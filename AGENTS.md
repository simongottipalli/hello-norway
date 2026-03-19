# Agent Instructions

## Implementation Workflow

When implementing planned tasks:
- Execute one task at a time
- Wait for user confirmation before proceeding to the next task
- This allows for iterative review and adjustment during implementation

## Testing Requirements

### For Backend Tasks (API Routes, Controllers, Services)

When implementing or modifying backend functionality, **ALWAYS**:

1. **Include Testing in Planning**
   - Add test creation/updates as explicit tasks in the implementation plan
   - Estimate test coverage needed (happy path + error cases)
   - Consider edge cases and validation requirements

2. **Write Tests During Implementation**
   - Create or update test files in `src/__tests__/`
   - Follow the existing test structure and patterns
   - Use Vitest + Supertest for API endpoint testing
   - Cover both success scenarios and error handling

3. **Test Coverage Requirements**
   - ✅ Happy path (successful operations)
   - ✅ Error handling (400, 404, 500 responses)
   - ✅ Data validation (required fields, constraints)
   - ✅ Edge cases (duplicates, not found, etc.)

4. **Run Tests After Implementation**
   - Execute `npm run test:unit` to verify all tests pass
   - Fix any failing tests before marking task complete
   - Ensure no regression in existing tests
   - Update test documentation if needed

5. **Test File Organization**
   ```
   src/__tests__/
   ├── setup.ts              # Test configuration
   ├── [feature].test.ts     # Feature-specific tests
   └── README.md             # Test documentation
   ```

### Example Test Structure

```typescript
describe("Feature Name", () => {
  describe("GET /endpoint", () => {
    it("should return success response", async () => {
      // Test implementation
    });

    it("should handle errors correctly", async () => {
      // Error case testing
    });
  });
});
```

### When to Skip Testing

Only skip testing when:
- Making trivial changes (typos, comments)
- Updating documentation only
- Modifying configuration files
- User explicitly requests no tests

**Default behavior: Always include testing for backend changes.**

---

## Documentation Maintenance

Before opening a PR, follow the workflow in [docs/DOCUMENTATION_MAINTENANCE.md](docs/DOCUMENTATION_MAINTENANCE.md) to update any relevant documentation affected by your changes.

---

## UI Development Guidelines

This project uses **shadcn/ui** with a **zinc** design system on top of Tailwind CSS v4.

### Component Source

All UI primitives live in `src/components/ui/`. **Always use these components** instead of writing raw HTML elements with manual Tailwind classes.

| Component | File | Use for |
|---|---|---|
| `Button` | `ui/button.tsx` | All clickable actions |
| `Card`, `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription` | `ui/card.tsx` | Content containers and panels |
| `Input` | `ui/input.tsx` | All text inputs |
| `Label` | `ui/label.tsx` | Form field labels (pair with `Input`) |
| `Badge` | `ui/badge.tsx` | Status indicators and category tags |

### Adding New Components

When you need a component not yet in `src/components/ui/`:

1. Check [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components) first
2. Copy the component source and place it in `src/components/ui/<name>.tsx`
3. Use the `cn()` helper from `@/lib/utils` for className merging
4. Follow the existing `data-slot` + `React.ComponentProps` pattern

```bash
# Or use the CLI to add a component automatically
npx shadcn@latest add <component-name>
```

### Design Tokens

All colors, spacing, and radii are defined as CSS variables in `src/app/globals.css`. Never hardcode raw color values — always use semantic tokens:

| Token class | Meaning |
|---|---|
| `bg-background` / `text-foreground` | Page background and body text |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-primary` / `text-primary-foreground` | Primary actions (buttons) |
| `bg-secondary` / `text-secondary-foreground` | Secondary/muted actions |
| `bg-muted` / `text-muted-foreground` | Subtle text and disabled states |
| `bg-accent` / `text-accent-foreground` | Hover states |
| `text-destructive` / `bg-destructive` | Errors and destructive actions |
| `border-border` | All borders |
| `border-input` | Form input borders |
| `ring-ring` | Focus rings |

### Dark Mode

Dark mode is automatic via `@media (prefers-color-scheme: dark)` — no class toggling needed. The CSS variables in `globals.css` switch automatically. Do **not** add manual `dark:bg-*` overrides when using the semantic token classes above.

### File Structure

```
src/
  components/
    ui/              # shadcn/ui primitives — DO NOT add business logic here
      button.tsx
      card.tsx
      input.tsx
      label.tsx
      badge.tsx
    [Feature].tsx    # Feature components that compose ui/ primitives
  lib/
    utils.ts         # cn() helper for className merging
  app/
    globals.css      # Design tokens (CSS variables) — zinc theme
components.json      # shadcn/ui configuration
```
