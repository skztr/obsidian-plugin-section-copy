export interface StringSlicer {
  slice(from?: number, to?: number): string;
}
export interface SliceStringer {
  sliceString(from?: number, to?: number): string;
}
export function sliceText(
  text: StringSlicer | SliceStringer,
  from: number,
  to?: number,
): string {
  return typeof text === "object" && "sliceString" in text
    ? text.sliceString(from, to)
    : text.slice(from, to);
}
