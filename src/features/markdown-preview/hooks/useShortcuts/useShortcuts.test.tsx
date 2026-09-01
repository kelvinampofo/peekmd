import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { useShortcuts } from "./useShortcuts";

function Shortcuts({ onClear }: { onClear: () => void }) {
  useShortcuts({ C: onClear });

  return null;
}

describe("useShortcuts", () => {
  it("matches letter keys without regard to case", async () => {
    const onClear = vi.fn();

    await render(<Shortcuts onClear={onClear} />);

    await userEvent.keyboard("c{Shift>}c{/Shift}");

    expect(onClear).toHaveBeenCalledTimes(2);
  });

  it("uses the latest handler", async () => {
    const firstHandler = vi.fn();
    const nextHandler = vi.fn();

    const { rerender } = await render(<Shortcuts onClear={firstHandler} />);

    await rerender(<Shortcuts onClear={nextHandler} />);
    await userEvent.keyboard("c");

    expect(firstHandler).not.toHaveBeenCalled();
    expect(nextHandler).toHaveBeenCalledOnce();
  });

  it("does not run when using a modifier", async () => {
    const onClear = vi.fn();

    await render(<Shortcuts onClear={onClear} />);

    await userEvent.keyboard("{Control>}c{/Control}{Alt>}c{/Alt}{Meta>}c{/Meta}");

    expect(onClear).not.toHaveBeenCalled();
  });

  it("ignores repeated and already handled keydowns", async () => {
    const onClear = vi.fn();

    await render(<Shortcuts onClear={onClear} />);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c", repeat: true }));

    const handledEvent = new KeyboardEvent("keydown", { cancelable: true, key: "c" });
    handledEvent.preventDefault();
    window.dispatchEvent(handledEvent);

    expect(onClear).not.toHaveBeenCalled();
  });
});
