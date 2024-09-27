import { invisibles } from "./invisibles";

describe("invisibles", () => {
  it("replaces spaces with a unicode OPEN BOX", () => {
    expect(invisibles("foo bar baz")).toEqual("foo␣bar␣baz");
  });

  it("replaces horizontal tabs with a unicode SYMBOL FOR HORIZONTAL TABULATION", () => {
    expect(invisibles("foo\tbar\tbaz")).toEqual("foo␉bar␉baz");
  });

  it("replaces newlines with unicode SYMBOL FOR NEWLINE", () => {
    expect(invisibles("foo\nbar\nbaz")).toEqual("foo␤bar␤baz");
  });

  it("replaces carriage returns with unicode SYMBOL FOR CARRIAGE RETURN", () => {
    expect(invisibles("foo\rbar\rbaz")).toEqual("foo␍bar␍baz");
  });

  it("replaces a mixture of special characters with their equivalent unicode symbols", () => {
    expect(invisibles("foo bar\tbaz\rqux\n")).toEqual("foo␣bar␉baz␍qux␤");
  });
});
