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

interface CopyCurrentSectionOptions {
  walkToDisplayed: boolean;
  excludeSubsections: "settings" | boolean;
}

function copyCurrentSection(
  app: App,
  plugin: CopySectionPlugin,
  options: CopyCurrentSectionOptions,
): void {
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

  const fileCache: CachedMetadata | null = app.metadataCache.getFileCache(file);
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

  // Track if the cursor started in a heading that has a copy button
  const displayLevels = plugin.displayLevels();
  const cursorInDisplayedHeading =
    targetHeading &&
    displayLevels.includes(targetHeading.level as 1 | 2 | 3 | 4 | 5 | 6);

  // If walkToDisplayed is true, walk up to find a heading with a copy button
  if (options.walkToDisplayed && targetHeading) {
    // Find the closest parent heading that has a copy button
    while (
      targetHeading &&
      !displayLevels.includes(targetHeading.level as 1 | 2 | 3 | 4 | 5 | 6)
    ) {
      // Find the parent heading (previous heading with lower level)
      let parentHeading: HeadingCache | undefined;
      for (const heading of fileCache.headings) {
        if (
          heading.position.start.offset >= targetHeading.position.start.offset
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

  // Determine whether to exclude subsections
  let shouldExcludeSubsections: boolean;
  if (options.excludeSubsections === "settings") {
    // Only exclude subsections if the cursor started in a heading with a copy button
    // If we had to walk up to a parent, include subsections so we get the section the cursor was in
    shouldExcludeSubsections = cursorInDisplayedHeading
      ? plugin.settings.excludeSubsections
      : false;
  } else {
    shouldExcludeSubsections = options.excludeSubsections;
  }

  const sectionText = sectionMarkdown(plugin, activeView.data, offset, {
    excludeSubsections: shouldExcludeSubsections,
    full: full,
  });
  navigator.clipboard.writeText(sectionText);
}

export function copySectionCopyCurrentExactWithSubsectionsCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-current-exact-with-subsections",
    name: "Copy current section (exact, with subsections)",
    callback: () =>
      copyCurrentSection(app, plugin, {
        walkToDisplayed: false,
        excludeSubsections: false,
      }),
  };
}

export function copySectionCopyCurrentExactWithoutSubsectionsCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-current-exact-without-subsections",
    name: "Copy current section (exact, without subsections)",
    callback: () =>
      copyCurrentSection(app, plugin, {
        walkToDisplayed: false,
        excludeSubsections: true,
      }),
  };
}

export function copySectionCopyCurrentWithSubsectionsCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-current-with-subsections",
    name: "Copy current section (with subsections)",
    callback: () =>
      copyCurrentSection(app, plugin, {
        walkToDisplayed: true,
        excludeSubsections: false,
      }),
  };
}

export function copySectionCopyCurrentWithoutSubsectionsCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-current-without-subsections",
    name: "Copy current section (without subsections)",
    callback: () =>
      copyCurrentSection(app, plugin, {
        walkToDisplayed: true,
        excludeSubsections: true,
      }),
  };
}

export function copySectionCopyCurrentCommand(
  app: App,
  plugin: CopySectionPlugin,
): Command {
  return {
    id: "copy-section-copy-current",
    name: "Copy current section (as per settings)",
    callback: () =>
      copyCurrentSection(app, plugin, {
        walkToDisplayed: true,
        excludeSubsections: "settings",
      }),
  };
}
