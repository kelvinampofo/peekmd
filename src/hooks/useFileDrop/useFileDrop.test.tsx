import { render } from "vitest-browser-react";

import { useFileDrop } from "./useFileDrop";

interface DropAreaProps {
  onFileDrop: (file: File) => void;
  onDragOver?: () => void;
  onDrop?: () => void;
}

function DropArea({ onFileDrop, onDragOver, onDrop }: DropAreaProps) {
  const { isFileDragActive, dropHandlers } = useFileDrop(onFileDrop);

  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      <section aria-label="Drop area" data-active={isFileDragActive} {...dropHandlers}>
        <span>Child</span>
      </section>
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
  type: string,
  dataTransfer: DataTransfer,
  relatedTarget?: EventTarget,
) {
  return target.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      relatedTarget,
    }),
  );
}

describe("useFileDrop", () => {
  describe("drag state", () => {
    it("tracks a file drag until it leaves the target", async () => {
      const screen = await render(<DropArea onFileDrop={vi.fn()} />);

      const dropArea = screen.getByRole("region", { name: "Drop area" });
      const dropAreaElement = dropArea.element();

      dispatchDragEvent(dropAreaElement, "dragenter", fileTransfer());
      await expect.element(dropArea).toHaveAttribute("data-active", "true");

      dispatchDragEvent(
        dropAreaElement,
        "dragleave",
        fileTransfer(),
        screen.getByText("Child").element(),
      );
      await expect.element(dropArea).toHaveAttribute("data-active", "true");

      dispatchDragEvent(dropAreaElement, "dragleave", fileTransfer(), document.body);
      await expect.element(dropArea).toHaveAttribute("data-active", "false");
    });
  });

  describe("dragover", () => {
    it("accepts file drags as copies", async () => {
      const transfer = fileTransfer();
      const setDropEffect = vi.spyOn(DataTransfer.prototype, "dropEffect", "set");

      const screen = await render(<DropArea onFileDrop={vi.fn()} />);

      const accepted = dispatchDragEvent(
        screen.getByRole("region", { name: "Drop area" }).element(),
        "dragover",
        transfer,
      );

      expect(accepted).toBe(false);
      expect(setDropEffect).toHaveBeenCalledWith("copy");
    });

    it("stops file drags from bubbling", async () => {
      const onParentDragOver = vi.fn();
      const screen = await render(<DropArea onFileDrop={vi.fn()} onDragOver={onParentDragOver} />);

      dispatchDragEvent(
        screen.getByRole("region", { name: "Drop area" }).element(),
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

      const screen = await render(<DropArea onFileDrop={onFileDrop} onDrop={onParentDrop} />);

      const dropArea = screen.getByRole("region", { name: "Drop area" });
      const dropAreaElement = dropArea.element();

      dispatchDragEvent(dropAreaElement, "dragenter", transfer);

      const accepted = dispatchDragEvent(dropAreaElement, "drop", transfer);

      expect(accepted).toBe(false);

      await expect.element(dropArea).toHaveAttribute("data-active", "false");

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
        <DropArea onFileDrop={onFileDrop} onDragOver={onParentDragOver} onDrop={onParentDrop} />,
      );

      const dropArea = screen.getByRole("region", { name: "Drop area" });
      const dropAreaElement = dropArea.element();

      dispatchDragEvent(dropAreaElement, "dragenter", transfer);

      const dragOverAccepted = dispatchDragEvent(dropAreaElement, "dragover", transfer);
      const dropAccepted = dispatchDragEvent(dropAreaElement, "drop", transfer);

      await expect.element(dropArea).toHaveAttribute("data-active", "false");

      expect(dragOverAccepted).toBe(true);
      expect(dropAccepted).toBe(true);
      expect(transfer.dropEffect).toBe("none");
      expect(onFileDrop).not.toHaveBeenCalled();
      expect(onParentDragOver).toHaveBeenCalledOnce();
      expect(onParentDrop).toHaveBeenCalledOnce();
    });
  });
});
