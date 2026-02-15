import * as vscode from 'vscode';
import { PromptDocument } from './document';
import { getWebviewContent } from './getWebviewContent';
import { rebuildPyFile } from './save';

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
    let set = this._webviewPanels.get(key);
    if (!set) {
      set = new Set();
      this._webviewPanels.set(key, set);
    }
    set.add(webviewPanel);
    webviewPanel.onDidDispose(() => set!.delete(webviewPanel));

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri],
    };
    webviewPanel.webview.html = getWebviewContent();

    const variables = document.entries.map((e) => ({
      name: e.name,
      content: e.rawValue,
      isFString: e.isFString,
    }));
    webviewPanel.webview.postMessage({ type: 'init', variables });

    webviewPanel.webview.onDidReceiveMessage((msg: { type: string; variableName?: string; content?: string }) => {
      if (msg.type === 'edit' && msg.variableName != null && msg.content != null) {
        document.setVariableContent(msg.variableName, msg.content);
        this._onDidChangeCustomDocument.fire({ document });
      }
    });
  }

  async saveCustomDocument(
    document: PromptDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const newContent = rebuildPyFile(document.savedFileText, document.entries);
    const bytes = new TextEncoder().encode(newContent);
    await vscode.workspace.fs.writeFile(document.uri, bytes);
    document.updateSavedContent(newContent);
  }

  async revertCustomDocument(
    document: PromptDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await document.reloadFromDisk();
    const variables = document.entries.map((e) => ({
      name: e.name,
      content: e.rawValue,
      isFString: e.isFString,
    }));
    const key = document.uri.toString();
    const panels = this._webviewPanels.get(key);
    if (panels) {
      for (const panel of panels) {
        panel.webview.postMessage({ type: 'revert', variables });
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
