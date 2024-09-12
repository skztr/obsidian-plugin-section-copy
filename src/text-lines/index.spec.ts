import { TextLines } from ".";

describe("TextLines", () => {
  it("should iterate over the lines in the passed blob", () => {
    const lines = new TextLines("a\nb\nc\n");
    const collected = [...lines];
    expect(collected).toEqual([
      { from: 0, to: 2, number: 0, text: "a\n" },
      { from: 2, to: 4, number: 1, text: "b\n" },
      { from: 4, to: 6, number: 2, text: "c\n" },
    ]);
  });

  it("should allow array-like access to a specific line", () => {
    const lines = new TextLines("a\nb\nc\n");
    const line = lines[1];
    expect(line).toEqual({ from: 2, to: 4, number: 1, text: "b\n" });
  });

  it("should return undefined when accessing a line that does not exist", () => {
    const lines = new TextLines("a\nb\nc\n");
    const line = lines[3];
    expect(line).toBe(undefined);
  });
});
