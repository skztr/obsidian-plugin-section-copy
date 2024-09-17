import { Node } from "unist";
import { Pos } from "obsidian";
import { SyntaxNode } from "./syntaxNode";
import { SyntaxNodePosition } from "./syntaxNodePosition";

function spanPosition(
  from: number,
  to: number,
  endLine?: number,
  endColumn?: number,
): SyntaxNodePosition {
  return {} as SyntaxNodePosition;
}

describe("SyntaxNode", () => {
  it("Should slice a SyntaxNode into a subset of the original", () => {
    const doc = "<a><b><c>";
    const originalNode: Node = {
      type: "literal",
      position: {
        start: {
          column: 1,
          line: 1,
          offset: 0,
        },
        end: {
          column: doc.length + 1,
          line: 1,
          offset: doc.length,
        },
      },
    };
    const original = new SyntaxNode(doc, originalNode);
    expect(original.position).toEqual(SyntaxNodePosition.fromOffsets(doc, 0));
    expect(original.toString()).toEqual(doc);
    expect(original.slice(3).toString()).toEqual(doc.slice(3));
    expect(original.slice(3, 6).toString()).toEqual(doc.slice(3, 6));
    expect(original.position).toEqual(
      SyntaxNodePosition.fromOffsets(doc, 0, 9),
    );
    expect(original.slice(3).position).toEqual(
      SyntaxNodePosition.fromOffsets(doc, 3, 9),
    );
    expect(original.slice(3, 6).position).toEqual(
      SyntaxNodePosition.fromOffsets(doc, 3, 6),
    );
  });

  it("Should handle newlines when slicing", () => {
    const doc = "<a>\n<b>\n<c>";
    const originalNode: Node = {
      type: "literal",
      position: {
        start: {
          column: 1,
          line: 1,
          offset: 0,
        },
        end: {
          column: 4,
          line: 3,
          offset: doc.length,
        },
      },
    };
    const original = new SyntaxNode(doc, originalNode);
    expect(original.toString()).toEqual(doc);
    expect(original.position).toEqual(SyntaxNodePosition.fromOffsets(doc));
    expect(original.slice(4).position).toEqual(
      SyntaxNodePosition.fromOffsets(doc, 4),
    );
    expect(original.slice(3, 6).position).toEqual(
      SyntaxNodePosition.fromOffsets(doc, 3, 6),
    );
  });
});
