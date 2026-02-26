export const handlePrismaError = (error: any): { status: number; message: string } | null => {
  if (!error.code) return null;

  switch (error.code) {
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
