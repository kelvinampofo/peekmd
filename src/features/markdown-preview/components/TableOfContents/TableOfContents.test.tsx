import { useRef } from "react";
import { page, server, userEvent } from "vitest/browser";
import { render, type RenderResult } from "vitest-browser-react";

import "../../../../styles/system.css";

import { requireElement } from "../../test/dom";
import TableOfContents from "./TableOfContents";
import type { Heading } from "./types/heading";

const headings: readonly Heading[] = [
  { id: "introduction", text: "Introduction", level: 1 },
  { id: "details", text: "Details", level: 2 },
];

interface FixtureProps {
  headings?: readonly Heading[];
  onNavigate?: (id: string) => void;
}

function Fixture({ headings: fixtureHeadings = headings, onNavigate }: FixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section ref={scrollRootRef} aria-label="TOC scroller">
      <TableOfContents
        headings={fixtureHeadings}
        contentRootRef={contentRootRef}
        scrollRootRef={scrollRootRef}
        {...(onNavigate ? { onNavigate } : {})}
      />
      <article ref={contentRootRef}>
        <h1 id="introduction">Introduction</h1>
        <p>Overview</p>
        <h2 id="details">Details</h2>
      </article>
    </section>
  );
}

const longDocumentHeadings: readonly Heading[] = Array.from({ length: 40 }, (_, index) => ({
  id: `section-${index}`,
  text: `Section ${index}`,
  level: 1,
}));

interface LongDocumentFixtureProps {
  sectionHeight?: number;
  onNavigate?: (id: string) => void;
}

function LongDocumentFixture({ sectionHeight = 250, onNavigate }: LongDocumentFixtureProps) {
  const contentRootRef = useRef<HTMLElement>(null);
  const scrollRootRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={scrollRootRef}
      aria-label="Long document"
      style={{
        height: 350,
        overflow: "auto",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        alignItems: "start",
      }}
    >
      <TableOfContents
        headings={longDocumentHeadings}
        contentRootRef={contentRootRef}
        scrollRootRef={scrollRootRef}
        {...(onNavigate ? { onNavigate } : {})}
      />
      <article ref={contentRootRef}>
        {longDocumentHeadings.map((item) => (
          <section key={item.id} style={{ height: sectionHeight }}>
            <h2 id={item.id}>{item.text}</h2>
          </section>
        ))}
      </article>
    </section>
  );
}

async function tabToNextControl() {
  if (server.browser === "webkit" && server.platform === "darwin") {
    await userEvent.keyboard("{Alt>}{Tab}{/Alt}");
    return;
  }

  await userEvent.tab();
}

