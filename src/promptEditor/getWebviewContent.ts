import * as vscode from 'vscode';

export type WebviewEditorMode = 'prompt' | 'markdown';

export type EditorWidth = 'constrained' | 'full';

export interface GetWebviewContentOptions {
  mode?: WebviewEditorMode;
  /** From promptmd.editorWidth; when 'full', no max-width. */
  editorWidth?: EditorWidth;
  /** From promptmd.tokenCounterModel; e.g. cl100k_base, o200k_base. */
  tokenCounterModel?: string;
}

/**
 * Builds the HTML for the prompt/markdown editor webview: layout, styles, and inline script.
 * Script loads TipTap from scriptUri, handles init/revert/variablesUpdated, and requests state on load (webviewReady).
 * When mode is 'markdown', tabs and variable UI are hidden; single-document edit with content-only messages.
 */
export function getWebviewContent(
  _webview: vscode.Webview,
  scriptUri: vscode.Uri,
  options?: GetWebviewContentOptions
): string {
  const mode = options?.mode ?? 'prompt';
  const config = vscode.workspace.getConfiguration('promptmd');
  const editorWidth = options?.editorWidth ?? (config.get<string>('editorWidth') as EditorWidth | undefined) ?? 'constrained';
  const tokenCounterModel = options?.tokenCounterModel ?? config.get<string>('tokenCounterModel') ?? 'cl100k_base';
  const placeholderStyle = config.get<string>('placeholderHighlightStyle') ?? 'both';
  const placeholderValidColor = config.get<string>('placeholderValidColor') ?? 'default';
  const placeholderInvalidColor = config.get<string>('placeholderInvalidColor') ?? 'default';
  const scriptSrc = scriptUri.toString();
  const bodyDataMode = mode === 'markdown' ? 'markdown' : 'prompt';
  const bodyDataWidth = editorWidth === 'full' ? 'full' : 'constrained';
  const bodyDataTokenModel = tokenCounterModel;
  const bodyDataPlaceholderStyle = placeholderStyle;
  const bodyDataPlaceholderValid = placeholderValidColor;
  const bodyDataPlaceholderInvalid = placeholderInvalidColor;
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
      align-items: center;
      gap: 2px;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    .tab-wrap {
      display: flex;
      align-items: center;
      gap: 2px;
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
    .tab-rename {
      padding: 2px 4px;
      background: transparent;
      border: none;
      border-radius: 2px;
      cursor: pointer;
      color: var(--vscode-descriptionForeground);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
    }
    .tab-rename:hover {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }
    .tab-wrap:hover .tab-rename { opacity: 0.8; }
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
    .editor-outer {
      flex: 1;
      min-height: 0;
      overflow: auto;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      max-width: 122ch;
      width: 100%;
      margin-left: auto;
      margin-right: auto;
    }
    .editor-outer.editor-outer--full {
      max-width: none;
    }
    .editor-wrap {
      flex: 1;
      min-height: 120px;
      width: 100%;
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
    .placeholder-inline {
      background: var(--vscode-inputValidation-infoBackground, var(--vscode-textBlockQuote-background));
      color: var(--vscode-inputValidation-infoForeground, var(--vscode-textLink-foreground, var(--vscode-editor-foreground)));
      border-left: 3px solid var(--vscode-inputValidation-infoBorder, var(--vscode-focusBorder, #007acc));
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-weight: 500;
    }
    .placeholder-inline.placeholder-invalid {
      background: var(--vscode-inputValidation-warningBackground, rgba(255, 193, 0, 0.15));
      border-left-color: var(--vscode-inputValidation-warningBorder, rgba(255, 193, 0, 0.8));
      color: var(--vscode-editor-foreground);
    }
    body[data-placeholder-style="background"] .placeholder-inline { border-left: none; }
    body[data-placeholder-style="leftLine"] .placeholder-inline {
      background: transparent;
      border-radius: 0;
    }
    body[data-placeholder-valid-color="blue"] .placeholder-inline:not(.placeholder-invalid) {
      background: rgba(0, 122, 204, 0.15);
      border-left-color: #007acc;
      color: var(--vscode-editor-foreground);
    }
    body[data-placeholder-valid-color="green"] .placeholder-inline:not(.placeholder-invalid) {
      background: rgba(22, 130, 93, 0.15);
      border-left-color: #16825d;
      color: var(--vscode-editor-foreground);
    }
    body[data-placeholder-valid-color="purple"] .placeholder-inline:not(.placeholder-invalid) {
      background: rgba(92, 45, 145, 0.15);
      border-left-color: #5c2d91;
      color: var(--vscode-editor-foreground);
    }
    body[data-placeholder-invalid-color="amber"] .placeholder-inline.placeholder-invalid {
      background: rgba(255, 193, 0, 0.15);
      border-left-color: rgba(255, 193, 0, 0.8);
      color: var(--vscode-editor-foreground);
    }
    body[data-placeholder-invalid-color="red"] .placeholder-inline.placeholder-invalid {
      background: rgba(200, 50, 50, 0.15);
      border-left-color: #c83232;
      color: var(--vscode-editor-foreground);
    }
    body[data-placeholder-invalid-color="orange"] .placeholder-inline.placeholder-invalid {
      background: rgba(230, 130, 50, 0.15);
      border-left-color: #e68232;
      color: var(--vscode-editor-foreground);
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
    .format-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px 8px 4px 0;
      border-bottom: 1px solid var(--vscode-input-border);
      margin-bottom: 8px;
      flex-shrink: 0;
    }
    .format-btn, .format-select {
      padding: 6px 8px;
      font-size: 0.9em;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .format-btn {
      min-width: 32px;
      min-height: 28px;
    }
    .format-btn:hover, .format-select:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .format-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .format-reopen-btn { margin-left: 4px; }
    .format-add-btn {
      margin-left: auto;
    }
    .token-count {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      margin-left: 8px;
      padding: 4px 8px;
    }
    .promptmd-tiptap-editor {
      min-height: 160px;
      outline: none;
    }
    .promptmd-tiptap-editor p { margin: 0.25em 0; }
    .promptmd-tiptap-editor h1 { font-size: 1.4em; margin: 0.5em 0; }
    .promptmd-tiptap-editor h2 { font-size: 1.2em; margin: 0.5em 0; }
    .promptmd-tiptap-editor h3 { font-size: 1.1em; margin: 0.5em 0; }
    .promptmd-tiptap-editor ul, .promptmd-tiptap-editor ol { margin: 0.4em 0; padding-left: 1.5em; }
    .promptmd-tiptap-editor blockquote { border-left: 3px solid var(--vscode-textBlockQuote-border); margin: 0.5em 0; padding-left: 1em; color: var(--vscode-textPreformat-foreground); }
    .promptmd-tiptap-editor code { background: var(--vscode-textCodeBlock-background); padding: 0.15em 0.4em; border-radius: 3px; font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    .promptmd-tiptap-editor pre { background: var(--vscode-textCodeBlock-background); padding: 0.75em 1em; border-radius: 4px; overflow-x: auto; margin: 0.5em 0; }
    .promptmd-tiptap-editor pre code { padding: 0; background: none; }
    .promptmd-tiptap-editor .ProseMirror { max-width: 100%; }
    .loading-state {
      padding: 24px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
    body[data-mode="markdown"] .tabs { display: none !important; }
  </style>
</head>
<body data-mode="${bodyDataMode}" data-editor-width="${bodyDataWidth}" data-token-counter-model="${bodyDataTokenModel}" data-placeholder-style="${bodyDataPlaceholderStyle}" data-placeholder-valid-color="${bodyDataPlaceholderValid}" data-placeholder-invalid-color="${bodyDataPlaceholderInvalid}">
  <script src="${scriptSrc}"></script>
  <div id="loading" class="loading-state">Loading…</div>
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
      const mode = document.body.getAttribute('data-mode') || 'prompt';
      const editorWidth = document.body.getAttribute('data-editor-width') || 'constrained';
      const tokenCounterModel = document.body.getAttribute('data-token-counter-model') || 'cl100k_base';
      let state = { mode: mode, variables: [], validPlaceholderNames: [], editorWidth: editorWidth, tokenCounterModel: tokenCounterModel };
      let activeIndex = 0;

      function hideLoading() {
        const el = document.getElementById('loading');
        if (el) el.style.display = 'none';
      }
      function showEmpty() {
        hideLoading();
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('main').style.display = 'none';
      }
      function showMain() {
        hideLoading();
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('main').style.display = 'flex';
      }

      function buildEditor(index) {
        const v = state.variables[index];
        const panel = document.createElement('div');
        panel.id = 'panel-' + index;
        panel.className = 'panel' + (index === activeIndex ? ' active' : '');
        const formatBar = document.createElement('div');
        formatBar.className = 'format-bar';
        const wrap = document.createElement('div');
        wrap.className = 'editor-wrap';
        const editorEl = document.createElement('div');
        editorEl.className = 'editor';
        const outer = document.createElement('div');
        outer.className = 'editor-outer' + (state.editorWidth === 'full' ? ' editor-outer--full' : '');
        outer.appendChild(formatBar);
        outer.appendChild(wrap);
        if (typeof window.initTiptapEditor !== 'function') {
          editorEl.textContent = 'Loading editor...';
          wrap.appendChild(editorEl);
          panel.appendChild(outer);
          return panel;
        }
        const isMarkdown = state.mode === 'markdown';
        const destroy = window.initTiptapEditor({
          toolbarContainer: formatBar,
          editorContainer: editorEl,
          initialMarkdown: v.content || '',
          variableName: v.name,
          onMarkdownChange: function(md) {
            v.content = md;
            if (isMarkdown) {
              vscode.postMessage({ type: 'edit', content: md });
            } else {
              vscode.postMessage({ type: 'edit', variableName: v.name, content: md });
            }
          },
          onAddVariable: isMarkdown ? undefined : function() {
            vscode.postMessage({ type: 'addVariable' });
          },
          onReopenInEditor: function() {
            vscode.postMessage({ type: 'reopenInEditor' });
          },
          validPlaceholderNames: state.validPlaceholderNames,
          tokenCounterModel: state.tokenCounterModel,
        });
        panel._destroyTiptap = destroy;
        wrap.appendChild(editorEl);
        panel.appendChild(outer);
        return panel;
      }

      function makeRenameIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>';
        return svg;
      }

      function render() {
        if (state.mode !== 'markdown' && state.variables.length === 0) {
          showEmpty();
          return;
        }
        showMain();
        const tabsEl = document.getElementById('tabs');
        const panelsEl = document.getElementById('panels');
        Array.from(panelsEl.querySelectorAll('.panel')).forEach(function(p) {
          if (p._destroyTiptap) p._destroyTiptap();
        });
        tabsEl.innerHTML = '';
        panelsEl.innerHTML = '';
        if (state.mode === 'markdown') {
          panelsEl.appendChild(buildEditor(0));
        } else {
          state.variables.forEach(function(v, i) {
            const wrap = document.createElement('div');
            wrap.className = 'tab-wrap';
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'tab' + (i === activeIndex ? ' active' : '');
            tab.textContent = v.name;
            tab.setAttribute('title', 'Switch to ' + v.name);
            const renameBtn = document.createElement('button');
            renameBtn.type = 'button';
            renameBtn.className = 'tab-rename';
            renameBtn.setAttribute('title', 'Rename variable');
            renameBtn.appendChild(makeRenameIcon());
            renameBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              vscode.postMessage({ type: 'renameVariable', variableName: v.name });
            });
            tab.addEventListener('click', function() {
              document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
              document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
              tab.classList.add('active');
              document.getElementById('panel-' + i).classList.add('active');
              activeIndex = i;
            });
            wrap.appendChild(tab);
            wrap.appendChild(renameBtn);
            tabsEl.appendChild(wrap);
            panelsEl.appendChild(buildEditor(i));
          });
        }
      }

      function applyInitOrRevert(msg) {
        if (msg.mode === 'markdown') {
          state.variables = [{ name: '', content: msg.content != null ? msg.content : '', isFString: false }];
          state.validPlaceholderNames = msg.validPlaceholderNames || [];
        } else {
          state.variables = (msg.variables || []).map(function(v) {
            return { name: v.name, content: v.content, isFString: v.isFString };
          });
          state.validPlaceholderNames = msg.validPlaceholderNames || [];
        }
        if (msg.editorWidth != null) state.editorWidth = msg.editorWidth;
        if (msg.tokenCounterModel != null) state.tokenCounterModel = msg.tokenCounterModel;
        activeIndex = 0;
        render();
      }
      function applyVariablesUpdated(msg) {
        if (msg.mode === 'markdown') {
          state.variables = [{ name: '', content: msg.content != null ? msg.content : '', isFString: false }];
          state.validPlaceholderNames = msg.validPlaceholderNames || [];
        } else {
          const prevLen = state.variables.length;
          state.variables = (msg.variables || []).map(function(v) {
            return { name: v.name, content: v.content, isFString: v.isFString };
          });
          state.validPlaceholderNames = msg.validPlaceholderNames || [];
          if (state.variables.length > prevLen) {
            activeIndex = state.variables.length - 1;
          } else if (activeIndex >= state.variables.length) {
            activeIndex = Math.max(0, state.variables.length - 1);
          }
        }
        if (msg.editorWidth != null) state.editorWidth = msg.editorWidth;
        if (msg.tokenCounterModel != null) state.tokenCounterModel = msg.tokenCounterModel;
        render();
      }
      window.addEventListener('message', function(event) {
        const msg = event.data;
        if (msg.type === 'init' || msg.type === 'revert') {
          applyInitOrRevert(msg);
        }
        if (msg.type === 'variablesUpdated') {
          applyVariablesUpdated(msg);
        }
      });
      function sendReadyWhenEditorLoaded() {
        if (typeof window.initTiptapEditor === 'function') {
          vscode.postMessage({ type: 'webviewReady' });
          return;
        }
        setTimeout(sendReadyWhenEditorLoaded, 30);
      }
      sendReadyWhenEditorLoaded();
    })();
  </script>
</body>
</html>`;
}
