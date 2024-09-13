import {
  App,
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
  Plugin,
  setIcon,
} from "obsidian";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder, StateField, Text, Line } from "@codemirror/state";
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
import {
  SettingTab,
  SectionCopySettings,
  DEFAULT_SETTINGS,
} from "./plugin/settings";
import { TextLine, TextLines, BlobTextLines } from "./lib/text-lines";
import { MarkdownSection } from "./lib/markdown-section";
import { CodemirrorTextLines } from "./lib/codemirror-text-lines";
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
        const plugin = view.state.field(pluginField);
        const section = new MarkdownSection(
          docLines,
          doc.lineAt(this.startPos).number - 1,
          {
            ...DEFAULT_SETTINGS,
            ...(plugin ? plugin.settings : {}),
          },
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
    const plugin = view.state.field(pluginField);
    const displayHeaders =
      plugin?.displayLevels().map((l) => `header_header-${l}`) || [];

    for (let { from, to } of view.visibleRanges) {
      tree.iterate({
        from,
        to,
        enter(node) {
          if (displayHeaders.contains(node.type.name)) {
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

function copySectionReaderView(
  app: App,
  plugin: CopySectionPlugin,
): MarkdownPostProcessor {
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

    const headers = el.findAll(
      plugin
        .displayLevels()
        .map((l) => `h${l}`)
        .join(", "),
    );
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
            {
              ...DEFAULT_SETTINGS,
              ...(plugin ? plugin.settings : {}),
            },
          );
          await navigator.clipboard.writeText(section.text);
          debounce.lock = false;
        },
      );
    }
  };
}

export class CopySectionPlugin extends Plugin {
  settings: SectionCopySettings;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.registerEditorExtension([
      pluginField.init(() => this),
      copySectionEditorView,
    ]);
    this.registerMarkdownPostProcessor(copySectionReaderView(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  displayLevels(): (1 | 2 | 3 | 4 | 5 | 6)[] {
    const displayLevels: (1 | 2 | 3 | 4 | 5 | 6)[] = [];
    for (let level of [1, 2, 3, 4, 5, 6] as (1 | 2 | 3 | 4 | 5 | 6)[]) {
      if (this.settings[`displayH${level}`]) {
        displayLevels.push(level);
      }
    }
    return displayLevels;
  }
}
export const pluginField = StateField.define<CopySectionPlugin | null>({
  create() {
    return null;
  },
  update(state) {
    return state;
  },
});
export default CopySectionPlugin;
