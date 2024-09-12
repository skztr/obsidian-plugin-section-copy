import { MarkdownSection } from ".";
import { BlobTextLines } from "../text-lines";

describe("MarkdownSection", () => {
  it("should iterate over all lines when they are all part of the same section", () => {
    const lines = new BlobTextLines("# Section\na\nb\nc");
    const section = new MarkdownSection(lines);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual([
      "# Section\n",
      "a\n",
      "b\n",
      "c",
    ]);
  });

  it("should iterate over all lines when they are all part of the same section or nested sections", () => {
    const lines = new BlobTextLines(
      "# Section\na\nb\nc\n## Nested\nAA\nBB\nCC",
    );
    const section = new MarkdownSection(lines);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual([
      "# Section\n",
      "a\n",
      "b\n",
      "c\n",
      "## Nested\n",
      "AA\n",
      "BB\n",
      "CC",
    ]);
  });

  it("should stop before the beginning of a non-nested section", () => {
    const lines = new BlobTextLines(
      "# Section\na\nb\nc\n## Nested\nAA\nBB\nCC\n# NonNested\nA\nB\nC",
    );
    const section = new MarkdownSection(lines);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual([
      "# Section\n",
      "a\n",
      "b\n",
      "c\n",
      "## Nested\n",
      "AA\n",
      "BB\n",
      "CC\n",
    ]);
  });

  it("should ignore markdown in code blocks", () => {
    const lines = new BlobTextLines(
      "# Section\na\nb\nc\n## Nested\nAA\nBB\nCC\n```\n# InCode\nA\nB\nC\n```\nok\n# no",
    );
    const section = new MarkdownSection(lines);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual([
      "# Section\n",
      "a\n",
      "b\n",
      "c\n",
      "## Nested\n",
      "AA\n",
      "BB\n",
      "CC\n",
      "```\n",
      "# InCode\n",
      "A\n",
      "B\n",
      "C\n",
      "```\n",
      "ok\n",
    ]);
  });

  it("should ignore markdown in code blocks (variable length start/stop)", () => {
    const lines = new BlobTextLines(
      "# Section\na\nb\nc\n## Nested\nAA\nBB\nCC\n`````\n# InCode\nA\n```\nB\nC\n``````\nok\n# no",
    );
    const section = new MarkdownSection(lines);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual([
      "# Section\n",
      "a\n",
      "b\n",
      "c\n",
      "## Nested\n",
      "AA\n",
      "BB\n",
      "CC\n",
      "`````\n",
      "# InCode\n",
      "A\n",
      "```\n",
      "B\n",
      "C\n",
      "``````\n",
      "ok\n",
    ]);
  });

  it("should start from the specified starting line", () => {
    const lines = new BlobTextLines(
      "# Section\na\nb\nc\n## Nested\nAA\nBB\nCC\n# NonNested\nA\nB\nC",
    );
    const expected = [
      "# Section\n",
      "a\n",
      "b\n",
      "c\n",
      "## Nested\n",
      "AA\n",
      "BB\n",
      "CC\n",
      "# NonNested\n",
      "A\n",
      "B\n",
      "C",
    ];
    const cases = [
      { offset: 0, expected: expected.slice(0, 8) },
      { offset: 4, expected: expected.slice(4, 8) },
      { offset: 8, expected: expected.slice(8, 12) },
    ];
    for (let testCase of cases) {
      const section = new MarkdownSection(lines, testCase.offset);
      const collected = [...section];
      expect(collected.map((t) => t.text)).toEqual(testCase.expected);
    }
  });

  it("should optionally remove comments contained within a single line", () => {
    const lines = new BlobTextLines(
      "# Section\na%%a comment%%b\nno comment here\n",
    );
    const expected = ["# Section\n", "ab\n", "no comment here\n"];
    const section = new MarkdownSection(lines, 0, { stripComments: true });
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });

  it("should optionally remove multiple comments contained within a single line", () => {
    const lines = new BlobTextLines(
      "# Section\na%%a comment%%b%%another comment%%c\nno comment here\n",
    );
    const expected = ["# Section\n", "abc\n", "no comment here\n"];
    const section = new MarkdownSection(lines, 0, { stripComments: true });
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });

  it("should optionally remove comments contained across multiple lines", () => {
    const lines = new BlobTextLines(
      "# Section\na%%a comment%%b%%another comment\nwhich does not end%%on the same line\n",
    );
    const expected = ["# Section\n", "ab", "on the same line\n"];
    const section = new MarkdownSection(lines, 0, { stripComments: true });
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });

  it("should optionally remove entire lines contained within comments", () => {
    const lines = new BlobTextLines(
      [
        "# Section",
        "a%%a comment%%b%%another comment",
        "which does not end",
        "for several lines%%but does eventually",
        "%%entire lines which are comments still have newlines%%",
        "followed by one which starts%%like this",
        "and continues%%%%into another",
        "immediately%%before ending",
      ].join("\n") + "\n",
    );
    const expected = [
      "# Section\n",
      "ab",
      "but does eventually\n",
      "\n",
      "followed by one which starts",
      "before ending\n",
    ];
    const section = new MarkdownSection(lines, 0, { stripComments: true });
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });

  it("should optionally remove tags", () => {
    const lines = new BlobTextLines(
      [
        "# Section",
        "a #tag",
        "#tag b #another",
        "#LineWhichIsJustATag",
        "#LineWhichIsJustTwo #Tags",
      ].join("\n") + "\n",
    );
    const expected = ["# Section\n", "a \n", " b \n", "\n", " \n"];
    const section = new MarkdownSection(lines, 0, { stripTags: true });
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });

  it("should not remove tags from comments", () => {
    const lines = new BlobTextLines(
      [
        "# Section",
        "a #tag",
        "a %%comment with a #tag%%",
        "a %%multi-line comment",
        "with a #tag in it%%",
      ].join("\n") + "\n",
    );
    const expected = [
      "# Section\n",
      "a \n",
      "a %%comment with a #tag%%\n",
      "a %%multi-line comment\n",
      "with a #tag in it%%\n",
    ];
    const section = new MarkdownSection(lines, 0, { stripTags: true });
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });

  it("should not care about headers in comments", () => {
    const lines = new BlobTextLines(
      [
        "# Section",
        "a multi-line %%comment",
        "# that pretends to start a new section",
        "but really doesn't%%",
        "so there",
      ].join("\n") + "\n",
    );
    const expected = [
      "# Section\n",
      "a multi-line %%comment\n",
      "# that pretends to start a new section\n",
      "but really doesn't%%\n",
      "so there\n",
    ];
    const section = new MarkdownSection(lines, 0);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual(expected);
  });
});
