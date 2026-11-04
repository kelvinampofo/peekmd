export function requireElement<T extends Element>(
  element: Element | null,
  type: abstract new () => T,
): T {
  if (!(element instanceof type)) {
    throw new Error(`Expected ${type.name}, received ${String(element)}`);
  }

  return element;
}
