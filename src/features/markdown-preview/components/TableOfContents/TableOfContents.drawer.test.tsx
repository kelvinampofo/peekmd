import { page, userEvent } from "vitest/browser";
import { render, type RenderResult } from "vitest-browser-react";

import "../../../../styles/system.css";

import { requireElement } from "../../test/dom";
import { Fixture, LongDocumentFixture } from "./test/fixtures";

function gestureTouchEvent(
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  x: number,
  y: number,
) {
  const event = new UIEvent(type, { bubbles: true, cancelable: true });
  const touch = { clientX: x, clientY: y };

  Object.defineProperty(event, "touches", {
    value: type === "touchend" || type === "touchcancel" ? [] : [touch],
  });
  Object.defineProperty(event, "changedTouches", { value: [touch] });

  return event;
}

function gesturePointerEvent(
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "lostpointercapture",
  x: number,
  y: number,
) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
}

type Point = readonly [x: number, y: number];

function dragFrom(element: Element, [start, ...moves]: readonly [Point, ...Point[]]) {
  element.dispatchEvent(gesturePointerEvent("pointerdown", ...start));

  for (const move of moves) {
    element.dispatchEvent(gesturePointerEvent("pointermove", ...move));
  }
}

function backgroundAlpha(element: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Canvas context unavailable");

  context.fillStyle = getComputedStyle(element).backgroundColor;
  context.fillRect(0, 0, 1, 1);

  const alpha = context.getImageData(0, 0, 1, 1).data[3];

  if (alpha === undefined) throw new Error("Canvas pixel has no alpha channel");

  return alpha;
}

async function settle(element: Element) {
  await new Promise(requestAnimationFrame);
  await Promise.all(element.getAnimations({ subtree: true }).map(({ finished }) => finished));
}

async function openPanel(screen: RenderResult) {
  await screen.getByRole("button", { name: "Open table of contents" }).click();
  const handle = screen.getByRole("button", { name: "Close table of contents" }).element();
  await settle(requireElement(handle.closest(".table-of-contents-drawer"), HTMLElement));

  return handle;
}

