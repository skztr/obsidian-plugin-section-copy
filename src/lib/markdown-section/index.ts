import { Section } from "../section";
import { TextLine, TextLines } from "../text-lines";
import { TestStringIsTag } from "../obsidian";

interface MarkdownSectionOptions {
  stripComments?: boolean;
  stripModifiedEmpty?: boolean;
  stripTagLines?: boolean;
}

// Markdown section implements a very bare-bones markdown parser with the goal of turning an iterable of TextLines
// into an iterable of TextLines that are specifically related to a specific "section" of Markdown (based on headers)
// ie: A header of a certain level defines the beginning of a "Section" which continues until the beginning of another
//     header of the same (or lesser) level.
export class MarkdownSection implements Iterable<TextLine>, Section {
  constructor(
    protected _lines: TextLines,
    protected _firstLineNumber: number = 0,
    protected _options: MarkdownSectionOptions = {},
  ) {
    if (typeof this.firstLine === "undefined") {
      throw new Error("invalid TextLines or starting point");
    }
    if (this.level === 0) {
      throw new Error("not the beginning of a headed Markdown Section");
    }
  }
  public get firstLine(): TextLine {
    return this._lines[this._firstLineNumber] as TextLine;
  }
  public get level(): number {
    const match = this.firstLine.text.match(/^(#+)\s/);
    if (!match) {
      return 0;
    }
    return match[1].length;
  }
  public get lastLine(): TextLine {
    return [...this].last() as TextLine;
  }
  public get text(): string {
    return [...this].map((line) => line.text).join("");
  }

  public [Symbol.iterator](): Iterator<TextLine> {
    const nexter = this._lines.slice(this._firstLineNumber)[Symbol.iterator]();
    const level = this.level;
    const options = this._options;
    let first: boolean = true;
    let firstLine: string;
    let eol: string;
    let codeBlock: string = "";
    let commentMarkers: number = 0;
    return {
      next(): IteratorResult<TextLine> {
        while (true) {
          const next = nexter.next();
          if (next.done) {
            return next;
          }
          if (first) {
            first = false;
            firstLine = next.value.text;
            const eolMatch = firstLine.match(/(\r\n|\r|\n)$/);
            eol = eolMatch ? eolMatch[1] : "";
          } else {
            if (codeBlock != "") {
              // FIXME: edge-case: Indentation seems to be handled inconsistently.
              //        Obsidian will consider something to be a code block only at certain indent levels.
              //        The closing indent also doesn't really need to match exactly (though we check exactly, here)
              if (next.value.text.startsWith(codeBlock)) {
                codeBlock = "";
              }
              first = false;
              return next;
            }
            if (commentMarkers % 2 == 0) {
              // we don't need to check for code blocks on the first line, because that is always a section header
              // only check for codeblocks if we're not in a comment
              const codeBlockMatch = next.value.text.match(/^( *```+)/);
              if (codeBlockMatch) {
                codeBlock = codeBlockMatch[1];
                first = false;
                return next;
              }

              // only check for headers if we're not in a comment
              const hMatch = next.value.text.match(/^(#+)\s/);
              if (hMatch) {
                const sublevel = hMatch[1].length;
                if (sublevel <= level) {
                  return { done: true, value: null };
                }
              }
            }
          }

          const commentSplit = next.value.text.split("%%");
          let withoutExtras: string;
          let modified: boolean = false;
          if (commentMarkers % 2 === 0) {
            // the line does not begin within a comment, so the first comment marker begins a comment
            withoutExtras = commentSplit
              .filter((_, index: number) =>
                options.stripComments ? index % 2 === 0 : true,
              )
              .join(options.stripComments ? "" : "%%");
            commentMarkers = (commentMarkers + (commentSplit.length - 1)) % 2;
            if (commentSplit.length > 1 && options.stripComments) {
              modified = true;
            }
            if (commentMarkers % 2 === 1 && options.stripComments) {
              withoutExtras += eol;
            }

            if (
              options.stripTagLines &&
              withoutExtras
                .split(/\s+/)
                .filter((v) => v.length && !TestStringIsTag(v)).length === 0
            ) {
              modified = true;
              withoutExtras = eol;
            }
          } else {
            // the line begins within a comment, so the first comment marker ends a comment
            withoutExtras = commentSplit
              .filter((_, index: number) =>
                options.stripComments ? index % 2 === 1 : true,
              )
              .join(options.stripComments ? "" : "%%");
            commentMarkers = (commentMarkers + (commentSplit.length - 1)) % 2;
            if (commentSplit.length === 1 && options.stripComments) {
              modified = true; // "modified" even if the line was empty, if it was a comment
            }
            if (commentMarkers % 2 === 1 && options.stripComments) {
              withoutExtras += eol;
            }
          }
          if (modified || withoutExtras !== next.value.text) {
            if (options.stripModifiedEmpty && withoutExtras.trim() === "") {
              // skip this line entirely
              continue;
            }
            next.value.text = withoutExtras;
          }
          return next;
        }
      },
    };
  }
}
