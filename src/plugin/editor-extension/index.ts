import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
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
import { mkButton } from "../button";
import { pluginField } from "..";
import { sectionMarkdown } from "../section";
import { ViewMode } from "../util/viewMode";

class CopySectionWidget extends WidgetType {
  constructor(private startPos: number) {
    super();
  }
  toDOM(view: EditorView): HTMLElement {
    const plugin = view.state.field(pluginField);
    const doc = view.state.doc;
    const container = document.createElement("span");
    container.addClass("plugin-copy-section-buttons");
    if (plugin?.settings.displayAlways) {
      container.addClass("plugin-copy-section-buttons-displayAlways");
    }
    const copyButton = mkButton("copy", "copy", container);

    const debounce = { lock: false };
    copyButton.container.on(
      "click",
      "*",
      async (ev: MouseEvent, delegateTarget: HTMLElement): Promise<void> => {
        if (debounce.lock) {
          return;
        }
        try {
          debounce.lock = true;
          const plugin = view.state.field(pluginField);
          if (!plugin) {
            return;
          }
          const sectionText = sectionMarkdown(
            plugin,
            doc,
            doc.lineAt(this.startPos).from,
          );
          await navigator.clipboard.writeText(sectionText);
        } catch (e) {
          // ignore it, probably nothing, right?
          // throw e;
        } finally {
          debounce.lock = false;
        }
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
    const plugin = view.state.field(pluginField);

    if (!plugin) {
      return builder.finish();
    }

    // Check if we're in live preview by looking for the markdown-source-view container
    // Live preview has the is-live-preview class, source mode doesn't
    const markdownSourceView = view.dom.closest(".markdown-source-view");
    const isLivePreview =
      markdownSourceView?.classList.contains("is-live-preview") ?? false;
    const viewMode = isLivePreview ? ViewMode.LivePreview : ViewMode.SourceMode;

    if (
      (viewMode === ViewMode.LivePreview &&
        !plugin.settings.displayInLivePreview) ||
      (viewMode === ViewMode.SourceMode && !plugin.settings.displayInSourceMode)
    ) {
      return builder.finish();
    }

    const displayHeaders =
      plugin
        ?.displayLevels()
        .map((l) => `HyperMD-header_HyperMD-header-${l}`) || [];

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
                widget: new CopySectionWidget(node.from),
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
