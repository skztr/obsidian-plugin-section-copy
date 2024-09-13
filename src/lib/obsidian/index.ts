export const REGEX_TAG_POSITIVE = /^#[-_\p{L}\w\/]+$/u;
export const REGEX_TAG_NEGATIVE = /^#[0-9]+$/u;
export function TestStringIsTag(str: string): boolean {
  return REGEX_TAG_POSITIVE.test(str) && !REGEX_TAG_NEGATIVE.test(str);
}
