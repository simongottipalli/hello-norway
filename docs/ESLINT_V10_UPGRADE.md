# ESLint v9 → v10 Upgrade Plan

## Overview

Upgrade `eslint` from `9.39.3` to `10.x` (latest: `10.0.3` as of March 2026).

This is a **major version bump**. The project already uses ESLint's flat config format (`eslint.config.mjs`), which is the only format supported in v10 — so the biggest migration hurdle most projects face does not apply here.

---

## Critical Prerequisite — `eslint-config-next` Compatibility

Before upgrading ESLint, confirm that `eslint-config-next` supports v10. The project currently pins `eslint-config-next: "16.1.7"` which targets ESLint v9 as a peer dependency.

**Action required:** Check `eslint-config-next`'s peer dependency range before upgrading ESLint:

```bash
npm info eslint-config-next peerDependencies
```

If `eslint-config-next` does not yet declare ESLint v10 as a supported peer, hold this upgrade until it does. Running ESLint v10 with a config that only supports v9 will produce peer dependency warnings and may cause unexpected linting behavior.

---

## What's Already v10-Ready

| Area | Status |
|---|---|
| Uses `eslint.config.mjs` flat config | Old `.eslintrc` format removed in v10 — already migrated |
| No `/* eslint-env */` comments in codebase | These are errors in v10 — not used here |
| No custom ESLint rules or plugins authored | Breaking changes for plugin developers don't apply |
| Node.js version requirement ≥ v20.19.0 | Meets v10 minimum |

---

## Breaking Changes That Apply

### 1. Three new rules added to `eslint:recommended`

ESLint v10 adds these rules to the recommended preset, which `eslint-config-next` extends:

| Rule | What it catches |
|---|---|
| `preserve-caught-error` | Requires using the caught error variable in catch blocks |
| `no-useless-assignment` | Warns on assigned variables that are never read |
| `no-unassigned-vars` | Warns on declared but never assigned variables |

**Action:** After upgrading, run `npm run lint` to surface any new violations. Fix them or disable the rules selectively in `eslint.config.mjs` if they're too noisy.

### 2. JSX references are now tracked

ESLint v10 correctly treats JSX identifiers (e.g. `<MyComponent />`) as references. This fixes false positives and false negatives in `no-unused-vars` and `no-undef` for React components.

**Impact:** May surface new `no-unused-vars` or `no-undef` errors on React components that weren't reported before.

**Action:** Run `npm run lint` after upgrading and fix any newly reported issues.

### 3. New config file lookup algorithm (default changed)

In v9, ESLint located `eslint.config.*` from the current working directory. In v10, it searches upward from each **linted file's** directory. This is now the default and the `v10_config_lookup_from_file` flag has been removed.

**Impact:** Low — for a standard single-workspace project this is equivalent behavior. Only affects monorepos or unusual directory structures.

---

## Breaking Changes That Do Not Apply

| Breaking Change | Why it doesn't apply |
|---|---|
| Old config format removed | Already using `eslint.config.mjs` flat config |
| `eslint-env` comments are errors | No `/* eslint-env */` comments in the codebase |
| `FlatESLint` / `LegacyESLint` APIs removed | Not using the ESLint Node.js API directly |
| `func-names` schema stricter | Rule not explicitly configured |
| `no-invalid-regexp` unique flags | Rule not explicitly configured |
| `radix` deprecated options | Rule not explicitly configured |
| `chalk` replaced by `styleText` in stylish formatter | Only affects terminal color output behavior |
| Deprecated `context` members removed | No custom ESLint rules written |
| Deprecated `SourceCode` methods removed | No custom ESLint rules written |

---

## Upgrade Steps

1. **Verify `eslint-config-next` peer compatibility** (see prerequisite above)
2. **Bump version in `package.json`:**

```diff
-  "eslint": "^9.39.3",
+  "eslint": "^10",
```

3. **Run `npm install`**
4. **Run the linter and fix any new violations:**

```bash
npm run lint
```

5. **Run unit tests to verify no regressions:**

```bash
npm run test:unit
```

---

## Risk Assessment

| Area | Risk | Notes |
|---|---|---|
| `eslint-config-next` peer compat | **High** — blocks upgrade if unsupported | Check before proceeding |
| New `eslint:recommended` rules | Medium | Likely to surface new lint errors in app code |
| JSX reference tracking | Low–Medium | Could produce new `no-unused-vars` reports |
| Config lookup algorithm change | Low | Equivalent for single-workspace projects |
| Everything else | Low | Not applicable to this codebase |
