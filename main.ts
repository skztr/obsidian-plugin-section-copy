import { Plugin, setIcon } from "obsidian";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder, Text, Line } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginSpec,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
type SyntaxTree = ReturnType<typeof syntaxTree>;
type SyntaxNode = ReturnType<SyntaxTree["resolve"]>;

class Section {
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
    for (line of this.lines) {
    }
    return line?.to || this._from;
  }

  public get isSection(): boolean {
    return Section.isSection(this._doc, this._tree, this._from);
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

  public get lines(): Iterable<Line> {
    return new SectionLineIterator(this._doc, this._tree, this._from);
  }

  public get text(): string {
    return [...this.lines].map((line) => line.text).join("\n");
  }
}

class SectionLineIterator extends Section implements Iterable<Line> {
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
        if (!first && Section.isSection(doc, tree, line.from)) {
          const subsection = new Section(doc, tree, line.from);
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

interface button {
  container: HTMLElement;
  button: HTMLElement;
}

function mkButton(name: string, icon: string, addTo?: HTMLElement): button {
  const container = document.createElement("span");
  const button = document.createElement("span");

  container.addClass("plugin-copy-section-button");
  container.addClass(`plugin-copy-section-button-${name}`);
  setIcon(button, icon);
  container.appendChild(button);
  if (addTo) {
    addTo.appendChild(container);
  }
  return { container, button };
}

export class CopySectionWidget extends WidgetType {
  constructor(
    private tree: SyntaxTree,
    private headerStart: number,
  ) {
    super();
  }
  toDOM(view: EditorView): HTMLElement {
    const doc = view.state.doc;
    const tree = this.tree;
    const container = document.createElement("span");
    container.addClass("plugin-copy-section-buttons");
    const copyButton = mkButton("copy", "copy", container);

    const debounce = { lock: false };
    copyButton.container.on(
      "click",
      "*",
      async (ev: MouseEvent, delegateTarget: HTMLElement): Promise<void> => {
        if (debounce.lock) {
          return;
        }
        debounce.lock = true;
        const line = doc.lineAt(this.headerStart);
        const section = new Section(doc, tree, line.from);
        await navigator.clipboard.writeText(section.text),
          (debounce.lock = false);
      },
    );

    return container;
  }
}

class CopySectionButtonsPlugin implements PluginValue {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  destroy() {}

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const tree = syntaxTree(view.state);

    for (let { from, to } of view.visibleRanges) {
      tree.iterate({
        from,
        to,
        enter(node) {
          if (node.type.name.startsWith("header_")) {
            builder.add(
              node.to,
              node.to,
              Decoration.widget({
                side: 1,
                widget: new CopySectionWidget(tree, node.from),
              }),
            );
          }
        },
      });
    }

    return builder.finish();
  }
}

const pluginSpec: PluginSpec<CopySectionButtonsPlugin> = {
  decorations: (value: CopySectionButtonsPlugin) => value.decorations,
};

export const copySectionButtonsPlugin = ViewPlugin.fromClass(
  CopySectionButtonsPlugin,
  pluginSpec,
);

export default class CopySectionPlugin extends Plugin {
  onload() {
    this.registerEditorExtension(copySectionButtonsPlugin);
  }

  onunload() {
    // Any additional cleanup if needed
  }
}
