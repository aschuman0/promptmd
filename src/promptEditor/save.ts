import type { PromptEntry } from './document';

/**
 * Escapes content for use inside a Python triple-quoted string.
 * Backslashes and the quote character must be escaped.
 * For f-strings, braces are escaped: { -> {{, } -> }}.
 */
function escapeForPythonTripleQuoted(
  content: string,
  useDoubleQuote: boolean,
  isFString: boolean
): string {
  const quote = useDoubleQuote ? '"' : "'";
  let out = '';
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '\\') out += '\\\\';
    else if (c === quote) out += '\\' + quote;
    else if (isFString && c === '{') out += '{{';
    else if (isFString && c === '}') out += '}}';
    else out += c;
  }
  return out;
}

/**
 * Rebuilds the full Python file content by replacing each prompt variable's
 * value span with the new content. Replaces in reverse order by offset so
 * that indices remain valid.
 */
export function rebuildPyFile(savedFileText: string, entries: PromptEntry[]): string {
  const sorted = [...entries].sort((a, b) => b.startOffset - a.startOffset);
  let result = savedFileText;
  for (const entry of sorted) {
    const escaped = escapeForPythonTripleQuoted(entry.rawValue, true, entry.isFString);
    const literal = entry.isFString ? `f"""${escaped}"""` : `"""${escaped}"""`;
    result =
      result.slice(0, entry.startOffset) + literal + result.slice(entry.endOffset);
  }
  return result;
}
