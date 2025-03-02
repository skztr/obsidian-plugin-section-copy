import { App, Command, MarkdownView } from "obsidian";
import { CopySectionPlugin } from "..";
import { sectionMarkdown } from "../section";

export function copySectionCopyCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy",
    name: "Copy file contents (as per settings)",
    callback: () => {
      const activeView: MarkdownView | null =
        app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        const sectionText = sectionMarkdown(plugin, activeView.data, 0, {
          excludeSubsections: false,
          full: true,
        });
        navigator.clipboard.writeText(sectionText);
      }
    },
  };
}

export function copySectionCopyRawCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-raw",
    name: "Copy file contents (raw)",
    callback: () => {
      const activeView: MarkdownView | null =
        app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        navigator.clipboard.writeText(activeView.data);
      }
    },
  };
}
