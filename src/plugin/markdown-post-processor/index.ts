import {
  App,
  MarkdownPostProcessor,
  MarkdownPostProcessorContext,
} from "obsidian";
import { BlobTextLines } from "../../lib/text-lines";
import { MarkdownSection } from "../../lib/markdown-section";
import { DEFAULT_SETTINGS } from "../settings";
import { mkButton } from "../button";
import { CopySectionPlugin } from "..";

export function copySectionReaderView(
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
