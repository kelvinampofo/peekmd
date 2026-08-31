import { useEffect, useEffectEvent } from "react";

type ShortcutHandler = () => void;
type Shortcuts = Record<string, ShortcutHandler>;

export function useShortcuts(shortcuts: Shortcuts) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const isModifiedKey =
      event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey;

    if (isModifiedKey) {
      return;
    }

    const handler =
      shortcuts[event.key] ??
      shortcuts[event.key.toUpperCase()] ??
      shortcuts[event.key.toLowerCase()];

    handler?.();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
