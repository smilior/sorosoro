import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { HomeApp } from "@/components/app/home-app";

export default async function HomePage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  return <HomeApp userName={session.user.name} />;
}
