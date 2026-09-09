import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_LABELS } from "@/lib/constants";

export default async function SpecialistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/specialist");
  if (session.role !== "SPECIALIST") redirect("/admin");

  return (
    <DashboardShell
      area="specialist"
      userName={session.name}
      userRole={ROLE_LABELS[session.role] ?? session.role}
    >
      {children}
    </DashboardShell>
  );
}
