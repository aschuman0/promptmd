import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './markdownEditor/provider';
import { PromptEditorProvider } from './promptEditor/provider';

/** Registers custom editors for *prompt*.py and .md files. */
export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('promptmd.promptEditor', new PromptEditorProvider(context)),
    vscode.window.registerCustomEditorProvider('promptmd.markdownEditor', new MarkdownEditorProvider(context))
  );
}

export function deactivate(): void {}
