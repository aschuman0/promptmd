/**
 * Parses a Python file and returns all top-level assignments whose value
 * is a triple-quoted string ("""...""" or '''...''') or f-string (f"""...""").
 * Only module-level assignments are considered (no indented blocks).
 */

export interface PromptVariable {
  /** Variable name (e.g. SYSTEM_PROMPT) */
  name: string;
  /** Raw string content (without quotes) */
  rawValue: string;
  /** True if assignment was f"""...""" or f'''...''' */
  isFString: boolean;
  /** Start offset in file (start of the opening quote) */
  startOffset: number;
  /** End offset in file (after closing quote) */
  endOffset: number;
}

const TRIPLE_DQ = '"""';
const TRIPLE_SQ = "'''";

export function parsePromptVariables(source: string): PromptVariable[] {
  const results: PromptVariable[] = [];
  let i = 0;
  const len = source.length;

  function skipWhitespace(): void {
    while (i < len && /[\t \r\n]/.test(source[i])) i++;
  }

  function skipComment(): void {
    if (source[i] === '#') {
      while (i < len && source[i] !== '\n') i++;
    }
  }

  function isIdentifierStart(ch: string): boolean {
    return /[a-zA-Z_]/.test(ch);
  }
  function isIdentifierPart(ch: string): boolean {
    return /[a-zA-Z0-9_]/.test(ch);
  }

  function readIdentifier(): string | null {
    if (!isIdentifierStart(source[i])) return null;
    const start = i;
    i++;
    while (i < len && isIdentifierPart(source[i])) i++;
    return source.slice(start, i);
  }

  /** Skip until we're at module level (column 0, no leading indent) or end of file. */
  function ensureModuleLevel(): void {
    while (i < len) {
      if (source[i] === '\n' || source[i] === '\r') {
        i++;
        continue;
      }
      if (source[i] === ' ' || source[i] === '\t') {
        const nextNewline = source.indexOf('\n', i);
        i = nextNewline === -1 ? len : nextNewline + 1;
        continue;
      }
      if (source[i] === '#') {
        skipComment();
        continue;
      }
      break;
    }
  }

  while (i < len) {
    ensureModuleLevel();
    if (i >= len) break;

    const lineStart = i;
    const name = readIdentifier();
    if (name === null) {
      i = lineStart;
      const nextNewline = source.indexOf('\n', i);
      i = nextNewline === -1 ? len : nextNewline + 1;
      continue;
    }

    skipWhitespace();
    if (source[i] !== '=') {
      const nextNewline = source.indexOf('\n', i);
      i = nextNewline === -1 ? len : nextNewline + 1;
      continue;
    }
    i++;

    skipWhitespace();

    const literalStart = i;
    const isFString = source.slice(i, i + 2) === 'f"' || source.slice(i, i + 2) === "f'";
    if (isFString) i++;

    const isDouble = source[i] === '"';
    const triple = isDouble ? TRIPLE_DQ : TRIPLE_SQ;
    if (source.slice(i, i + 3) !== triple) {
      const nextNewline = source.indexOf('\n', i);
      i = nextNewline === -1 ? len : nextNewline + 1;
      continue;
    }

    const valueStart = i + 3;
    i = valueStart;
    const closeTriple = triple;
    let content = '';

    while (i < len) {
      const rest = source.slice(i);
      const closeIdx = rest.indexOf(closeTriple);
      if (closeIdx === -1) {
        content += rest;
        i = len;
        break;
      }
      content += rest.slice(0, closeIdx);
      i += closeIdx + 3;
      break;
    }

    const rawValue = isFString ? content.replace(/\{\{/g, '{').replace(/\}\}/g, '}') : content;
    results.push({
      name,
      rawValue,
      isFString,
      startOffset: literalStart,
      endOffset: i,
    });
  }

  return results;
}
