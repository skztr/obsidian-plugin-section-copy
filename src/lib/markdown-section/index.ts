import { Section } from "../section";
import { TextLine, TextLines } from "../text-lines";

interface MarkdownSectionOptions {
  stripComments?: boolean;
  stripTags?: boolean;
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
    let first = true;
    let codeBlock: string = "";
    let commentMarkers: number = 0;
    return {
      next(): IteratorResult<TextLine> {
        while (true) {
          const next = nexter.next();
          if (next.done) {
            return next;
          }
          if (codeBlock != "") {
            // FIXME: edge-case: Indentation seems to be handled inconsistently.
            //        Obsidian will consider something to be a code block only at certain indent levels.
            //        The closing indent also doesn't really need to match exactly (though we check exactly, here)
            if (next.value.text.startsWith(codeBlock)) {
              codeBlock = "";
            }
            return next;
          }
          if (commentMarkers % 2 == 0) {
            // only check for codeblocks if we're not in a comment
            const codeBlockMatch = next.value.text.match(/^( *```+)/);
            if (codeBlockMatch) {
              codeBlock = codeBlockMatch[1];
              return next;
            }
          }
          if (first) {
            first = false;
          } else if (commentMarkers % 2 == 0) {
            // only check for headers if we're not in a comment
            const hMatch = next.value.text.match(/^(#+)\s/);
            if (hMatch) {
              const sublevel = hMatch[1].length;
              if (sublevel <= level) {
                return { done: true, value: null };
              }
            }
          }

          // FIXME: do not strip tags from inline code (approaching the point of wanting a real parser)
          //        we'll also not want to strip tag-like things from URLs, some HTML might have tags, etc
          //        might make sense to do all this "stripping out" after forcing the section to be parsed
          //        into a real syntax tree with a real parser.
          const commentSplit = next.value.text.split("%%");
          let withoutExtras: string;
          if (commentMarkers % 2 === 0) {
            withoutExtras = commentSplit
              .map((v: string, index: number) =>
                options.stripTags && index % 2 === 0 ? stripTags(v) : v,
              )
              .filter((_, index: number) =>
                options.stripComments ? index % 2 === 0 : true,
              )
              .join(options.stripComments ? "" : "%%");
            commentMarkers = (commentMarkers + (commentSplit.length - 1)) % 2;
          } else {
            withoutExtras = commentSplit
              .map((v: string, index: number) =>
                options.stripTags && index % 2 === 1 ? stripTags(v) : v,
              )
              .filter((_, index: number) =>
                options.stripComments ? index % 2 === 1 : true,
              )
              .join(options.stripComments ? "" : "%%");
            commentMarkers = (commentMarkers + (commentSplit.length - 1)) % 2;
          }
          if (withoutExtras !== next.value.text) {
            if (withoutExtras == "") {
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

function stripTags(str: string): string {
  const orig = str;
  const re = /(^|\W+)#[\w]+(\W+|$)/g;
  let next = str;
  do {
    str = next;
    next = str.replace(re, "$1$2");
  } while (next !== str);
  return str;
}
