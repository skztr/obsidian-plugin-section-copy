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
import { TextLines } from "../../lib/text-lines";
import { MarkdownSection } from "../../lib/markdown-section";
import { CodemirrorTextLines } from "../../lib/codemirror-text-lines";
import { DEFAULT_SETTINGS } from "../settings";
import { mkButton } from "../button";
import { pluginField } from "..";

class CopySectionWidget extends WidgetType {
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

export const copySectionEditorView = ViewPlugin.fromClass(
  CopySectionButtonsPlugin,
  pluginSpec,
);
