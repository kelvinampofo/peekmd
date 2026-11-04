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
        handleProps={{ ref: handleRef }}
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

  it("shows the gesture hint after five seconds", async () => {
    const frameRef = createRef<HTMLDivElement>();
    await render(
      <Drawer {...closedState} ref={frameRef} handleProps={{}}>
        <Navigation />
      </Drawer>,
    );
    const frame = requireElement(frameRef.current, HTMLDivElement);
    const hint = requireElement(
      frame.querySelector(".table-of-contents-gesture-hint"),
      HTMLElement,
    );

    expect(getComputedStyle(hint).visibility).toBe("hidden");
    const animations = hint.getAnimations();

    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 4999;
    }

    expect(getComputedStyle(hint).visibility).toBe("hidden");

    for (const animation of animations) animation.currentTime = 5000;

    expect(getComputedStyle(hint).visibility).toBe("visible");
  });

  it.each(["pointerdown", "click"])(
    "dismisses the hint on %s and keeps it dismissed after closing",
    async (type) => {
      const frameRef = createRef<HTMLDivElement>();
      const screen = await render(
        <Drawer {...closedState} ref={frameRef} handleProps={{}}>
          <Navigation />
        </Drawer>,
      );
      const frame = requireElement(frameRef.current, HTMLDivElement);
      const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

      expect(frame.querySelector(".table-of-contents-gesture-hint")).not.toBeNull();
      handle.dispatchEvent(
        type === "pointerdown"
          ? new PointerEvent(type, { bubbles: true })
          : new MouseEvent(type, { bubbles: true }),
      );
      const hint = requireElement(
        frame.querySelector(".table-of-contents-gesture-hint"),
        HTMLElement,
      );
      await vi.waitFor(() => expect(getComputedStyle(hint).opacity).toBe("0"));

      await screen.rerender(
        <Drawer {...closedState} ref={frameRef} isOpen openProgress={1} handleProps={{}}>
          <Navigation />
        </Drawer>,
      );
      await screen.rerender(
        <Drawer {...closedState} ref={frameRef} handleProps={{}}>
          <Navigation />
        </Drawer>,
      );

      expect(getComputedStyle(hint).opacity).toBe("0");
    },
  );

  it("fades and blurs a visible hint when the handle is pressed", async () => {
    const frameRef = createRef<HTMLDivElement>();
    const screen = await render(
      <Drawer {...closedState} ref={frameRef} handleProps={{}}>
        <Navigation />
      </Drawer>,
    );
    const frame = requireElement(frameRef.current, HTMLDivElement);
    const hint = requireElement(
      frame.querySelector(".table-of-contents-gesture-hint"),
      HTMLElement,
    );

    for (const animation of hint.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 5000;
    }

    expect(getComputedStyle(hint).visibility).toBe("visible");
    expect(getComputedStyle(hint).opacity).toBe("1");
    screen
      .getByRole("button", { name: "Open table of contents" })
      .element()
      .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));

    await vi.waitFor(() =>
      expect(hint.getAnimations().some((animation) => animation instanceof CSSTransition)).toBe(
        true,
      ),
    );
    const transitions = hint
      .getAnimations()
      .filter((animation) => animation instanceof CSSTransition);

    for (const transition of transitions) {
      transition.pause();
      transition.currentTime = 90;
    }

    const opacity = Number(getComputedStyle(hint).opacity);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    expect(getComputedStyle(hint).filter).toContain("blur");

    for (const transition of transitions) transition.finish();

    await vi.waitFor(() => expect(getComputedStyle(hint).opacity).toBe("0"));
  });

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
