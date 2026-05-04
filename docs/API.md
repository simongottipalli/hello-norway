# API Development Guide

## Adding a New Endpoint

### 1. Create a DTO

Define request/response types in `src/dto/`:

```typescript
// src/dto/ExampleDto.ts
export class CreateExampleDto {
  /**
   * Example field
   * @example "value"
   * @minLength 1
   * @maxLength 100
   */
  name!: string;
}
```

### 2. Create or Update a Controller

```typescript
// src/controllers/ExampleController.ts
import { Body, Post, Route, Security, Request } from "tsoa";
import { CreateExampleDto } from "@/dto/ExampleDto";
import type { Request as ExpressRequest } from "express";

@Route("examples")
export class ExampleController {
  @Post()
  @Security("cookie_auth") // Add this for protected endpoints
  public async create(
    @Body() body: CreateExampleDto,
    @Request() req: ExpressRequest
  ): Promise<any> {
    // Access authenticated user
    const userId = req.user!.id;

    // Access logger
    req.logger.info({ msg: "Creating example" });

    // Call service layer
    const result = await exampleService.create(body, userId);

    return result;
  }
}
```

### 3. Regenerate Routes

```bash
npm run tsoa:build
```

### 4. Test

- Visit `/api-docs` to see the new endpoint in Swagger UI
- Write unit tests in `src/__tests__/`
- Test manually via Swagger UI or curl

---

## Common Patterns

### Protected Endpoint

```typescript
@Get("protected")
@Security("cookie_auth")
public async protectedRoute(@Request() req: ExpressRequest) {
  const user = req.user!; // Available after authentication
  // ...
}
```

### Public Endpoint

```typescript
@Post("public")
public async publicRoute(@Body() body: SomeDto) {
  // No @Security decorator = public
  // ...
}
```

### Error Handling

```typescript
if (!result.success) {
  throw {
    status: 404,
    message: "Resource not found",
  };
}
```

### Path Parameters

```typescript
@Get("{id}")
public async getById(@Path() id: string) {
  // ...
}
```

### Query Parameters

```typescript
@Get()
public async list(@Query() limit?: number) {
  // ...
}
```

---

## OpenAPI Annotations

Use JSDoc tags in DTOs for OpenAPI schema enrichment:

| Tag | Purpose |
|---|---|
| `@example` | Example value shown in Swagger UI |
| `@minLength` / `@maxLength` | String length constraints |
| `@minimum` / `@maximum` | Number range constraints |
| `@isInt` | Integer validation |
| `@pattern` | Regex pattern constraint |

These annotations appear in Swagger UI and are included in the generated `swagger.json`.
