import * as vscode from 'vscode';
import { parsePromptVariables, type PromptVariable } from './parser';

/**
 * Mutable prompt entry: same as parser's PromptVariable but rawValue can be updated by the editor.
 * nameStart/nameEnd are undefined for newly added (not-yet-saved) entries.
 * deleted is true when user chose to delete; entry stays until save so rebuildPyFile can remove its span.
 */
export interface PromptEntry {
  name: string;
  rawValue: string;
  isFString: boolean;
  nameStart?: number;
  nameEnd?: number;
  startOffset: number;
  endOffset: number;
  deleted?: boolean;
}

function parsedToEntries(parsed: PromptVariable[]): PromptEntry[] {
  return parsed.map((p) => ({
    name: p.name,
    rawValue: p.rawValue,
    isFString: p.isFString,
    nameStart: p.nameStart,
    nameEnd: p.nameEnd,
    startOffset: p.startOffset,
    endOffset: p.endOffset,
  }));
}

/** Filter parsed variables by promptmd.promptVariablePattern (regex on variable name). */
function filterByVariablePattern(parsed: PromptVariable[]): PromptVariable[] {
  const pattern = vscode.workspace.getConfiguration('promptmd').get<string>('promptVariablePattern') ?? '.*';
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch {
    re = /.*/;
  }
  return parsed.filter((p) => re.test(p.name));
}

export class PromptDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri;
  readonly entries: PromptEntry[];
  private _disposed = false;

  static async create(uri: vscode.Uri): Promise<PromptDocument> {
    const data = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf-8').decode(data);
    const parsed = parsePromptVariables(text);
    const filtered = filterByVariablePattern(parsed);
    const entries = parsedToEntries(filtered);
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

  /** Add a new prompt variable (not yet saved; startOffset/endOffset are -1). */
  addEntry(name: string): void {
    this.entries.push({
      name,
      rawValue: '',
      isFString: false,
      startOffset: -1,
      endOffset: -1,
    });
  }

  /** Rename an existing variable. */
  renameEntry(oldName: string, newName: string): boolean {
    const entry = this.entries.find((e) => e.name === oldName);
    if (!entry) return false;
    entry.name = newName;
    return true;
  }

  /** Mark an entry as deleted (removed from file on next save). */
  deleteEntry(name: string): boolean {
    const entry = this.entries.find((e) => e.name === name);
    if (!entry) return false;
    entry.deleted = true;
    return true;
  }

  /** Update saved text and re-parse (call after save so offsets stay correct). */
  updateSavedContent(newFileText: string): void {
    this._savedFileText = newFileText;
    this.entries.length = 0;
    const parsed = parsePromptVariables(newFileText);
    const filtered = filterByVariablePattern(parsed);
    this.entries.push(...parsedToEntries(filtered));
  }

  /** Reload from disk and re-parse (for revert). */
  async reloadFromDisk(): Promise<void> {
    const data = await vscode.workspace.fs.readFile(this.uri);
    const text = new TextDecoder('utf-8').decode(data);
    this._savedFileText = text;
    this.entries.length = 0;
    const parsed = parsePromptVariables(text);
    const filtered = filterByVariablePattern(parsed);
    this.entries.push(...parsedToEntries(filtered));
  }

  dispose(): void {
    this._disposed = true;
  }

  get isDisposed(): boolean {
    return this._disposed;
  }
}
