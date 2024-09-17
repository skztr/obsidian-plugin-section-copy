import { textTweaker } from "./textTweaker";
import { unindent } from "../../lib/text";

describe("textTweaker", () => {
  const MARKDOWN_BASIC = unindent(`
    # Header Level 1
    #tag #only #line
    text and #tag line
    %%comment%%
    %%multi-line
    comment%%
    text line
  `);
  it("should just return the original string in the trivial case with no settings", () => {
    expect(textTweaker(MARKDOWN_BASIC, {})).toEqual(MARKDOWN_BASIC);
  });

  it("should replace comments on request", () => {
    const expected = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      
      
      
      text line
    `);
    expect(textTweaker(MARKDOWN_BASIC, { stripComments: true })).toEqual(
      expected,
    );
  });

  it("should replace tag lines on request", () => {
    const expected = unindent(`
      # Header Level 1
      
      text and #tag line
      %%comment%%
      %%multi-line
      comment%%
      text line
    `);
    expect(textTweaker(MARKDOWN_BASIC, { stripTagLines: true })).toEqual(
      expected,
    );
  });

  it("should replace comments AND tag lines on request", () => {
    const expected = unindent(`
      # Header Level 1
      
      text and #tag line
      
      
      
      text line
    `);
    expect(
      textTweaker(MARKDOWN_BASIC, { stripComments: true, stripTagLines: true }),
    ).toEqual(expected);
  });

  it("should replace trailing comments on request", () => {
    const original = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      %%comment%%
    `);
    const expected =
      unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
    `) + "\n";
    expect(textTweaker(original, { stripComments: true })).toEqual(expected);
  });

  it("should replace trailing tag lines on request", () => {
    const original = unindent(`
      # Header Level 1
      #tag #only #line
    `);
    const expected =
      unindent(`
      # Header Level 1
    `) + "\n";
    expect(textTweaker(original, { stripTagLines: true })).toEqual(expected);
  });

  it("should replace trailing tag lines AND comments on request", () => {
    const originalTagLine = unindent(`
      # Header Level 1
      %%comment%%
      #tag #only #line
    `);
    const expectedTagLine = unindent(`
      # Header Level 1


    `);
    expect(
      textTweaker(originalTagLine, {
        stripComments: true,
        stripTagLines: true,
      }),
    ).toEqual(expectedTagLine);

    const originalComment = unindent(`
      # Header Level 1
      #tag #only #line
      %%comment%%
    `);
    const expectedComment = unindent(`
      # Header Level 1

      
    `);
    expect(
      textTweaker(originalComment, {
        stripComments: true,
        stripTagLines: true,
      }),
    ).toEqual(expectedComment);
  });

  it("should remove comment-only lines on request", () => {
    const original = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      %%comment%%
      text line
    `);
    const expected = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      text line
    `);
    expect(
      textTweaker(original, { stripComments: true, stripModifiedEmpty: true }),
    ).toEqual(expected);
  });

  it("should remove successive comment-only lines on request", () => {
    const original = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      %%comment1%%
      %%comment2%%
      text line
    `);
    const expected = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      text line
    `);
    expect(
      textTweaker(original, { stripComments: true, stripModifiedEmpty: true }),
    ).toEqual(expected);
  });

  it("should remove tag-only lines on request", () => {
    const expected = unindent(`
      # Header Level 1
      text and #tag line
      %%comment%%
      %%multi-line
      comment%%
      text line
    `);
    expect(
      textTweaker(MARKDOWN_BASIC, {
        stripTagLines: true,
        stripModifiedEmpty: true,
      }),
    ).toEqual(expected);
  });

  it("should remove successive tag-only lines", () => {
    const original = unindent(`
      # Header Level 1
      #tag #only #line1
      #tag #only #line2
      text line
    `);
    const expected = unindent(`
      # Header Level 1
      text line
    `);
    expect(
      textTweaker(original, {
        stripTagLines: true,
        stripModifiedEmpty: true,
      }),
    ).toEqual(expected);
  });

  it("should remove tag-only lines AND comment lines on request", () => {
    const originalTagThenComment = unindent(`
      # Header Level 1
      #tag #only #line
      %%comment%%
      text line
    `);
    const expectedTagThenComment = unindent(`
      # Header Level 1
      text line
    `);
    expect(
      textTweaker(originalTagThenComment, {
        stripComments: true,
        stripTagLines: true,
        stripModifiedEmpty: true,
      }),
    ).toEqual(expectedTagThenComment);

    const originalCommentThenTag = unindent(`
      # Header Level 1
      #tag #only #line
      %%comment%%
      text line
    `);
    const expectedCommentThenTag = unindent(`
      # Header Level 1
      text line
    `);
    expect(
      textTweaker(originalCommentThenTag, {
        stripComments: true,
        stripTagLines: true,
        stripModifiedEmpty: true,
      }),
    ).toEqual(expectedCommentThenTag);
  });

  it("should remove trailing comment-only lines on request", () => {
    const original = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
      %%comment%%
    `);
    const expected = unindent(`
      # Header Level 1
      #tag #only #line
      text and #tag line
    `);
    expect(
      textTweaker(original, { stripComments: true, stripModifiedEmpty: true }),
    ).toEqual(expected);
  });

  it("should remove trailing tag-only lines on request", () => {
    const original = unindent(`
      # Header Level 1
      test
      #tag #only #line
    `);
    const expected = unindent(`
      # Header Level 1
      test
    `);
    expect(
      textTweaker(original, { stripTagLines: true, stripModifiedEmpty: true }),
    ).toEqual(expected);
  });

  it("should remove trailing tag lines AND comments on request", () => {
    const originalTagLine = unindent(`
      # Header Level 1
      %%comment%%
      #tag #only #line
    `);
    const expectedTagLine = unindent(`
      # Header Level 1
    `);
    expect(
      textTweaker(originalTagLine, {
        stripComments: true,
        stripTagLines: true,
        stripModifiedEmpty: true,
      }),
    ).toEqual(expectedTagLine);

    const originalComment = unindent(`
      # Header Level 1
      #tag #only #line
      %%comment%%
    `);
    const expectedComment = unindent(`
      # Header Level 1
    `);
    expect(
      textTweaker(originalComment, {
        stripComments: true,
        stripTagLines: true,
        stripModifiedEmpty: true,
      }),
    ).toEqual(expectedComment);
  });
});
