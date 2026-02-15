import * as vscode from 'vscode';

/** In-memory document for a single .md file. */
export class MarkdownDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri;
  private _content: string;
  private _savedContent: string;
  private _disposed = false;

  static async create(uri: vscode.Uri): Promise<MarkdownDocument> {
    const data = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf-8').decode(data);
    return new MarkdownDocument(uri, text);
  }

  private constructor(uri: vscode.Uri, content: string) {
    this.uri = uri;
    this._content = content;
    this._savedContent = content;
  }

  getContent(): string {
    return this._content;
  }

  setContent(text: string): void {
    this._content = text;
  }

  /** Call after save so saved snapshot matches current content. */
  updateSavedContent(text: string): void {
    this._savedContent = text;
    this._content = text;
  }

  /** Reload from disk (for revert). */
  async reloadFromDisk(): Promise<void> {
    const data = await vscode.workspace.fs.readFile(this.uri);
    const text = new TextDecoder('utf-8').decode(data);
    this._savedContent = text;
    this._content = text;
  }

  dispose(): void {
    this._disposed = true;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }
}
