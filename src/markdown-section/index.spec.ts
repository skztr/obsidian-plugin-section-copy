import { MarkdownSection } from ".";
import { TextLines } from "../text-lines";

describe("MarkdownSection", () => {
  it("should iterate over all lines when they are all part of the same section", () => {
    const lines = new TextLines("# Section\na\nb\nc");
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
    const lines = new TextLines("# Section\na\nb\nc\n## Nested\nAA\nBB\nCC");
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
    const lines = new TextLines(
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
    const lines = new TextLines(
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

  it("should start from the specified starting line", () => {
    const lines = new TextLines(
      "# Section\na\nb\nc\n## Nested\nAA\nBB\nCC\n# NonNested\nA\nB\nC",
    );
    const section = new MarkdownSection(lines, 4);
    const collected = [...section];
    expect(collected.map((t) => t.text)).toEqual([
      "## Nested\n",
      "AA\n",
      "BB\n",
      "CC\n",
    ]);
  });
});
