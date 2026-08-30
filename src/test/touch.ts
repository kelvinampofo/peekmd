// Playwright WebKit cannot construct Touch entries, so emulate the touch lists read by the hook
type TouchEventType = "touchstart" | "touchmove" | "touchend" | "touchcancel";

export function touchEvent(type: TouchEventType, clientYs: number[]) {
  const event = new UIEvent(type, { bubbles: true });
  const touches = clientYs.map((clientY) => ({ clientY }));

  Object.defineProperty(event, "touches", {
    value: type === "touchend" || type === "touchcancel" ? [] : touches,
  });
  Object.defineProperty(event, "changedTouches", { value: touches });

  return event;
}

export function startPull(scroller: Element, travel: number, startY?: number) {
  scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;

  const grabY = startY ?? scroller.getBoundingClientRect().bottom - 20;

  scroller.dispatchEvent(touchEvent("touchstart", [grabY]));
  scroller.dispatchEvent(touchEvent("touchmove", [grabY - travel]));

  return grabY - travel;
}
