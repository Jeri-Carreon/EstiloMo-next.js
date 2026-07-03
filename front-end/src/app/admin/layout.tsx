import Sidebar from "@/components/admin/Sidebar";
import Providers from "./providers";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";

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
    },
  });

  if (!dbUser || dbUser.role === "CUSTOMER") {
    redirect("/login");
  }

  const currentName =
    `${dbUser.firstName ?? ""} ${dbUser.lastName ?? ""}`.trim() ||
    dbUser.email ||
    "Admin";

  const currentRole = dbUser.role;

  return (
    <Providers>
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