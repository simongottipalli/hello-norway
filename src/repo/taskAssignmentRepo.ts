import { UserTaskStatus } from "../generated/prisma/client.js";
import type { EmploymentStatus, Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma";
import { MS_PER_DAY } from "../lib/dateUtils";

type TaskAssignmentDb = Pick<typeof prisma, "task" | "userTask">;

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

export const findRelevantTaskIds = async (
  profile: AssignmentProfile,
  now: Date,
  db: TaskAssignmentDb = prisma
) => {
  const relevantTasks = await db.task.findMany({
    where: getRelevantTaskWhere(profile, now),
    select: { id: true },
  });
  return relevantTasks.map((task) => task.id);
};

export const findUserAssignments = (userId: string, db: TaskAssignmentDb = prisma) =>
  db.userTask.findMany({
    where: { userId },
    select: {
      taskId: true,
      status: true,
      task: { select: { createdByUserId: true } },
    },
  });

export const createManyAssignments = (
  data: Array<{ userId: string; taskId: string; status: UserTaskStatus }>,
  db: TaskAssignmentDb = prisma
) =>
  db.userTask.createMany({
    data,
    skipDuplicates: true,
  });

export const deleteStaleAssignments = (
  userId: string,
  taskIds: string[],
  db: TaskAssignmentDb = prisma
) =>
  db.userTask.deleteMany({
    where: {
      userId,
      taskId: { in: taskIds },
      status: UserTaskStatus.TODO,
      task: { createdByUserId: null },
    },
  });
