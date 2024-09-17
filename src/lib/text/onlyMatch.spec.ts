import { onlyMatch } from "./onlyMatch";

describe("onlyMatch", () => {
  it("removes everything other than the specified character", () => {
    expect(onlyMatch("foo bar baz", "a")).toEqual("aa");
  });

  it("removes everything other than the specified pattern", () => {
    expect(onlyMatch("foo bar baz", /ba[rz]/)).toEqual("barbaz");
  });

  it("returns an empty string if the original text does not contain the search pattern at all", () => {
    expect(onlyMatch("foo bar baz", "q")).toEqual("");
  });

  it("returns an empty string if the original text does not contain the search pattern at all", () => {
    expect(onlyMatch("foo bar baz", /q/)).toEqual("");
  });
});
