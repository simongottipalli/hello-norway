/**
 * RFC 5321 compliant email regex.
 * Kept in a server-safe module with no UI dependencies so it can be
 * imported from seed scripts and server-only code without pulling in
 * frontend helpers (clsx, tailwind-merge, etc.).
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
