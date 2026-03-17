import { describe, expect, it, vi } from "vitest";
import TaskDetailRedirectPage from "../app/tasks/[id]/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Task detail route", () => {
  it("redirects /tasks/[id] to dashboard overlay query format", async () => {
    await TaskDetailRedirectPage({
      params: Promise.resolve({ id: "task-123" }),
    });

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });
});
