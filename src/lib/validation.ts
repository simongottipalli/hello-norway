/**
 * Basic email format regex used by the app.
 * It intentionally validates a practical subset of common email addresses,
 * not every RFC-allowed form (for example, quoted local parts and address
 * literals are not supported).
 * Kept in a server-safe module with no UI dependencies so it can be
 * imported from seed scripts and server-only code without pulling in
 * frontend helpers (clsx, tailwind-merge, etc.).
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
