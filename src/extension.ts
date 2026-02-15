import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './markdownEditor/provider';
import { PromptEditorProvider } from './promptEditor/provider';

const MD_PATTERN = '*.md';
const PROMPT_PY_PATTERN = '*prompt*.py';

/** Sync workbench.editorAssociations with promptmd.markdownEditorDefault and promptmd.promptEditorDefault. */
function syncEditorAssociations(): void {
  const config = vscode.workspace.getConfiguration();
  const promptmd = config.get<boolean>('promptmd.markdownEditorDefault');
  const promptPy = config.get<boolean>('promptmd.promptEditorDefault');
  const associations = config.get<Record<string, string>>('workbench.editorAssociations') ?? {};
  const next = { ...associations };
  if (promptmd === true) {
    next[MD_PATTERN] = 'promptmd.markdownEditor';
  } else {
    delete next[MD_PATTERN];
  }
  if (promptPy === true) {
    next[PROMPT_PY_PATTERN] = 'promptmd.promptEditor';
  } else {
    delete next[PROMPT_PY_PATTERN];
  }
  config.update('workbench.editorAssociations', next, vscode.ConfigurationTarget.Global);
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
