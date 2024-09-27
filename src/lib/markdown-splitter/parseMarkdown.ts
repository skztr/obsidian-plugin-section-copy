import { remark } from "remark";
import { Root } from "mdast";
import { SyntaxNode, SyntaxNodeType, SimpleSpan } from "./syntaxNode";

/**
 * markdownSyntaxLeaves Parses a markdown document into SyntaxNodes, iterating over the "leaf" nodes
 */
export function* markdownSyntaxLeaves(
  doc: string,
): Generator<SyntaxNode, void, unknown> {
  const root: Root = remark().parse(doc);
  const stack: SyntaxNode[] = [];
  let prev: SyntaxNode | undefined;
  let next: SyntaxNode | undefined = new SyntaxNode(doc, root);
  while (next) {
    const node: SyntaxNode = next;
    if (!node.firstChild) {
      if (
        (!prev && node.position.from > 0) ||
        (prev && prev.position.to < node.position.from)
      ) {
        const gap = SyntaxNode.createGap(prev, node);
        yield gap;
      }
      if (node.position.from < node.position.to) {
        yield node;
        prev = node;
      }
    }

    if (node.firstChild) {
      stack.push(node);
      next = node.firstChild;
    } else if (node.nextSibling) {
      next = node.nextSibling;
    } else {
      // sibling of parent
      next = stack.pop()?.nextSibling || undefined;
    }
  }
  if (prev && prev.position.to < doc.length) {
    yield SyntaxNode.createGap(prev);
  }
}

type syntaxNodeTypeMapping = Partial<Record<SyntaxNodeType, SyntaxNodeType>>;

/**
 * combineSpans detects runs of multiple spans of the same type, and emits a single long span
 */
function* combineSpans(
  spans: Iterable<SyntaxNode>,
  typeMapping?: syntaxNodeTypeMapping,
): Generator<SyntaxNode, void, unknown> {
  let pending: SyntaxNode | undefined;
  for (const node of spans) {
    if (typeMapping && node.type in typeMapping) {
      node.type = typeMapping[node.type] as SyntaxNodeType;
    }
    if (!pending) {
      pending = node;
    } else if (node.type === pending.type) {
      pending = pending.extendTo(node.position.to);
    } else {
      yield pending;
      pending = node;
    }
  }
  if (pending) {
    yield pending;
  }
}
/**
 * combineSpansTransformer creates a transformer like combineSpans, but requiring only a single argument,
 * by pre-filling the typeMapping parameter
 */
export function combineSpansTransformer(
  typeMapping?: syntaxNodeTypeMapping,
): SyntaxNodeTransformer {
  return (
    nodes: Iterable<SyntaxNode>,
  ): Generator<SyntaxNode, void, unknown> => {
    return combineSpans(nodes, typeMapping);
  };
}

interface tweakSpansMatch {
  type: SyntaxNodeType;
  from: number;
  to: number;
  continue?: boolean;
}
type tweakSpansRule = (
  text: string,
  offset: number,
) => tweakSpansMatch | undefined;
const tweakSpansRules: tweakSpansRule[] = [
  (text, offset) => {
    const start = text.indexOf("\\", offset);
    if (start === -1 || start === text.length - 1) {
      return undefined;
    }
    return { type: SyntaxNodeType.Literal, from: start, to: start + 2 };
  },
  (text, offset) => {
    const start = text.indexOf("%%", offset);
    if (start === -1) {
      return undefined;
    }
    const end = text.indexOf("%%", start + 2);
    return {
      type: SyntaxNodeType.Comment,
      from: start,
      to: end === -1 ? start + 2 : end + 2,
      continue: end === -1,
    };
  },
  (text, offset) => {
    const tagRegExp =
      /#[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/gu;

    while (offset < text.length) {
      tagRegExp.lastIndex = offset;
      const match = tagRegExp.exec(text);
      if (!match) {
        return undefined;
      }

      const start = match.index as number;
      if (start !== 0 && !/\s/.test(text[start - 1])) {
        // if tags aren't at the beginning of the document, they must follow whitespace
        offset = start + 1;
        continue;
      }
      if (
        start + match[0].length < text.length &&
        !/\s/.test(text[start + match[0].length])
      ) {
        // if tags aren't at the end of the document, they must be followed by whitespace
        offset = start + 1;
        continue;
      }
      return {
        type: SyntaxNodeType.Tag,
        from: start,
        to: start + match[0].length,
      };
    }
  },
];

enum tweakSpansState {
  Default = "default",
  InComment = "in-comment",
}

