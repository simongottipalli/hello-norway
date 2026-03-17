# @getbrevo/brevo v4 → v5 Upgrade Plan

## Overview

Upgrade `@getbrevo/brevo` from `4.0.1` to `5.x` (latest: `5.0.1` as of March 2026).

This is a **major version bump**, but in practice it is a **low-risk upgrade**. The v4.0.0 release was the large architectural rewrite (new `BrevoClient`, TypeScript-first SDK, namespaced APIs). The v5.0.1 release is a focused bug-fix release that primarily corrects nullable type definitions.

---

## What Changed in v5

### Bug fixes (all are type corrections — no new API methods or renamed exports)

| Fix | Details |
|---|---|
| `GetCampaignStats.appleMppOpens` and `opensRate` | Now typed as `number \| null` instead of `number` |
| `Order.products` | Now exposes full product fields: `price`, `productId`, `variantId`, `quantity`, `quantityFloat` |
| `GetAccountResponsePlanVerticalsItem.users` | Now typed as optional/nullable |
| `createContact()` 204 empty body | No longer throws a JSON parse error when a contact already exists |

### Deprecation

`transactionalSms.sendTransacSms()` is now marked `@deprecated`. Use `transactionalSms.sendTransacSmsAsync()` instead. The deprecated method still works — no immediate code change is required.

---

## Codebase Usage

Only one file uses `@getbrevo/brevo`:

**`src/services/email/providers/brevoProvider.ts`**

```typescript
import { BrevoClient } from '@getbrevo/brevo';

// Instantiation — unchanged in v5
this.client = new BrevoClient({ apiKey });

// Usage — unchanged in v5
const response = await this.client.transactionalEmails.sendTransacEmail({ ... });
return { success: true, messageId: response.messageId };
```

Neither `transactionalSms`, `createContact`, nor campaign stats are used in this project. The only surface touched by v5's changes is `response.messageId`.

---

## Required Code Change

### `src/services/email/providers/brevoProvider.ts` — handle nullable `messageId`

In v5, the `sendTransacEmail` response's `messageId` field may be typed as `string | null | undefined`. The current code passes it directly:

```typescript
return { success: true, messageId: response.messageId };
```

If `EmailResult.messageId` is typed as `string | undefined` (check `src/services/email/types.ts`), this is already compatible. If it is typed as `string`, a null-coalescing guard is needed:

```typescript
return { success: true, messageId: response.messageId ?? undefined };
```

**Action:** After upgrading, run `npm run build` or check for TypeScript errors — the compiler will flag this if a type mismatch exists.

---

## Upgrade Steps

1. **Bump version in `package.json`:**

```diff
-  "@getbrevo/brevo": "^4.0.1",
+  "@getbrevo/brevo": "^5",
```

2. **Run `npm install`**

3. **Check for TypeScript errors** (particularly around `response.messageId`):

```bash
npx tsc --noEmit
```

4. **Fix any type errors** in `src/services/email/providers/brevoProvider.ts` if `messageId` nullability changed.

5. **Run unit tests:**

```bash
npm run test:unit
```

The Brevo provider tests in `src/__tests__/services/email/brevoProvider.test.ts` fully mock `@getbrevo/brevo`, so they will continue to pass regardless. The TypeScript check in step 3 is the meaningful verification here.

---

## Risk Assessment

| Area | Risk | Notes |
|---|---|---|
| `BrevoClient` instantiation | None | Unchanged in v5 |
| `transactionalEmails.sendTransacEmail` API | None | Unchanged in v5 |
| `response.messageId` nullability | Low | TypeScript compiler will catch any mismatch |
| `sendTransacSms` deprecation | None | Not used in this project |
| `createContact` 204 fix | None | Not used in this project |
| Campaign stats nullable fields | None | Not used in this project |
