import { AdminLoginForm } from "@/components/AdminLoginForm";

export default function AdminLoginPage() {
  const adminPath = process.env.ADMIN_PATH ?? "";
  return <AdminLoginForm adminPath={adminPath} />;
}
