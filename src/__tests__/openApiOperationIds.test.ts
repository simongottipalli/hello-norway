import { describe, expect, it } from "vitest";
import swagger from "../generated/swagger.json";

type OpenApiOperation = { operationId?: string };

describe("OpenAPI specification", () => {
  it("uses a unique operationId for every operation", () => {
    const operationIds = Object.values(swagger.paths).flatMap((pathItem) =>
      Object.values(pathItem as Record<string, OpenApiOperation>)
        .map((operation) => operation.operationId)
        .filter((operationId): operationId is string => operationId !== undefined),
    );

    expect(new Set(operationIds).size).toBe(operationIds.length);
  });
});
