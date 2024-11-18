import { CachedMetadata } from "obsidian";
import { CachedMetadataSlice } from "../lib/obsidian/cachedMedataSlice";
import { CopySectionPlugin } from ".";
import { SectionCopySettings } from "./settings";
import { textTweaker } from "./util/textTweaker";
import { StringSlicer, SliceStringer, sliceText } from "../lib/text";

export function sectionMarkdown(
  plugin: CopySectionPlugin,
  doc: StringSlicer | SliceStringer,
  offset: number,
  settingOverrides?: Partial<SectionCopySettings>,
): string {
  const settings: SectionCopySettings = Object.assign(
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
  if (!firstHeading) {
    throw new Error(
      "Specified section does not contain a Heading (none are cached)",
    );
  }
  const nextHeading = [...metadataSlice.getHeadings()]
    .slice(1)
    .find((h) => settings.excludeSubsections || h.level <= firstHeading.level);

  const sectionSlice = metadataSlice.sliceAbsolute(
    !settings.includeSectionHeading && firstHeading
      ? firstHeading.position.end.offset
      : undefined,
    nextHeading ? nextHeading.position.start.offset : undefined,
  );

  return textTweaker(
    sliceText(doc, sectionSlice.from, sectionSlice.to),
    settings,
  );
}
