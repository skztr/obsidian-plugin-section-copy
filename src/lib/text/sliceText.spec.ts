import { sliceText } from "./sliceText";

describe("sliceText", () => {
  it("calls sliceString if the passed object supports it", () => {
    const sliceStringer = {
      sliceString(from: number, to: number) {
        return "sliceString called";
      },
      slice(from: number, to: number) {
        return "slice called";
      },
    };
    expect(sliceText(sliceStringer, 0, 1)).toEqual("sliceString called");
  });

  it("calls slice, otherwise", () => {
    const sliceStringer = {
      slice(from: number, to: number): string {
        return "slice called";
      },
    };
    expect(sliceText(sliceStringer, 0, 1)).toEqual("slice called");
  });
});
