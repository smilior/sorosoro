import { z } from "zod";

/** タスク名の上限（文字数。絵文字も1として数える code unit ではなく Array.from で概算） */
export const TASK_NAME_MAX = 100;
export const TASK_NAME_MIN = 1;

const taskNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z
      .string()
      .min(TASK_NAME_MIN, "タスク名を入力してください")
      .refine(
        (s) => Array.from(s).length <= TASK_NAME_MAX,
        `タスク名は${TASK_NAME_MAX}文字以内にしてください`,
      ),
  );

export type ParsedTaskName =
  | { ok: true; name: string }
  | { ok: false; error: string };

export function parseTaskName(raw: unknown): ParsedTaskName {
  const r = taskNameSchema.safeParse(typeof raw === "string" ? raw : "");
  if (!r.success) {
    return {
      ok: false,
      error: r.error.issues[0]?.message ?? "タスク名が不正です",
    };
  }
  return { ok: true, name: r.data };
}
