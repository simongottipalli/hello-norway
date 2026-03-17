import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "../lib/prisma";

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

  });
});
