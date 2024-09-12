import {
  App,
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
  Plugin,
  setIcon,
} from "obsidian";
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
import { TextLine, TextLines, BlobTextLines } from "./text-lines";
import { MarkdownSection } from "./markdown-section";
import { CodemirrorTextLines } from "./codemirror-text-lines";
export type SyntaxTree = ReturnType<typeof syntaxTree>;
export type SyntaxNode = ReturnType<SyntaxTree["resolve"]>;

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
    private docLines: TextLines,
    private startPos: number,
  ) {
    super();
  }
  toDOM(view: EditorView): HTMLElement {
    const docLines = this.docLines;
    const doc = view.state.doc;
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
        const section = new MarkdownSection(
          docLines,
          doc.lineAt(this.startPos).number - 1,
        );
        await navigator.clipboard.writeText(section.text);
        debounce.lock = false;
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
    const docLines = new CodemirrorTextLines(view.state.doc);

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
                widget: new CopySectionWidget(docLines, node.from),
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

const copySectionEditorView = ViewPlugin.fromClass(
  CopySectionButtonsPlugin,
  pluginSpec,
);

function copySectionReaderView(app: App): MarkdownPostProcessor {
  let elSectionText: string;
  let elSectionTextLines: BlobTextLines;
  return async (
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): Promise<void> => {
    const elSectionInfo = ctx.getSectionInfo(el);
    if (!elSectionInfo) {
      return;
    }
    if (elSectionText !== elSectionInfo.text) {
      elSectionText = elSectionInfo.text;
      elSectionTextLines = new BlobTextLines(elSectionText);
    }
    if (!elSectionTextLines) {
      return;
    }
    const firstLine = elSectionTextLines[elSectionInfo.lineStart];
    if (!firstLine || !/^#+\s/.test(firstLine.text)) {
      return;
    }

    const headers = el.findAll("h1, h2, h3, h4, h5, h6");
    for (let header of headers) {
      const container = header.createEl("span");
      container.addClass("plugin-copy-section-buttons");
      const copyButton = mkButton("copy", "copy", container);
      const debounce = { lock: false };
      // just to make the "active" button style in reader view
      copyButton.container.on(
        "mousedown",
        "span",
        (ev: MouseEvent, delegateTarget: HTMLElement) => {
          delegateTarget.parentElement?.addClass("active");
          const rm = () => {
            delegateTarget.parentElement?.removeClass("active");
            delegateTarget.ownerDocument.off("mouseup", "*", rm);
          };
          delegateTarget.ownerDocument.on("mouseup", "*", rm);
        },
      );
      const hSectionTextLines = elSectionTextLines;
      const hSectionTextStart = elSectionInfo.lineStart;
      copyButton.container.on(
        "click",
        "span",
        async (ev: MouseEvent, delegateTarget: HTMLElement): Promise<void> => {
          if (debounce.lock) {
            return;
          }

          /*
          // Note: this method doesn't work, as it will only capture "rendered" elements
          // So instead, we need to fall back to using the source
          const sectionInfo = ctx.getSectionInfo(delegateTarget);
          const range = delegateTarget.doc.createRange();
          const section = new DOMSection(delegateTarget);
          range.setStartBefore(section.startElement);
          range.setEndAfter(section.endElement);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          document.execCommand("copy");
          selection?.removeAllRanges();
          */
          const section = new MarkdownSection(
            hSectionTextLines,
            hSectionTextStart,
          );
          await navigator.clipboard.writeText(section.text);
          debounce.lock = false;
        },
      );
    }
  };
}

export default class CopySectionPlugin extends Plugin {
  onload() {
    this.registerEditorExtension(copySectionEditorView);
    this.registerMarkdownPostProcessor(copySectionReaderView(this.app));
  }

  onunload() {
    // Any additional cleanup if needed
  }
}
