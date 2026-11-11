import { clamp } from "../../../../../utils/math";

const OPEN_DISTANCE = 120;
const CLOSE_THRESHOLD = 0.8;
const DRAG_HYSTERESIS_DISTANCE = 4;
const SCRUB_HYSTERESIS_DISTANCE = 16;
const SCRUB_STEP = 32;

interface Position {
  x: number;
  y: number;
}

interface ActivePointer {
  pointerId: number;
}

export type GestureSource = "handle" | "list";

export type GestureState =
  | { phase: "idle" }
  | { phase: "released" }
  | (ActivePointer & {
      phase: "pressed";
      origin: Position;
      startedOpen: boolean;
      source: GestureSource;
    })
  | (ActivePointer & { phase: "rejected" })
  | (ActivePointer & { phase: "revealing" | "closing"; originX: number; progress: number })
  | (ActivePointer & {
      phase: "scrubbing";
      originY: number;
      originIndex: number;
      selectedIndex: number;
      hasScrubbed: boolean;
    });

export type ReleaseAction =
  | { action: "none" | "toggle" | "open" | "close" }
  | { action: "navigate"; index: number };

interface GestureContext {
  currentIndex: number;
  headingCount: number;
  travelDistance: number;
}

function recogniseDrag(
  gesture: GestureState,
  position: Position,
  currentIndex: number,
): GestureState {
  if (gesture.phase !== "pressed") return gesture;

  const horizontalDistance = position.x - gesture.origin.x;
  const verticalDistance = position.y - gesture.origin.y;

  if (
    Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) <= DRAG_HYSTERESIS_DISTANCE
  ) {
    return gesture;
  }

  const isHorizontal = Math.abs(horizontalDistance) > Math.abs(verticalDistance);

  if (gesture.startedOpen && !isHorizontal) {
    return {
      phase: "scrubbing",
      pointerId: gesture.pointerId,
      originY: gesture.origin.y,
      originIndex: currentIndex,
      selectedIndex: currentIndex,
      hasScrubbed: false,
    };
  }

  if (
    gesture.source === "list" ||
    !isHorizontal ||
    (gesture.startedOpen ? horizontalDistance > 0 : horizontalDistance < 0)
  ) {
    return { phase: "rejected", pointerId: gesture.pointerId };
  }

  return {
    phase: gesture.startedOpen ? "closing" : "revealing",
    pointerId: gesture.pointerId,
    originX: gesture.origin.x,
    progress: gesture.startedOpen ? 1 : 0,
  };
}

export function moveGesture(
  gesture: GestureState,
  position: Position,
  context: GestureContext,
): GestureState {
  const { currentIndex, headingCount, travelDistance } = context;
  const drag = recogniseDrag(gesture, position, currentIndex);

  switch (drag.phase) {
    case "idle":
    case "released":
    case "pressed":
    case "rejected":
      return drag;
    case "revealing": {
      const progress = clamp((position.x - drag.originX) / OPEN_DISTANCE, 0, 1);

      return progress === 1
        ? {
            phase: "scrubbing",
            pointerId: drag.pointerId,
            originY: position.y,
            originIndex: currentIndex,
            selectedIndex: currentIndex,
            hasScrubbed: false,
          }
        : { ...drag, progress };
    }
    case "closing":
      return {
        ...drag,
        progress: clamp(1 + (position.x - drag.originX) / travelDistance, 0, 1),
      };
    case "scrubbing": {
      const verticalDistance = position.y - drag.originY;

      if (Math.abs(verticalDistance) <= SCRUB_HYSTERESIS_DISTANCE && !drag.hasScrubbed) {
        return drag;
      }

      const indexDelta = Math.trunc((position.y - drag.originY) / SCRUB_STEP);
      const selectedIndex = clamp(drag.originIndex + indexDelta, 0, headingCount - 1);

      return { ...drag, selectedIndex, hasScrubbed: true };
    }
    default:
      return drag satisfies never;
  }
}

export function releaseGesture(gesture: GestureState, cancelled: boolean): ReleaseAction {
  switch (gesture.phase) {
    case "idle":
    case "released":
    case "rejected":
      return { action: "none" };
    case "pressed":
      return { action: cancelled ? "none" : "toggle" };
    case "revealing":
      return { action: "close" };
    case "closing":
      return { action: !cancelled && gesture.progress <= CLOSE_THRESHOLD ? "close" : "open" };
    case "scrubbing":
      return !cancelled && gesture.hasScrubbed
        ? { action: "navigate", index: gesture.selectedIndex }
        : { action: "none" };
    default:
      return gesture satisfies never;
  }
}
