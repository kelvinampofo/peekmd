import { getReadingPosition } from "./readingPosition";

describe("reading position", () => {
  it("keeps a long section current after its heading leaves the viewport", () => {
    expect(
      getReadingPosition([
        { id: "introduction", beforeReadingLine: true, inViewport: false },
        { id: "details", beforeReadingLine: false, inViewport: true },
        { id: "summary", beforeReadingLine: false, inViewport: false },
      ]),
    ).toEqual({ currentId: "introduction", visibleIds: ["introduction", "details"] });
  });

  it("retains the current section when no heading is visible", () => {
    expect(
      getReadingPosition([
        { id: "introduction", beforeReadingLine: true, inViewport: false },
        { id: "details", beforeReadingLine: false, inViewport: false },
      ]),
    ).toEqual({ currentId: "introduction", visibleIds: ["introduction"] });
  });

  it("changes the current heading when it reaches the reading line", () => {
    expect(
      getReadingPosition([
        { id: "introduction", beforeReadingLine: true, inViewport: false },
        { id: "details", beforeReadingLine: true, inViewport: true },
        { id: "summary", beforeReadingLine: false, inViewport: false },
      ]),
    ).toEqual({ currentId: "details", visibleIds: ["details"] });
  });

  it("uses the first heading before the article reaches the reading line", () => {
    expect(
      getReadingPosition([{ id: "introduction", beforeReadingLine: false, inViewport: true }]),
    ).toEqual({ currentId: "introduction", visibleIds: ["introduction"] });
  });

  it("has no reading position without headings", () => {
    expect(getReadingPosition([])).toEqual({ currentId: undefined, visibleIds: [] });
  });
});
