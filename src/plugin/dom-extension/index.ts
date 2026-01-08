import { App, MarkdownView } from "obsidian";
import { mkButton } from "../button";
import { CopySectionPlugin } from "..";
import { sectionMarkdown } from "../section";

export function copySectionRegisterDomExtension(
  app: App,
  plugin: CopySectionPlugin,
) {
  const initializeLeaf = (leaf: any) => {
    if (
      !plugin.settings.displayTitle ||
      !leaf ||
      !(leaf.view instanceof MarkdownView)
    ) {
      return;
    }

    const view = leaf.view as MarkdownView;
    let readinessCheck: NodeJS.Timeout | undefined;
    const callback = (): boolean => {
      if (!view.data) {
        return false;
      }
      if (readinessCheck) {
        clearInterval(readinessCheck);
        readinessCheck = undefined;
      }

      const title = leaf.view.containerEl.querySelector(".inline-title");
      if (!title || title.querySelector(".plugin-copy-section-buttons")) {
        return true;
      }
      const container = title.createEl("span");
      container.addClass("plugin-copy-section-buttons");
      if (plugin.settings.displayAlways) {
        container.addClass("plugin-copy-section-buttons-displayAlways");
      }
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
      copyButton.container.on(
        "click",
        "span",
        async (ev: MouseEvent, delegateTarget: HTMLElement): Promise<void> => {
          if (debounce.lock) {
            return;
          }
          try {
            debounce.lock = true;
            const currentView = app.workspace.getActiveViewOfType(MarkdownView);
            if (!currentView) {
              return;
            }
            const offset = 0;
            const sectionText = sectionMarkdown(
              plugin,
              currentView.data,
              offset,
              {
                excludeSubsections: false,
                full: true,
              },
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
      return true;
    };
    if (!callback()) {
      readinessCheck = setInterval(callback, 200);
    }
  };

  // Initialize all existing leaves when the plugin loads
  app.workspace.iterateAllLeaves((leaf) => {
    initializeLeaf(leaf);
  });

  // Listen for new tabs or tab switches
  app.workspace.on("active-leaf-change", (leaf) => {
    initializeLeaf(leaf);
  });
}
