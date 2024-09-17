/**
 * unindent removes leading indentation from a string.
 * It looks for the indentation level by searching for the first non-blank line, and grabbing the whitespace from that.
 * It then removes that amount of whitespace from all subsequent lines.
 *
 * This is intended to make tests easier to read.
 */
export function unindent(text: string): string {
  if (text[0] === "\n") {
    text = text.slice(1);

    const lastLineIndex = text.lastIndexOf("\n");
    if (lastLineIndex !== -1) {
      // last line is only whitespace, remove it
      if (text.slice(lastLineIndex + 1).trimEnd().length === 0) {
        text = text.slice(0, lastLineIndex + 1);
      }
    }
  }

  const indent = text.match(/^\s+/)?.[0];
  if (indent === undefined) {
    return text;
  }
  const replaceRegex = new RegExp(`^\\s{1,${indent.length}}`);
  return text
    .split("\n")
    .map((line) => line.replace(replaceRegex, ""))
    .join("\n");
}
