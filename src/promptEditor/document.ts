import * as vscode from 'vscode';
import { parsePromptVariables } from './parser';

/**
 * Mutable prompt entry: same as parser's PromptVariable but rawValue can be updated by the editor.
 */
export interface PromptEntry {
  name: string;
  rawValue: string;
  isFString: boolean;
  startOffset: number;
  endOffset: number;
}

export class PromptDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri;
  readonly entries: PromptEntry[];
  private _disposed = false;

  static async create(uri: vscode.Uri): Promise<PromptDocument> {
    const data = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf-8').decode(data);
    const parsed = parsePromptVariables(text);
    const entries: PromptEntry[] = parsed.map((p) => ({
      name: p.name,
      rawValue: p.rawValue,
      isFString: p.isFString,
      startOffset: p.startOffset,
      endOffset: p.endOffset,
    }));
    return new PromptDocument(uri, text, entries);
  }

  private constructor(
    uri: vscode.Uri,
    private _savedFileText: string,
    entries: PromptEntry[]
  ) {
    this.uri = uri;
    this.entries = entries;
  }

  get savedFileText(): string {
    return this._savedFileText;
  }

  setVariableContent(name: string, content: string): void {
    const entry = this.entries.find((e) => e.name === name);
    if (entry) entry.rawValue = content;
  }

  getVariableContent(name: string): string | undefined {
    return this.entries.find((e) => e.name === name)?.rawValue;
  }

  /** Update saved text and re-parse (call after save so offsets stay correct). */
  updateSavedContent(newFileText: string): void {
    const parsed = parsePromptVariables(newFileText);
    this._savedFileText = newFileText;
    this.entries.length = 0;
    for (const p of parsed) {
      this.entries.push({
        name: p.name,
        rawValue: p.rawValue,
        isFString: p.isFString,
        startOffset: p.startOffset,
        endOffset: p.endOffset,
      });
    }
  }

  /** Reload from disk and re-parse (for revert). */
  async reloadFromDisk(): Promise<void> {
    const data = await vscode.workspace.fs.readFile(this.uri);
    const text = new TextDecoder('utf-8').decode(data);
    const parsed = parsePromptVariables(text);
    this._savedFileText = text;
    this.entries.length = 0;
    for (const p of parsed) {
      this.entries.push({
        name: p.name,
        rawValue: p.rawValue,
        isFString: p.isFString,
        startOffset: p.startOffset,
        endOffset: p.endOffset,
      });
    }
  }

  dispose(): void {
    this._disposed = true;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }
}
