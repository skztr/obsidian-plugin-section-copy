import { onlyMatch } from "./onlyMatch";

describe("onlyMatch", () => {
  it("removes everything other than the specified character", () => {
    expect(onlyMatch("foo bar baz", "a")).toEqual("aa");
  });

  it("defaults to finding newlines", () => {
    expect(onlyMatch("foo\nbar\nbaz")).toEqual("\n\n");
  });

  it("removes everything other than the specified pattern", () => {
    expect(onlyMatch("foo bar baz", /ba[rz]/g)).toEqual("barbaz");
  });

  it("converts non-global patterns to global patterns", () => {
    expect(onlyMatch("foo bar baz", /ba[rz]/)).toEqual("barbaz");
  });

  it("returns an empty string if the original text does not contain the search pattern at all", () => {
    expect(onlyMatch("foo bar baz", "q")).toEqual("");
  });

  it("returns an empty string if the original text does not contain the search pattern at all", () => {
    expect(onlyMatch("foo bar baz", /q/)).toEqual("");
  });
});
