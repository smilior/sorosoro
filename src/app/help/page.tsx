import { HelpManual } from "@/components/app/help-manual";
import { getServerSession } from "@/lib/auth-session";

export const metadata = {
  title: "ヘルプ ｜ おうち掃除ログ",
  description: "おうち掃除ログの概要と使い方",
};

export default async function HelpPage() {
  const session = await getServerSession();
  const backHref = session?.user ? "/home" : "/login";
  return <HelpManual backHref={backHref} />;
}