/**
 * tweakSpans does what "regular" markdown does not
 *
 *  - detects comment markers %%like this%%
 *  - escapes various things, eg: comment markers. Note it only escapes *beginning* comment markers.
 *    Obsidian itself is inconsistent about how *end* comment markers are escaped/not.
 *  - detects tags
 *
 *  You'll probably want to run combineSpans both before and after this step
 */
function* tweakSpans(
  spans: Iterable<SyntaxNode>,
): Generator<SyntaxNode, void, unknown> {
  let state: tweakSpansState = tweakSpansState.Default;

  /**
   * next holds a node which has been started but not yet emitted.
   * If next is defined at the beginning of the loop, it is expected to be an unclosed comment.
   */
  let next: SyntaxNode | undefined;
  let node: SyntaxNode | undefined;
  for (node of spans) {
    if (
      state === tweakSpansState.Default &&
      node.type !== SyntaxNodeType.Text
    ) {
      yield node;
      continue;
    }

    if (state === tweakSpansState.InComment) {
      /* istanbul ignore if */ /* this is an assertion / sanity check */
      if (!next) {
        throw new Error(
          "Logic Error: still in a comment, but no 'next' node is waiting for us",
        );
      }
      const text = node.toString();
      const delimiterIndex = text.indexOf("%%");
      if (delimiterIndex === -1) {
        next = next.extendTo(node.position.to);
        continue;
      }
      next = next.extendTo(next.position.to + delimiterIndex + 2);
      yield next;
      next = undefined;
      state = tweakSpansState.Default;

      // Note: we are making the assumption that any syntax "interrupted" by a comment can be safely ignored
      // See the note above about Obsidian's inconsistencies about these situations.
      // Edge-cases include inline code, HTML, and backslash-escapes
      node = node.slice(delimiterIndex + 2);
      node.type = SyntaxNodeType.Text;
    }

    const text = node.toString();
    let offset = 0;
    while (offset < text.length) {
      let matched: tweakSpansMatch | undefined;
      for (const rule of tweakSpansRules) {
        const match = rule(text, offset);
        if (match && (!matched || matched.from > match.from)) {
          matched = match;
        }
      }
      if (!matched) {
        const rest = node.slice(offset, text.length);
        rest.type = SyntaxNodeType.Text;
        yield rest;
        offset = text.length;
        break;
      }

      if (matched.from > offset) {
        const leading = node.slice(offset, matched.from);
        leading.type = SyntaxNodeType.Text;
        yield leading;
      }

      next = node.slice(matched.from, matched.to);
      next.type = matched.type;
      if (matched.continue) {
        if (matched.type === SyntaxNodeType.Comment) {
          state = tweakSpansState.InComment;
        }
        break;
      }
      yield next;
      offset = matched.to;
      next = undefined;
    }
  }
  if (next && node) {
    // trailing comment at the end of the spans list
    next = next.extendTo(node.position.to);
    yield next;
  }
}

/**
 * lineSpans splits spans into lines
 */
export function* lineSpans(
  spans: Iterable<SyntaxNode>,
): Generator<SyntaxNode, void, unknown> {
  for (const span of spans) {
    const text = span.toString();
    let offset = 0;
    while (offset < text.length) {
      const newlineIndex = text.indexOf("\n", offset);
      if (newlineIndex === -1) {
        // no newline, output remaining
        yield span.slice(offset);
        break;
      }
      yield span.slice(offset, newlineIndex + 1);
      offset = newlineIndex + 1;
    }
  }
}

export type SyntaxNodeTransformer = (
  nodes: Iterable<SyntaxNode>,
) => Generator<SyntaxNode, void, unknown>;
export const standardTransformers: SyntaxNodeTransformer[] = [
  // Combine runs of the same type, so we can tweak anything that spans multiple nodes more easily
  combineSpansTransformer({
    [SyntaxNodeType.Gap]: SyntaxNodeType.Text,
  }),

  // Separate out Comments and Tags
  tweakSpans,

  // Recombine runs of the same type, eg: multiple Comments, while removing distinction between "Literals" and "Text"
  combineSpansTransformer({
    [SyntaxNodeType.Gap]: SyntaxNodeType.Text,
    [SyntaxNodeType.Literal]: SyntaxNodeType.Text,
  }),
];

/**
 * parseMarkdown turns a document string into a stream of "markdown spans", optionally running specified transformers
 */
export function* parseMarkdown(
  doc: string,
  transformers?: SyntaxNodeTransformer[],
): Generator<SimpleSpan, void, unknown> {
  // Parse the Markdown string
  const syntaxLeaves = markdownSyntaxLeaves(doc);

  let transformed: Generator<SyntaxNode, void, unknown> = syntaxLeaves;
  for (const transformer of transformers || standardTransformers) {
    transformed = transformer(transformed);
  }

  for (const span of transformed) {
    yield span.simpleSpan;
  }
}
