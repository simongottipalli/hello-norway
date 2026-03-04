import { Router } from "express";
import { getAllTasks, getTaskById, createTask, updateTask, updateTaskStatus, deleteTask } from "../controllers/taskController";

const router = Router();

router.get("/tasks", getAllTasks);
router.get("/tasks/:id", getTaskById);
router.post("/tasks", createTask);
router.patch("/tasks/:id/status", updateTaskStatus);
router.patch("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

export default router;
