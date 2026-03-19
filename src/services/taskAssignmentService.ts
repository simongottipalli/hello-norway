import { UserTaskStatus, EmploymentStatus } from "../types/enums";
import { prisma, type TransactionClient, type DbClient } from "../repo/db";
import * as taskAssignmentRepo from "../repo/taskAssignmentRepo";

export type AssignmentProfile = {
  id: string;
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: EmploymentStatus | null;
  arrivalDate: Date | null;
  plannedArrivalDate: Date | null;
};

export async function syncUserTaskAssignments(
  profile: AssignmentProfile,
  options?: {
    removeOutdatedTodoAssignments?: boolean;
    now?: Date;
    db?: TransactionClient | Pick<DbClient, "task" | "userTask">;
  }
) {
  const db = options?.db ?? prisma;
  const now = options?.now ?? new Date();

  const relevantTaskIds = await taskAssignmentRepo.findRelevantTaskIds(profile, now, db);
  const existingAssignments = await taskAssignmentRepo.findUserAssignments(profile.id, db);

  const existingTaskIds = new Set(existingAssignments.map((assignment) => assignment.taskId));

  const newAssignments = relevantTaskIds
    .filter((taskId) => !existingTaskIds.has(taskId))
    .map((taskId) => ({
      userId: profile.id,
      taskId,
      status: UserTaskStatus.TODO,
    }));

  if (newAssignments.length > 0) {
    await taskAssignmentRepo.createManyAssignments(newAssignments, db);
  }

  if (!options?.removeOutdatedTodoAssignments) {
    return;
  }

  const relevantTaskIdSet = new Set(relevantTaskIds);
  const staleTodoTaskIds = existingAssignments
    .filter(
      (assignment) =>
        assignment.status === UserTaskStatus.TODO &&
        !relevantTaskIdSet.has(assignment.taskId) &&
        assignment.task?.createdByUserId === null
    )
    .map((assignment) => assignment.taskId);

  if (staleTodoTaskIds.length > 0) {
    await taskAssignmentRepo.deleteStaleAssignments(profile.id, staleTodoTaskIds, db);
  }
}
