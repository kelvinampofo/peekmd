import { createRef } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import "../../../../../styles/system.css";

import { requireElement } from "../../../test/dom";
import Drawer from "./Drawer";

const closedState = {
  isOpen: false,
  isDragging: false,
  openProgress: 0,
  onCloseComplete: () => {},
};

function Navigation() {
  return (
    <nav id="table-of-contents-navigation" aria-label="Table of contents">
      <a href="#details">Details</a>
    </nav>
  );
}

describe("Drawer", () => {
  beforeEach(async () => {
    await page.viewport(390, 844);
  });

  it("renders navigation children and exposes the frame and handle refs", async () => {
    const frameRef = createRef<HTMLDivElement>();
    const handleRef = createRef<HTMLButtonElement>();

    const screen = await render(
      <Drawer
        ref={frameRef}
        isOpen
        isDragging={false}
        openProgress={1}
        handleProps={{ ref: handleRef, "aria-controls": "table-of-contents-navigation" }}
        onCloseComplete={() => {}}
      >
        <Navigation />
      </Drawer>,
    );
    const handle = screen.getByRole("button", { name: "Close table of contents" });
    const navigation = screen.getByRole("navigation", { name: "Table of contents" });

    expect(frameRef.current?.contains(navigation.element())).toBe(true);
    expect(handleRef.current).toBe(handle.element());

    await expect.element(handle).toHaveAttribute("aria-controls", navigation.element().id);
    await expect.element(navigation).toBeVisible();
  });

  it("updates disclosure state while keeping the frame and handle mounted", async () => {
    const frameRef = createRef<HTMLDivElement>();
    const handleRef = createRef<HTMLButtonElement>();

    const screen = await render(
      <Drawer {...closedState} ref={frameRef} handleProps={{ ref: handleRef }}>
        <Navigation />
      </Drawer>,
    );
    const originalFrame = frameRef.current;
    const originalHandle = handleRef.current;

    await screen.rerender(
      <Drawer
        ref={frameRef}
        isOpen
        isDragging={false}
        openProgress={1}
        handleProps={{ ref: handleRef }}
        onCloseComplete={() => {}}
      >
        <Navigation />
      </Drawer>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Close table of contents" }))
      .toHaveAttribute("aria-expanded", "true");
    expect(frameRef.current).toBe(originalFrame);
    expect(handleRef.current).toBe(originalHandle);

    await screen.rerender(
      <Drawer {...closedState} ref={frameRef} handleProps={{ ref: handleRef }}>
        <Navigation />
      </Drawer>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Open table of contents" }))
      .toHaveAttribute("aria-expanded", "false");
    expect(frameRef.current).toBe(originalFrame);
    expect(handleRef.current).toBe(originalHandle);
  });

  it("gives the handle two small chevron tugs after 3.5 seconds", async () => {
    const screen = await render(
      <Drawer {...closedState} ref={null} handleProps={{}}>
        <Navigation />
      </Drawer>,
    );
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    const stroke = requireElement(handle.querySelector("path"), SVGPathElement);
    const start = handle.getBoundingClientRect().left;
    const straight = getComputedStyle(stroke).transform;
    const animations = handle.getAnimations({ subtree: true });

    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 3499;
    }
    expect(getComputedStyle(stroke).transform).toBe(straight);

    for (const animation of animations) {
      animation.currentTime = 4100;
    }

    expect(getComputedStyle(stroke).transform).not.toBe(straight);
    expect(handle.getBoundingClientRect().left).toBe(start);

    for (const animation of animations) {
      animation.currentTime = 5000;
    }

    expect(getComputedStyle(stroke).transform).toBe(straight);

    for (const animation of animations) {
      animation.currentTime = 6500;
    }

    expect(getComputedStyle(stroke).transform).not.toBe(straight);

    for (const animation of animations) {
      animation.currentTime = 8300;
    }

    expect(getComputedStyle(stroke).transform).toBe(straight);
  });

  it.each(["pointerdown", "click"])(
    "stops the handle hint on %s and keeps it dismissed after closing",
    async (type) => {
      const screen = await render(
        <Drawer {...closedState} ref={null} handleProps={{}}>
          <Navigation />
        </Drawer>,
      );
      const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
      const stroke = requireElement(handle.querySelector("path"), SVGPathElement);
      const straight = getComputedStyle(stroke).transform;
      const animations = handle.getAnimations({ subtree: true });

      for (const animation of animations) {
        animation.pause();
        animation.currentTime = 4100;
      }

      expect(getComputedStyle(stroke).transform).not.toBe(straight);
      handle.dispatchEvent(
        type === "pointerdown"
          ? new PointerEvent(type, { bubbles: true })
          : new MouseEvent(type, { bubbles: true }),
      );

      await vi.waitFor(() => expect(handle.getAnimations({ subtree: true })).toHaveLength(0));
      expect(getComputedStyle(stroke).transform).toBe(straight);

      await screen.rerender(
        <Drawer {...closedState} ref={null} isOpen openProgress={1} handleProps={{}}>
          <Navigation />
        </Drawer>,
      );
      await screen.rerender(
        <Drawer {...closedState} ref={null} handleProps={{}}>
          <Navigation />
        </Drawer>,
      );

      await vi.waitFor(() => expect(handle.getAnimations({ subtree: true })).toHaveLength(0));
    },
  );

  it("keeps the list off-screen while the handle is dragged", async () => {
    const frameRef = createRef<HTMLDivElement>();
    const screen = await render(
      <Drawer {...closedState} ref={frameRef} isDragging openProgress={0.5} handleProps={{}}>
        <Navigation />
      </Drawer>,
    );
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    const frame = requireElement(frameRef.current, HTMLDivElement);
    const surface = requireElement(frame.querySelector(".table-of-contents-surface"), HTMLElement);

    expect(surface.getBoundingClientRect().right).toBeCloseTo(0);
    expect(handle.getBoundingClientRect().left).toBe(0);
  });

  it.each([
    { x: 56, y: 32 },
    { x: 22, y: -8 },
    { x: 22, y: 72 },
  ])("accepts a press in the expanded handle target at $x,$y", async (position) => {
    const onClick = vi.fn();
    const screen = await render(
      <Drawer {...closedState} ref={null} handleProps={{ onClick }}>
        <Navigation />
      </Drawer>,
    );

    await screen.getByRole("button", { name: "Open table of contents" }).click({ position });

    expect(onClick).toHaveBeenCalledOnce();
  });
});
