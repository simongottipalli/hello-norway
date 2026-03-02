import type { Logger } from '../lib/logger';

export const handlePrismaError = (
  error: unknown,
  logger?: Logger
): { status: number; message: string } | null => {
  if (!error || typeof error !== 'object' || !('code' in error)) return null;

  const code = (error as { code: string }).code;

  let result: { status: number; message: string } | null = null;

  switch (code) {
    case "P2002":
      result = { status: 400, message: "Task with this slug already exists" };
      break;
    case "P2025":
      result = { status: 404, message: "Task not found" };
      break;
    case "P2003":
      result = { status: 400, message: "Cannot delete task with existing user tasks" };
      break;
    default:
      result = null;
  }

  if (result && logger) {
    logger.error({
      msg: 'Prisma error',
      code,
      status: result.status,
      message: result.message,
    });
  }

  return result;
};
