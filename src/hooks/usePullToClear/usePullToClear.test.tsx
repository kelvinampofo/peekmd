import { render } from "vitest-browser-react";

import { startPull, touchEvent } from "../../test/touch";
import { usePullToClear } from "./usePullToClear";

interface ScrollerProps {
  enabled?: boolean;
  onClear: () => void;
}

function Scroller({ enabled = true, onClear }: ScrollerProps) {
  const scrollRef = usePullToClear({ enabled, onClear });

  return (
    <section ref={scrollRef} aria-label="scroller" style={{ height: "200px", overflow: "auto" }}>
      <div style={{ height: "600px" }} />
    </section>
  );
}

describe("usePullToClear", () => {
  async function renderScroller() {
    const onClear = vi.fn();
    const screen = await render(<Scroller onClear={onClear} />);

    return { onClear, scroller: screen.getByRole("region").element() };
  }

  it("clears when a pull is released past the threshold", async () => {
    const { onClear, scroller } = await renderScroller();

    const endY = startPull(scroller, 300);
    scroller.dispatchEvent(touchEvent("touchend", [endY]));

    expect(onClear).toHaveBeenCalledOnce();
  });

  it("keeps the preview when a pull stops short of the threshold", async () => {
    const { onClear, scroller } = await renderScroller();

    const endY = startPull(scroller, 80);
    scroller.dispatchEvent(touchEvent("touchend", [endY]));

    expect(onClear).not.toHaveBeenCalled();
  });

  it("leaves scrolling alone until the end of the document is reached", async () => {
    const { onClear, scroller } = await renderScroller();
    const grabY = scroller.getBoundingClientRect().bottom - 20;

    scroller.dispatchEvent(touchEvent("touchstart", [grabY]));
    scroller.dispatchEvent(touchEvent("touchmove", [grabY - 300]));
    scroller.dispatchEvent(touchEvent("touchend", [grabY - 300]));

    expect(onClear).not.toHaveBeenCalled();
  });

  it("does not clear when the document reaches the end mid-gesture", async () => {
    const { onClear, scroller } = await renderScroller();
    const grabY = scroller.getBoundingClientRect().bottom - 20;

    scroller.dispatchEvent(touchEvent("touchstart", [grabY]));

    scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;

    scroller.dispatchEvent(touchEvent("touchmove", [grabY - 100]));
    scroller.dispatchEvent(touchEvent("touchmove", [grabY - 400]));
    scroller.dispatchEvent(touchEvent("touchend", [grabY - 400]));

    expect(onClear).not.toHaveBeenCalled();
  });

  it("abandons the pull when a second finger joins", async () => {
    const { onClear, scroller } = await renderScroller();
    const grabY = scroller.getBoundingClientRect().bottom - 20;

    startPull(scroller, 300);
    // a second finger starts a pinch
    scroller.dispatchEvent(touchEvent("touchstart", [grabY - 300, grabY]));
    scroller.dispatchEvent(touchEvent("touchend", [grabY - 300]));

    expect(onClear).not.toHaveBeenCalled();
  });

  it("abandons a pull that the system interrupts", async () => {
    const { onClear, scroller } = await renderScroller();

    startPull(scroller, 300);
    scroller.dispatchEvent(touchEvent("touchcancel", []));

    expect(onClear).not.toHaveBeenCalled();
  });

  it("abandons an active pull when disabled", async () => {
    const onClear = vi.fn();
    const screen = await render(<Scroller onClear={onClear} />);
    const scroller = screen.getByRole("region").element();
    const endY = startPull(scroller, 300);

    await screen.rerender(<Scroller enabled={false} onClear={onClear} />);
    scroller.dispatchEvent(touchEvent("touchend", [endY]));

    expect(onClear).not.toHaveBeenCalled();
  });
});
