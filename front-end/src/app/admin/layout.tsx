import Sidebar from "@/components/admin/Sidebar";
import Providers from "./providers";
import AdminInactivityLogout from "@/components/adminInactivity";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Box from "@mui/material/Box";
import { getCurrentAdminAccess } from "@/lib/adminAuthorization";
import { getAdminTabForPath } from "@/lib/adminTabs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getCurrentAdminAccess();

  if (access.status === 401) {
    redirect("/login");
  }

  if (access.status === 403 || !access.user) {
    redirect("/unauthorized");
  }

  const pathname = (await headers()).get("x-pathname") || "";
  const tabKey = getAdminTabForPath(pathname);

  if (tabKey && !access.accessibleTabs.includes(tabKey)) {
    redirect("/unauthorized");
  }

  const currentName =
    `${access.user.firstName ?? ""} ${access.user.lastName ?? ""}`.trim() ||
    access.user.email ||
    "Admin";

  const currentRole = access.role;

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
        <Sidebar
          currentName={currentName}
          currentRole={currentRole}
          accessibleTabs={access.accessibleTabs}
        />

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
