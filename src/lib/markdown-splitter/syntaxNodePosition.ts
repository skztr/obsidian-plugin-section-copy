import { Pos } from "obsidian";
import { Position } from "unist";

/**
 * SyntaxNodePosition translates between unist-style Positions and obsidian-style Pos
 *
 * - Obsidian Pos/Loc: Line and Col are counted from 0
 * - unist Position/Point: Line and Col are counted from 1
 *
 * This class mostly exists to aid debugging when comparing different parsers
 */
export class SyntaxNodePosition {
  private constructor(private position: Pos) {}
  private static countNewlines(text: string, from: number, to: number): number {
    return text.slice(from, to).split("\n").length - 1;
  }
  private static obsidianCol(text: string, offset: number): number {
    const lastNewlineIndex = text.lastIndexOf("\n", offset);
    if (lastNewlineIndex === -1) {
      return offset;
    }
    // 0 1 2 3  0 1 2
    // F O O \n B A R
    if (offset === lastNewlineIndex) {
      const prevNewlineIndex = text.lastIndexOf("\n", lastNewlineIndex - 1);
      if (prevNewlineIndex === -1) {
        return offset;
      }
      if (offset === prevNewlineIndex + 1) {
        return 0;
      }
      return offset - (prevNewlineIndex + 1);
    }

    if (offset === lastNewlineIndex + 1) {
      return 0;
    }
    return offset - (lastNewlineIndex + 1);
  }
  public static fromOffsets(
    text: string,
    from?: number,
    to?: number,
  ): SyntaxNodePosition {
    from = from === undefined ? 0 : from;
    to = to === undefined ? text.length : to;
    const startLine = SyntaxNodePosition.countNewlines(text, 0, from);
    return new SyntaxNodePosition({
      start: {
        col: SyntaxNodePosition.obsidianCol(text, from),
        line: startLine,
        offset: from,
      },
      end: {
        col: SyntaxNodePosition.obsidianCol(text, to),
        line: startLine + SyntaxNodePosition.countNewlines(text, from, to),
        offset: to,
      },
    });
  }
  public static gap(
    text: string,
    from?: SyntaxNodePosition,
    to?: SyntaxNodePosition,
  ) {
    return SyntaxNodePosition.fromOffsets(
      text,
      from ? from.position.end.offset : undefined,
      to ? to.position.start.offset : undefined,
    );
  }
  public static fromUnistPosition(position: Position): SyntaxNodePosition {
    if (
      position.start.offset === undefined ||
      position.end.offset === undefined
    ) {
      throw new Error(
        "SyntaxNodePosition requires unist positions to have an offset",
      );
    }
    return new SyntaxNodePosition({
      start: {
        col: position.start.column - 1,
        line: position.start.line - 1,
        offset: position.start.offset,
      },
      end: {
        col: position.end.column - 1,
        line: position.end.line - 1,
        offset: position.end.offset,
      },
    });
  }
  public static fromObsidianPos(position: Pos): SyntaxNodePosition {
    return new SyntaxNodePosition(position);
  }
  public get from(): number {
    return this.position.start.offset;
  }
  public get to(): number {
    return this.position.end.offset;
  }
  public get unistPosition(): Position {
    return {
      start: {
        column: this.position.start.col + 1,
        line: this.position.start.line + 1,
        offset: this.position.start.offset,
      },
      end: {
        column: this.position.end.col + 1,
        line: this.position.end.line + 1,
        offset: this.position.end.offset,
      },
    };
  }
  public get obsidianPos(): Pos {
    return this.position;
  }

  public sliceAbsolute(
    text: string,
    from?: number,
    to?: number,
    uncapped?: boolean,
  ): SyntaxNodePosition {
    from =
      from === undefined
        ? this.position.start.offset
        : uncapped
          ? from
          : Math.min(
              Math.max(this.position.start.offset, from),
              this.position.end.offset,
            );
    to =
      to === undefined
        ? this.position.end.offset
        : uncapped
          ? to
          : Math.max(
              Math.min(this.position.end.offset, to),
              this.position.start.offset,
            );

    return SyntaxNodePosition.fromOffsets(text, from, to);
  }

  public sliceRelative(
    text: string,
    from?: number,
    to?: number,
    uncapped?: boolean,
  ): SyntaxNodePosition {
    from = from === undefined ? undefined : this.position.start.offset + from;
    to = to === undefined ? undefined : this.position.start.offset + to;
    return this.sliceAbsolute(text, from, to, uncapped);
  }
}
