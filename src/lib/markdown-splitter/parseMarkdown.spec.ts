import { Pos } from "obsidian";
import {
  lineSpans,
  parseMarkdown,
  standardTransformers,
} from "./parseMarkdown";
import { SimpleSpan, SyntaxNodeType } from "./syntaxNode";

interface testSpan {
  expectedType?: SyntaxNodeType;
  unparsed: string;
}

/**
 * spanPosition is a helper for these tests.
 * Given a list of text string spans, and an index, it outputs the position of spans[i]
 */
function spanPosition(spans: testSpan[], i: number): Pos {
  const fullText = spans
    .slice(0, i + 1)
    .map((s) => s.unparsed)
    .join("");
  const lines = fullText.split("\n");
  const lastLine = lines[lines.length - 1];
  return {
    start:
      i === 0 ? { col: 0, line: 0, offset: 0 } : spanPosition(spans, i - 1).end,
    end: {
      col: lastLine.length,
      line: lines.length - 1,
      offset: fullText.length,
    },
  };
}

function spansExpect(spans: testSpan[]): SimpleSpan[] {
  return spans.map(
    (span, i): SimpleSpan => ({
      type: span.expectedType || SyntaxNodeType.Text,
      position: spanPosition(spans, i),
    }),
  );
}

describe("markdownSpans", () => {
  it("Should turn empty text into nothing", () => {
    const spans: testSpan[] = [{ unparsed: "" }];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), []),
    ];
    expect(collected).toEqual([]);
  });

  it("Should turn uninteresting text into a single text span", () => {
    const spans: testSpan[] = [{ unparsed: "foo bar baz" }];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), []),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should turn uninteresting text into a single text span using standard transforms", () => {
    const spans: testSpan[] = [{ unparsed: "foo bar baz" }];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should separate comments from non-comments", () => {
    const spans: testSpan[] = [
      { unparsed: "leading" },
      { unparsed: "%%a comment%%", expectedType: SyntaxNodeType.Comment },
      { unparsed: "trailing" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should support HTML-style comments when separating", () => {
    const spans: testSpan[] = [
      { unparsed: "leading" },
      { unparsed: "<!--a comment-->", expectedType: SyntaxNodeType.Comment },
      { unparsed: "trailing" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should separate comments from non-comments (multiple lines)", () => {
    const spans: testSpan[] = [
      { unparsed: "leading" },
      {
        unparsed: "%%a\nmultiline\ncomment%%",
        expectedType: SyntaxNodeType.Comment,
      },
      { unparsed: "trailing" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should separate comments from non-comments (unclosed trailing comment)", () => {
    const spans: testSpan[] = [
      { unparsed: "leading" },
      {
        unparsed: "%%trailing comment",
        expectedType: SyntaxNodeType.Comment,
      },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should ignore comments in inline code blocks", () => {
    const spans: testSpan[] = [
      { unparsed: "leading `code block %%with comment%%` in it" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should ignore code blocks in comments", () => {
    const spans: testSpan[] = [
      { unparsed: "leading " },
      {
        unparsed: "%%comment with `code block`%%",
        expectedType: SyntaxNodeType.Comment,
      },
      { unparsed: " in it" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  // UNDEFINED BEHAVIOR / INCONSISTENCY:
  // When the codeblock begins in a comment but ends outside of it:
  //  - The editor view considers that the code block interrupts the comment block
  //  - The reader view considers the comment block to negate the code block
  /*
  it("Should allow comments to end if a code block begins inside it", () => {
    const spans: testSpan[] = [
      { unparsed: "leading " },
      {
        unparsed: "%%comment with `unterminated code block%%",
        expectedType: MarkdownSpanType.Comment,
      },
      { unparsed: " in it" },
    ];
    const collected = [...markdownSpans(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });
  */

  // UNDEFINED BEHAVIOR / INCONSISTENCY:
  // When the codeblock begins in a comment but ends outside of it:
  //  - The editor view considers that the code block interrupts the comment block
  //  - The reader view considers the comment block to negate the code block
  /*
  it("Should allow comments to end if a code block begins inside but ends outside", () => {
    const spans: testSpan[] = [
      { unparsed: "leading " },
      {
        unparsed: "%%comment with `unterminated code block%%",
        expectedType: MarkdownSpanType.Comment,
      },
      { unparsed: " in it`" },
    ];
    const collected = [...markdownSpans(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });
  */

  it("Should ignore comments in html attributes", () => {
    const spans: testSpan[] = [
      { unparsed: 'an <html attribute="including %% a comment %%"> in it' },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should allow comment delimiters to be escaped", () => {
    const spans: testSpan[] = [{ unparsed: "an \\%%escaped comment\\%%" }];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should allow code delimiters to be escaped (eg: comments within escaped inline code are comments)", () => {
    const spans: testSpan[] = [
      { unparsed: "leading \\`not really code" },
      { unparsed: "%%a comment%%", expectedType: SyntaxNodeType.Comment },
      { unparsed: "because it is\\` escaped" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should separate tags", () => {
    const spans: testSpan[] = [
      { unparsed: "leading " },
      { unparsed: "#foo", expectedType: SyntaxNodeType.Tag },
      { unparsed: " " },
      { unparsed: "#bar", expectedType: SyntaxNodeType.Tag },
      { unparsed: " trailing" },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should consider tags not surrounded by whitespace to be invalid", () => {
    const spans: testSpan[] = [{ unparsed: "#foo#bar foo#bar" }];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should find tags after an invalid tag", () => {
    const spans: testSpan[] = [
      { unparsed: "#foo#bar " },
      { unparsed: "#bar", expectedType: SyntaxNodeType.Tag },
      { unparsed: " foo#bar " },
      { unparsed: "#baz", expectedType: SyntaxNodeType.Tag },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should match tags at the beginning of the document", () => {
    const spans: testSpan[] = [
      { unparsed: "#foo", expectedType: SyntaxNodeType.Tag },
      { unparsed: " " },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should match tags at the end of the document", () => {
    const spans: testSpan[] = [
      { unparsed: " " },
      { unparsed: "#foo", expectedType: SyntaxNodeType.Tag },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should match tags which take up the whole document", () => {
    const spans: testSpan[] = [
      { unparsed: "#foo", expectedType: SyntaxNodeType.Tag },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should match tags when the document contains only tags and spaces", () => {
    const spans: testSpan[] = [
      { unparsed: "#foo", expectedType: SyntaxNodeType.Tag },
      { unparsed: " " },
      { unparsed: "#bar", expectedType: SyntaxNodeType.Tag },
      { unparsed: " " },
      { unparsed: "#baz", expectedType: SyntaxNodeType.Tag },
    ];
    const collected = [...parseMarkdown(spans.map((s) => s.unparsed).join(""))];
    expect(collected).toEqual(spansExpect(spans));
  });
});

describe("lineSpans", () => {
  it("Should do nothing of note to a span containing no newlines", () => {
    const spans: testSpan[] = [
      { unparsed: "line1", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [lineSpans]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should split text spans on newlines", () => {
    const spans: testSpan[] = [
      { unparsed: "line1\n", expectedType: SyntaxNodeType.Text },
      { unparsed: "line2", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [
        ...standardTransformers,
        lineSpans,
      ]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should not emit an empty span after a trailing newline", () => {
    const spans: testSpan[] = [
      { unparsed: "line1\n", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [
        ...standardTransformers,
        lineSpans,
      ]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should split multiple text spans on newlines", () => {
    const spans: testSpan[] = [
      { unparsed: "line1\n", expectedType: SyntaxNodeType.Text },
      { unparsed: "line2\n", expectedType: SyntaxNodeType.Text },
      { unparsed: "line3", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [
        ...standardTransformers,
        lineSpans,
      ]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should split empty lines", () => {
    const spans: testSpan[] = [
      { unparsed: "line1\n", expectedType: SyntaxNodeType.Text },
      { unparsed: "\n", expectedType: SyntaxNodeType.Text },
      { unparsed: "line3", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [
        ...standardTransformers,
        lineSpans,
      ]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should split comment spans on newlines", () => {
    const spans: testSpan[] = [
      { unparsed: "leading\n", expectedType: SyntaxNodeType.Text },
      { unparsed: "%%foo\n", expectedType: SyntaxNodeType.Comment },
      { unparsed: "bar%%", expectedType: SyntaxNodeType.Comment },
      { unparsed: "trailing\n", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [
        ...standardTransformers,
        lineSpans,
      ]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });

  it("Should split empty lines after comments", () => {
    const spans: testSpan[] = [
      { unparsed: "%%foo%%", expectedType: SyntaxNodeType.Comment },
      { unparsed: "\n", expectedType: SyntaxNodeType.Text },
    ];
    const collected = [
      ...parseMarkdown(spans.map((s) => s.unparsed).join(""), [
        ...standardTransformers,
        lineSpans,
      ]),
    ];
    expect(collected).toEqual(spansExpect(spans));
  });
});
