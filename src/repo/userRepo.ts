import type { Prisma } from "../generated/prisma/client";
import { prisma, type DbClient } from "./db";
import type { UserUpdateData } from "../types/models";
import { EmploymentStatus } from "../types/enums";

type UserDb = Pick<DbClient, "user" | "userTask">;

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: EmploymentStatus | null;
  arrivalDate: Date | null;
  plannedArrivalDate: Date | null;
};

export const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  isEU: true,
  hasChildren: true,
  employmentStatus: true,
  arrivalDate: true,
  plannedArrivalDate: true,
} as const;

const mapPrismaUserToProfile = (user: {
  id: string;
  email: string;
  name: string;
  isEU: boolean | null;
  hasChildren: boolean | null;
  employmentStatus: string | null;
  arrivalDate: Date | null;
  plannedArrivalDate: Date | null;
}): UserProfile => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isEU: user.isEU,
  hasChildren: user.hasChildren,
  employmentStatus: user.employmentStatus as EmploymentStatus | null,
  arrivalDate: user.arrivalDate,
  plannedArrivalDate: user.plannedArrivalDate,
});

export const findUserById = async (id: string, db: UserDb = prisma): Promise<UserProfile | null> => {
  const user = await db.user.findUnique({ where: { id }, select: PROFILE_SELECT });
  return user ? mapPrismaUserToProfile(user) : null;
};

export const upsertUserByEmail = async (email: string, db: UserDb = prisma) => {
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0],
    },
  });
  return mapPrismaUserToProfile(user);
};

export const updateUserProfile = async (
  id: string,
  data: UserUpdateData,
  db: UserDb = prisma,
): Promise<UserProfile> => {
  const user = await db.user.update({ where: { id }, data: data as Prisma.UserUpdateInput, select: PROFILE_SELECT });
  return mapPrismaUserToProfile(user);
};

export const deleteUserTasks = (userId: string, db: UserDb = prisma) =>
  db.userTask.deleteMany({ where: { userId } });

export const deleteUser = (id: string, db: UserDb = prisma) =>
  db.user.delete({ where: { id } });
