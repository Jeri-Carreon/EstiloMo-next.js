import Sidebar from '@/components/admin/Sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role === "CUSTOMER") {
    redirect("/login");
  }
  
  const currentName =
    session?.user?.name || session?.user?.email || 'Admin';

  const currentRole =
    (session?.user as { role?: string })?.role || 'USER';

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        currentName={currentName}
        currentRole={currentRole}
      />

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}