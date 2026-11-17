import { page, server, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import "../../../../styles/system.css";

import { requireElement } from "../../test/dom";
import { Fixture, LongDocumentFixture } from "./test/fixtures";

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
