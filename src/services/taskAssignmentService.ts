import type { Prisma, User } from "@prisma/client";
import { prisma } from "../lib/prisma";

type AssignmentProfile = Pick<User, "id" | "isEU" | "hasChildren" | "employmentStatus" | "arrivalDate" | "plannedArrivalDate">;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    return [{ minDaysFromArrival: null }, { maxDaysFromArrival: null }];
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

function getRelevantTaskWhere(profile: AssignmentProfile, now: Date): Prisma.TaskWhereInput {
  return {
    AND: [
      getBooleanEligibilityFilter("requiresEU", profile.isEU),
      getBooleanEligibilityFilter("requiresChildren", profile.hasChildren),
      getEmploymentFilter(profile.employmentStatus),
      ...getArrivalWindowFilter(profile, now),
    ],
  };
}

export async function syncUserTaskAssignments(
  profile: AssignmentProfile,
  options?: { removeOutdatedTodoAssignments?: boolean; now?: Date }
) {
  const now = options?.now ?? new Date();
  const relevantTasks = await prisma.task.findMany({
    where: getRelevantTaskWhere(profile, now),
    select: { id: true },
  });

  const relevantTaskIds = relevantTasks.map((task) => task.id);

  const existingAssignments = await prisma.userTask.findMany({
    where: { userId: profile.id },
    select: { taskId: true, status: true },
  });

  const existingTaskIds = new Set(existingAssignments.map((assignment) => assignment.taskId));

  const newAssignments = relevantTaskIds
    .filter((taskId) => !existingTaskIds.has(taskId))
    .map((taskId) => ({
      userId: profile.id,
      taskId,
      status: "TODO",
    }));

  if (newAssignments.length > 0) {
    await prisma.userTask.createMany({
      data: newAssignments,
      skipDuplicates: true,
    });
  }

  if (!options?.removeOutdatedTodoAssignments) {
    return;
  }

  const relevantTaskIdSet = new Set(relevantTaskIds);
  const staleTodoTaskIds = existingAssignments
    .filter((assignment) => assignment.status === "TODO" && !relevantTaskIdSet.has(assignment.taskId))
    .map((assignment) => assignment.taskId);

  if (staleTodoTaskIds.length > 0) {
    await prisma.userTask.deleteMany({
      where: {
        userId: profile.id,
        taskId: { in: staleTodoTaskIds },
        status: "TODO",
      },
    });
  }
}
