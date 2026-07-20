/** ドメイン計算（永続化しない派生値） */

export type TaskState = "normal" | "warn" | "late";

export type TaskWithLogs = {
  id: string;
  name: string;
  cycleDays: number;
  logs: string[]; // YYYY-MM-DD 昇順
};

export type DerivedTask = TaskWithLogs & {
  lastDone: string | null;
  elapsedDays: number | null;
  ratio: number;
  nextDue: string | null;
  state: TaskState;
  doneToday: boolean;
};

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayYmd(now = new Date()): string {
  return formatYmd(now);
}

export function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

export function diffDays(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd).getTime();
  const b = parseYmd(toYmd).getTime();
  return Math.round((b - a) / 86400000);
}

export function deriveTask(task: TaskWithLogs, today: string): DerivedTask {
  const logs = [...task.logs].sort();
  const lastDone = logs.length ? logs[logs.length - 1]! : null;
  const elapsedDays = lastDone ? diffDays(lastDone, today) : null;
  const ratio =
    lastDone == null
      ? 1.0
      : elapsedDays! / Math.max(1, task.cycleDays);
  const nextDue = lastDone ? addDays(lastDone, task.cycleDays) : null;

  let state: TaskState = "normal";
  if (ratio >= 1.5) state = "late";
  else if (ratio > 1) state = "warn";

  return {
    ...task,
    logs,
    lastDone,
    elapsedDays,
    ratio,
    nextDue,
    state,
    doneToday: lastDone === today,
  };
}

export function sortTasks(tasks: DerivedTask[]): DerivedTask[] {
  return [...tasks].sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    const ae = a.elapsedDays ?? Number.MAX_SAFE_INTEGER;
    const be = b.elapsedDays ?? Number.MAX_SAFE_INTEGER;
    if (be !== ae) return be - ae;
    return a.name.localeCompare(b.name, "ja");
  });
}

export function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseYmd(s).getTime());
}

export function clampCycleDays(n: number): number {
  if (!Number.isFinite(n)) return 7;
  return Math.min(365, Math.max(1, Math.round(n)));
}
