import {
  App,
  Command,
  MarkdownView,
  CachedMetadata,
  HeadingCache,
} from "obsidian";
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

export function copySectionCopyCurrentCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-current",
    name: "Copy current section (as per settings)",
    callback: () => {
      const activeView: MarkdownView | null =
        app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeView) {
        return;
      }

      const editor = activeView.editor;
      const cursorOffset = editor.posToOffset(editor.getCursor());

      const file = activeView.file;
      if (!file) {
        return;
      }

      const fileCache: CachedMetadata | null =
        app.metadataCache.getFileCache(file);
      if (!fileCache?.headings) {
        return;
      }

      // Find the heading at or before the cursor position
      let targetHeading: HeadingCache | undefined;
      for (const heading of fileCache.headings) {
        if (heading.position.start.offset <= cursorOffset) {
          targetHeading = heading;
        } else {
          break;
        }
      }

      const displayLevels = plugin.displayLevels();
      const cursorInDisplayedHeading =
        targetHeading &&
        displayLevels.includes(targetHeading.level as 1 | 2 | 3 | 4 | 5 | 6);

      // If we found a heading, check if it would have a copy button
      // If not, walk up to parent headings until we find one that would
      if (targetHeading) {
        // Find the closest parent heading that has a copy button
        while (
          targetHeading &&
          !displayLevels.includes(targetHeading.level as 1 | 2 | 3 | 4 | 5 | 6)
        ) {
          // Find the parent heading (previous heading with lower level)
          let parentHeading: HeadingCache | undefined;
          for (const heading of fileCache.headings) {
            if (
              heading.position.start.offset >=
              targetHeading.position.start.offset
            ) {
              break;
            }
            if (heading.level < targetHeading.level) {
              parentHeading = heading;
            }
          }
          targetHeading = parentHeading;
        }
      }

      // If we still don't have a valid heading, use the whole file
      const offset = targetHeading ? targetHeading.position.start.offset : 0;
      const full = !targetHeading;

      const sectionText = sectionMarkdown(plugin, activeView.data, offset, {
        excludeSubsections: cursorInDisplayedHeading
          ? plugin.settings.excludeSubsections
          : false,
        full: full,
      });
      navigator.clipboard.writeText(sectionText);
    },
  };
}
