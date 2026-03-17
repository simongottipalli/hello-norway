import { UserTaskStatus } from "../generated/prisma/client.js";
import type { EmploymentStatus, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma";
import { MS_PER_DAY } from "../lib/dateUtils";

export type AssignmentProfile = {
  id: string;
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: EmploymentStatus | null;
  arrivalDate: Date | null;
  plannedArrivalDate: Date | null;
};


const toUtcMidnight = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

function getDaysFromArrival(profile: AssignmentProfile, now: Date): number | null {
  const anchorDate = profile.arrivalDate ?? profile.plannedArrivalDate;
  if (!anchorDate) {
    return null;
  }

  return Math.floor((toUtcMidnight(now) - toUtcMidnight(anchorDate)) / MS_PER_DAY);
}

function getEmploymentFilter(status: AssignmentProfile["employmentStatus"]): Prisma.TaskWhereInput {
  if (!status) {
    return { requiresEmploymentStatus: { isEmpty: true } };
  }

  return {
    OR: [
      { requiresEmploymentStatus: { isEmpty: true } },
      { requiresEmploymentStatus: { has: status } },
    ],
  };
}

function getBooleanEligibilityFilter(field: "requiresEU" | "requiresChildren", value: boolean | null): Prisma.TaskWhereInput {
  if (value === null) {
    return { [field]: null };
  }

  return {
    OR: [
      { [field]: null },
      { [field]: value },
    ],
  };
}

function getArrivalWindowFilter(profile: AssignmentProfile, now: Date): Prisma.TaskWhereInput[] {
  const daysFromArrival = getDaysFromArrival(profile, now);
  if (daysFromArrival === null) {
    return [];
  }

  return [
    {
      OR: [
        { minDaysFromArrival: null },
        { minDaysFromArrival: { lte: daysFromArrival } },
      ],
    },
    {
      OR: [
        { maxDaysFromArrival: null },
        { maxDaysFromArrival: { gte: daysFromArrival } },
      ],
    },
  ];
}

export function getRelevantTaskWhere(profile: AssignmentProfile, now: Date): Prisma.TaskWhereInput {
  return {
    AND: [
      { createdByUserId: null },
      getBooleanEligibilityFilter("requiresEU", profile.isEU),
      getBooleanEligibilityFilter("requiresChildren", profile.hasChildren),
      getEmploymentFilter(profile.employmentStatus),
      ...getArrivalWindowFilter(profile, now),
    ],
  };
}

export async function syncUserTaskAssignments(
  profile: AssignmentProfile,
  options?: {
    removeOutdatedTodoAssignments?: boolean;
    now?: Date;
    db?: Pick<typeof prisma, "task" | "userTask">;
  }
) {
  const db = options?.db ?? prisma;
  const now = options?.now ?? new Date();
  const relevantTasks = await db.task.findMany({
    where: getRelevantTaskWhere(profile, now),
    select: { id: true },
  });

  const relevantTaskIds = relevantTasks.map((task) => task.id);

  const existingAssignments = await db.userTask.findMany({
    where: { userId: profile.id },
    select: {
      taskId: true,
      status: true,
      task: { select: { createdByUserId: true } },
    },
  });

  const existingTaskIds = new Set(existingAssignments.map((assignment) => assignment.taskId));

  const newAssignments = relevantTaskIds
    .filter((taskId) => !existingTaskIds.has(taskId))
    .map((taskId) => ({
      userId: profile.id,
      taskId,
      status: UserTaskStatus.TODO,
    }));

  if (newAssignments.length > 0) {
    await db.userTask.createMany({
      data: newAssignments,
      skipDuplicates: true,
    });
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
    await db.userTask.deleteMany({
      where: {
        userId: profile.id,
        taskId: { in: staleTodoTaskIds },
        status: UserTaskStatus.TODO,
        task: { createdByUserId: null },
      },
    });
  }
}
