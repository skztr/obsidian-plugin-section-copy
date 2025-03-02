import { CachedMetadata } from "obsidian";
import { CachedMetadataSlice } from "../lib/obsidian/cachedMedataSlice";
import { CopySectionPlugin } from ".";
import { SectionCopySettings } from "./settings";
import { textTweaker } from "./util/textTweaker";
import { StringSlicer, SliceStringer, sliceText } from "../lib/text";

export type SectionMarkdownSettings = Partial<SectionCopySettings> & {
  full?: boolean;
};
export function sectionMarkdown(
  plugin: CopySectionPlugin,
  doc: StringSlicer | SliceStringer,
  offset: number,
  settingOverrides?: SectionMarkdownSettings,
): string {
  const settings: SectionMarkdownSettings = Object.assign(
    {},
    plugin.settings,
    settingOverrides || {},
  );
  const file = plugin.app.workspace.activeEditor?.file;
  if (!file) {
    throw new Error("No active editor file");
  }
  const fileCache: CachedMetadata | null =
    plugin.app.metadataCache.getFileCache(file);
  if (!fileCache?.headings || !fileCache?.sections) {
    throw new Error("fileCache not ready");
  }

  const metadataSlice = new CachedMetadataSlice(fileCache, offset);
  const firstHeading = metadataSlice.getHeadingRelative(0);
  if (!firstHeading && !settings.full) {
    throw new Error(
      "Specified section does not contain a Heading (none are cached)",
    );
  }
  const nextHeading =
    firstHeading && !settings.full
      ? [...metadataSlice.getHeadings()]
          .slice(1)
          .find(
            (h) => settings.excludeSubsections || h.level <= firstHeading.level,
          )
      : undefined;

  const sectionSlice = metadataSlice.sliceAbsolute(
    !settings.full && !settings.includeSectionHeading && firstHeading
      ? firstHeading.position.end.offset
      : undefined,
    nextHeading ? nextHeading.position.start.offset : undefined,
  );

  return textTweaker(
    sliceText(doc, sectionSlice.from, sectionSlice.to),
    settings,
  );
}
