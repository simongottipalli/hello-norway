import { Router } from "express";
import { getUserTasks, getTaskById, createTask, deleteTaskById, updateTaskStatus } from "../controllers/taskController";

const router = Router();

router.get("/tasks/personalized", getUserTasks);
router.get("/tasks/:id", getTaskById);
router.post("/tasks", createTask);
router.delete("/tasks/:id", deleteTaskById);
router.patch("/tasks/:id/status", updateTaskStatus);

export default router;
