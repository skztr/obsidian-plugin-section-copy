import {
  App,
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
} from "obsidian";
import { mkButton } from "../button";
import { CopySectionPlugin } from "..";
import { sectionMarkdown } from "../section";

export function copySectionReaderView(
  app: App,
  plugin: CopySectionPlugin,
): MarkdownPostProcessor {
  return async (
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): Promise<void> => {
    if (!plugin.settings.displayInReadingMode) {
      return;
    }

    const elSectionInfo = ctx.getSectionInfo(el);
    if (!elSectionInfo) {
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
            const offset =
              elSectionInfo.lineStart === 0
                ? 0
                : elSectionInfo.text
                    .split("\n", elSectionInfo.lineStart + 1)
                    .slice(0, elSectionInfo.lineStart)
                    .join("\n").length + 1;
            const sectionText = sectionMarkdown(
              plugin,
              elSectionInfo.text,
              offset,
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
    }
  };
}
