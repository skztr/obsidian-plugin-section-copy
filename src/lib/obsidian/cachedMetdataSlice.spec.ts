import { CachedMetadata, HeadingCache, SectionCache } from "obsidian";
import { SyntaxNodePosition } from "../markdown-splitter/syntaxNodePosition";
import { CachedMetadataSlice } from "./cachedMedataSlice";

interface testSection {
  level?: number;
  text: string;
}

function mkCachedMetadata(
  testSections: (testSection | string)[],
): CachedMetadata {
  const headings: HeadingCache[] = [];
  const sections: SectionCache[] = [];

  let text: string = "";
  // using SyntaxNodePosition for its utility functions
  for (const sectionOrString of testSections) {
    const section =
      typeof sectionOrString !== "string"
        ? sectionOrString
        : { text: sectionOrString };

    const prevLength = text.length;
    text += section.text + "\n";
    const newLength = text.length;
    const position = SyntaxNodePosition.fromOffsets(
      text,
      prevLength,
      newLength,
    );

    sections.push({
      type: section.level === undefined ? "text" : "header",
      position: position.obsidianPos,
    });

    if (section.level !== undefined) {
      headings.push({
        heading: section.text,
        level: section.level,
        position: position.obsidianPos,
      });
    }
  }

  return {
    headings: headings,
    sections: sections,
  };
}

