import * as vscode from 'vscode';
import { getWebviewContent } from '../promptEditor/getWebviewContent';
import { MarkdownDocument } from './document';

/** Custom editor provider for .md files. Single-document view, same rich editor, no tabs or variable UI. */
export class MarkdownEditorProvider implements vscode.CustomEditorProvider<MarkdownDocument> {
  private readonly _context: vscode.ExtensionContext;
  private readonly _onDidChangeCustomDocument = new vscode.EventEmitter<
    vscode.CustomDocumentContentChangeEvent<MarkdownDocument>
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
  ): Promise<MarkdownDocument> {
    return MarkdownDocument.create(uri);
  }

  resolveCustomEditor(
    document: MarkdownDocument,
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
    webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, scriptUri, { mode: 'markdown' });

    webviewPanel.webview.postMessage({
      type: 'init',
      mode: 'markdown',
      content: document.getContent(),
      validPlaceholderNames: [],
    });

    webviewPanel.webview.onDidReceiveMessage(
      async (msg: { type: string; content?: string }) => {
        if (msg.type === 'reopenInEditor') {
          await vscode.commands.executeCommand('workbench.action.reopenWithEditor');
          return;
        }
        if (msg.type === 'webviewReady') {
          webviewPanel.webview.postMessage({
            type: 'init',
            mode: 'markdown',
            content: document.getContent(),
            validPlaceholderNames: [],
          });
          return;
        }
        if (msg.type === 'edit' && msg.content != null) {
          document.setContent(msg.content);
          this._onDidChangeCustomDocument.fire({ document });
        }
      }
    );
  }

  async saveCustomDocument(
    document: MarkdownDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const content = document.getContent();
    const bytes = new TextEncoder().encode(content);
    await vscode.workspace.fs.writeFile(document.uri, bytes);
    document.updateSavedContent(content);
    const panels = this._webviewPanels.get(document.uri.toString());
    if (panels) {
      for (const panel of panels) {
        panel.webview.postMessage({ type: 'variablesUpdated', mode: 'markdown', content, validPlaceholderNames: [] });
      }
    }
  }

  async revertCustomDocument(
    document: MarkdownDocument,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    await document.reloadFromDisk();
    const panels = this._webviewPanels.get(document.uri.toString());
    if (panels) {
      const content = document.getContent();
      for (const panel of panels) {
        panel.webview.postMessage({ type: 'revert', mode: 'markdown', content });
      }
    }
  }

  backupCustomDocument(
    _document: MarkdownDocument,
    _context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken
  ): Promise<vscode.CustomDocumentBackup> {
    return Promise.resolve({ id: '', delete: () => {} });
  }

  async saveCustomDocumentAs(
    document: MarkdownDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken
  ): Promise<void> {
    const bytes = new TextEncoder().encode(document.getContent());
    await vscode.workspace.fs.writeFile(destination, bytes);
  }
}
