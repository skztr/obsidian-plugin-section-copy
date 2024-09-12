import { Section } from "../section";
import { TextLine, TextLines } from "../text-lines";

// Markdown section implements a very bare-bones markdown parser with the goal of turning an iterable of TextLines
// into an iterable of TextLines that are specifically related to a specific "section" of Markdown (based on headers)
// ie: A header of a certain level defines the beginning of a "Section" which continues until the beginning of another
//     header of the same (or lesser) level.
export class MarkdownSection implements Iterable<TextLine>, Section {
  constructor(
    protected _lines: TextLines,
    protected _firstLineNumber: number = 0,
  ) {
    if (typeof this.firstLine === "undefined") {
      throw new Error("invalid TextLines or starting point");
    }
    if (this.level === 0) {
      throw new Error("not the beginning of a headed Markdown Section");
    }
  }
  public get firstLine(): TextLine {
    return this._lines.get(this._firstLineNumber) as TextLine;
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
    const nexter = this._lines[Symbol.iterator](this._firstLineNumber);
    const level = this.level;
    let first = true;
    let codeBlock: string = "";
    return {
      next(): IteratorResult<TextLine> {
        const next = nexter.next();
        if (next.done) {
          return next;
        }
        if (codeBlock != "") {
          if (next.value.text.startsWith(codeBlock)) {
            codeBlock = "";
          }
          return next;
        }
        const codeBlockMatch = next.value.text.match(/^(```+)/);
        if (codeBlockMatch) {
          codeBlock = codeBlockMatch[1];
          return next;
        }
        if (first) {
          first = false;
        } else {
          const hMatch = next.value.text.match(/^(#+)\s/);
          if (hMatch) {
            const sublevel = hMatch[1].length;
            if (sublevel <= level) {
              return { done: true, value: null };
            }
          }
        }
        return next;
      },
    };
  }
}
