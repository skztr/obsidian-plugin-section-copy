import { App, MarkdownView } from "obsidian";
import { mkButton } from "../button";
import { CopySectionPlugin } from "..";
import { sectionMarkdown } from "../section";

export function copySectionRegisterDomExtension(
  app: App,
  plugin: CopySectionPlugin,
) {
  let readinessCheck: NodeJS.Timeout | undefined;
  app.workspace.on("active-leaf-change", (leaf) => {
    if (
      !plugin.settings.displayTitle ||
      !leaf ||
      !(leaf.view instanceof MarkdownView)
    ) {
      return;
    }

    const view = leaf.view as MarkdownView;
    const callback = (): boolean => {
      if (!view.data) {
        return false;
      }
      if (readinessCheck) {
        clearInterval(readinessCheck);
        readinessCheck = undefined;
      }

      const title = document.querySelector(".inline-title");
      if (!title || title.querySelector(".plugin-copy-section-buttons")) {
        return true;
      }
      const container = title.createEl("span");
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
      copyButton.container.on(
        "click",
        "span",
        async (ev: MouseEvent, delegateTarget: HTMLElement): Promise<void> => {
          if (debounce.lock) {
            return;
          }
          try {
            debounce.lock = true;
            const offset = 0;
            const sectionText = sectionMarkdown(plugin, view.data, offset, {
              excludeSubsections: false,
            });
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
      setInterval(callback, 200);
    }
  });
}
