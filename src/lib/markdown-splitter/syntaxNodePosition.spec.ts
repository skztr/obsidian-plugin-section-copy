import { Position } from "unist";
import { Pos } from "obsidian";
import { SyntaxNodePosition } from "./syntaxNodePosition";

describe("SyntaxNodePosition", () => {
  it("Should translate Obsidian Pos to Unist Position", () => {
    const obsidianPos: Pos = {
      start: {
        col: 0,
        line: 0,
        offset: 0,
      },
      end: {
        col: 10,
        line: 2,
        offset: 20,
      },
    };
    const position = SyntaxNodePosition.fromObsidianPos(obsidianPos);
    expect(position.obsidianPos).toEqual(obsidianPos);
    expect(position.unistPosition).toEqual({
      start: {
        column: 1,
        line: 1,
        offset: 0,
      },
      end: {
        column: 11,
        line: 3,
        offset: 20,
      },
    });
  });

  it("Should translate Unist Position to Obsidian Pos", () => {
    const unistPosition: Position = {
      start: {
        column: 1,
        line: 1,
        offset: 0,
      },
      end: {
        column: 10,
        line: 2,
        offset: 20,
      },
    };
    const position = SyntaxNodePosition.fromUnistPosition(unistPosition);
    expect(position.unistPosition).toEqual(unistPosition);
    expect(position.obsidianPos).toEqual({
      start: {
        col: 0,
        line: 0,
        offset: 0,
      },
      end: {
        col: 9,
        line: 1,
        offset: 20,
      },
    });
  });

  it("Should throw an error if a unist position is given without an offset", () => {
    const unistPosition: Position = {
      start: {
        column: 1,
        line: 1,
      },
      end: {
        column: 10,
        line: 2,
      },
    };
    expect(() => {
      SyntaxNodePosition.fromUnistPosition(unistPosition);
    }).toThrow(/SyntaxNodePosition requires unist positions to have an offset/);
  });

  describe("fromOffsets", () => {
    it("Should translate a text and offset to a sane position with lines/columns - basic", () => {
      const simple = SyntaxNodePosition.fromOffsets("abc", 0, 3);
      expect(simple.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 0,
          offset: 0,
        },
        end: {
          col: 3,
          line: 0,
          offset: 3,
        },
      });
    });

    it("Should translate a text and offset to a sane position with lines/columns - two lines", () => {
      const simple = SyntaxNodePosition.fromOffsets("abc\ndef", 0, 7);
      expect(simple.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 0,
          offset: 0,
        },
        end: {
          col: 3,
          line: 1,
          offset: 7,
        },
      });
    });

    it("Should translate a text and offset to a sane position with lines/columns - partial three lines", () => {
      const simple = SyntaxNodePosition.fromOffsets("abc\ndef\nghi", 4, 11);
      expect(simple.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 1,
          offset: 4,
        },
        end: {
          col: 3,
          line: 2,
          offset: 11,
        },
      });
    });

    it("Should translate a text and offset to a sane position with lines/columns - mid of three lines", () => {
      const simple = SyntaxNodePosition.fromOffsets("abc\ndef\nghi", 5, 6);
      expect(simple.obsidianPos).toEqual({
        start: {
          col: 1,
          line: 1,
          offset: 5,
        },
        end: {
          col: 2,
          line: 1,
          offset: 6,
        },
      });
    });

    it("Should translate a text and offset to a sane position with lines/columns - default to beginning", () => {
      const simple = SyntaxNodePosition.fromOffsets(
        "abc\ndef\nghi",
        undefined,
        6,
      );
      expect(simple.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 0,
          offset: 0,
        },
        end: {
          col: 2,
          line: 1,
          offset: 6,
        },
      });
    });

    it("Should translate a text and offset to a sane position with lines/columns - default to end", () => {
      const simple = SyntaxNodePosition.fromOffsets("abc\ndef\nghi", 1);
      expect(simple.obsidianPos).toEqual({
        start: {
          col: 1,
          line: 0,
          offset: 1,
        },
        end: {
          col: 3,
          line: 2,
          offset: 11,
        },
      });
    });
  });

  describe("slice", () => {
    it("Should slice a longer position to a smaller one", () => {
      const text = "abc\ndef\nghi";
      const original = SyntaxNodePosition.fromOffsets(text, 0, 11);
      const sliced = original.sliceRelative(text, 4, 8);
      expect(sliced.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 1,
          offset: 4,
        },
        end: {
          col: 0,
          line: 2,
          offset: 8,
        },
      });
    });

    it("Should default to the beginning of the position when there is no first argument to slice", () => {
      const text = "abc\ndef\nghi";
      const original = SyntaxNodePosition.fromOffsets(text, 0, 11);
      const sliced = original.sliceRelative(text, undefined, 8);
      expect(sliced.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 0,
          offset: 0,
        },
        end: {
          col: 0,
          line: 2,
          offset: 8,
        },
      });
    });

    it("Should default to the end of the position when there is no last argument to slice", () => {
      const text = "abc\ndef\nghi";
      const original = SyntaxNodePosition.fromOffsets(text, 0, 11);
      const sliced = original.sliceRelative(text, 4);
      expect(sliced.obsidianPos).toEqual({
        start: {
          col: 0,
          line: 1,
          offset: 4,
        },
        end: {
          col: 3,
          line: 2,
          offset: 11,
        },
      });
    });

    it("Should should limit slices to the beginning/end of the original position", () => {
      const text = "abc\ndef\nghi";
      const original = SyntaxNodePosition.fromOffsets(text, 4, 8);
      // from before beginning and to after end
      expect(original.sliceAbsolute(text, 3, 9).obsidianPos).toEqual({
        start: {
          col: 0,
          line: 1,
          offset: 4,
        },
        end: {
          col: 0,
          line: 2,
          offset: 8,
        },
      });

      // from after end
      expect(original.sliceAbsolute(text, 9).obsidianPos).toEqual({
        start: {
          col: 0,
          line: 2,
          offset: 8,
        },
        end: {
          col: 0,
          line: 2,
          offset: 8,
        },
      });
    });

    it("Should should optionally NOT limit slices to the beginning/end of the original position", () => {
      const text = "abc\ndef\nghi";
      const original = SyntaxNodePosition.fromOffsets(text, 4, 8);
      const sliced = original.sliceAbsolute(text, 3, 9, true);
      expect(sliced.obsidianPos).toEqual({
        start: {
          col: 3,
          line: 0,
          offset: 3,
        },
        end: {
          col: 1,
          line: 2,
          offset: 9,
        },
      });
    });
  });

  it("Should count columns around newlines correctly", () => {
    const text = "abc\ndef\nghi";
    const obsidianPos: Pos = {
      start: {
        col: 0,
        line: 0,
        offset: 0,
      },
      end: {
        col: 3,
        line: 1,
        offset: 11,
      },
    };
    const position = SyntaxNodePosition.fromObsidianPos(obsidianPos);
    expect(position.sliceRelative(text, 0).obsidianPos.start.col).toEqual(0); // a
    expect(position.sliceRelative(text, 1).obsidianPos.start.col).toEqual(1); // b
    expect(position.sliceRelative(text, 2).obsidianPos.start.col).toEqual(2); // c
    expect(position.sliceRelative(text, 3).obsidianPos.start.col).toEqual(3); // \n
    expect(position.sliceRelative(text, 4).obsidianPos.start.col).toEqual(0); // d
    expect(position.sliceRelative(text, 5).obsidianPos.start.col).toEqual(1); // e
    expect(position.sliceRelative(text, 6).obsidianPos.start.col).toEqual(2); // f
    expect(position.sliceRelative(text, 7).obsidianPos.start.col).toEqual(3); // \n
    expect(position.sliceRelative(text, 8).obsidianPos.start.col).toEqual(0); // g
    expect(position.sliceRelative(text, 9).obsidianPos.start.col).toEqual(1); // h
    expect(position.sliceRelative(text, 10).obsidianPos.start.col).toEqual(2); // i
    expect(position.sliceRelative(text, 11).obsidianPos.start.col).toEqual(3); // END
  });
});
