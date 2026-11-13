import { moveGesture, releaseGesture, type GestureState } from "./drawer";

const context = { currentIndex: 3, headingCount: 10, travelDistance: 300, scrollTop: 0 };

const closedPress: GestureState = {
  phase: "pressed",
  pointerId: 1,
  origin: { x: 100, y: 200 },
  startedOpen: false,
  source: "handle",
};

const scrub: GestureState = {
  phase: "scrubbing",
  pointerId: 1,
  originY: 200,
  originIndex: 3,
  originScrollTop: 0,
  selectedIndex: 3,
  hasScrubbed: false,
};

describe("TOC gestures", () => {
  it.each([
    [0, 0],
    [4, 4],
    [-4, -4],
  ])("preserves a press within the drag hysteresis distance (%i, %i)", (x, y) => {
    const next = moveGesture(closedPress, { x: 100 + x, y: 200 + y }, context);

    expect(next.phase).toBe("pressed");
  });

  it.each([
    [-10, 0],
    [0, 10],
    [10, 10],
  ])("rejects an unsupported opening direction (%i, %i)", (x, y) => {
    const next = moveGesture(closedPress, { x: 100 + x, y: 200 + y }, context);

    expect(next.phase).toBe("rejected");
  });

  it("reports a partial reveal and clamps reversal at the closed position", () => {
    const partial = moveGesture(closedPress, { x: 160, y: 200 }, context);
    const reversed = moveGesture(partial, { x: 50, y: 200 }, context);

    expect(partial).toMatchObject({ phase: "revealing", progress: 0.5 });
    expect(reversed).toMatchObject({ phase: "revealing", progress: 0 });
  });

  it.each([
    [159, "close"],
    [160, "open"],
    [219, "open"],
  ] as const)("releases an opening drag at x = %i with %s", (x, action) => {
    const next = moveGesture(closedPress, { x, y: 200 }, context);

    expect(next.phase).toBe("revealing");
    expect(releaseGesture(next, false)).toEqual({ action });
  });

  it("closes a cancelled opening drag past its threshold", () => {
    const next = moveGesture(closedPress, { x: 219, y: 200 }, context);

    expect(releaseGesture(next, true)).toEqual({ action: "close" });
  });

  it("starts scrubbing from the current heading when opening reaches its threshold", () => {
    const opened = moveGesture(closedPress, { x: 220, y: 230 }, context);
    const next = moveGesture(opened, { x: 220, y: 262 }, context);

    expect(opened).toMatchObject({ phase: "scrubbing", selectedIndex: 3, hasScrubbed: false });
    expect(next).toMatchObject({ phase: "scrubbing", selectedIndex: 4, hasScrubbed: true });
  });

  it("recognises a vertical drag before the first heading step", () => {
    const press: GestureState = { ...closedPress, startedOpen: true };
    const next = moveGesture(press, { x: 100, y: 205 }, context);

    expect(next).toMatchObject({ phase: "scrubbing", selectedIndex: 3, hasScrubbed: false });
    expect(releaseGesture(next, false)).toEqual({ action: "none" });
  });

  it("scrubs directly when a press begins on an open drawer", () => {
    const press: GestureState = { ...closedPress, startedOpen: true };
    const next = moveGesture(press, { x: 100, y: 232 }, context);

    expect(next).toMatchObject({ phase: "scrubbing", selectedIndex: 4 });
  });

  it("keeps the scroll position from where scrubbing began", () => {
    const press: GestureState = { ...closedPress, startedOpen: true };
    const started = moveGesture(press, { x: 100, y: 205 }, { ...context, scrollTop: 480 });
    const moved = moveGesture(started, { x: 100, y: 264 }, { ...context, scrollTop: 900 });

    expect(started).toMatchObject({ phase: "scrubbing", originScrollTop: 480 });
    expect(moved).toMatchObject({ phase: "scrubbing", originScrollTop: 480 });
  });

  it.each([
    [31, 3],
    [32, 4],
    [64, 5],
    [-31, 3],
    [-32, 2],
    [-1000, 0],
    [1000, 9],
  ])("maps vertical travel of %ipx to heading %i", (distance, selectedIndex) => {
    const next = moveGesture(scrub, { x: 220, y: 200 + distance }, context);

    expect(next).toMatchObject({ phase: "scrubbing", selectedIndex });
  });

  it("remembers navigation after the pointer returns to its starting heading", () => {
    const next = moveGesture(scrub, { x: 220, y: 232 }, context);
    const returned = moveGesture(next, { x: 220, y: 200 }, { ...context, currentIndex: 4 });

    expect(returned).toMatchObject({ phase: "scrubbing", selectedIndex: 3, hasScrubbed: true });
    expect(releaseGesture(returned, false)).toEqual({ action: "none" });
  });

  it("distinguishes a closing swipe from vertical scrubbing", () => {
    const press: GestureState = { ...closedPress, startedOpen: true };
    const closing = moveGesture(press, { x: -50, y: 200 }, context);

    expect(closing).toMatchObject({ phase: "closing", progress: 0.5 });
    expect(releaseGesture(closing, false)).toEqual({ action: "close" });
    expect(releaseGesture(closing, true)).toEqual({ action: "open" });
  });

  it("rejects horizontal closing from the heading list", () => {
    const press: GestureState = { ...closedPress, startedOpen: true, source: "list" };
    const next = moveGesture(press, { x: -50, y: 200 }, context);

    expect(next.phase).toBe("rejected");
    expect(releaseGesture(next, false)).toEqual({ action: "none" });
  });

  it("restores an open drawer when a closing drag is reversed", () => {
    const press: GestureState = { ...closedPress, startedOpen: true };
    const closing = moveGesture(press, { x: -50, y: 200 }, context);
    const reversed = moveGesture(closing, { x: 95, y: 200 }, context);

    expect(reversed.phase).toBe("closing");
    expect(releaseGesture(reversed, false)).toEqual({ action: "open" });
  });

  it("does not navigate when a scrub is cancelled", () => {
    const moved = moveGesture(scrub, { x: 220, y: 264 }, context);

    expect(releaseGesture(moved, true)).toEqual({ action: "none" });
    expect(releaseGesture(moved, false)).toEqual({ action: "navigate", index: 5 });
  });

  it.each(["idle", "rejected"] as const)("does not restart a %s session on movement", (phase) => {
    const gesture: GestureState = phase === "rejected" ? { phase, pointerId: 1 } : { phase };

    expect(moveGesture(gesture, { x: 400, y: 800 }, context)).toBe(gesture);
  });
});
