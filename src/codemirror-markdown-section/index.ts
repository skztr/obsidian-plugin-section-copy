import { syntaxTree } from "@codemirror/language";
import { Text, Line } from "@codemirror/state";
import { Section } from "../section";
export type SyntaxTree = ReturnType<typeof syntaxTree>;
export type SyntaxNode = ReturnType<SyntaxTree["resolve"]>;

export class CodemirrorMarkdownSection implements Iterable<Line>, Section {
  constructor(
    protected _doc: Text,
    protected _tree: SyntaxTree,
    protected _from: number,
  ) {}

  public static isSection(doc: Text, tree: SyntaxTree, from: number): boolean {
    const line: Line = doc.lineAt(from);
    const node: SyntaxNode = tree.resolve(line.from, 1);
    return node?.type?.name !== "hmd-codeblock" && /^#+\s+/.test(line.text);
  }
  public get from(): number {
    return this._from;
  }
  public get to(): number {
    let line: Line | undefined;
    for (line of this) {
    }
    return line?.to || this._from;
  }

  public get isSection(): boolean {
    return CodemirrorMarkdownSection.isSection(
      this._doc,
      this._tree,
      this._from,
    );
  }

  public get firstNode(): SyntaxNode {
    return this._tree.resolve(this._from, 1);
  }

  public get firstLine(): Line {
    return this._doc.lineAt(this._from);
  }

  public get level(): number {
    if (!this.isSection) {
      return 0;
    }
    return this.firstLine.text.match(/^(#+)[\s]/)?.[1].length || 0;
  }

  public get text(): string {
    return [...this].map((line) => line.text).join("\n");
  }

  public [Symbol.iterator](): Iterator<Line> {
    const doc: Text = this._doc;
    const tree: SyntaxTree = this._tree;
    const sectionLevel = this.level;
    let line: Line | undefined = this.firstLine;
    let first = true;

    if (!line) {
      return [].values();
    }

    return {
      next(): IteratorResult<Line> {
        if (!line) {
          return { done: true, value: null };
        }
        if (
          !first &&
          CodemirrorMarkdownSection.isSection(doc, tree, line.from)
        ) {
          const subsection = new CodemirrorMarkdownSection(
            doc,
            tree,
            line.from,
          );
          if (subsection.level <= sectionLevel) {
            return { done: true, value: null };
          }
        }
        first = false;

        const prev = line as Line;
        line = doc.length > prev.to ? doc.lineAt(prev.to + 1) : undefined;
        return { done: false, value: prev };
      },
    };
  }
}
