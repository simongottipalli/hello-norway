export const handlePrismaError = (error: unknown): { status: number; message: string } | null => {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;

  const code = (error as { code: string }).code;

  switch (code) {
    case "P2002":
      return { status: 400, message: "Task with this slug already exists" };
    case "P2025":
      return { status: 404, message: "Task not found" };
    case "P2003":
      return { status: 400, message: "Cannot delete task with existing user tasks" };
    default:
      return null;
  }
};
