export const TOUCH_GESTURE_CONTROL_ATTRIBUTE = "data-touch-gesture-control";

const TOUCH_GESTURE_CLAIMED_EVENT = "peekmd:touch-gesture-claimed";

export function isTouchGestureControl(target: EventTarget | null) {
  return (
    target instanceof Element && target.closest(`[${TOUCH_GESTURE_CONTROL_ATTRIBUTE}]`) !== null
  );
}

export function claimTouchGesture() {
  window.dispatchEvent(new Event(TOUCH_GESTURE_CLAIMED_EVENT));
}

export function listenForClaimedTouchGesture(listener: () => void, signal: AbortSignal) {
  window.addEventListener(TOUCH_GESTURE_CLAIMED_EVENT, listener, { signal });
}
