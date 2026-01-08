import { MarkdownView } from "obsidian";

export enum ViewMode {
  SourceMode = "source",
  LivePreview = "livePreview",
  ReadingMode = "reading",
}

/**
 * Detects the current view mode from a MarkdownView
 * @param view The MarkdownView to check
 * @returns The current ViewMode
 */
export function detectViewMode(view: MarkdownView): ViewMode {
  const viewMode = view.getMode();

  if (viewMode === "preview") {
    return ViewMode.ReadingMode;
  }

  // Both source mode and live preview report as 'source'
  // Check for the is-live-preview class to distinguish them
  const markdownSourceView = view.containerEl.querySelector(
    ".markdown-source-view",
  );
  const isLivePreview =
    markdownSourceView?.classList.contains("is-live-preview") ?? false;

  return isLivePreview ? ViewMode.LivePreview : ViewMode.SourceMode;
}
