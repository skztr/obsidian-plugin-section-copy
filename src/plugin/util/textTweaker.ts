import { SectionCopyTweakSettings } from "../settings";
import {
  parseMarkdown,
  lineSpans,
  standardTransformers,
  SyntaxNodeType,
} from "../../lib/markdown-splitter";
import { onlyMatch, sliceText } from "../../lib/text";

/**
 * textTweaker applies the transformations requested based on the passed settings.
 * specifically, it will optionally remove comments, "tag lines", and entire lines where such spans are removed.
 *
 * @argument text the segment of markdown text which should be copied (eg: the headed section)
 * @argument settings SectionCopySettings the plugin settings. Not all settings are relevant.
 */
export function textTweaker(
  text: string,
  settings: Partial<SectionCopyTweakSettings>,
): string {
  if (
    !settings.stripComments &&
    !settings.stripLinks &&
    !settings.stripMetadata &&
    !settings.stripTagLines
  ) {
    return text;
  }

  let output: string = "";
  let line: string = "";
  let hasNonWhitespace: boolean = false;
  let hasTags: boolean = false;
  let hasComments: boolean = false;
  for (const span of parseMarkdown(text, [
    ...standardTransformers,
    lineSpans,
  ])) {
    const spanText = sliceText(
      text,
      span.position.start.offset,
      span.position.end.offset,
    );
    // ASSUMPTIONS:
    // 1. There is only ever at most one newlineIndex
    // 2. newlineIndex is always at the end of a string
    // That's what lineSpans should enforce.
    const newlineIndex = spanText.lastIndexOf("\n");

    if (span.type === SyntaxNodeType.Comment) {
      hasComments = true;
    }
    if (span.type === SyntaxNodeType.Tag) {
      hasTags = true;
    }
    if (
      (!settings.stripComments || span.type !== SyntaxNodeType.Comment) &&
      (!settings.stripTagLines || span.type !== SyntaxNodeType.Tag) &&
      !/^\s*$/.test(spanText)
    ) {
      // we care whether the current "line" has any non-whitespace characters in spans that won't be stripped
      hasNonWhitespace = true;
    }

    if (settings.stripLinks && span.type === SyntaxNodeType.Link) {
      const isWikiLink = spanText.startsWith("[[") && spanText.endsWith("]]");
      const isMarkdownLink =
        !isWikiLink &&
        spanText.startsWith("[") &&
        spanText.includes("](") &&
        spanText.endsWith(")");
      if (isWikiLink) {
        const [_, linkText, linkAlias] =
          spanText.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/) ?? [];
        line += linkAlias || linkText;
        continue;
      }
      if (isMarkdownLink) {
        const linkText = spanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
        line += linkText;
        continue;
      }
      // not a link we recognize, just add the text as-is
      line += spanText;
      continue;
    }

    if (settings.stripComments && span.type === SyntaxNodeType.Comment) {
      hasComments = true;
      if (!settings.stripModifiedEmpty) {
        output += onlyMatch(
          sliceText(text, span.position.start.offset, span.position.end.offset),
          "\n",
        );
      }
      continue;
    }

    if (settings.stripMetadata && span.type === SyntaxNodeType.Metadata) {
      continue;
    }

    line += spanText;
    if (newlineIndex !== -1) {
      if (
        (settings.stripTagLines && !hasNonWhitespace && hasTags) ||
        (settings.stripComments && !hasNonWhitespace && hasComments)
      ) {
        if (!settings.stripModifiedEmpty) {
          output += onlyMatch(line, "\n");
        }
        line = "";
        hasComments = false;
        hasNonWhitespace = false;
        hasTags = false;
        continue;
      }
      output += line;
      line = "";
      hasComments = false;
      hasNonWhitespace = false;
      hasTags = false;
    }
  }
  if (line.length > 0) {
    if (
      (settings.stripTagLines && !hasNonWhitespace && hasTags) ||
      (settings.stripComments && !hasNonWhitespace && hasComments)
    ) {
      if (!settings.stripModifiedEmpty) {
        output += onlyMatch(line, "\n");
      }
    } else {
      output += line;
    }
  }
  return output;
}
