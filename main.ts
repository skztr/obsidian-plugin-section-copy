import { Plugin, setIcon } from "obsidian";
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
  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement("span");
    container.addClass("plugin-copy-section-buttons");
    const copyButton = mkButton("copy", "clipboard-copy", container);

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

    for (let { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          if (node.type.name.startsWith("header_")) {
            builder.add(
              node.to,
              node.to,
              Decoration.widget({
                side: 1,
                widget: new CopySectionWidget(),
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
