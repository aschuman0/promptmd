/**
 * Builds the HTML for the prompt editor webview.
 * Inline script sets up tabs and a WYSIWYG-style editor (contenteditable with markdown-aware behavior)
 * and placeholders highlighted. Sends edits to the extension via postMessage.
 */

export function getWebviewContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt Editor</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 8px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    #main {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .tabs {
      display: flex;
      flex-direction: row;
      gap: 2px;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    .tab {
      padding: 6px 12px;
      cursor: pointer;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      border-bottom: 2px solid transparent;
    }
    .tab:hover { background: var(--vscode-toolbar-hoverBackground); }
    .tab.active {
      border-bottom-color: var(--vscode-focusBorder);
      font-weight: 500;
    }
    #panels {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }
    .panel {
      display: none;
      flex: 1;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .panel.active { display: flex; }
    .editor-wrap {
      flex: 1;
      min-height: 120px;
      overflow: auto;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 12px;
      background: var(--vscode-input-background);
    }
    .editor {
      min-height: 200px;
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .editor:empty::before { content: attr(data-placeholder); color: var(--vscode-input-placeholderForeground); }
    .preview {
      flex-shrink: 0;
      margin-top: 8px;
      padding: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      min-height: 80px;
      max-height: 40%;
      overflow: auto;
      font-size: 0.95em;
    }
    .preview h1 { font-size: 1.4em; margin: 0.5em 0; }
    .preview h2 { font-size: 1.2em; margin: 0.5em 0; }
    .preview h3 { font-size: 1.1em; margin: 0.5em 0; }
    .preview p { margin: 0.4em 0; }
    .preview ul, .preview ol { margin: 0.4em 0; padding-left: 1.5em; }
    .preview code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 2px; }
    .placeholder-inline {
      background: var(--vscode-textBlockQuote-background);
      color: var(--vscode-editorWidget-foreground);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <div id="emptyState" class="empty-state" style="display: none;">
    No prompt variables found in this file. Add top-level triple-quoted string assignments (e.g. <code>VAR = """..."""</code>).
  </div>
  <div id="main" style="display: none;">
    <div class="tabs" id="tabs"></div>
    <div id="panels"></div>
  </div>
  <script>
    (function() {
      const vscode = acquireVsCodeApi();
      let state = { variables: [] };
      let activeIndex = 0;
      let editDebounce = null;
      const DEBOUNCE_MS = 400;

      function showEmpty() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('main').style.display = 'none';
      }
      function showMain() {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('main').style.display = 'flex';
      }

      function renderContentWithPlaceholders(text) {
        const div = document.createElement('div');
        let i = 0;
        const re = /\{[^}]*\}/g;
        let m;
        let last = 0;
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) {
            div.appendChild(document.createTextNode(text.slice(last, m.index)));
          }
          const span = document.createElement('span');
          span.className = 'placeholder-inline';
          span.textContent = m[0];
          span.contentEditable = 'false';
          span.setAttribute('data-placeholder', m[0]);
          div.appendChild(span);
          last = m.index + m[0].length;
        }
        if (last < text.length) div.appendChild(document.createTextNode(text.slice(last)));
        return div;
      }

      function getTextFromNode(node) {
        let out = '';
        function walk(n) {
          if (n.nodeType === Node.TEXT_NODE) {
            out += n.textContent;
          } else if (n.classList && n.classList.contains('placeholder-inline')) {
            out += n.getAttribute('data-placeholder') || n.textContent;
          } else {
            for (const c of n.childNodes) walk(c);
          }
        }
        walk(node);
        return out;
      }

      function syncEditorToVariable(index) {
        const v = state.variables[index];
        if (!v) return;
        const panel = document.getElementById('panel-' + index);
        if (!panel) return;
        const editor = panel.querySelector('.editor');
        if (!editor) return;
        const content = getTextFromNode(editor);
        if (content !== v.content) {
          v.content = content;
          vscode.postMessage({ type: 'edit', variableName: v.name, content: content });
        }
      }

      function buildEditor(index) {
        const v = state.variables[index];
        const panel = document.createElement('div');
        panel.id = 'panel-' + index;
        panel.className = 'panel' + (index === activeIndex ? ' active' : '');
        const wrap = document.createElement('div');
        wrap.className = 'editor-wrap';
        const editor = document.createElement('div');
        editor.className = 'editor';
        editor.contentEditable = 'true';
        editor.setAttribute('data-placeholder', 'Enter markdown...');
        const contentWithPlaceholders = renderContentWithPlaceholders(v.content || '');
        editor.appendChild(contentWithPlaceholders);
        editor.addEventListener('input', function() {
          clearTimeout(editDebounce);
          editDebounce = setTimeout(function() {
            syncEditorToVariable(index);
          }, DEBOUNCE_MS);
        });
        editor.addEventListener('blur', function() { syncEditorToVariable(index); });
        const preview = document.createElement('div');
        preview.className = 'preview';
        preview.innerHTML = 'Preview';
        function updatePreview() {
          const raw = getTextFromNode(editor);
          preview.innerHTML = simpleMarkdownToHtml(raw);
        }
        editor.addEventListener('input', updatePreview);
        editor.addEventListener('blur', updatePreview);
        updatePreview();
        wrap.appendChild(editor);
        panel.appendChild(wrap);
        panel.appendChild(preview);
        return panel;
      }
      function simpleMarkdownToHtml(md) {
        if (!md) return '';
        let s = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
        s = s.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
        s = s.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
        s = s.replace(/^\\- (.+)$/gm, '<li>$1</li>');
        s = s.replace(/\\n\\n/g, '</p><p>');
        s = s.replace(/\\n/g, '<br>');
        return '<p>' + s + '</p>';
      }

      function render() {
        if (state.variables.length === 0) {
          showEmpty();
          return;
        }
        showMain();
        const tabsEl = document.getElementById('tabs');
        const panelsEl = document.getElementById('panels');
        tabsEl.innerHTML = '';
        panelsEl.innerHTML = '';
        state.variables.forEach(function(v, i) {
          const tab = document.createElement('button');
          tab.className = 'tab' + (i === activeIndex ? ' active' : '');
          tab.textContent = v.name;
          tab.addEventListener('click', function() {
            syncEditorToVariable(activeIndex);
            document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById('panel-' + i).classList.add('active');
            activeIndex = i;
          });
          tabsEl.appendChild(tab);
          panelsEl.appendChild(buildEditor(i));
        });
      }

      window.addEventListener('message', function(event) {
        const msg = event.data;
        if (msg.type === 'init' || msg.type === 'revert') {
          state.variables = (msg.variables || []).map(function(v) {
            return { name: v.name, content: v.content, isFString: v.isFString };
          });
          activeIndex = 0;
          render();
        }
      });
      render();
    })();
  </script>
</body>
</html>`;
}
