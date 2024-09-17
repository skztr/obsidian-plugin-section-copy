import { Pos } from "obsidian";
import { Literal, Node, Parent } from "unist";
import { SyntaxNodePosition } from "./syntaxNodePosition";

export enum SyntaxNodeType {
  Comment = "comment",
  Gap = "gap",
  Literal = "literal",
  Tag = "tag",
  Text = "text",
}

/**
 * SimpleSpan is a simplified version of the SyntaxNode
 */
export interface SimpleSpan<T extends SyntaxNodeType = SyntaxNodeType> {
  type: T;
  position: Pos;
}

export class SyntaxNode {
  private typeOverride: SyntaxNodeType | undefined;
  private nodePosition: SyntaxNodePosition;
  constructor(
    private doc: string,
    private node: Node,
    private parent?: SyntaxNode,
    private index?: number,
  ) {
    if (!this.node.position) {
      throw new Error(
        "assertion failure: all parsed Nodes are expected to have a position",
      );
    }
    this.nodePosition = SyntaxNodePosition.fromUnistPosition(
      this.node.position,
    );
  }
  public static createGap(
    prev: SyntaxNode | undefined,
    next?: SyntaxNode | undefined,
  ): SyntaxNode {
    if (!prev && !next) {
      throw new Error("can't gap between nothing and nothing");
    }
    const doc = prev?.doc || (next?.doc as string);
    const position = SyntaxNodePosition.gap(
      doc,
      prev?.position,
      next?.position,
    );
    const node: Literal = {
      type: "gap",
      position: position.unistPosition,
      value: doc.slice(position.from, position.to),
    };
    return new SyntaxNode(doc, node);
  }
  private static isParent(node: Node): node is Parent {
    return "children" in node && (node as Parent).children.length > 0;
  }
  public extendTo(offset: number): SyntaxNode {
    const extended = new SyntaxNode(
      this.doc,
      this.node,
      this.parent,
      this.index,
    );
    if (this.typeOverride !== undefined) {
      extended.type = this.typeOverride;
    }
    extended.nodePosition = this.nodePosition.sliceAbsolute(
      this.doc,
      this.position.from,
      offset,
      true,
    );
    return extended;
  }
  public slice(from?: number, to?: number): SyntaxNode {
    const sliced = new SyntaxNode(this.doc, this.node, this.parent, this.index);
    if (this.typeOverride !== undefined) {
      sliced.type = this.typeOverride;
    }
    sliced.nodePosition = this.nodePosition.sliceRelative(this.doc, from, to);
    return sliced;
  }
  public get simpleSpan(): SimpleSpan {
    return {
      type: this.type,
      position: this.position.obsidianPos,
    };
  }
  public get firstChild(): SyntaxNode | undefined {
    return SyntaxNode.isParent(this.node)
      ? new SyntaxNode(this.doc, this.node.children[0], this, 0)
      : undefined;
  }
  public get children(): SyntaxNode[] {
    return SyntaxNode.isParent(this.node)
      ? this.node.children.map(
          (node, i) => new SyntaxNode(this.doc, node, this, i),
        )
      : [];
  }
  public get siblings(): SyntaxNode[] {
    if (!this.parent || this.index === undefined) {
      return [];
    }
    return this.parent.children;
  }
  public get nextSibling(): SyntaxNode | undefined {
    if (!this.parent || this.index === undefined) {
      return undefined;
    }
    return this.parent.children[this.index + 1];
  }
  public get type(): SyntaxNodeType {
    if (this.typeOverride !== undefined) {
      return this.typeOverride;
    }

    if (this.node.type === "html") {
      if (
        this.doc.slice(this.position.from, this.position.from + 4) === "<!--"
      ) {
        return SyntaxNodeType.Comment;
      }
      return SyntaxNodeType.Literal;
    }
    const mapped: { [nodeType: string]: SyntaxNodeType } = {
      code: SyntaxNodeType.Literal,
      comment: SyntaxNodeType.Comment,
      gap: SyntaxNodeType.Text,
      inlineCode: SyntaxNodeType.Literal,
      tag: SyntaxNodeType.Tag,
      text: SyntaxNodeType.Text,
    };
    if (this.node.type in mapped) {
      return mapped[this.node.type];
    }
    return this.node.type as SyntaxNodeType;
  }
  public set type(type: SyntaxNodeType) {
    this.typeOverride = type;
  }

  /**
   * position returns an SyntaxNodePosition, which can be converted into a obsidian-style Pos or a unist Position
   */
  public get position(): SyntaxNodePosition {
    return this.nodePosition;
  }

  public toString(): string {
    return this.doc.slice(this.position.from, this.position.to);
  }
}
