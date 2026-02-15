import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './markdownEditor/provider';
import { PromptEditorProvider } from './promptEditor/provider';

const MD_PATTERN = '*.md';
const PROMPT_PY_PATTERN = '*prompt*.py';

const MD_VIEW_TYPE = 'promptmd.markdownEditor';
const PROMPT_VIEW_TYPE = 'promptmd.promptEditor';

/** Sync workbench.editorAssociations with promptmd.markdownEditorDefault and promptmd.promptEditorDefault. */
function syncEditorAssociations(): void {
  const config = vscode.workspace.getConfiguration();
  const markdownDefault = config.get<boolean>('promptmd.markdownEditorDefault') === true;
  const promptDefault = config.get<boolean>('promptmd.promptEditorDefault') === true;
  const associations = config.get<Record<string, string>>('workbench.editorAssociations') ?? {};
  const next = { ...associations };
  if (markdownDefault) {
    next[MD_PATTERN] = MD_VIEW_TYPE;
  } else {
    delete next[MD_PATTERN];
  }
  if (promptDefault) {
    next[PROMPT_PY_PATTERN] = PROMPT_VIEW_TYPE;
  } else {
    delete next[PROMPT_PY_PATTERN];
  }
  const changed =
    (associations[MD_PATTERN] ?? null) !== (next[MD_PATTERN] ?? null) ||
    (associations[PROMPT_PY_PATTERN] ?? null) !== (next[PROMPT_PY_PATTERN] ?? null);
  if (changed) {
    config.update('workbench.editorAssociations', next, vscode.ConfigurationTarget.Global);
  }
}

/** Registers custom editors for *prompt*.py and .md files. */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('promptmd.promptEditor', new PromptEditorProvider(context)),
    vscode.window.registerCustomEditorProvider('promptmd.markdownEditor', new MarkdownEditorProvider(context))
  );
  syncEditorAssociations();
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('promptmd')) syncEditorAssociations();
    })
  );
}

export function deactivate(): void {}
