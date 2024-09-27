import { Node, Parent } from "unist";
import { Pos } from "obsidian";
import { SyntaxNode, SyntaxNodeType } from "./syntaxNode";
import { SyntaxNodePosition } from "./syntaxNodePosition";
import { syntaxParserRunning } from "@codemirror/language";

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

  it("Throws an error when there is no specified position in the node", () => {
    const node: Node = { type: "literal" };
    expect(() => {
      new SyntaxNode("", node);
    }).toThrow(/all parsed Nodes are expected to have a position/);
  });

  it("Returns an empty children array when there are no children", () => {
    const node: Node = {
      type: "literal",
      position: {
        start: { column: 1, line: 1, offset: 0 },
        end: { column: 1, line: 1, offset: 0 },
      },
    };
    const syntaxNode = new SyntaxNode("", node);
    expect(syntaxNode.children).toEqual([]);
  });

  it("Returns an empty siblings array when there is no parent", () => {
    const node: Node = {
      type: "literal",
      position: {
        start: { column: 1, line: 1, offset: 0 },
        end: { column: 1, line: 1, offset: 0 },
      },
    };
    const syntaxNode = new SyntaxNode("", node);
    expect(syntaxNode.siblings).toEqual([]);
  });

  it("Returns the parent's children when there is a parent", () => {
    const node: Node = {
      type: "literal",
      position: {
        start: { column: 1, line: 1, offset: 0 },
        end: { column: 6, line: 1, offset: 5 },
      },
    };
    const parent: Parent = {
      type: "literalParent",
      position: {
        start: { column: 1, line: 1, offset: 0 },
        end: { column: 11, line: 1, offset: 10 },
      },
      children: [
        node,
        {
          type: "literalChildA",
          position: {
            start: { column: 6, line: 1, offset: 5 },
            end: { column: 7, line: 1, offset: 6 },
          },
        },
        {
          type: "literalChildB",
          position: {
            start: { column: 7, line: 1, offset: 6 },
            end: { column: 11, line: 1, offset: 10 },
          },
        },
      ],
    };

    const parentNode = new SyntaxNode("", parent);
    const syntaxNode = new SyntaxNode("", node, parentNode, 0);
    expect(syntaxNode.siblings.map((n) => n.simpleSpan)).toEqual(
      parentNode.children.map((n) => n.simpleSpan),
    );
  });

  describe("createGap", () => {
    it("Throws an error when trying to gap with no parameters", () => {
      expect(() => {
        SyntaxNode.createGap(undefined);
      }).toThrow(/can't gap between nothing and nothing/);
    });

    it("fills a gap between two nodes", () => {
      const nodeA: Node = {
        type: "literal",
        position: {
          start: { column: 1, line: 1, offset: 0 },
          end: { column: 6, line: 1, offset: 5 },
        },
      };
      const nodeB: Node = {
        type: "literal",
        position: {
          start: { column: 11, line: 1, offset: 10 },
          end: { column: 16, line: 1, offset: 15 },
        },
      };
      const doc = "123456789012345";
      const a = new SyntaxNode(doc, nodeA);
      const b = new SyntaxNode(doc, nodeB);

      // both nodes
      expect(SyntaxNode.createGap(a, b).simpleSpan).toEqual({
        type: SyntaxNodeType.Text,
        position: {
          start: a.position.obsidianPos.end,
          end: b.position.obsidianPos.start,
        },
      });

      // no start
      expect(SyntaxNode.createGap(undefined, b).simpleSpan).toEqual({
        type: SyntaxNodeType.Text,
        position: {
          start: a.position.obsidianPos.start,
          end: b.position.obsidianPos.start,
        },
      });

      // no end
      expect(SyntaxNode.createGap(a, undefined).simpleSpan).toEqual({
        type: SyntaxNodeType.Text,
        position: {
          start: a.position.obsidianPos.end,
          end: b.position.obsidianPos.end,
        },
      });
    });
  });
});
