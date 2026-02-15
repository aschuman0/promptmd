import * as vscode from 'vscode';
import { PromptDocument } from './document';
import { getWebviewContent } from './getWebviewContent';
import { getNamesInScope } from './parser';
import { rebuildPyFile } from './save';

const PY_IDENT_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PY_IDENT_ERROR = 'Use a valid Python identifier (letters, numbers, underscore).';

function getEditorConfig(): { editorWidth: string; tokenCounterModel: string } {
  const config = vscode.workspace.getConfiguration('promptmd');
  return {
    editorWidth: config.get<string>('editorWidth') ?? 'constrained',
    tokenCounterModel: config.get<string>('tokenCounterModel') ?? 'cl100k_base',
  };
}

function getWebviewPayload(document: PromptDocument): {
  variables: { name: string; content: string; isFString: boolean }[];
  validPlaceholderNames: string[];
} {
  const visibleEntries = document.entries.filter((e) => !e.deleted);
  return {
    variables: visibleEntries.map((e) => ({
      name: e.name,
      content: e.rawValue,
      isFString: e.isFString,
    })),
    validPlaceholderNames: getNamesInScope(document.savedFileText),
  };
}

/** Convert character offset in file text to a VS Code Position (line, character). Handles LF, CR, and CRLF. */
function offsetToPosition(text: string, offset: number): vscode.Position {
  let line = 0;
  let lineStart = 0;
  for (let i = 0; i < text.length && i <= offset; i++) {
    const atLf = text[i] === '\n';
    const atCr = text[i] === '\r';
    const atCrlfEnd = atLf && i > 0 && text[i - 1] === '\r';
    const atLoneCr = atCr && text[i + 1] !== '\n';
    if (atCrlfEnd) {
      if (i < offset) {
        line++;
        lineStart = i + 1;
      }
    } else if (atLf || atLoneCr) {
      if (i < offset) {
        line++;
        lineStart = i + 1;
      }
    }
  }
  return new vscode.Position(line, offset - lineStart);
}

/** Custom editor provider for *prompt*.py files. */
export class PromptEditorProvider implements vscode.CustomEditorProvider<PromptDocument> {
  private readonly _context: vscode.ExtensionContext;
  private readonly _log: vscode.OutputChannel | undefined;
  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<PromptDocument>
  >();
  readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  private readonly _webviewPanels = new Map<string, Set<vscode.WebviewPanel>>();

  constructor(context: vscode.ExtensionContext, log?: vscode.OutputChannel) {
    this._context = context;
    this._log = log;
    this._context.subscriptions.push(
      vscode.window.onDidChangeActiveColorTheme((e) => {
        const theme =
          e.kind === vscode.ColorThemeKind.Dark
            ? 'vscode-dark'
            : e.kind === vscode.ColorThemeKind.HighContrast
              ? 'vscode-high-contrast'
              : 'vscode-light';
        for (const panels of this._webviewPanels.values()) {
          for (const panel of panels) {
            panel.webview.postMessage({ type: 'themeChanged', theme });
          }
        }
      })
    );
  }

  async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<PromptDocument> {
    return PromptDocument.create(uri);
  }

