"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  createTaskAction,
  deleteTaskAction,
  listTasksAction,
  recordDoneAction,
  seedIfEmptyAction,
  undoRecordAction,
  updateTaskAction,
} from "@/actions/tasks";
import {
  deriveTask,
  sortTasks,
  todayYmd,
  type DerivedTask,
} from "@/lib/domain/task";
import { signOut } from "@/lib/auth-client";

type Screen = "home" | "edit" | "history";
type ToastState = {
  msg: string;
  undo?: { taskId: string; date: string } | null;
} | null;

function formatTodayLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}月${d}日（${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}）`;
}

function formatLogLabel(ymd: string, today: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const [ty] = today.split("-").map(Number);
  const prefix = y !== ty ? `${y}年` : "";
  const wd = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${prefix}${m}月${d}日（${wd}）`;
}

function relativeFromToday(ymd: string, today: string) {
  const [y1, m1, d1] = ymd.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  const diff = Math.round((b - a) / 86400000);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  return `${diff}日前`;
}

function formatNextDue(ymd: string | null) {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${m}月${d}日ごろ`;
}

function cardBg(state: DerivedTask["state"], flash: boolean) {
  if (flash) return "var(--accent-soft)";
  if (state === "late") return "var(--late-bg)";
  if (state === "warn") return "var(--warn-bg)";
  return "var(--card)";
}

function emColor(state: DerivedTask["state"]) {
  if (state === "late") return "var(--late-ink)";
  if (state === "warn") return "var(--warn-ink)";
  return "var(--ink)";
}

export function HomeApp({ userName }: { userName?: string | null }) {
  const [tasks, setTasks] = useState<DerivedTask[]>([]);
  /** 端末ローカルの今日（サーバー UTC とのずれを避ける） */
  const [today, setToday] = useState(() => todayYmd());
  const [screen, setScreen] = useState<Screen>("home");
  const [editId, setEditId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [editFrom, setEditFrom] = useState<Screen>("home");
  const [fName, setFName] = useState("");
  /** 空文字を許す（入力中にクリアしてから打ち直せる） */
  const [fCycle, setFCycle] = useState<number | "">(7);
  const [fCycleError, setFCycleError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null);
  const [sheetDate, setSheetDate] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [doneFlash, setDoneFlash] = useState<Set<string>>(new Set());
  const [popId, setPopId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const localToday = useCallback(() => todayYmd(), []);

  const refresh = useCallback(async () => {
    const clientToday = localToday();
    setToday(clientToday);
    const res = await listTasksAction({ clientToday });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    // サーバー返却の today より端末ローカルを優先し、派生を端末 today で再計算
    const derived = sortTasks(
      res.data.tasks.map((t) =>
        deriveTask(
          {
            id: t.id,
            name: t.name,
            cycleDays: t.cycleDays,
            logs: t.logs,
          },
          clientToday,
        ),
      ),
    );
    setTasks(derived);
    setLoading(false);
  }, [localToday]);

  /** 取り消し後すぐ UI を合わせる（ホームの「記録済み」が残るのを防ぐ） */
  const applyLocalLogRemoval = useCallback(
    (taskId: string, date: string) => {
      const day = localToday();
      setToday(day);
      setTasks((prev) =>
        sortTasks(
          prev.map((t) => {
            if (t.id !== taskId) return t;
            return deriveTask(
              {
                id: t.id,
                name: t.name,
                cycleDays: t.cycleDays,
                logs: t.logs.filter((d) => d !== date),
              },
              day,
            );
          }),
        ),
      );
    },
    [localToday],
  );

  useEffect(() => {
    (async () => {
      // サーバー側でも NODE_ENV===development のときだけ seed する
      await seedIfEmptyAction();
      await refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    const prefers =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  const showToast = (msg: string, undo?: { taskId: string; date: string } | null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo: undo ?? null });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };

  const openAdd = () => {
    setEditId(null);
    setFName("");
    setFCycle(7);
    setFCycleError(null);
    setConfirmDel(false);
    setEditFrom("home");
    setScreen("edit");
  };

  const openEdit = (id: string, from: Screen) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setEditId(id);
    setFName(t.name);
    setFCycle(t.cycleDays);
    setFCycleError(null);
    setConfirmDel(false);
    setEditFrom(from);
    setScreen("edit");
  };

  const openHistory = (id: string) => {
    setHistoryId(id);
    setScreen("history");
  };

  const goBack = () => {
    if (screen === "edit") setScreen(editFrom);
    else setScreen("home");
  };

  const saveTask = () => {
    const name = fName.trim();
    if (!name) {
      showToast("タスク名を入力してください");
      return;
    }
    if (fCycle === "" || fCycle === null || fCycle === undefined) {
      setFCycleError("目安の周期を入力してください");
      showToast("目安の周期を入力してください");
      return;
    }
    const cycleDays = Number(fCycle);
    if (!Number.isFinite(cycleDays) || cycleDays < 1 || cycleDays > 365) {
      setFCycleError("周期は1〜365の整数で入力してください");
      showToast("周期は1〜365の整数で入力してください");
      return;
    }
    setFCycleError(null);
    startTransition(async () => {
      const res = editId
        ? await updateTaskAction({ id: editId, name, cycleDays })
        : await createTaskAction({ name, cycleDays });
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      await refresh();
      setScreen(editFrom === "history" && editId ? "history" : "home");
    });
  };

  const removeTask = () => {
    if (!editId) return;
    startTransition(async () => {
      const res = await deleteTaskAction(editId);
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      await refresh();
      setHistoryId(null);
      setScreen("home");
    });
  };

  const record = (taskId: string, date?: string) => {
    const clientToday = localToday();
    const doneDate = date ?? clientToday;
    startTransition(async () => {
      const res = await recordDoneAction({
        taskId,
        date: doneDate,
        clientToday,
      });
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      const t = tasks.find((x) => x.id === taskId);
      const label =
        res.data.date === clientToday
          ? "今日"
          : relativeFromToday(res.data.date, clientToday);
      showToast(
        `「${t?.name ?? "タスク"}」を記録しました（${label}）`,
        { taskId, date: res.data.date },
      );
      setPopId(taskId);
      setDoneFlash((prev) => new Set(prev).add(taskId));
      setTimeout(() => setPopId(null), 500);
      setTimeout(() => {
        setDoneFlash((prev) => {
          const n = new Set(prev);
          n.delete(taskId);
          return n;
        });
      }, 1100);
      setSheetTaskId(null);
      // 楽観更新
      setToday(clientToday);
      setTasks((prev) =>
        sortTasks(
          prev.map((task) => {
            if (task.id !== taskId) return task;
            const logs = task.logs.includes(res.data.date)
              ? task.logs
              : [...task.logs, res.data.date];
            return deriveTask(
              {
                id: task.id,
                name: task.name,
                cycleDays: task.cycleDays,
                logs,
              },
              clientToday,
            );
          }),
        ),
      );
      await refresh();
    });
  };

  const undoFromToast = () => {
    if (!toast?.undo) return;
    const { taskId, date } = toast.undo;
    cancelRecord(taskId, date, { fromToast: true });
  };

  /** 誤記録の取り消し（ホームの「記録済み」タップ / 履歴の取り消し） */
  const cancelRecord = (
    taskId: string,
    date: string,
    opts?: { fromToast?: boolean },
  ) => {
    const t = tasks.find((x) => x.id === taskId);
    const day = localToday();
    const label = date === day ? "今日" : relativeFromToday(date, day);

    // 先にローカル状態から外して「記録済み」を即時解除
    applyLocalLogRemoval(taskId, date);

    startTransition(async () => {
      const res = await undoRecordAction({ taskId, date });
      if (!res.ok) {
        // 失敗時はサーバー状態に戻す
        showToast(res.error);
        await refresh();
        return;
      }
      if (opts?.fromToast) {
        setToast(null);
      } else {
        showToast(`「${t?.name ?? "タスク"}」の記録を取り消しました（${label}）`);
      }
      await refresh();
    });
  };

  const historyTask = useMemo(
    () => tasks.find((t) => t.id === historyId) ?? null,
    [tasks, historyId],
  );

  const onPointerDownDone = (taskId: string, doneToday: boolean) => {
    longPressFired.current = false;
    // 記録済みのときは長押しで過去日シートを開かない（誤操作防止）
    if (doneToday) return;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSheetTaskId(taskId);
      setSheetDate(today);
    }, 480);
  };

  const onPointerUpDone = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const onClickDone = (e: React.MouseEvent, taskId: string, doneToday: boolean) => {
    e.stopPropagation();
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    // 誤タップ対策: 記録済みをもう一度タップで取り消し
    if (doneToday) {
      cancelRecord(taskId, localToday());
      return;
    }
    record(taskId);
  };

  return (
    <div className="min-h-dvh flex justify-center" style={{ background: "var(--desk)" }}>
      <div
        className="relative w-full max-w-[402px] min-h-dvh flex flex-col overflow-hidden"
        style={{ background: "var(--bg)", color: "var(--ink)" }}
      >
        {screen === "home" && (
          <div className="anim-screen flex flex-col h-full min-h-dvh">
            <header className="px-5 pt-[max(20px,env(safe-area-inset-top))] pb-2.5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-bold tracking-wider" style={{ color: "var(--sub)" }}>
                  おうち掃除ログ
                </div>
                <div className="text-[22px] font-bold mt-0.5">
                  {today ? formatTodayLabel(today) : "…"}
                </div>
                {userName && (
                  <div className="text-[11.5px] font-medium mt-1" style={{ color: "var(--sub)" }}>
                    {userName}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  aria-label="ダークモード切替"
                  onClick={() => setDark((d) => !d)}
                  className="h-11 w-11 rounded-2xl flex items-center justify-center active:scale-95"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                >
                  {dark ? "☀" : "☾"}
                </button>
                <button
                  type="button"
                  aria-label="タスクを追加"
                  onClick={openAdd}
                  className="h-11 w-11 rounded-2xl flex items-center justify-center active:scale-95"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 3.5v13M3.5 10h13"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pt-2.5 pb-24 flex flex-col gap-2.5">
              {loading && (
                <div className="text-center py-16 text-[13px]" style={{ color: "var(--sub)" }}>
                  読み込み中…
                </div>
              )}
              {!loading &&
                tasks.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openHistory(t.id)}
                    onKeyDown={(e) => e.key === "Enter" && openHistory(t.id)}
                    className="rounded-[20px] flex items-center gap-2.5 cursor-pointer active:scale-[0.985] transition-[background-color,transform]"
                    style={{
                      background: cardBg(t.state, doneFlash.has(t.id)),
                      padding: "15px 14px 15px 18px",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[16px] font-bold leading-snug truncate">{t.name}</div>
                      <div className="text-[12.5px] mt-1 font-medium" style={{ color: "var(--sub)" }}>
                        {t.lastDone == null ? (
                          <>
                            まだ記録なし・目安{t.cycleDays}日
                          </>
                        ) : (
                          <>
                            前回から
                            <span className="font-bold" style={{ color: emColor(t.state) }}>
                              {t.elapsedDays}日
                            </span>
                            ・目安{t.cycleDays}日
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={
                        t.doneToday
                          ? "今日の記録を取り消す"
                          : "今日やったと記録する"
                      }
                      onClick={(e) => onClickDone(e, t.id, t.doneToday)}
                      onPointerDown={() => onPointerDownDone(t.id, t.doneToday)}
                      onPointerUp={onPointerUpDone}
                      onPointerLeave={onPointerUpDone}
                      onPointerCancel={onPointerUpDone}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`min-h-11 rounded-[14px] px-3 flex items-center gap-1.5 text-[13.5px] font-bold shrink-0 select-none touch-manipulation ${
                        popId === t.id ? "anim-pop" : ""
                      }`}
                      style={{
                        background: t.doneToday ? "var(--accent)" : "var(--accent-soft)",
                        color: t.doneToday ? "#fff" : "var(--accent-ink)",
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4.5 12.5l5 5L19.5 7"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {t.doneToday ? "記録済み" : "今日やった"}
                    </button>
                  </div>
                ))}

              {!loading && tasks.length > 0 && (
                <div
                  className="text-center text-[11.5px] font-medium pt-3 opacity-75 leading-relaxed"
                  style={{ color: "var(--sub)" }}
                >
                  「今日やった」を長押しすると、過去の日付でも記録できます
                  <br />
                  「記録済み」をもう一度タップすると取り消せます
                </div>
              )}

              {!loading && tasks.length === 0 && (
                <div className="text-center py-[70px] px-6" style={{ color: "var(--sub)" }}>
                  <div className="text-[15px] font-bold">まだタスクがありません</div>
                  <div className="text-[12.5px] mt-2 leading-loose font-medium">
                    右上の＋から、気になる掃除を
                    <br />
                    登録してみましょう
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
              <Link
                href="/help"
                className="text-[12px] font-medium px-3 py-2"
                style={{ color: "var(--sub)" }}
              >
                ヘルプ
              </Link>
              <button
                type="button"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/login";
                      },
                    },
                  })
                }
                className="text-[12px] font-medium px-3 py-2"
                style={{ color: "var(--sub)" }}
              >
                ログアウト
              </button>
            </div>
          </div>
        )}

        {screen === "edit" && (
          <div className="anim-screen flex flex-col min-h-dvh">
            <header className="px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3 flex items-center gap-2">
              <BackButton onClick={goBack} />
              <h1 className="text-[18px] font-bold flex-1">
                {editId ? "タスクを編集" : "タスクを追加"}
              </h1>
            </header>
            <div className="flex-1 px-4 pb-8">
              <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--sub)" }}>
                タスク名
              </label>
              <input
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                placeholder="例：シーツ洗い"
                className="w-full rounded-2xl border-[1.5px] px-4 py-3.5 text-[16px] outline-none"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              />

              <label className="block text-[12px] font-bold mt-5 mb-2" style={{ color: "var(--sub)" }}>
                目安の周期
              </label>
              <div className="flex gap-2">
                {[
                  { label: "毎週", days: 7 },
                  { label: "隔週", days: 14 },
                  { label: "毎月", days: 30 },
                ].map((p) => {
                  const on = fCycle === p.days;
                  return (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => {
                        setFCycle(p.days);
                        setFCycleError(null);
                      }}
                      className="flex-1 rounded-2xl border py-3 text-[13px] font-bold"
                      style={{
                        background: on ? "var(--accent-soft)" : "var(--card)",
                        borderColor: on ? "var(--accent)" : "var(--line)",
                        color: on ? "var(--accent-ink)" : "var(--sub)",
                      }}
                    >
                      {p.label}
                      <div className="text-[11px] font-medium opacity-80">{p.days}日</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="日数"
                  value={fCycle === "" ? "" : String(fCycle)}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    setFCycleError(null);
                    if (raw === "") {
                      setFCycle("");
                      return;
                    }
                    // 数字以外は無視（入力しやすさ優先）
                    if (!/^\d+$/.test(raw)) return;
                    const n = Number(raw);
                    if (n > 365) {
                      setFCycle(365);
                      return;
                    }
                    setFCycle(n);
                  }}
                  className="w-[86px] rounded-2xl border text-center py-2.5 text-[15px] font-bold"
                  style={{
                    background: "var(--card)",
                    borderColor: fCycleError ? "var(--del)" : "var(--line)",
                    color: "var(--ink)",
                  }}
                  aria-invalid={!!fCycleError}
                  aria-describedby={fCycleError ? "cycle-error" : undefined}
                />
                <span className="text-[13px] font-medium" style={{ color: "var(--sub)" }}>
                  日ごと
                </span>
              </div>
              {fCycleError && (
                <p
                  id="cycle-error"
                  className="mt-2 text-[12.5px] font-bold"
                  style={{ color: "var(--del)" }}
                  role="alert"
                >
                  {fCycleError}
                </p>
              )}
              <p className="mt-4 text-[12px] font-medium leading-relaxed" style={{ color: "var(--sub)" }}>
                きっちり守れなくても大丈夫。あくまで「目安」です。あとからいつでも変えられます。
              </p>

              <button
                type="button"
                disabled={pending}
                onClick={saveTask}
                className="mt-8 w-full rounded-[18px] py-4 text-[15px] font-bold disabled:opacity-50"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                }}
              >
                保存する
              </button>

              {editId && (
                <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--line)" }}>
                  {!confirmDel ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDel(true)}
                      className="w-full text-[14px] font-bold py-3"
                      style={{ color: "var(--del)" }}
                    >
                      このタスクを削除
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-[13.5px] font-medium mb-3">履歴ごと削除します。よい？</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={removeTask}
                          className="flex-1 rounded-2xl py-3 text-[14px] font-bold text-white"
                          style={{ background: "var(--del)" }}
                        >
                          削除する
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDel(false)}
                          className="flex-1 rounded-2xl py-3 text-[14px] font-bold"
                          style={{ background: "var(--card)", color: "var(--sub)" }}
                        >
                          やめる
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "history" && historyTask && (
          <div className="anim-screen flex flex-col min-h-dvh">
            <header className="px-4 pt-[max(16px,env(safe-area-inset-top))] pb-3 flex items-center gap-2">
              <BackButton onClick={() => setScreen("home")} />
              <h1 className="text-[18px] font-bold flex-1 truncate">{historyTask.name}</h1>
              <button
                type="button"
                onClick={() => openEdit(historyTask.id, "history")}
                className="rounded-2xl px-3 py-2 text-[13px] font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                編集
              </button>
            </header>
            <div className="px-4 pb-8">
              <div
                className="rounded-[20px] p-4 grid gap-3"
                style={{
                  background: "var(--card)",
                  boxShadow: "var(--shadow)",
                  gridTemplateColumns: "1fr 1fr 1.25fr",
                }}
              >
                <SummaryCell label="目安の周期" value={`${historyTask.cycleDays}日ごと`} />
                <SummaryCell
                  label="前回"
                  value={
                    historyTask.elapsedDays == null
                      ? "—"
                      : historyTask.elapsedDays === 0
                        ? "今日"
                        : `${historyTask.elapsedDays}日前`
                  }
                />
                <SummaryCell label="次の目安" value={formatNextDue(historyTask.nextDue)} />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSheetTaskId(historyTask.id);
                  setSheetDate(today);
                }}
                className="mt-3 w-full rounded-2xl py-3.5 text-[14px] font-bold"
                style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              >
                ＋ 日付を選んで記録
              </button>

              <div
                className="mt-4 rounded-[20px] overflow-hidden"
                style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
              >
                {historyTask.logs.length === 0 && (
                  <div className="px-4 py-8 text-center text-[13px]" style={{ color: "var(--sub)" }}>
                    まだ記録がありません
                  </div>
                )}
                {[...historyTask.logs].reverse().map((ymd, i, arr) => (
                  <div
                    key={ymd}
                    className="flex items-center gap-2 px-4 py-3.5"
                    style={{
                      borderBottom:
                        i < arr.length - 1 ? "1px solid var(--line)" : undefined,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold">
                        {formatLogLabel(ymd, today)}
                      </div>
                      <div className="text-[12.5px] font-medium mt-0.5" style={{ color: "var(--sub)" }}>
                        {relativeFromToday(ymd, today)}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`${formatLogLabel(ymd, today)}の記録を取り消す`}
                      disabled={pending}
                      onClick={() => cancelRecord(historyTask.id, ymd)}
                      className="shrink-0 rounded-xl px-3 py-2 text-[12.5px] font-bold active:scale-95 disabled:opacity-50"
                      style={{
                        background: "color-mix(in oklab, var(--del) 12%, var(--card))",
                        color: "var(--del)",
                      }}
                    >
                      取り消し
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Record sheet */}
        {sheetTaskId && (
          <div
            className="absolute inset-0 z-40 flex items-end justify-center"
            style={{ background: "rgba(42,36,28,.34)" }}
            onClick={() => setSheetTaskId(null)}
          >
            <div
              className="anim-sheet w-full max-w-[402px] rounded-t-[28px] px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]"
              style={{ background: "var(--sheet)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-9 rounded-full" style={{ background: "var(--line)" }} />
              <h2 className="text-[17px] font-bold">日付を選んで記録</h2>
              <p className="text-[12.5px] font-medium mt-1" style={{ color: "var(--sub)" }}>
                {tasks.find((t) => t.id === sheetTaskId)?.name}
              </p>
              <div className="mt-4 flex gap-2">
                {[
                  { label: "今日", offset: 0 },
                  { label: "昨日", offset: 1 },
                  { label: "おととい", offset: 2 },
                ].map((q) => {
                  const d = new Date();
                  d.setDate(d.getDate() - q.offset);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, "0");
                  const day = String(d.getDate()).padStart(2, "0");
                  const ymd = `${y}-${m}-${day}`;
                  return (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => record(sheetTaskId, ymd)}
                      className="flex-1 rounded-2xl py-3 text-[13px] font-bold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                    >
                      {q.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2 items-center">
                <input
                  type="date"
                  max={today}
                  value={sheetDate}
                  onChange={(e) => setSheetDate(e.target.value)}
                  className="flex-1 rounded-2xl border px-3 py-3 text-[14px]"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--line)",
                    color: "var(--ink)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!sheetDate.trim()) {
                      showToast("日付を選んでください");
                      return;
                    }
                    record(sheetTaskId, sheetDate);
                  }}
                  className="rounded-2xl px-4 py-3 text-[13.5px] font-bold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  この日で記録
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSheetTaskId(null)}
                className="w-full mt-3 py-3 text-[13.5px] font-bold"
                style={{ color: "var(--sub)" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-11 z-50 flex justify-center px-4">
            <div
              className="anim-toast pointer-events-auto max-w-[340px] rounded-2xl px-4 py-3 text-[13px] font-semibold flex items-center gap-3"
              style={{ background: "var(--toast-bg)", color: "var(--toast-c)" }}
            >
              <span className="flex-1">{toast.msg}</span>
              {toast.undo && (
                <button
                  type="button"
                  onClick={undoFromToast}
                  className="shrink-0 font-bold underline-offset-2"
                  style={{ color: "var(--accent-bright)" }}
                >
                  元に戻す
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="戻る"
      className="h-[38px] w-[38px] rounded-[12px] flex items-center justify-center shrink-0 active:scale-95"
      style={{ background: "var(--card)" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 6l-6 6 6 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] font-bold" style={{ color: "var(--sub)" }}>
        {label}
      </div>
      <div className="text-[14.5px] font-bold mt-1">{value}</div>
    </div>
  );
}
