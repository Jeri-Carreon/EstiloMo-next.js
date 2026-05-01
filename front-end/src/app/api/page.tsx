import { auth } from "@/lib/auth";

export default async function Dashboard() {
  const session = await auth();

  if (!session) {
    return <div>Unauthorized</div>;
  }

  return <div>Welcome {session.user?.email}</div>;
}