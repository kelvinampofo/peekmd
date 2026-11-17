import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import "../../../../styles/system.css";

import { requireElement } from "../../test/dom";
import { LongDocumentFixture } from "./test/fixtures";

describe("TableOfContents pointer capture", () => {
  beforeEach(async () => {
    await page.viewport(390, 844);
  });

  it("navigates after dragging beyond the handle", async () => {
    const onNavigate = vi.fn();

    const screen = await render(<LongDocumentFixture onNavigate={onNavigate} />);
    const scroller = screen.getByRole("region", { name: "Long document" }).element();

    const handle = requireElement(
      screen.getByRole("button", { name: "Open table of contents" }).element(),
      HTMLButtonElement,
    );

    const captured = vi.fn<(event: PointerEvent) => void>();
    const released = vi.fn<(event: PointerEvent) => void>();

    handle.addEventListener("gotpointercapture", captured);
    handle.addEventListener("lostpointercapture", released);

    const bounds = handle.getBoundingClientRect();
    const start = { x: bounds.left + 16, y: bounds.top + 32 };

    try {
      await userEvent.pointer({ target: handle, coords: { x: 16, y: 32 }, keys: "[MouseLeft>]" });
      await userEvent.pointer({ coords: { x: start.x + 160, y: start.y } });

      await expect.element(handle).toHaveAttribute("aria-expanded", "true");
      expect(captured).toHaveBeenCalledOnce();
      const pointer = captured.mock.calls[0]?.[0];
      if (!pointer) throw new Error("The handle did not capture the pointer");
      expect(pointer.isTrusted).toBe(true);
      expect(handle.hasPointerCapture(pointer.pointerId)).toBe(true);
      await vi.waitFor(() =>
        expect(start.x + 160).toBeLessThan(handle.getBoundingClientRect().left),
      );

      await userEvent.pointer({ coords: { x: start.x + 160, y: start.y + 64 } });
      await vi.waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(0));
      await userEvent.pointer("[/MouseLeft]");

      expect(onNavigate).toHaveBeenCalledExactlyOnceWith("section-2");
      await expect.element(handle).toHaveAttribute("aria-expanded", "false");
      expect(released).toHaveBeenCalledOnce();
      expect(handle.hasPointerCapture(pointer.pointerId)).toBe(false);
    } finally {
      await userEvent.pointer("[/MouseLeft]");
    }
  });

  it("restores the reading position when list capture is lost", async () => {
    const onNavigate = vi.fn();

    const screen = await render(<LongDocumentFixture onNavigate={onNavigate} />);
    const scroller = screen.getByRole("region", { name: "Long document" }).element();

    scroller.scrollTop = 60;

    await screen.getByRole("button", { name: "Open table of contents" }).click();

    const navigation = requireElement(
      screen.getByRole("navigation", { name: "Table of contents" }).element(),
      HTMLElement,
    );

    const link = screen.getByRole("link", { name: "Section 0", exact: true }).element();

    const captured = vi.fn<(event: PointerEvent) => void>();
    const released = vi.fn<(event: PointerEvent) => void>();

    navigation.addEventListener("gotpointercapture", captured);
    navigation.addEventListener("lostpointercapture", released);

    try {
      await userEvent.pointer({ target: link, keys: "[MouseLeft>]" });

      const bounds = link.getBoundingClientRect();
      const position = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };

      await userEvent.pointer({ coords: { x: position.x, y: position.y + 64 } });
      await userEvent.pointer({ coords: { x: position.x, y: position.y + 65 } });

      expect(captured).toHaveBeenCalledOnce();
      const pointer = captured.mock.calls[0]?.[0];

      if (!pointer) throw new Error("The navigation did not capture the pointer");

      expect(pointer.isTrusted).toBe(true);
      expect(navigation.hasPointerCapture(pointer.pointerId)).toBe(true);

      await vi.waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(60));

      navigation.releasePointerCapture(pointer.pointerId);

      await userEvent.pointer({ coords: { x: position.x, y: position.y + 66 } });
      await userEvent.pointer("[/MouseLeft]");

      expect(released).toHaveBeenCalledOnce();
      expect(onNavigate).not.toHaveBeenCalled();

      await vi.waitFor(() => expect(scroller.scrollTop).toBe(60));
      await expect
        .element(screen.getByRole("button", { name: "Close table of contents" }))
        .toHaveAttribute("aria-expanded", "true");
    } finally {
      await userEvent.pointer("[/MouseLeft]");
    }
  });
});
