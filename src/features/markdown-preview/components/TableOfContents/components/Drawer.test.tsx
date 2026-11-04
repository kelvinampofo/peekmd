import { createRef } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import "../../../../../styles/system.css";

import { requireElement } from "../../../test/dom";
import Drawer from "./Drawer";

const closedState = { isOpen: false, isDragging: false, openProgress: 0 };

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

  it("keeps the list off-screen while the handle is dragged", async () => {
    const frameRef = createRef<HTMLDivElement>();
    const screen = await render(
      <Drawer ref={frameRef} isOpen={false} isDragging openProgress={0.5} handleProps={{}}>
        <Navigation />
      </Drawer>,
    );
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    const frame = requireElement(frameRef.current, HTMLDivElement);
    const surface = requireElement(frame.querySelector(".table-of-contents-surface"), HTMLElement);

    expect(surface.getBoundingClientRect().right).toBeCloseTo(0);
    expect(handle.getBoundingClientRect().left).toBe(0);
  });
});
