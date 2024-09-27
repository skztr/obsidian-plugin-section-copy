import { CachedMetadata, HeadingCache, Pos, SectionCache } from "obsidian";

interface Positioned {
  position: Pos;
}

/**
 * CachedMetadataSlice represents a range of text data for which CachedMetadata is relevant.
 * It can iterate over relevant sections/headings within that range, simplifying reasoning about concepts such as
 * "the first header in the range", etc.
 *
 * It is expected that the CachedMetadataSlice itself be created based on the position of some element within the UI,
 * looking up the offset within the open document that the element relates to.
 */
export class CachedMetadataSlice {
  /**
   * @argument metadata: the CachedMetadata of the document
   * @argument start: The first valid offset (sections/headings must have start offsets >= this number)
   * @argument end: The offset+1 of the last valid offset (sections/headings must have end offsets < this number)
   */
  constructor(
    private metadata: CachedMetadata,
    private start: number,
    private end?: number,
  ) {}

  /**
   * sliceAbsolute creates a new CachedMetadataSlice which is a subset of this CachedMetadataSlice.
   *
   * All arguments are absolute offsets relative to the start of the data described by the CachedMetadataSlice,
   * regardless of where the CachedMetadataSlice itself's range exists relative to it.
   *
   * @argument from - the offset to start the new slice from (default: the beginning of the range)
   * @argument to - the offset to end the new slice at (default: the rest of the range)
   */
  public sliceAbsolute(from?: number, to?: number): CachedMetadataSlice {
    const cappedFrom = Math.max(this.start, from || 0);
    const cappedTo =
      this.end === undefined || to === undefined ? to : Math.min(this.end, to);
    return new CachedMetadataSlice(this.metadata, cappedFrom, cappedTo);
  }

  /**
   * sliceRelative creates a new CachedMetadataSlice which is a subset of this CachedMetadataSlice.
   *
   * All arguments are offsets relative to the start of the range described by the CachedMetadataSlice
   *
   * @argument from - the relative offset to start the new slice from (default: the beginning of the range)
   * @argument to - the relative offset to end the new slice at (default: the rest of the range)
   */
  public sliceRelative(from?: number, to?: number): CachedMetadataSlice {
    const span = this.end ? this.end - this.start : undefined;
    const absoluteFrom = this.start + (from || 0);
    const absoluteTo =
      span !== undefined && to !== undefined
        ? this.start + Math.min(to, span)
        : span !== undefined && to === undefined
          ? this.start + span
          : span === undefined && to !== undefined
            ? this.start + to
            : /* (span === undefined && to === undefined) ? */
              undefined;
    return this.sliceAbsolute(absoluteFrom, absoluteTo);
  }
  public get from(): number {
    return this.start;
  }
  public get to(): number {
    if (this.end !== undefined) {
      return this.end;
    }
    if (!this.metadata.sections) {
      return this.from;
    }
    return this.metadata.sections[this.metadata.sections.length - 1].position
      .end.offset;
  }

  /**
   * getPositionedIndexes returns all valid indexes of the passed array of Positioned items (sections or headers).
   * An index is considered to be "valid" if the Positioned item is at least partially contained by the range of offsets
   * that this CachedMetadataSlice describes.
   */
  private *getPositionedIndexes(
    positioned?: Positioned[],
  ): Generator<number, void, unknown> {
    if (!positioned) {
      return;
    }

    for (let i = 0; i < positioned.length; i++) {
      const value = positioned[i];
      if (this.end && value.position.end.offset > this.end) {
        return;
      }
      if (value.position.start.offset >= this.start) {
        yield i;
      }
    }
  }

  public *getHeadingIndexes(): Generator<number, void, unknown> {
    yield* this.getPositionedIndexes(this.metadata.headings);
  }
  public *getHeadings(): Generator<HeadingCache, void, unknown> {
    for (let i of this.getHeadingIndexes()) {
      yield (this.metadata.headings as HeadingCache[])[i] as HeadingCache;
    }
  }
  public getHeadingRelative(i: number): HeadingCache | undefined {
    let firstAbsoluteHeadingIndex: number | undefined = undefined;
    for (let j of this.getHeadingIndexes()) {
      firstAbsoluteHeadingIndex = j;
      break;
    }
    if (firstAbsoluteHeadingIndex === undefined) {
      return undefined;
    }
    return (this.metadata.headings as HeadingCache[])[
      firstAbsoluteHeadingIndex + i
    ];
  }

  public *getSectionIndexes(): Generator<number, void, unknown> {
    yield* this.getPositionedIndexes(this.metadata.sections);
  }
  public *getSections(): Generator<SectionCache, void, unknown> {
    for (let i of this.getSectionIndexes()) {
      yield (this.metadata.sections as SectionCache[])[i] as SectionCache;
    }
  }

  /**
   * getSectionsExpanded() iterates over sections, adding "gap" sections for any areas not covered by "real" sections
   */
  public *getSectionsExpanded(): Generator<SectionCache, void, unknown> {
    let prev: SectionCache | undefined;
    for (let i of this.getSectionIndexes()) {
      const section = (this.metadata.sections as SectionCache[])[
        i
      ] as SectionCache;
      if (
        (!prev && this.from < section.position.start.offset) ||
        (prev && prev.position.end.offset < section.position.start.offset)
      ) {
        yield {
          type: "gap",
          position: {
            start: prev
              ? prev.position.end
              : { col: 0, line: 0, offset: this.from },
            end: section.position.start,
          },
        };
      }
      yield section;
      prev = section;
    }
    if (!prev || prev.position.end.offset < this.to) {
      yield {
        type: "gap",
        position: {
          start: prev ? prev.position.end : { col: 0, line: 0, offset: 0 },
          end: { col: 0, line: 0, offset: this.to }, // note: col/line are definitely wrong here
        },
      };
    }
  }
}
