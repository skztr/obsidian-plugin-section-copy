import { Text } from "@codemirror/state";
import { TextLine, TextLines } from "../text-lines";

export class CodemirrorTextLines implements TextLines {
  protected _doc: Text;
  protected _startLine: number;
  protected _endLine: number | undefined;
  protected static _proxyHandler = {
    get: (obj: any, prop: any) => {
      if (prop in obj) {
        return obj[prop];
      }
      const propn = typeof prop === "number" ? prop : parseInt(prop, 10);
      if (typeof prop !== "number" && propn.toString(10) !== prop) {
        return undefined;
      }
      if ("get" in obj && typeof obj["get"] === "function") {
        return obj.get(propn);
      }
      return undefined;
    },
  };
  constructor(doc: Text, startLine?: number, endLine?: number) {
    this._doc = doc;
    this._startLine = startLine || 0;
    this._endLine = endLine;
    return new Proxy(this, CodemirrorTextLines._proxyHandler);
  }

  [index: number]: TextLine | undefined;
  // get retrieves a specific line from the underlying text data (if it exists)
  public get(index: number): TextLine | undefined {
    const endIndex =
      this._endLine === undefined
        ? this._doc.lines - 1
        : Math.min(this._endLine, this._doc.lines - 1);

    if ((this._startLine && index < this._startLine) || index > endIndex) {
      return undefined;
    }

    const line = this._doc.line(index + 1);

    return {
      from: line.from,
      to: line.to + 1,
      number: index,
      text: this._doc.sliceString(line.from, line.to + 1),
    };
  }
  public slice(start?: number, end?: number): CodemirrorTextLines {
    const sliced = new CodemirrorTextLines(
      this._doc,
      this._startLine + (start || 0),
      end === undefined && this._endLine === undefined
        ? undefined
        : end === undefined && this._endLine !== undefined
          ? this._endLine
          : end !== undefined && this._endLine === undefined
            ? end + this._startLine
            : Math.min(
                (end as number) + this._startLine,
                this._endLine as number,
              ),
    );
    return sliced;
  }

  // A method that returns the default iterator for an object. Called by the semantics of the for-of statement.
  // startingLine: optional 0-based line number to start iterating from
  public [Symbol.iterator](): Iterator<TextLine> {
    let i = this._startLine;
    const self = this;
    return {
      next(): IteratorResult<TextLine> {
        const value = self.get(i);
        if (value === undefined) {
          return { done: true, value: null };
        }
        i++;
        return { done: false, value: value };
      },
    };
  }
}