  resolveCustomEditor(
    document: PromptDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    const key = document.uri.toString();
    let panelSet = this._webviewPanels.get(key);
    if (!panelSet) {
      panelSet = new Set();
      this._webviewPanels.set(key, panelSet);
    }
    panelSet.add(webviewPanel);
    webviewPanel.onDidDispose(() => this._webviewPanels.get(key)?.delete(webviewPanel));

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    const scriptUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._context.extensionUri, 'media', 'editor.js')
    );
    webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, scriptUri);

    const { variables, validPlaceholderNames } = getWebviewPayload(document);
    const editorConfig = getEditorConfig();
    const variableCount = variables.length;
    this._log?.appendLine(`[Prompt] resolveCustomEditor ${key} variables=${variableCount}`);
    webviewPanel.webview.postMessage({
      type: 'init',
      variables,
      validPlaceholderNames,
      editorWidth: editorConfig.editorWidth,
      tokenCounterModel: editorConfig.tokenCounterModel,
    });
    this._log?.appendLine(`[Prompt] sent initial init ${key} variables=${variableCount}`);

    const broadcastVariables = () => {
      const panels = this._webviewPanels.get(key);
      if (panels) {
        const payload = getWebviewPayload(document);
        const editorConfig = getEditorConfig();
        for (const panel of panels) {
          panel.webview.postMessage({
            type: 'variablesUpdated',
            ...payload,
            editorWidth: editorConfig.editorWidth,
            tokenCounterModel: editorConfig.tokenCounterModel,
          });
        }
      }
    };

    webviewPanel.webview.onDidReceiveMessage(
      async (msg: { type: string; variableName?: string; content?: string }) => {
        if (msg.type === 'reopenInEditor') {
          await vscode.commands.executeCommand('workbench.action.reopenWithEditor');
          return;
        }
        if (msg.type === 'initAck') {
          const n = (msg as { variableCount?: number }).variableCount;
          this._log?.appendLine(`[Prompt] webview received init variables=${n ?? '?'} ${key}`);
          return;
        }
        if (msg.type === 'webviewReady') {
          this._log?.appendLine(`[Prompt] webviewReady ${key}, sending init`);
          const payload = getWebviewPayload(document);
          const editorConfig = getEditorConfig();
          webviewPanel.webview.postMessage({
            type: 'init',
            ...payload,
            editorWidth: editorConfig.editorWidth,
            tokenCounterModel: editorConfig.tokenCounterModel,
          });
          return;
        }
        if (msg.type === 'edit' && msg.variableName != null && msg.content != null) {
          document.setVariableContent(msg.variableName, msg.content);
          this._onDidChangeCustomDocument.fire({ document });
          return;
        }
        if (msg.type === 'addVariable') {
          const name = await vscode.window.showInputBox({
            prompt: 'New variable name (Python identifier)',
            value: 'NEW_PROMPT',
            validateInput: (value) => {
              if (!PY_IDENT_REGEX.test(value)) return PY_IDENT_ERROR;
              if (document.entries.some((e) => e.name === value && !e.deleted)) {
                return 'A variable with this name already exists.';
              }
              return null;
            },
          });
          if (name) {
            document.addEntry(name);
            this._onDidChangeCustomDocument.fire({ document });
            broadcastVariables();
          }
          return;
        }
        if (msg.type === 'renameVariable' && msg.variableName != null) {
          const oldName = msg.variableName;
          const newName = await vscode.window.showInputBox({
            prompt: 'Rename variable',
            value: oldName,
            validateInput: (value) => {
              if (!PY_IDENT_REGEX.test(value)) return PY_IDENT_ERROR;
              if (value !== oldName && document.entries.some((e) => e.name === value && !e.deleted)) {
                return 'A variable with this name already exists.';
              }
              return null;
            },
          });
          if (newName && newName !== oldName) {
            const entry = document.entries.find((e) => e.name === oldName && !e.deleted);
            const nameStart = entry?.nameStart;
            if (
              nameStart != null &&
              nameStart >= 0 &&
              typeof document.savedFileText === 'string'
            ) {
              const position = offsetToPosition(document.savedFileText, nameStart);
              const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit | null>(
                'vscode.executeDocumentRenameProvider',
                document.uri,
                position,
                newName
              );
              if (edit && edit.size > 0) {
                const applied = await vscode.workspace.applyEdit(edit);
                if (applied) {
                  await document.reloadFromDisk();
                  broadcastVariables();
                  return;
                }
              }
            }
            document.renameEntry(oldName, newName);
            this._onDidChangeCustomDocument.fire({ document });
            broadcastVariables();
          }
          return;
        }
        if (msg.type === 'deleteVariable' && msg.variableName != null) {
          const name = msg.variableName;
          const first = await vscode.window.showWarningMessage(
            `Delete prompt '${name}'? This will remove it from the file.`,
            'Delete',
            'Cancel'
          );
          if (first !== 'Delete') return;
          const second = await vscode.window.showWarningMessage('Are you sure?', 'Yes', 'No');
          if (second !== 'Yes') return;
          if (document.deleteEntry(name)) {
            this._onDidChangeCustomDocument.fire({ document });
            broadcastVariables();
          }
          return;
        }
      }
    );
  }

  async saveCustomDocument(
    document: PromptDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const newContent = rebuildPyFile(document.savedFileText, document.entries);
    const bytes = new TextEncoder().encode(newContent);
    await vscode.workspace.fs.writeFile(document.uri, bytes);
    document.updateSavedContent(newContent);
    const panels = this._webviewPanels.get(document.uri.toString());
    if (panels) {
      const payload = getWebviewPayload(document);
      const editorConfig = getEditorConfig();
      for (const panel of panels) {
        panel.webview.postMessage({
          type: 'variablesUpdated',
          ...payload,
          editorWidth: editorConfig.editorWidth,
          tokenCounterModel: editorConfig.tokenCounterModel,
        });
      }
    }
  }

  async revertCustomDocument(
    document: PromptDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await document.reloadFromDisk();
    const panels = this._webviewPanels.get(document.uri.toString());
    if (panels) {
      const payload = getWebviewPayload(document);
      const editorConfig = getEditorConfig();
      for (const panel of panels) {
        panel.webview.postMessage({
          type: 'revert',
          ...payload,
          editorWidth: editorConfig.editorWidth,
          tokenCounterModel: editorConfig.tokenCounterModel,
        });
      }
    }
  }

  backupCustomDocument(
    _document: PromptDocument,
    _context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    return Promise.resolve({ id: '', delete: () => {} });
  }

  async saveCustomDocumentAs(
    document: PromptDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const newContent = rebuildPyFile(document.savedFileText, document.entries);
    const bytes = new TextEncoder().encode(newContent);
    await vscode.workspace.fs.writeFile(destination, bytes);
  }
}
