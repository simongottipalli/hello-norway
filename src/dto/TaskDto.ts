import { TaskCategory } from "@/types/enums";

export class CreateTaskDto {
  /**
   * Task title
   * @example "Register with GP"
   */
  title!: string;

  /**
   * Task description
   */
  description!: string;

  /**
   * Task category
   */
  category!: TaskCategory;

  /**
   * Task slug (unique identifier)
   * @example "register-gp"
   */
  slug!: string;

  /**
   * Official link for more information
   * @example "https://helsenorge.no"
   */
  officialLink?: string | null;
}

export class UpdateTaskStatusDto {
  /**
   * Task status
   * @example "completed"
   */
  status!: string;

  /**
   * Optional due date (YYYY-MM-DD)
   * @example "2024-12-31"
   */
  dueDate?: string | null;

  /**
   * Optional personal notes
   * @example "Called and booked appointment"
   */
  personalNotes?: string | null;
}
