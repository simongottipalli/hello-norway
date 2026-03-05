import { redirect } from "next/navigation";

interface TaskDetailRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailRedirectPage({ params }: TaskDetailRedirectPageProps) {
  const { id } = await params;
  redirect(`/tasks?taskId=${encodeURIComponent(id)}`);
}