describe("TableOfContents", () => {
  beforeEach(async () => {
    await page.viewport(1280, 800);
  });

  it("renders native anchor links for each heading", async () => {
    const screen = await render(<Fixture />);

    const introduction = screen.getByRole("link", { name: "Introduction" });
    const details = screen.getByRole("link", { name: "Details" });

    await expect.element(introduction).toHaveAttribute("href", "#introduction");
    await expect.element(details).toHaveAttribute("href", "#details");
    await expect.element(screen.getByText("Contents")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no headings", async () => {
    const screen = await render(<Fixture headings={[]} />);

    await expect
      .element(screen.getByRole("navigation", { name: "Table of contents" }))
      .not.toBeInTheDocument();
  });

  it("reports navigation through its optional callback", async () => {
    const onNavigate = vi.fn();
    const screen = await render(<Fixture onNavigate={onNavigate} />);

    await screen.getByRole("link", { name: "Details" }).click();

    expect(onNavigate).toHaveBeenCalledWith("details");
  });

  it("moves keyboard focus through heading links in document order", async () => {
    const screen = await render(<Fixture />);

    await tabToNextControl();
    await expect.element(screen.getByRole("link", { name: "Introduction" })).toHaveFocus();

    await tabToNextControl();
    await expect.element(screen.getByRole("link", { name: "Details" })).toHaveFocus();
  });

  it("keeps the current heading visible in its own scroller without moving the article", async () => {
    const screen = await render(<LongDocumentFixture />);
    const articleScroller = screen.getByRole("region", { name: "Long document" }).element();
    const target = screen.getByRole("heading", { name: "Section 30", exact: true }).element();
    const link = screen.getByRole("link", { name: "Section 30", exact: true });
    const navigation = screen.getByRole("navigation", { name: "Table of contents" }).element();
    const drawer = requireElement(navigation.closest(".table-of-contents-drawer"), HTMLElement);
    const navigationScroller = requireElement(
      navigation.closest(".table-of-contents-drawer__content"),
      HTMLElement,
    );
    drawer.style.height = "260px";

    const positionOf = (heading: Element) =>
      heading.getBoundingClientRect().top -
      articleScroller.getBoundingClientRect().top +
      articleScroller.scrollTop +
      1;
    const isInNavigationViewport = (item: Element) => {
      const itemBounds = item.getBoundingClientRect();
      const viewport = navigationScroller.getBoundingClientRect();
      return itemBounds.top >= viewport.top - 1 && itemBounds.bottom <= viewport.bottom + 1;
    };

    const articlePosition = positionOf(target);
    articleScroller.scrollTop = articlePosition;

    await expect.element(link).toHaveAttribute("aria-current", "location");
    await vi.waitFor(() => {
      expect(isInNavigationViewport(link.element())).toBe(true);
      expect(navigationScroller.scrollTop).toBeGreaterThan(0);
    });
    expect(articleScroller.scrollTop).toBeCloseTo(articlePosition, 0);

    navigationScroller.scrollTop = 0;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    expect(navigationScroller.scrollTop).toBe(0);
    expect(articleScroller.scrollTop).toBeCloseTo(articlePosition, 0);

    const earlierLink = screen.getByRole("link", { name: "Section 10", exact: true });
    navigationScroller.scrollTop = navigationScroller.scrollHeight;
    await new Promise(requestAnimationFrame);
    expect(
      earlierLink.element().getBoundingClientRect().bottom,
      "Section 10 starts above the navigation viewport",
    ).toBeLessThan(navigationScroller.getBoundingClientRect().top);

    articleScroller.scrollTop = positionOf(
      screen.getByRole("heading", { name: "Section 10", exact: true }).element(),
    );
    await expect.element(earlierLink).toHaveAttribute("aria-current", "location");
    await vi.waitFor(() => expect(isInNavigationViewport(earlierLink.element())).toBe(true));

    articleScroller.scrollTop = 0;
    await expect
      .element(screen.getByRole("link", { name: "Section 0", exact: true }))
      .toHaveAttribute("aria-current", "location");
    await vi.waitFor(() => expect(navigationScroller.scrollTop).toBe(0));
  });

  it("tracks a long section when its heading has scrolled off-screen", async () => {
    const screen = await render(<LongDocumentFixture sectionHeight={1000} />);
    const scrollContainer = screen.getByRole("region", { name: "Long document" }).element();
    scrollContainer.scrollTop = 600;

    const current = screen.getByRole("link", { name: "Section 0", exact: true });
    await expect.element(current).toHaveAttribute("aria-current", "location");
    await expect.element(current).toHaveAttribute("data-active", "true");
    await expect
      .element(screen.getByRole("link", { name: "Section 1", exact: true }))
      .not.toHaveAttribute("data-active");
  });

  it("tracks a heading entering and leaving the bottom of the viewport", async () => {
    const screen = await render(<LongDocumentFixture sectionHeight={350} />);
    const scrollContainer = screen.getByRole("region", { name: "Long document" }).element();
    const heading = screen.getByRole("heading", { name: "Section 1", exact: true }).element();
    const link = screen.getByRole("link", { name: "Section 1", exact: true });

    await expect
      .element(screen.getByRole("link", { name: "Section 0", exact: true }))
      .toHaveAttribute("aria-current", "location");
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    expect(heading.getBoundingClientRect().top).toBe(
      scrollContainer.getBoundingClientRect().bottom,
    );
    await expect.element(link).not.toHaveAttribute("data-active");

    scrollContainer.scrollTop = 1;
    await expect.element(link).toHaveAttribute("data-active", "true");

    scrollContainer.scrollTop = 0;
    await expect.element(link).not.toHaveAttribute("data-active");

    scrollContainer.scrollTop = 1;
    await expect.element(link).toHaveAttribute("data-active", "true");
  });

  it("tracks the current section after the content grows", async () => {
    const screen = await render(<LongDocumentFixture />);
    const scrollContainer = screen.getByRole("region", { name: "Long document" }).element();
    const article = screen.getByRole("article").element();
    const firstSection = requireElement(article.querySelector("section"), HTMLElement);
    firstSection.style.height = "20000px";
    scrollContainer.scrollTop = 15000;

    const current = screen.getByRole("link", { name: "Section 0", exact: true });
    await expect.element(current).toHaveAttribute("aria-current", "location");
    await expect.element(current).toHaveAttribute("data-active", "true");
  });

  it("updates visible sections when the viewport changes size", async () => {
    const screen = await render(<LongDocumentFixture />);
    const scrollContainer = screen.getByRole("region", { name: "Long document" }).element();
    const next = screen.getByRole("link", { name: "Section 1", exact: true });
    await expect.element(next).toHaveAttribute("data-active", "true");
    const first = screen.getByRole("link", { name: "Section 0", exact: true }).element();
    const drawer = requireElement(first.closest(".table-of-contents-drawer"), HTMLElement);
    const thumb = requireElement(
      drawer.querySelector(".table-of-contents__scroll-thumb"),
      HTMLElement,
    );
    const firstItem = requireElement(first.closest("li"), HTMLLIElement).getBoundingClientRect();
    const nextItem = requireElement(
      next.element().closest("li"),
      HTMLLIElement,
    ).getBoundingClientRect();
    await vi.waitFor(() => {
      const bounds = thumb.getBoundingClientRect();
      expect(bounds.top).toBeCloseTo(firstItem.top);
      expect(bounds.bottom).toBeCloseTo(nextItem.bottom);
    });

    scrollContainer.style.height = "150px";

    await expect.element(next).not.toHaveAttribute("data-active");
    await vi.waitFor(() => {
      const bounds = thumb.getBoundingClientRect();
      expect(bounds.top).toBeCloseTo(firstItem.top);
      expect(bounds.bottom).toBeCloseTo(firstItem.bottom);
    });
    await expect
      .element(screen.getByRole("link", { name: "Section 0", exact: true }))
      .toHaveAttribute("aria-current", "location");
  });
});

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

  it("leaves heading-list scrolling to the browser", async () => {
    const screen = await render(<Fixture />);
    await openPanel(screen);
    const link = screen.getByRole("link", { name: "Details" }).element();
    const scroll = gestureTouchEvent("touchmove", 180, 300);

    link.dispatchEvent(gestureTouchEvent("touchstart", 180, 400));
    link.dispatchEvent(scroll);
    link.dispatchEvent(gestureTouchEvent("touchend", 180, 300));

    expect(scroll.defaultPrevented).toBe(false);
    expect(getComputedStyle(link).touchAction).toBe("auto");
    await expect
      .element(screen.getByRole("button", { name: "Close table of contents" }))
      .toHaveAttribute("aria-expanded", "true");
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

    dragFrom(handle, [
      [360, 400],
      [260, 400],
    ]);
    await vi.waitFor(() =>
      expect(handle.getBoundingClientRect().left).toBeCloseTo(openLeft - 100, 0),
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
