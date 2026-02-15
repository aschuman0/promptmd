import * as vscode from 'vscode';
import { PromptDocument } from './document';
import { getWebviewContent } from './getWebviewContent';
import { getNamesInScope } from './parser';
import { rebuildPyFile } from './save';

const PY_IDENT_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PY_IDENT_ERROR = 'Use a valid Python identifier (letters, numbers, underscore).';

function getWebviewPayload(document: PromptDocument): {
  variables: { name: string; content: string; isFString: boolean }[];
  validPlaceholderNames: string[];
} {
  return {
    variables: document.entries.map((e) => ({
      name: e.name,
      content: e.rawValue,
      isFString: e.isFString,
    })),
    validPlaceholderNames: getNamesInScope(document.savedFileText),
  };
}

/** Custom editor provider for *prompt*.py files. */
export class PromptEditorProvider implements vscode.CustomEditorProvider<PromptDocument> {
  private readonly _context: vscode.ExtensionContext;
  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<PromptDocument>
  >();
  readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  private readonly _webviewPanels = new Map<string, Set<vscode.WebviewPanel>>();

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
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
    webviewPanel.webview.postMessage({ type: 'init', variables, validPlaceholderNames });

    const broadcastVariables = () => {
      const panels = this._webviewPanels.get(key);
      if (panels) {
        const payload = getWebviewPayload(document);
        for (const panel of panels) {
          panel.webview.postMessage({ type: 'variablesUpdated', ...payload });
        }
      }
    };

    webviewPanel.webview.onDidReceiveMessage(
      async (msg: { type: string; variableName?: string; content?: string }) => {
        if (msg.type === 'reopenInEditor') {
          await vscode.commands.executeCommand('workbench.action.reopenWithEditor');
          return;
        }
        if (msg.type === 'webviewReady') {
          webviewPanel.webview.postMessage({
            type: 'init',
            ...getWebviewPayload(document),
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
              if (document.entries.some((e) => e.name === value)) {
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
          const newName = await vscode.window.showInputBox({
            prompt: 'Rename variable',
            value: msg.variableName,
            validateInput: (value) => {
              if (!PY_IDENT_REGEX.test(value)) return PY_IDENT_ERROR;
              if (value !== msg.variableName && document.entries.some((e) => e.name === value)) {
                return 'A variable with this name already exists.';
              }
              return null;
            },
          });
          if (newName && newName !== msg.variableName) {
            document.renameEntry(msg.variableName, newName);
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
      for (const panel of panels) {
        panel.webview.postMessage({ type: 'variablesUpdated', ...payload });
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
      for (const panel of panels) {
        panel.webview.postMessage({ type: 'revert', ...payload });
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
