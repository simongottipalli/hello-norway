import type { Prisma } from "../generated/prisma/client.js";
import { prisma, type DbClient } from "./db";
import type { UserUpdateData } from "../types/models";

type UserDb = Pick<DbClient, "user" | "userTask">;

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

export const findUserById = (id: string, db: UserDb = prisma) =>
  db.user.findUnique({ where: { id }, select: PROFILE_SELECT });

export const upsertUserByEmail = (email: string, db: UserDb = prisma) =>
  db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split("@")[0],
    },
  });

export const updateUserProfile = (
  id: string,
  data: UserUpdateData,
  db: UserDb = prisma,
) => db.user.update({ where: { id }, data: data as Prisma.UserUpdateInput, select: PROFILE_SELECT });

export const deleteUserTasks = (userId: string, db: UserDb = prisma) =>
  db.userTask.deleteMany({ where: { userId } });

export const deleteUser = (id: string, db: UserDb = prisma) =>
  db.user.delete({ where: { id } });
