// TextLine represents a line within a large blob
// all indexes are zero-based, and "to" is exclusive (as in String.slice)
export interface TextLine {
  // from is the offset within the data this TextLine begins at
  from: number;
  // to is the offset within the data the next line begins at (or would begin at)
  to: number;
  // number is the line number (0-based) of the line
  number: number;
  // text is the full line data, including newline characters, obtained via blob.slice(from, to)
  text: string;
}

export interface TextLines extends Iterable<TextLine> {
  // Array-like access to get(index: number)
  [index: number]: TextLine | undefined;
  [Symbol.iterator](): Iterator<TextLine>;
  slice(start?: number, end?: number): TextLines;
}

// BlobTextLines attempts to allow efficient iteration over lines in a potentially very large document
// it caches the offset positions of each line, but does not duplicate the memory of the document itself
// (other than "one line at a time")
// It is returned as a Proxy to itself when initialized, allowing for array-like access.
export class BlobTextLines implements Iterable<TextLine>, TextLines {
  protected _blob: string;
  protected _offset: number;
  protected _startLine: number;
  protected _endLine?: number;
  protected _offsetCache: number[] = [0];
  protected _offsetCacheFull: boolean = false;
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
  constructor(
    protected blob: string,
    protected offset?: number,
    protected startLine?: number,
    protected endLine?: number,
  ) {
    this._blob = blob;
    this._offset = offset || 0;
    this._startLine = startLine || 0;
    this._endLine = endLine;
    return new Proxy(this, BlobTextLines._proxyHandler);
  }
  public get firstLine(): TextLine | undefined {
    return this.get(0);
  }
  public get from(): number {
    return this._offset;
  }
  public get lastLine(): TextLine | undefined {
    if (this._offsetCacheFull) {
      return this.get(this._offsetCache.length - 1);
    }
    let line: TextLine | undefined;
    for (line of this) {
    }
    return line;
  }
  public get to(): number {
    return this.lastLine?.to || this.from;
  }

  [index: number]: TextLine | undefined;
  // get retrieves a specific line from the underlying text data (if it exists)
  public get(index: number): TextLine | undefined {
    if (
      typeof this._offsetCache[index] !== "undefined" &&
      typeof this._offsetCache[index + 1] !== "undefined"
    ) {
      return this._cachedTextLine(index);
    }
    for (let line of this) {
      if (line.number === index) {
        return line;
      }
    }
    return undefined;
  }
  // _cachedTextLine is a helper to retrieve a TextLine when offsets are already in the cache
  protected _cachedTextLine(index: number): TextLine {
    if (
      typeof this._offsetCache[index] === "undefined" ||
      typeof this._offsetCache[index + 1] === "undefined"
    ) {
      throw new Error(
        `tried to read cached TextLine for uncached index ${index}`,
      );
    }
    return {
      from: this._offsetCache[index],
      to: this._offsetCache[index + 1],
      number: index,
      text: this._blob.slice(
        this._offsetCache[index],
        this._offsetCache[index + 1],
      ),
    };
  }

  public slice(start?: number, end?: number): BlobTextLines {
    const sliced = new BlobTextLines(
      this._blob,
      this._offset,
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
    sliced._offsetCache = this._offsetCache;
    sliced._offsetCacheFull = this._offsetCacheFull;
    return sliced;
  }

  // A method that returns the default iterator for an object. Called by the semantics of the for-of statement.
  // startingLine: optional 0-based line number to start iterating from
  public [Symbol.iterator](): Iterator<TextLine> {
    if (!this._blob) {
      return [].values();
    }

    const self = this;
    let i = 0;
    let offset = 0;
    const nexter = {
      next(): IteratorResult<TextLine> {
        if (offset === -1 || i === self._endLine) {
          if (offset === -1) {
            self._offsetCacheFull = true;
          }
          return { done: true, value: null };
        }
        if (
          typeof self._offsetCache[i] !== "undefined" &&
          typeof self._offsetCache[i + 1] !== "undefined"
        ) {
          i++;
          offset = self._offsetCache[i];
          return { done: false, value: self._cachedTextLine(i - 1) };
        }

        const eol = self._blob.indexOf("\n", offset);
        if (eol !== -1) {
          offset = eol + 1;
          self._offsetCache[i + 1] = offset;
          i++;
          return { done: false, value: self._cachedTextLine(i - 1) };
        }
        offset = -1;
        self._offsetCache[i + 1] = self._blob.length;
        i++;
        const lastLine = self._blob.slice(
          self._offsetCache[i - 1],
          self._offsetCache[i],
        );
        if (lastLine !== "") {
          return { done: false, value: self._cachedTextLine(i - 1) };
        }
        self._offsetCacheFull = true;
        return { done: true, value: null };
      },
    };

    // pre-iterate if we need to, in order to fill the cache up to the startLine
    while (i < this._startLine) {
      if (this._offsetCache.length > this._startLine) {
        i = this._startLine;
        offset = self._offsetCache[i];
        break;
      }
      i = this._offsetCache.length - 1;
      offset = self._offsetCache[i];
      const next = nexter.next();
      if (next.done) {
        return [].values();
      }
    }
    return nexter;
  }
}