describe("CachedMetadataSlice", () => {
  const BASIC_METADATA: (testSection | string)[] = [
    { level: 1, text: "# Heading 1" },
    "heading 1 line 1",
    "heading 1 line 2",
    { level: 2, text: "## Heading 1 Subheading 1" },
    "heading 1 subheading 1 line 1",
    "heading 1 subheading 1 line 2",
    { level: 1, text: "# Heading 2" },
    "heading 2 line 1",
    "heading 2 line 2",
  ];
  const BASIC_METADATA_CACHE: CachedMetadata = mkCachedMetadata(BASIC_METADATA);
  const BASIC_METADATA_TEXT = BASIC_METADATA.map((s) =>
    typeof s === "string" ? s : s.text,
  ).join("\n");

  it("derives the final offset from the sections array when no end is specified", () => {
    const slice = new CachedMetadataSlice(BASIC_METADATA_CACHE, 0);
    const sections = BASIC_METADATA_CACHE.sections as SectionCache[];
    expect(slice.sliceRelative().to).toEqual(
      sections[sections.length - 1].position.end.offset,
    );
  });

  it("considers the final offset to be the start when no sections are defined", () => {
    const slice = new CachedMetadataSlice(
      { ...BASIC_METADATA_CACHE, sections: undefined },
      5,
    );
    expect(slice.sliceRelative().to).toEqual(5);
  });

  describe("slice", () => {
    it("should return the original range when no from/to parameters are given", () => {
      const slice = new CachedMetadataSlice(
        BASIC_METADATA_CACHE,
        0,
        BASIC_METADATA_TEXT.length,
      );
      expect(slice.sliceRelative().from).toEqual(slice.from);
      expect(slice.sliceRelative().to).toEqual(slice.to);
    });

    it("should return the original range (with no end) when no from/to parameters are given", () => {
      const slice = new CachedMetadataSlice(BASIC_METADATA_CACHE, 0);
      expect(slice.sliceRelative().from).toEqual(slice.from);
      expect(slice.sliceRelative().to).toEqual(slice.to);
    });

    it("should return a range with the new start/end when given a new start/end", () => {
      const slice = new CachedMetadataSlice(
        BASIC_METADATA_CACHE,
        0,
        BASIC_METADATA_TEXT.length,
      );

      expect(slice.sliceRelative(1).from).toEqual(slice.from + 1);
      expect(slice.sliceRelative(1).to).toEqual(slice.to);

      expect(slice.sliceRelative(1, 10).from).toEqual(slice.from + 1);
      expect(slice.sliceRelative(1, 10).to).toEqual(slice.from + 10);

      expect(slice.sliceRelative(undefined, 10).from).toEqual(slice.from);
      expect(slice.sliceRelative(undefined, 10).to).toEqual(slice.from + 10);
    });

    it("should return a range with the new start/end when given a new start/end, with no original end", () => {
      const slice = new CachedMetadataSlice(BASIC_METADATA_CACHE, 0);

      expect(slice.sliceRelative(1).from).toEqual(slice.from + 1);
      expect(slice.sliceRelative(1).to).toEqual(slice.to);

      expect(slice.sliceRelative(1, 10).from).toEqual(slice.from + 1);
      expect(slice.sliceRelative(1, 10).to).toEqual(slice.from + 10);

      expect(slice.sliceRelative(undefined, 10).from).toEqual(slice.from);
      expect(slice.sliceRelative(undefined, 10).to).toEqual(slice.from + 10);
    });

    it("should cap the to part of slice to the end of the range", () => {
      const slice = new CachedMetadataSlice(
        BASIC_METADATA_CACHE,
        0,
        BASIC_METADATA_TEXT.length,
      );
      expect(slice.sliceRelative(0, BASIC_METADATA_TEXT.length + 1).to).toEqual(
        slice.to,
      );
    });
  });

  describe("getHeadingIndexes", () => {
    it("should output all heading indexes in the metadata with no end specified", () => {
      const slice = new CachedMetadataSlice(BASIC_METADATA_CACHE, 0);
      expect([...slice.getHeadingIndexes()]).toEqual([0, 1, 2]);
    });

    it("should output an empty array when there are no headings", () => {
      const slice = new CachedMetadataSlice(
        { ...BASIC_METADATA_CACHE, headings: undefined },
        0,
      );
      expect([...slice.getHeadingIndexes()]).toEqual([]);
    });

    it("should output all heading indexes in the metadata when the range covers all metadata", () => {
      const slice = new CachedMetadataSlice(
        BASIC_METADATA_CACHE,
        0,
        BASIC_METADATA_TEXT.length,
      );
      expect([...slice.getHeadingIndexes()]).toEqual([0, 1, 2]);
    });

    it("should output only heading indexes that are covered by the range", () => {
      const slice = new CachedMetadataSlice(
        BASIC_METADATA_CACHE,
        0,
        BASIC_METADATA_TEXT.length,
      );
      const headings = BASIC_METADATA_CACHE.headings as HeadingCache[];
      expect([
        ...slice
          .sliceRelative(0, headings[0].position.end.offset)
          .getHeadingIndexes(),
      ]).toEqual([0]);
      expect([
        ...slice
          .sliceRelative(0, headings[1].position.end.offset)
          .getHeadingIndexes(),
      ]).toEqual([0, 1]);
      expect([
        ...slice
          .sliceRelative(0, headings[2].position.end.offset)
          .getHeadingIndexes(),
      ]).toEqual([0, 1, 2]);
      expect([
        ...slice
          .sliceRelative(headings[0].position.end.offset)
          .getHeadingIndexes(),
      ]).toEqual([1, 2]);
      expect([
        ...slice
          .sliceRelative(headings[1].position.end.offset)
          .getHeadingIndexes(),
      ]).toEqual([2]);
      expect([
        ...slice
          .sliceRelative(headings[2].position.end.offset)
          .getHeadingIndexes(),
      ]).toEqual([]);
    });
  });

  describe("getHeadings", () => {
    it("is an alias that returns the HeadingCache directly, based on the HeadingIndexes", () => {
      const slice = new CachedMetadataSlice(BASIC_METADATA_CACHE, 0);
      const headings = BASIC_METADATA_CACHE.headings as HeadingCache[];
      expect([...slice.getHeadings()]).toEqual(BASIC_METADATA_CACHE.headings);
      expect([
        ...slice
          .sliceRelative(0, headings[0].position.end.offset)
          .getHeadings(),
      ]).toEqual(headings.slice(0, 1));
      expect([
        ...slice
          .sliceRelative(0, headings[1].position.end.offset)
          .getHeadings(),
      ]).toEqual(headings.slice(0, 2));
      expect([
        ...slice
          .sliceRelative(0, headings[2].position.end.offset)
          .getHeadings(),
      ]).toEqual(headings.slice(0, 3));
      expect([
        ...slice.sliceRelative(headings[0].position.end.offset).getHeadings(),
      ]).toEqual(headings.slice(1));
      expect([
        ...slice.sliceRelative(headings[1].position.end.offset).getHeadings(),
      ]).toEqual(headings.slice(2));
      expect([
        ...slice.sliceRelative(headings[2].position.end.offset).getHeadings(),
      ]).toEqual(headings.slice(3));
    });
  });

  describe("getHeadingRelative", () => {
    it("should give the heading specified by relative index", () => {
      const slice = new CachedMetadataSlice(BASIC_METADATA_CACHE, 0);
      const headings = BASIC_METADATA_CACHE.headings as HeadingCache[];
      expect([...slice.getHeadings()]).toEqual(BASIC_METADATA_CACHE.headings);
      expect(
        slice
          .sliceRelative(headings[0].position.end.offset)
          .getHeadingRelative(0),
      ).toEqual(headings.slice(1)[0]);
      expect(
        slice
          .sliceRelative(headings[1].position.end.offset)
          .getHeadingRelative(0),
      ).toEqual(headings.slice(2)[0]);
      expect(
        slice
          .sliceRelative(headings[2].position.end.offset)
          .getHeadingRelative(0),
      ).toEqual(headings.slice(3)[0]);

      expect(
        slice
          .sliceRelative(headings[0].position.end.offset)
          .getHeadingRelative(1),
      ).toEqual(headings.slice(1)[1]);
      expect(
        slice
          .sliceRelative(headings[1].position.end.offset)
          .getHeadingRelative(1),
      ).toEqual(headings.slice(2)[1]);
      expect(
        slice
          .sliceRelative(headings[2].position.end.offset)
          .getHeadingRelative(1),
      ).toEqual(undefined);

      expect(
        slice
          .sliceRelative(headings[0].position.end.offset)
          .getHeadingRelative(2),
      ).toEqual(headings.slice(1)[2]);
      expect(
        slice
          .sliceRelative(headings[1].position.end.offset)
          .getHeadingRelative(2),
      ).toEqual(undefined);
      expect(
        slice
          .sliceRelative(headings[2].position.end.offset)
          .getHeadingRelative(2),
      ).toEqual(undefined);
    });
  });
});
