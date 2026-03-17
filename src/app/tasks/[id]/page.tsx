import { redirect } from "next/navigation";

export default async function TaskDetailRedirectPage() {
  redirect("/dashboard");
}
