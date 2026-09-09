import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_LABELS } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "ADMIN") redirect("/specialist");

  return (
    <DashboardShell
      area="admin"
      userName={session.name}
      userRole={ROLE_LABELS[session.role] ?? session.role}
    >
      {children}
    </DashboardShell>
  );
}
