import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { EMAIL_REGEX } from "./validation";

/**
 * Converts a SNAKE_CASE enum key to Title Case for display.
 * Example: 'IDENTITY_BANKING' → 'Identity Banking'
 */
export function formatEnumKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
