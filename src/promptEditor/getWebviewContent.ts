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
  const editorTypeface = (config.get<string>('editorTypeface') as 'sansSerif' | 'serif' | 'monospace' | undefined) ?? 'sansSerif';
  const scriptSrc = scriptUri.toString();
  const themeKind = vscode.window.activeColorTheme.kind;
  const bodyDataTheme =
    themeKind === vscode.ColorThemeKind.Dark
      ? 'vscode-dark'
      : themeKind === vscode.ColorThemeKind.HighContrast
        ? 'vscode-high-contrast'
        : 'vscode-light';
  const bodyDataMode = mode === 'markdown' ? 'markdown' : 'prompt';
  const bodyDataWidth = editorWidth === 'full' ? 'full' : 'constrained';
  const bodyDataTokenModel = tokenCounterModel;
  const bodyDataPlaceholderStyle = placeholderStyle;
  const bodyDataPlaceholderValid = placeholderValidColor;
  const bodyDataPlaceholderInvalid = placeholderInvalidColor;
  const bodyDataTypeface = editorTypeface;
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
    .tab-disclosure {
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
      position: relative;
    }
    .tab-disclosure svg {
      width: 20px;
      height: 20px;
    }
    .tab-disclosure:hover {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }
    .tab-wrap:hover .tab-disclosure { opacity: 0.8; }
    .tab-disclosure-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 2px;
      min-width: 140px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 100;
      flex-direction: column;
      padding: 4px 0;
    }
    .tab-disclosure-dropdown.open {
      display: flex;
    }
    .tab-disclosure-dropdown button {
      display: block;
      width: 100%;
      padding: 6px 12px;
      text-align: left;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: inherit;
    }
    .tab-disclosure-dropdown button:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .tab-wrap-dropdown {
      position: relative;
    }
    #panels {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .panel {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
      visibility: hidden;
      pointer-events: none;
    }
    .panel.active {
      visibility: visible;
      pointer-events: auto;
    }
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
    .format-table-wrap {
      position: relative;
      display: inline-flex;
    }
    .format-table-trigger {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 6px 6px 6px 8px;
      font-size: 0.9em;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      cursor: pointer;
      min-height: 28px;
    }
    .format-table-trigger:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .format-table-trigger.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .format-table-trigger .format-table-chevron {
      width: 16px;
      height: 16px;
      opacity: 0.85;
    }
    .format-table-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 2px;
      min-width: 180px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 100;
      flex-direction: column;
      padding: 4px 0;
    }
    .format-table-dropdown.open {
      display: flex;
    }
    .format-table-dropdown button {
      display: block;
      width: 100%;
      padding: 6px 12px;
      text-align: left;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: inherit;
    }
    .format-table-dropdown button:hover:not(:disabled) {
      background: var(--vscode-list-hoverBackground);
    }
    .format-table-dropdown button:disabled {
      color: var(--vscode-descriptionForeground);
      cursor: default;
    }
    .format-table-dropdown .format-table-sep {
      height: 1px;
      margin: 4px 8px;
      background: var(--vscode-dropdown-border);
    }
    .token-count {
      font-size: 0.85em;
      color: var(--vscode-descriptionForeground);
      margin-left: 8px;
      padding: 4px 8px;
    }
    .promptmd-tiptap-editor {
      font-family: var(--markdown-font-family, var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, "Ubuntu", "Droid Sans", sans-serif));
      font-size: 1.2em;
      line-height: 1.5;
      word-wrap: break-word;
      min-height: 160px;
      outline: none;
    }
    body[data-editor-typeface="serif"] .promptmd-tiptap-editor {
      font-family: Georgia, "Times New Roman", Times, serif;
    }
    body[data-editor-typeface="monospace"] .promptmd-tiptap-editor {
      font-family: var(--vscode-editor-font-family, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace);
    }
    .promptmd-tiptap-editor .ProseMirror { max-width: 100%; }
    .promptmd-tiptap-editor h1, .promptmd-tiptap-editor h2, .promptmd-tiptap-editor h3, .promptmd-tiptap-editor h4, .promptmd-tiptap-editor h5, .promptmd-tiptap-editor h6,
    .promptmd-tiptap-editor p, .promptmd-tiptap-editor ol, .promptmd-tiptap-editor ul, .promptmd-tiptap-editor pre {
      margin-top: 0;
    }
    .promptmd-tiptap-editor h1, .promptmd-tiptap-editor h2, .promptmd-tiptap-editor h3, .promptmd-tiptap-editor h4, .promptmd-tiptap-editor h5, .promptmd-tiptap-editor h6 {
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 16px;
      line-height: 1.25;
    }
    .promptmd-tiptap-editor h1 { font-size: 2em; margin-top: 0; padding-bottom: 0.3em; border-bottom-width: 1px; border-bottom-style: solid; }
    .promptmd-tiptap-editor h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom-width: 1px; border-bottom-style: solid; }
    .promptmd-tiptap-editor h3 { font-size: 1.25em; }
    .promptmd-tiptap-editor h4 { font-size: 1em; }
    .promptmd-tiptap-editor h5 { font-size: 0.875em; }
    .promptmd-tiptap-editor h6 { font-size: 0.85em; }
    .promptmd-tiptap-editor p { margin-bottom: 16px; }
    .promptmd-tiptap-editor li p { margin-bottom: 0.7em; }
    .promptmd-tiptap-editor ul, .promptmd-tiptap-editor ol { margin-bottom: 0.7em; padding-left: 1.5em; }
    .promptmd-tiptap-editor ul ul:first-child, .promptmd-tiptap-editor ul ol:first-child,
    .promptmd-tiptap-editor ol ul:first-child, .promptmd-tiptap-editor ol ol:first-child { margin-bottom: 0; }
    .promptmd-tiptap-editor sub, .promptmd-tiptap-editor sup { line-height: 0; }
    .promptmd-tiptap-editor a { text-decoration: none; }
    .promptmd-tiptap-editor a:hover { text-decoration: underline; }
    .promptmd-tiptap-editor hr { border: 0; height: 1px; border-bottom: 1px solid; }
    .promptmd-tiptap-editor blockquote {
      margin: 0;
      padding: 0 16px 0 10px;
      border-left-width: 5px;
      border-left-style: solid;
      border-radius: 2px;
      border-left-color: var(--vscode-textBlockQuote-border);
      color: var(--vscode-textPreformat-foreground);
    }
    .promptmd-tiptap-editor code {
      font-family: var(--vscode-editor-font-family, "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace);
      font-size: 1em;
      line-height: 1.357em;
      background: var(--vscode-textCodeBlock-background);
      padding: 0.15em 0.4em;
      border-radius: 3px;
    }
    .promptmd-tiptap-editor pre {
      background-color: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-widget-border);
      padding: 16px;
      border-radius: 3px;
      overflow: auto;
      margin: 0.5em 0;
    }
    .promptmd-tiptap-editor pre code {
      display: inline-block;
      color: var(--vscode-editor-foreground);
      tab-size: 4;
      background: none;
      padding: 0;
    }
    .promptmd-tiptap-editor table { border-collapse: collapse; margin-bottom: 0.7em; }
    .promptmd-tiptap-editor th { text-align: left; border-bottom: 1px solid; }
    .promptmd-tiptap-editor th, .promptmd-tiptap-editor td { padding: 5px 10px; }
    .promptmd-tiptap-editor table > tbody > tr + tr > td { border-top: 1px solid; }
    body.vscode-light .promptmd-tiptap-editor th { border-color: rgba(0, 0, 0, 0.69); }
    body.vscode-dark .promptmd-tiptap-editor th { border-color: rgba(255, 255, 255, 0.69); }
    body.vscode-light .promptmd-tiptap-editor h1, body.vscode-light .promptmd-tiptap-editor h2,
    body.vscode-light .promptmd-tiptap-editor hr, body.vscode-light .promptmd-tiptap-editor td { border-color: rgba(0, 0, 0, 0.18); }
    body.vscode-dark .promptmd-tiptap-editor h1, body.vscode-dark .promptmd-tiptap-editor h2,
    body.vscode-dark .promptmd-tiptap-editor hr, body.vscode-dark .promptmd-tiptap-editor td { border-color: rgba(255, 255, 255, 0.18); }
    body.vscode-high-contrast .promptmd-tiptap-editor h1 { border-color: rgb(0, 0, 0); }
    .loading-state {
      padding: 24px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
    }
    body[data-mode="markdown"] .tabs { display: none !important; }
  </style>
