import Sidebar from "@/components/admin/Sidebar";
import Providers from "./providers";
import AdminInactivityLogout from "@/components/adminInactivity";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import { getPrimaryRole, normalizeAdminRoles } from "@/lib/adminTabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      role: true,
      firstName: true,
      lastName: true,
      email: true,
      roleAssignments: {
        select: {
          role: true,
        },
      },
    },
  });

  const roles = dbUser
    ? normalizeAdminRoles(
        dbUser.roleAssignments.length > 0
          ? dbUser.roleAssignments.map((assignment) => assignment.role)
          : dbUser.role
      )
    : [];

  if (!dbUser || roles.length === 0) {
    redirect("/login");
  }

  const currentName =
    `${dbUser.firstName ?? ""} ${dbUser.lastName ?? ""}`.trim() ||
    dbUser.email ||
    "Admin";

  const currentRole = getPrimaryRole(roles, dbUser.role);

  return (
    <Providers>
      <AdminInactivityLogout />

      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        <Sidebar currentName={currentName} currentRole={currentRole} />

        <main
          style={{
            flex: "1 1 0%",
            minWidth: 0,
            maxWidth: "100%",
            overflowX: "hidden",
          }}
        >
          <Box sx={{ display: { xs: "block", md: "none" }, minHeight: 56 }} />
          {children}
        </main>
      </div>
    </Providers>
  );
}
