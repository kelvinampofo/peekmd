import { createRef } from "react";
import { render } from "vitest-browser-react";

import DropTarget from "./DropTarget";

describe("DropTarget", () => {
  it("forwards section props, content, and its ref", async () => {
    const ref = createRef<HTMLElement>();
    const onClick = vi.fn();

    const screen = await render(
      <DropTarget
        ref={ref}
        aria-label="Drop target"
        isDraggingOver={false}
        isLoaded={false}
        onClick={onClick}
      >
        Preview
      </DropTarget>,
    );
    const dropTarget = screen.getByRole("region", { name: "Drop target" });

    await expect.element(dropTarget).toHaveTextContent("Preview");
    expect(ref.current).toBe(dropTarget.element());

    await dropTarget.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("exposes active states as data attributes", async () => {
    const screen = await render(<DropTarget aria-label="Drop target" isDraggingOver isLoaded />);

    const dropTarget = screen.getByRole("region", { name: "Drop target" });

    await expect.element(dropTarget).toHaveAttribute("data-dragging");
    await expect.element(dropTarget).toHaveAttribute("data-loaded");
  });

  it("omits inactive state attributes", async () => {
    const screen = await render(
      <DropTarget aria-label="Drop target" isDraggingOver={false} isLoaded={false} />,
    );

    const dropTarget = screen.getByRole("region", { name: "Drop target" });

    await expect.element(dropTarget).not.toHaveAttribute("data-dragging");
    await expect.element(dropTarget).not.toHaveAttribute("data-loaded");
  });
});