</head>
<body class="${bodyDataTheme}" data-mode="${bodyDataMode}" data-editor-width="${bodyDataWidth}" data-editor-typeface="${bodyDataTypeface}" data-token-counter-model="${bodyDataTokenModel}" data-placeholder-style="${bodyDataPlaceholderStyle}" data-placeholder-valid-color="${bodyDataPlaceholderValid}" data-placeholder-invalid-color="${bodyDataPlaceholderInvalid}">
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
        try {
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
        } catch (err) {
          console.error('[PromptMD] Error initializing editor for variable ' + v.name + ':', err);
          editorEl.innerHTML = '<div style="color: var(--vscode-errorForeground); padding: 12px;"><strong>Error initializing editor:</strong><br><pre style="white-space: pre-wrap; margin-top: 8px;">' + (err && err.message ? err.message : String(err)) + '</pre></div>';
        }
        wrap.appendChild(editorEl);
        panel.appendChild(outer);
        return panel;
      }

      function makeDisclosureIcon() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
        return svg;
      }

      function closeAllDisclosureDropdowns() {
        document.querySelectorAll('.tab-disclosure-dropdown.open').forEach(function(el) {
          el.classList.remove('open');
        });
      }
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.tab-wrap-dropdown')) {
          closeAllDisclosureDropdowns();
        }
      });

      function render() {
        if (state.mode !== 'markdown' && state.variables.length === 0) {
          showEmpty();
          return;
        }
        showMain();
        const tabsEl = document.getElementById('tabs');
        const panelsEl = document.getElementById('panels');
        Array.from(panelsEl.querySelectorAll('.panel')).forEach(function(p) {
          try {
            if (p._destroyTiptap) p._destroyTiptap();
          } catch (err) {
            console.error('[PromptMD] Error destroying editor:', err);
          }
        });
        tabsEl.innerHTML = '';
        panelsEl.innerHTML = '';
        if (state.mode === 'markdown') {
          panelsEl.appendChild(buildEditor(0));
        } else {
          state.variables.forEach(function(v, i) {
            try {
              const wrap = document.createElement('div');
              wrap.className = 'tab-wrap';
              const tab = document.createElement('button');
              tab.type = 'button';
              tab.className = 'tab' + (i === activeIndex ? ' active' : '');
              tab.textContent = v.name;
              tab.setAttribute('title', 'Switch to ' + v.name);
              const dropdownWrap = document.createElement('div');
              dropdownWrap.className = 'tab-wrap-dropdown';
              const disclosureBtn = document.createElement('button');
              disclosureBtn.type = 'button';
              disclosureBtn.className = 'tab-disclosure';
              disclosureBtn.setAttribute('title', 'Variable actions');
              disclosureBtn.appendChild(makeDisclosureIcon());
              const dropdown = document.createElement('div');
              dropdown.className = 'tab-disclosure-dropdown';
              const editBtn = document.createElement('button');
              editBtn.type = 'button';
              editBtn.textContent = 'Edit name';
              editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeAllDisclosureDropdowns();
                vscode.postMessage({ type: 'renameVariable', variableName: v.name });
              });
              const deleteBtn = document.createElement('button');
              deleteBtn.type = 'button';
              deleteBtn.textContent = 'Delete prompt';
              deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeAllDisclosureDropdowns();
                vscode.postMessage({ type: 'deleteVariable', variableName: v.name });
              });
              dropdown.appendChild(editBtn);
              dropdown.appendChild(deleteBtn);
              disclosureBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeAllDisclosureDropdowns();
                dropdown.classList.toggle('open');
              });
              dropdownWrap.appendChild(disclosureBtn);
              dropdownWrap.appendChild(dropdown);
              tab.addEventListener('click', function() {
                closeAllDisclosureDropdowns();
                document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
                tab.classList.add('active');
                document.getElementById('panel-' + i).classList.add('active');
                activeIndex = i;
              });
              wrap.appendChild(tab);
              wrap.appendChild(dropdownWrap);
              tabsEl.appendChild(wrap);
              panelsEl.appendChild(buildEditor(i));
            } catch (err) {
              console.error('[PromptMD] Error rendering tab/panel ' + i + ':', err);
            }
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
        console.log('[PromptMD] Received message:', msg.type, msg);
        if (msg.type === 'init' || msg.type === 'revert') {
          console.log('[PromptMD] Applying init/revert, variables:', msg.variables ? msg.variables.length : 0);
          applyInitOrRevert(msg);
          vscode.postMessage({ type: 'initAck', variableCount: state.variables.length, mode: state.mode });
        }
        if (msg.type === 'variablesUpdated') {
          applyVariablesUpdated(msg);
        }
        if (msg.type === 'themeChanged' && msg.theme) {
          document.body.className = msg.theme;
        }
      });
      function sendReadyWhenEditorLoaded() {
        if (typeof window.initTiptapEditor === 'function') {
          console.log('[PromptMD] initTiptapEditor is ready');
          vscode.postMessage({ type: 'webviewReady' });
          return;
        }
        console.log('[PromptMD] waiting for initTiptapEditor, current type:', typeof window.initTiptapEditor);
        setTimeout(sendReadyWhenEditorLoaded, 30);
      }
      console.log('[PromptMD] Webview script starting, mode:', mode);
      sendReadyWhenEditorLoaded();
    })();
  </script>
</body>
</html>`;
}
