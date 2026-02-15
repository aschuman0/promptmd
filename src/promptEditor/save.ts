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

interface Replacement {
  start: number;
  end: number;
  text: string;
}

/**
 * Rebuilds the full Python file content: replaces name and value spans for
 * existing entries, appends new entries (startOffset < 0), removes deleted entries.
 */
export function rebuildPyFile(savedFileText: string, entries: PromptEntry[]): string {
  const replacements: Replacement[] = [];

  for (const entry of entries) {
    if (entry.deleted) {
      if (
        entry.nameStart != null &&
        entry.startOffset >= 0 &&
        entry.endOffset >= 0
      ) {
        replacements.push({ start: entry.nameStart, end: entry.endOffset, text: '' });
      }
      continue;
    }
    if (entry.nameStart != null && entry.nameEnd != null && entry.nameStart >= 0) {
      replacements.push({ start: entry.nameStart, end: entry.nameEnd, text: entry.name });
    }
    if (entry.startOffset >= 0 && entry.endOffset >= 0) {
      const escaped = escapeForPythonTripleQuoted(entry.rawValue, true, entry.isFString);
      const literal = entry.isFString ? `f"""${escaped}"""` : `"""${escaped}"""`;
      replacements.push({ start: entry.startOffset, end: entry.endOffset, text: literal });
    }
  }

  // Apply replacements from end to start so earlier indices remain valid.
  replacements.sort((a, b) => b.start - a.start);
  let result = savedFileText;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.text + result.slice(r.end);
  }

  // Collapse 3+ newlines to 2 for tidiness after deletions. Match LF, CR, or CRLF so CRLF files are handled.
  result = result.replace(/(\r?\n){3,}/g, (match) => {
    const single = match.startsWith('\r') ? '\r\n' : '\n';
    return single + single;
  });

  const newEntries = entries.filter((e) => e.startOffset < 0 && !e.deleted);
  for (const entry of newEntries) {
    const escaped = escapeForPythonTripleQuoted(entry.rawValue, true, entry.isFString);
    const literal = entry.isFString ? `f"""${escaped}"""` : `"""${escaped}"""`;
    const block = `\n\n${entry.name} = ${literal}\n`;
    result = result.trimEnd() + block;
  }

  return result;
}
