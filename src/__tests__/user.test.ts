import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/prisma";
import type { User } from "../generated/prisma/models";

describe("User Model", () => {
  let testUserId: string;

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("User creation with name field", () => {
    it("should create a user with name field", async () => {
      const testUser = {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
      };

      const user = await prisma.user.create({
        data: testUser,
      });

      testUserId = user.id;

      expect(user).toHaveProperty("id");
      expect(user.email).toBe(testUser.email);
      expect(user.name).toBe(testUser.name);
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("updatedAt");
    });

    it("should require name field when creating user", async () => {
      const testUser = {
        email: `test-no-name-${Date.now()}@example.com`,
      };

      // TypeScript should prevent this at compile time, but we test runtime behavior
      await expect(
        prisma.user.create({
          data: testUser as any,
        })
      ).rejects.toThrow();
    });

    it("should retrieve user with name field", async () => {
      const testUser = {
        email: `test-retrieve-${Date.now()}@example.com`,
        name: "Retrieve Test",
      };

      const createdUser = await prisma.user.create({
        data: testUser,
      });

      const retrievedUser = await prisma.user.findUnique({
        where: { id: createdUser.id },
      });

      // Clean up
      await prisma.user.delete({ where: { id: createdUser.id } });

      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser?.name).toBe(testUser.name);
      expect(retrievedUser?.email).toBe(testUser.email);
    });

    it("should update user name field", async () => {
      const testUser = {
        email: `test-update-${Date.now()}@example.com`,
        name: "Original Name",
      };

      const createdUser = await prisma.user.create({
        data: testUser,
      });

      const updatedUser = await prisma.user.update({
        where: { id: createdUser.id },
        data: { name: "Updated Name" },
      });

      // Clean up
      await prisma.user.delete({ where: { id: createdUser.id } });

      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.email).toBe(testUser.email);
    });

    it("should have name field in User type", () => {
      // Type check - this will fail at compile time if name is not in the type
      const userShape: Partial<User> = {
        id: "test-id",
        email: "test@example.com",
        name: "Test Name",
      };

      expect(userShape.name).toBeDefined();
    });
  });

  describe("User model structure", () => {
    it("should have all expected fields in the model", async () => {
      const testUser = {
        email: `test-structure-${Date.now()}@example.com`,
        name: "Structure Test",
        isEU: true,
        hasChildren: false,
      };

      const user = await prisma.user.create({
        data: testUser,
      });

      // Clean up
      await prisma.user.delete({ where: { id: user.id } });

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("isEU");
      expect(user).toHaveProperty("employmentStatus");
      expect(user).toHaveProperty("hasChildren");
      expect(user).toHaveProperty("housingType");
      expect(user).toHaveProperty("plannedArrivalDate");
      expect(user).toHaveProperty("arrivalDate");
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("updatedAt");
    });
  });
});
