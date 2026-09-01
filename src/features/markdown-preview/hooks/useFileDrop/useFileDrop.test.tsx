import { render } from "vitest-browser-react";

import DropTarget from "../../components/DropTarget/DropTarget";
import { useFileDrop } from "./useFileDrop";

interface DropTargetHarnessProps {
  onFileDrop: (file: File) => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

type DragEventType = keyof Pick<
  HTMLElementEventMap,
  "dragenter" | "dragleave" | "dragover" | "drop"
>;

function DropTargetHarness({ onFileDrop, onDragOver, onDrop }: DropTargetHarnessProps) {
  const { isDraggingOver, dropHandlers } = useFileDrop(onFileDrop);

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      <DropTarget
        aria-label="Drop target"
        isDraggingOver={isDraggingOver}
        isLoaded={false}
        {...dropHandlers}
      >
        <span>Child</span>
      </DropTarget>
    </div>
  );
}

function fileTransfer() {
  const transfer = new DataTransfer();
  transfer.items.add(new File(["# Notes"], "notes.md", { type: "text/markdown" }));

  return transfer;
}

function textTransfer() {
  const transfer = new DataTransfer();
  transfer.setData("text/plain", "Not a file");

  return transfer;
}

function dispatchDragEvent(
  target: Element,
  type: DragEventType,
  dataTransfer: DataTransfer,
  relatedTarget?: EventTarget,
) {
  return target.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      relatedTarget: relatedTarget ?? null,
    }),
  );
}

describe("useFileDrop", () => {
  describe("drag state", () => {
    it("tracks a file drag until it leaves the target", async () => {
      const screen = await render(<DropTargetHarness onFileDrop={vi.fn()} />);

      const dropTarget = screen.getByRole("region", { name: "Drop target" });
      const dropTargetElement = dropTarget.element();

      dispatchDragEvent(dropTargetElement, "dragenter", fileTransfer());
      await expect.element(dropTarget).toHaveAttribute("data-dragging");

      dispatchDragEvent(
        dropTargetElement,
        "dragleave",
        fileTransfer(),
        screen.getByText("Child").element(),
      );
      await expect.element(dropTarget).toHaveAttribute("data-dragging");

      dispatchDragEvent(dropTargetElement, "dragleave", fileTransfer(), document.body);
      await expect.element(dropTarget).not.toHaveAttribute("data-dragging");
    });
  });

  describe("dragover", () => {
    it("accepts file drags as copies", async () => {
      const transfer = fileTransfer();
      const setDropEffect = vi.spyOn(DataTransfer.prototype, "dropEffect", "set");

      const screen = await render(<DropTargetHarness onFileDrop={vi.fn()} />);

      const accepted = dispatchDragEvent(
        screen.getByRole("region", { name: "Drop target" }).element(),
        "dragover",
        transfer,
      );

      expect(accepted).toBe(false);
      expect(setDropEffect).toHaveBeenCalledWith("copy");
    });

    it("stops file drags from bubbling", async () => {
      const onParentDragOver = vi.fn();

      const screen = await render(
        <DropTargetHarness onFileDrop={vi.fn()} onDragOver={onParentDragOver} />,
      );

      dispatchDragEvent(
        screen.getByRole("region", { name: "Drop target" }).element(),
        "dragover",
        fileTransfer(),
      );

      expect(onParentDragOver).not.toHaveBeenCalled();
    });
  });

  describe("drops", () => {
    it("reports an accepted file drop", async () => {
      const onFileDrop = vi.fn();
      const onParentDrop = vi.fn();
      const transfer = fileTransfer();

      const screen = await render(
        <DropTargetHarness onFileDrop={onFileDrop} onDrop={onParentDrop} />,
      );

      const dropTarget = screen.getByRole("region", { name: "Drop target" });
      const dropTargetElement = dropTarget.element();

      dispatchDragEvent(dropTargetElement, "dragenter", transfer);

      const accepted = dispatchDragEvent(dropTargetElement, "drop", transfer);

      expect(accepted).toBe(false);

      await expect.element(dropTarget).not.toHaveAttribute("data-dragging");

      expect(onFileDrop).toHaveBeenCalledOnce();
      expect(onFileDrop).toHaveBeenCalledWith(transfer.files.item(0));
      expect(onParentDrop).not.toHaveBeenCalled();
    });

    it("ignores non-file drags", async () => {
      const onFileDrop = vi.fn();
      const onParentDragOver = vi.fn();
      const onParentDrop = vi.fn();

      const transfer = textTransfer();

      const screen = await render(
        <DropTargetHarness
          onFileDrop={onFileDrop}
          onDragOver={onParentDragOver}
          onDrop={onParentDrop}
        />,
      );

      const dropTarget = screen.getByRole("region", { name: "Drop target" });
      const dropTargetElement = dropTarget.element();

      dispatchDragEvent(dropTargetElement, "dragenter", transfer);

      const dragOverAccepted = dispatchDragEvent(dropTargetElement, "dragover", transfer);
      const dropAccepted = dispatchDragEvent(dropTargetElement, "drop", transfer);

      await expect.element(dropTarget).not.toHaveAttribute("data-dragging");

      expect(dragOverAccepted).toBe(true);
      expect(dropAccepted).toBe(true);
      expect(transfer.dropEffect).toBe("none");
      expect(onFileDrop).not.toHaveBeenCalled();
      expect(onParentDragOver).toHaveBeenCalledOnce();
      expect(onParentDrop).toHaveBeenCalledOnce();
    });
  });
});
