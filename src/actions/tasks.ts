"use server";

import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { taskLogs, tasks } from "@/lib/db/schema";
import { requireUserId } from "@/lib/auth-session";
import {
  clampCycleDays,
  deriveTask,
  isValidYmd,
  sortTasks,
  todayYmd,
  type DerivedTask,
  type TaskWithLogs,
} from "@/lib/domain/task";
import { limitCreate, limitMutation } from "@/lib/rate-limit";
import { parseTaskName } from "@/lib/validation";

/** クライアントから渡された今日 (YYYY-MM-DD)。未指定・不正時はサーバー日付。 */
function resolveToday(clientToday?: string): string {
  if (clientToday && isValidYmd(clientToday)) return clientToday;
  return todayYmd();
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function loadUserTasks(userId: string): Promise<TaskWithLogs[]> {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const logs = await db
    .select()
    .from(taskLogs)
    .where(inArray(taskLogs.taskId, ids))
    .orderBy(asc(taskLogs.doneDate));

  const byTask = new Map<string, string[]>();
  for (const log of logs) {
    const list = byTask.get(log.taskId) ?? [];
    list.push(log.doneDate);
    byTask.set(log.taskId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    cycleDays: r.cycleDays,
    logs: byTask.get(r.id) ?? [],
  }));
}

export async function listTasksAction(input?: {
  /** 端末ローカルの今日。タイムゾーンずれ防止 */
  clientToday?: string;
}): Promise<ActionResult<{ tasks: DerivedTask[]; today: string }>> {
  try {
    const userId = await requireUserId();
    const today = resolveToday(input?.clientToday);
    const raw = await loadUserTasks(userId);
    const derived = sortTasks(raw.map((t) => deriveTask(t, today)));
    return { ok: true, data: { tasks: derived, today } };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "タスクの取得に失敗しました" };
  }
}

export async function createTaskAction(input: {
  name: string;
  cycleDays: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const rl = limitCreate(userId, "createTask");
    if (!rl.ok) return { ok: false, error: rl.error };

    const parsed = parseTaskName(input.name);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const cycleDays = clampCycleDays(input.cycleDays);

    const [row] = await db
      .insert(tasks)
      .values({
        userId,
        name: parsed.name,
        cycleDays,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: tasks.id });

    revalidatePath("/home");
    revalidatePath("/");
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "タスクの作成に失敗しました" };
  }
}

export async function updateTaskAction(input: {
  id: string;
  name: string;
  cycleDays: number;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const rl = limitMutation(userId, "updateTask");
    if (!rl.ok) return { ok: false, error: rl.error };

    const parsed = parseTaskName(input.name);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const cycleDays = clampCycleDays(input.cycleDays);

    const updated = await db
      .update(tasks)
      .set({ name: parsed.name, cycleDays, updatedAt: new Date() })
      .where(and(eq(tasks.id, input.id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });

    if (!updated.length) return { ok: false, error: "タスクが見つかりません" };
    revalidatePath("/home");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "タスクの更新に失敗しました" };
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const rl = limitMutation(userId, "deleteTask");
    if (!rl.ok) return { ok: false, error: rl.error };

    const deleted = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });
    if (!deleted.length) return { ok: false, error: "タスクが見つかりません" };
    revalidatePath("/home");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "タスクの削除に失敗しました" };
  }
}

export async function recordDoneAction(input: {
  taskId: string;
  date?: string;
  /** 端末ローカルの今日（未来日ガード用） */
  clientToday?: string;
}): Promise<ActionResult<{ date: string }>> {
  try {
    const userId = await requireUserId();
    const rl = limitMutation(userId, "recordDone");
    if (!rl.ok) return { ok: false, error: rl.error };

    const today = resolveToday(input.clientToday);
    const date = input.date ?? today;

    if (!isValidYmd(date)) {
      return { ok: false, error: "日付の形式が不正です" };
    }
    if (date > today) {
      return { ok: false, error: "未来の日付は記録できません" };
    }

    const owned = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)),
    });
    if (!owned) return { ok: false, error: "タスクが見つかりません" };

    const existing = await db.query.taskLogs.findFirst({
      where: and(
        eq(taskLogs.taskId, input.taskId),
        eq(taskLogs.doneDate, date),
      ),
    });
    if (existing) {
      return { ok: false, error: "その日はすでに記録済みです" };
    }

    await db.insert(taskLogs).values({
      taskId: input.taskId,
      doneDate: date,
      createdAt: new Date(),
    });
    await db
      .update(tasks)
      .set({ updatedAt: new Date() })
      .where(eq(tasks.id, input.taskId));

    revalidatePath("/home");
    revalidatePath("/");
    return { ok: true, data: { date } };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "記録に失敗しました" };
  }
}

export async function undoRecordAction(input: {
  taskId: string;
  date: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const rl = limitMutation(userId, "undoRecord");
    if (!rl.ok) return { ok: false, error: rl.error };

    const owned = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)),
    });
    if (!owned) return { ok: false, error: "タスクが見つかりません" };

    const deleted = await db
      .delete(taskLogs)
      .where(
        and(
          eq(taskLogs.taskId, input.taskId),
          eq(taskLogs.doneDate, input.date),
        ),
      )
      .returning({ id: taskLogs.id });

    if (!deleted.length) {
      return { ok: false, error: "取り消す記録が見つかりません" };
    }

    await db
      .update(tasks)
      .set({ updatedAt: new Date() })
      .where(eq(tasks.id, input.taskId));

    revalidatePath("/home");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "取り消しに失敗しました" };
  }
}

/**
 * 開発環境のみ: タスク0件のときサンプルを投入する。
 * production / preview では no-op。
 */
export async function seedIfEmptyAction(): Promise<
  ActionResult<{ seeded: boolean }>
> {
  if (process.env.NODE_ENV !== "development") {
    return { ok: true, data: { seeded: false } };
  }

  try {
    const userId = await requireUserId();
    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.userId, userId),
    });
    if (existing) return { ok: true, data: { seeded: false } };

    const today = todayYmd();
    const samples = [
      { name: "シーツ洗い", cycleDays: 7, offset: 12 },
      { name: "風呂の排水口", cycleDays: 14, offset: 20 },
      { name: "レンジフード", cycleDays: 30, offset: 5 },
      { name: "トイレの床", cycleDays: 7, offset: 3 },
    ];

    for (const s of samples) {
      const [row] = await db
        .insert(tasks)
        .values({
          userId,
          name: s.name,
          cycleDays: s.cycleDays,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: tasks.id });

      const d = new Date();
      d.setDate(d.getDate() - s.offset);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const doneDate = `${y}-${m}-${day}`;
      if (doneDate <= today) {
        await db.insert(taskLogs).values({
          taskId: row.id,
          doneDate,
          createdAt: new Date(),
        });
      }
    }

    revalidatePath("/");
    return { ok: true, data: { seeded: true } };
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return { ok: false, error: "ログインが必要です" };
    }
    console.error(e);
    return { ok: false, error: "サンプル作成に失敗しました" };
  }
}
