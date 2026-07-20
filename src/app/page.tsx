import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";

export default async function RootPage() {
  const session = await getServerSession();
  if (session?.user) {
    redirect("/home");
  }
  redirect("/login");
}