describe("TableOfContents drawer", () => {
  beforeEach(async () => {
    await page.viewport(390, 844);
    vi.spyOn(Element.prototype, "setPointerCapture").mockImplementation(() => {});
    vi.spyOn(Element.prototype, "hasPointerCapture").mockReturnValue(false);
  });

  it("opens with an accessible handle and closes after a regular navigation", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);
    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents", includeHidden: true }))
      .not.toBeVisible();

    await screen.getByRole("button", { name: "Open table of contents" }).click();

    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents" }))
      .toBeVisible();
    const drawer = requireElement(
      screen
        .getByRole("navigation", { name: "Table of contents" })
        .element()
        .closest(".table-of-contents-drawer"),
      HTMLElement,
    );

    expect(drawer.getBoundingClientRect().width).toBe(390);
    expect(drawer.getBoundingClientRect().height).toBeCloseTo(844, 1);
    await screen.getByRole("link", { name: "Details" }).click();

    expect(onNavigate).toHaveBeenCalledWith("details");
    await expect
      .element(screen.getByRole("button", { name: "Open table of contents" }))
      .toHaveAttribute("aria-expanded", "false");
  });

  it("makes the background more opaque while the drawer returns off-screen", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    const drawer = requireElement(handle.closest(".table-of-contents-drawer"), HTMLElement);
    const surface = requireElement(drawer.querySelector(".table-of-contents-surface"), HTMLElement);
    const content = requireElement(
      drawer.querySelector(".table-of-contents-drawer__content"),
      HTMLElement,
    );

    await screen.getByRole("button", { name: "Open table of contents" }).click();
    await vi.waitFor(() => expect(surface.getBoundingClientRect().left).toBeCloseTo(0));
    const openAlpha = backgroundAlpha(surface);
    expect(openAlpha).toBeGreaterThan(0);
    expect(openAlpha).toBeLessThan(255);
    expect(getComputedStyle(surface).backdropFilter).toContain("blur");
    await screen.getByRole("button", { name: "Close table of contents" }).click();

    await vi.waitFor(() => expect(surface.getAnimations().length).toBeGreaterThan(0));
    const animations = drawer.getAnimations({ subtree: true });

    for (const animation of animations) {
      animation.pause();
      animation.currentTime = 150;
    }

    expect(getComputedStyle(content).visibility).toBe("visible");
    expect(surface.getBoundingClientRect().left).toBeGreaterThan(-390);
    expect(surface.getBoundingClientRect().left).toBeLessThan(0);
    expect(getComputedStyle(surface).opacity).toBe("1");
    expect(backgroundAlpha(surface)).toBeGreaterThan(openAlpha);
    expect(getComputedStyle(surface).backdropFilter).toContain("blur");

    for (const animation of animations) animation.finish();

    await vi.waitFor(() => expect(getComputedStyle(content).visibility).toBe("hidden"));
    expect(backgroundAlpha(surface)).toBe(255);
    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it.each(["pointerup", "pointercancel"] as const)(
    "abandons an incomplete opening on %s and accepts a new gesture",
    async (eventType) => {
      const onNavigate = vi.fn();
      const screen = await render(<Fixture onNavigate={onNavigate} />);
      const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

      dragFrom(handle, [
        [12, 400],
        [72, 400],
      ]);
      handle.dispatchEvent(gesturePointerEvent(eventType, 72, 400));

      await expect.element(handle).toHaveAttribute("aria-expanded", "false");
      expect(onNavigate).not.toHaveBeenCalled();

      dragFrom(handle, [
        [12, 400],
        [132, 400],
      ]);
      handle.dispatchEvent(gesturePointerEvent("pointerup", 132, 400));

      await expect.element(handle).toHaveAttribute("aria-expanded", "true");
      expect(onNavigate).not.toHaveBeenCalled();
    },
  );

  it("continues a handle drag into heading scrubbing and navigates on release", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<LongDocumentFixture onNavigate={onNavigate} />);
    const scroller = screen.getByRole("region", { name: "Long document" }).element();
    const target = screen.getByRole("heading", { name: "Section 2", exact: true }).element();
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [10, 400],
      [130, 420],
      [130, 452],
      [130, 484],
    ]);

    await expect
      .element(screen.getByRole("link", { name: "Section 2", exact: true }))
      .toHaveAttribute("data-active", "true");
    await vi.waitFor(() =>
      expect(target.getBoundingClientRect().top).toBeCloseTo(
        scroller.getBoundingClientRect().top,
        0,
      ),
    );

    handle.dispatchEvent(gesturePointerEvent("pointerup", 130, 484));

    expect(onNavigate).toHaveBeenCalledWith("section-2");
    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("scrubs down and up from a fresh press on an open handle", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<LongDocumentFixture onNavigate={onNavigate} />);
    const handle = await openPanel(screen);
    const scroller = screen.getByRole("region", { name: "Long document" }).element();
    const second = screen.getByRole("heading", { name: "Section 2", exact: true }).element();
    const first = screen.getByRole("heading", { name: "Section 1", exact: true }).element();

    dragFrom(handle, [
      [360, 400],
      [360, 464],
    ]);
    await vi.waitFor(() =>
      expect(second.getBoundingClientRect().top).toBeCloseTo(
        scroller.getBoundingClientRect().top,
        0,
      ),
    );

    handle.dispatchEvent(gesturePointerEvent("pointermove", 360, 432));
    await vi.waitFor(() =>
      expect(first.getBoundingClientRect().top).toBeCloseTo(
        scroller.getBoundingClientRect().top,
        0,
      ),
    );
    expect(onNavigate).not.toHaveBeenCalled();

    handle.dispatchEvent(gesturePointerEvent("pointerup", 360, 432));

    expect(onNavigate).toHaveBeenCalledWith("section-1");
    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("abandons a scrub without navigating when pointer capture is lost", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [10, 400],
      [130, 420],
      [130, 452],
    ]);
    await expect
      .element(screen.getByRole("link", { name: "Details" }))
      .toHaveAttribute("data-active", "true");

    handle.dispatchEvent(gesturePointerEvent("lostpointercapture", 130, 452));
    handle.dispatchEvent(gesturePointerEvent("pointerup", 130, 452));

    expect(onNavigate).not.toHaveBeenCalled();
    await expect.element(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("stays open when the opening gesture is released without vertical scrubbing", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [10, 400],
      [130, 420],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointerup", 130, 420));

    await expect.element(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape", async () => {
    const screen = await render(<Fixture />);
    const handle = await openPanel(screen);

    await userEvent.keyboard("{Escape}");

    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the viewport widens to the desktop layout", async () => {
    const screen = await render(<Fixture />);
    const handle = await openPanel(screen);

    await page.viewport(1280, 800);

    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when tapping anywhere other than a heading link", async () => {
    const screen = await render(<Fixture />);

    await screen.getByRole("button", { name: "Open table of contents" }).click();
    const list = screen
      .getByRole("navigation", { name: "Table of contents" })
      .getByRole("list")
      .element();

    list.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await expect
      .element(screen.getByRole("button", { name: "Open table of contents" }))
      .toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the table of contents open if the platform cancels after the threshold", async () => {
    const screen = await render(<Fixture />);

    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    dragFrom(handle, [
      [180, 400],
      [300, 400],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointercancel", 300, 400));

    await expect
      .element(screen.getByRole("button", { name: "Close table of contents" }))
      .toHaveAttribute("aria-expanded", "true");
  });

  it("cancels native touch behaviour only on the handle", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();
    const handleTouch = gestureTouchEvent("touchstart", 16, 400);
    const articleTouch = gestureTouchEvent("touchstart", 180, 400);

    handle.dispatchEvent(handleTouch);
    document.body.dispatchEvent(articleTouch);

    expect(handleTouch.defaultPrevented).toBe(true);
    expect(articleTouch.defaultPrevented).toBe(false);
    expect(getComputedStyle(handle).touchAction).toBe("none");
  });

  it("treats movement within the drag hysteresis distance as a tap and toggles once", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [16, 400],
      [18, 402],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointerup", 18, 402));
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));

    await expect.element(handle).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores the click after a drag but still accepts keyboard activation", async () => {
    const screen = await render(<Fixture />);
    const handle = screen.getByRole("button", { name: "Open table of contents" }).element();

    dragFrom(handle, [
      [16, 400],
      [136, 400],
    ]);
    handle.dispatchEvent(gesturePointerEvent("pointerup", 136, 400));
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    handle.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    await expect.element(handle).toHaveAttribute("aria-expanded", "true");

    handle.focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
  });

  it("scrubs from the heading list and suppresses the click after release", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<LongDocumentFixture onNavigate={onNavigate} />);
    await openPanel(screen);
    const navigation = screen.getByRole("navigation", { name: "Table of contents" }).element();
    const link = screen.getByRole("link", { name: "Section 1", exact: true }).element();
    const scroller = screen.getByRole("region", { name: "Long document" }).element();
    const second = screen.getByRole("heading", { name: "Section 2", exact: true }).element();
    const first = screen.getByRole("heading", { name: "Section 1", exact: true }).element();

    dragFrom(link, [
      [180, 300],
      [180, 364],
    ]);
    await vi.waitFor(() =>
      expect(second.getBoundingClientRect().top).toBeCloseTo(
        scroller.getBoundingClientRect().top,
        0,
      ),
    );
    link.dispatchEvent(gesturePointerEvent("lostpointercapture", 180, 364));
    navigation.dispatchEvent(gesturePointerEvent("pointermove", 180, 332));
    await vi.waitFor(() =>
      expect(first.getBoundingClientRect().top).toBeCloseTo(
        scroller.getBoundingClientRect().top,
        0,
      ),
    );
    expect(onNavigate).not.toHaveBeenCalled();
    expect(getComputedStyle(navigation).touchAction).toBe("pinch-zoom");
    const style = getComputedStyle(navigation);
    expect(
      style.getPropertyValue("user-select") || style.getPropertyValue("-webkit-user-select"),
    ).toBe("none");

    navigation.dispatchEvent(gesturePointerEvent("pointerup", 180, 332));
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 });
    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("section-1");
    await expect
      .element(screen.getByRole("button", { name: "Open table of contents" }))
      .toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a leftward handle swipe without navigating or reopening on click", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);
    const closedLeft = screen
      .getByRole("button", { name: "Open table of contents" })
      .element()
      .getBoundingClientRect().left;
    const handle = await openPanel(screen);
    const openLeft = handle.getBoundingClientRect().left;
    const drawer = requireElement(handle.closest(".table-of-contents-drawer"), HTMLElement);
    const surface = requireElement(drawer.querySelector(".table-of-contents-surface"), HTMLElement);
    const stroke = requireElement(handle.querySelector("path"), SVGPathElement);
    const openRight = surface.getBoundingClientRect().right;
    const edgeInset = openRight - stroke.getBoundingClientRect().left;

    dragFrom(handle, [
      [360, 400],
      [260, 400],
    ]);
    await vi.waitFor(() =>
      expect(handle.getBoundingClientRect().left).toBeCloseTo(openLeft - 100, 0),
    );
    expect(surface.getBoundingClientRect().right).toBeCloseTo(openRight - 100, 0);
    expect(surface.getBoundingClientRect().right - stroke.getBoundingClientRect().left).toBeCloseTo(
      edgeInset,
      0,
    );

    handle.dispatchEvent(gesturePointerEvent("pointermove", 160, 400));
    handle.dispatchEvent(gesturePointerEvent("pointerup", 160, 400));
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));

    await expect.element(handle).toHaveAttribute("aria-expanded", "false");
    await vi.waitFor(() => expect(handle.getBoundingClientRect().left).toBeCloseTo(closedLeft, 0));
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it.each(["pointerup", "pointercancel"] as const)(
    "restores the open position after a short closing drag on %s",
    async (endEvent) => {
      const screen = await render(<Fixture />);
      const handle = await openPanel(screen);
      const openLeft = handle.getBoundingClientRect().left;

      dragFrom(handle, [
        [360, 400],
        [330, 400],
      ]);
      handle.dispatchEvent(gesturePointerEvent(endEvent, 330, 400));

      await expect.element(handle).toHaveAttribute("aria-expanded", "true");
      await vi.waitFor(() => expect(handle.getBoundingClientRect().left).toBeCloseTo(openLeft, 0));
    },
  );
});
