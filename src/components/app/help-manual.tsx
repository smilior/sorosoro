import Link from "next/link";

/** アプリ内ヘルプ。文言は短く事実だけ。モックはキャプチャ代わりの画面見本。 */
export function HelpManual({ backHref = "/home" }: { backHref?: string }) {
  return (
    <div
      className="min-h-dvh flex justify-center"
      style={{ background: "var(--desk)" }}
    >
      <div
        className="w-full max-w-[402px] min-h-dvh flex flex-col"
        style={{ background: "var(--bg)", color: "var(--ink)" }}
      >
        <header className="px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3 flex items-center gap-2 sticky top-0 z-10"
          style={{ background: "var(--bg)" }}
        >
          <Link
            href={backHref}
            aria-label="戻る"
            className="h-[38px] w-[38px] rounded-[12px] flex items-center justify-center shrink-0"
            style={{ background: "var(--card)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1 className="text-[18px] font-bold flex-1">ヘルプ</h1>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-12">
          <section className="mb-8">
            <h2 className="text-[13px] font-bold tracking-wide mb-2" style={{ color: "var(--sub)" }}>
              概要
            </h2>
            <div
              className="rounded-[20px] p-4 text-[14.5px] font-medium leading-relaxed"
              style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
            >
              <p className="m-0">
                おうち掃除ログは、シーツ洗いや排水口など、家の掃除をいつやったか残すメモです。
              </p>
              <p className="mt-3 mb-0">
                カレンダーや期限の赤表示は使いません。前回から何日経ったかだけをリストで見ます。記録はホームのボタン1回です。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[13px] font-bold tracking-wide mb-2" style={{ color: "var(--sub)" }}>
              使い方
            </h2>
            <ol className="m-0 p-0 list-none flex flex-col gap-6">
              <HelpStep n={1} title="Googleでログイン">
                初回は Google アカウントで入ります。データはそのアカウントにだけ保存されます。
              </HelpStep>

              <HelpStep n={2} title="タスクを登録する">
                ホーム右上の ＋ を押します。名前と目安の周期（毎週・隔週・毎月、または日数）を入れて保存します。周期はあくまで目安で、あとから変えられます。
                <MockPhone caption="タスクを追加">
                  <MockHeader title="タスクを追加" />
                  <div className="px-3 pt-2 space-y-2">
                    <div
                      className="rounded-2xl border px-3 py-2.5 text-[13px]"
                      style={{ borderColor: "var(--line)", background: "var(--card)" }}
                    >
                      シーツ洗い
                    </div>
                    <div className="flex gap-1.5">
                      {["毎週", "隔週", "毎月"].map((l, i) => (
                        <div
                          key={l}
                          className="flex-1 rounded-xl border py-2 text-center text-[11px] font-bold"
                          style={{
                            borderColor: i === 0 ? "var(--accent)" : "var(--line)",
                            background: i === 0 ? "var(--accent-soft)" : "var(--card)",
                            color: i === 0 ? "var(--accent-ink)" : "var(--sub)",
                          }}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                    <div
                      className="rounded-2xl py-3 text-center text-[13px] font-bold text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      保存する
                    </div>
                  </div>
                </MockPhone>
              </HelpStep>

              <HelpStep n={3} title="ホームで状況を見る">
                カードが上ほど、目安より間が空いているタスクです。背景の薄い黄・橙は経過の目安で、責めの表示ではありません。
                <MockPhone caption="ホーム">
                  <div className="px-3 pt-3 pb-1 flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-bold" style={{ color: "var(--sub)" }}>
                        おうち掃除ログ
                      </div>
                      <div className="text-[15px] font-bold">7月20日（月）</div>
                    </div>
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center text-[16px] font-bold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                    >
                      +
                    </div>
                  </div>
                  <div className="px-3 pt-2 space-y-2">
                    <MockCard
                      name="シーツ洗い"
                      meta="前回から12日・目安7日"
                      bg="var(--late-bg)"
                      em
                    />
                    <MockCard
                      name="風呂の排水口"
                      meta="前回から3日・目安14日"
                      bg="var(--card)"
                    />
                  </div>
                </MockPhone>
              </HelpStep>

              <HelpStep n={4} title="「今日やった」で記録する">
                カード右のボタンを1回押すと、今日の日付が記録されます。確認ダイアログはありません。すぐ下に出るトーストの「元に戻す」でも取り消せます。
                <MockPhone caption="記録した直後">
                  <div className="px-3 pt-3 space-y-2">
                    <MockCard
                      name="シーツ洗い"
                      meta="前回から0日・目安7日"
                      bg="var(--accent-soft)"
                      done
                    />
                  </div>
                  <div className="mt-4 mx-3 rounded-2xl px-3 py-2.5 text-[11px] font-semibold flex justify-between gap-2"
                    style={{ background: "var(--toast-bg)", color: "var(--toast-c)" }}
                  >
                    <span>記録しました（今日）</span>
                    <span style={{ color: "var(--accent-bright)" }}>元に戻す</span>
                  </div>
                </MockPhone>
              </HelpStep>

              <HelpStep n={5} title="記録を取り消す">
                <ul className="m-0 pl-4 space-y-1.5">
                  <li>ホームで「記録済み」をもう一度タップ → 今日の記録を消す</li>
                  <li>履歴の各日付の「取り消し」→ その日の記録を消す</li>
                </ul>
              </HelpStep>

              <HelpStep n={6} title="過去の日付で記録する">
                「今日やった」を長押し（約0.5秒）すると日付シートが開きます。今日・昨日・おととい、またはカレンダーから選べます。
                <MockPhone caption="日付を選んで記録">
                  <div className="flex-1" />
                  <div
                    className="rounded-t-[22px] px-3 pt-2 pb-3"
                    style={{ background: "var(--sheet)", boxShadow: "0 -4px 20px rgba(0,0,0,.08)" }}
                  >
                    <div className="mx-auto mb-2 h-1 w-8 rounded-full" style={{ background: "var(--line)" }} />
                    <div className="text-[13px] font-bold">日付を選んで記録</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--sub)" }}>
                      シーツ洗い
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {["今日", "昨日", "おととい"].map((l) => (
                        <div
                          key={l}
                          className="flex-1 rounded-xl py-2 text-center text-[11px] font-bold"
                          style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </MockPhone>
              </HelpStep>

              <HelpStep n={7} title="履歴と編集">
                カード本体（ボタン以外）をタップすると履歴が開きます。実施日の一覧と、右上「編集」から名前・周期の変更、タスク削除ができます。
              </HelpStep>
            </ol>
          </section>

          <section className="mt-8">
            <h2 className="text-[13px] font-bold tracking-wide mb-2" style={{ color: "var(--sub)" }}>
              色の意味
            </h2>
            <div
              className="rounded-[20px] overflow-hidden text-[13.5px] font-medium"
              style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
            >
              <ColorRow bg="var(--card)" label="通常" desc="目安以内" />
              <ColorRow bg="var(--warn-bg)" label="薄い黄" desc="目安を少し過ぎた" />
              <ColorRow bg="var(--late-bg)" label="薄い橙" desc="目安を大きく過ぎた" last />
            </div>
            <p className="mt-2 text-[12px] font-medium px-1" style={{ color: "var(--sub)" }}>
              警告バッジや強い赤は出しません。
            </p>
          </section>

          <p className="mt-10 text-center text-[12px] font-medium" style={{ color: "var(--sub)" }}>
            <Link href={backHref} className="underline-offset-2" style={{ color: "var(--accent-ink)" }}>
              アプリに戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function HelpStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="text-[12px] font-bold tabular-nums"
          style={{ color: "var(--accent-ink)" }}
        >
          {String(n).padStart(2, "0")}
        </span>
        <h3 className="m-0 text-[15px] font-bold">{title}</h3>
      </div>
      <div className="text-[13.5px] font-medium leading-relaxed pl-7" style={{ color: "var(--ink)" }}>
        {children}
      </div>
    </li>
  );
}

function MockPhone({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="mt-3 mb-0 pl-0">
      <div
        className="mx-auto w-full max-w-[240px] rounded-[28px] overflow-hidden border-[3px] flex flex-col"
        style={{
          borderColor: "var(--line)",
          background: "var(--bg)",
          minHeight: 280,
          boxShadow: "var(--shadow)",
        }}
        role="img"
        aria-label={`画面見本: ${caption}`}
      >
        <div
          className="h-5 flex items-center justify-center shrink-0"
          style={{ background: "var(--card)" }}
        >
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--line)" }} />
        </div>
        <div className="flex-1 flex flex-col min-h-0 pb-2">{children}</div>
      </div>
      <figcaption
        className="text-center text-[11.5px] font-medium mt-2"
        style={{ color: "var(--sub)" }}
      >
        {caption}（見本）
      </figcaption>
    </figure>
  );
}

function MockHeader({ title }: { title: string }) {
  return (
    <div className="px-2 pt-2 pb-1 flex items-center gap-1">
      <div
        className="h-6 w-6 rounded-lg flex items-center justify-center text-[12px]"
        style={{ background: "var(--card)" }}
      >
        ‹
      </div>
      <div className="text-[12px] font-bold">{title}</div>
    </div>
  );
}

function MockCard({
  name,
  meta,
  bg,
  done,
  em,
}: {
  name: string;
  meta: string;
  bg: string;
  done?: boolean;
  em?: boolean;
}) {
  return (
    <div
      className="rounded-2xl px-2.5 py-2 flex items-center gap-1.5"
      style={{ background: bg, boxShadow: "var(--shadow)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold truncate">{name}</div>
        <div className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--sub)" }}>
          {em ? (
            <>
              前回から
              <span className="font-bold" style={{ color: "var(--late-ink)" }}>
                12日
              </span>
              ・目安7日
            </>
          ) : (
            meta
          )}
        </div>
      </div>
      <div
        className="shrink-0 rounded-lg px-2 py-1.5 text-[10px] font-bold"
        style={{
          background: done ? "var(--accent)" : "var(--accent-soft)",
          color: done ? "#fff" : "var(--accent-ink)",
        }}
      >
        {done ? "記録済み" : "今日やった"}
      </div>
    </div>
  );
}

function ColorRow({
  bg,
  label,
  desc,
  last,
}: {
  bg: string;
  label: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        background: bg,
        borderBottom: last ? undefined : "1px solid var(--line)",
      }}
    >
      <span className="font-bold w-14 shrink-0">{label}</span>
      <span style={{ color: "var(--sub)" }}>{desc}</span>
    </div>
  );
}
