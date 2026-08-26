/** Join class names, dropping falsy values. Small enough not to warrant clsx. */
export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
