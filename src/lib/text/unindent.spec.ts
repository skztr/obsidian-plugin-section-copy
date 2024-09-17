import { unindent } from "./unindent";

describe("unindent", () => {
  it("returns the original string if there is no indent", () => {
    expect(unindent("foo")).toEqual("foo");
  });

  it("removes leading whitespace from a string", () => {
    expect(unindent("  foo")).toEqual("foo");
  });

  it("removes the same leading whitespace from a string after a newline", () => {
    expect(unindent("  foo\n  bar\n")).toEqual("foo\nbar\n");
  });

  it("removes shorter leading whitespace from a string after a newline", () => {
    expect(unindent("  foo\n bar\n")).toEqual("foo\nbar\n");
  });

  it("removes the beginning of longer leading whitespace from a string after a newline", () => {
    expect(unindent("  foo\n    bar\n")).toEqual("foo\n  bar\n");
  });

  it("removes leading/trailing newlines (eg: for multiline constants)", () => {
    const indented = `
      foo
      bar
    `;
    expect(unindent(indented)).toEqual("foo\nbar\n");
  });
});
