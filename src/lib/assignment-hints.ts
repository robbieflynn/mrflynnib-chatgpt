import { readFile } from "node:fs/promises";
import path from "node:path";

export type AssignmentHint = { part: string; step: number; title: string; text: string; work: string; figure: string };
const directories: Record<string, string> = { "AA HL": "aa-hl", "AA SL": "aa-sl", "AI HL": "ai-hl", "AI SL": "ai-sl", "IGCSE Higher": "igcse-higher" };

/** Read only the authored steps, using the same course-specific file as the bank. */
export async function getAssignmentHints(course: string, questionId: string): Promise<AssignmentHint[]> {
  const directory = directories[course];
  if (!directory || !/^[A-Za-z0-9_-]{1,160}$/.test(questionId)) return [];
  let source: string;
  try { source = await readFile(path.join(process.cwd(), "public/question-bank/solutions", directory, `${questionId}.js`), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  // Parse the known JSON arguments. Never execute solution JavaScript on the server.
  const match = source.trim().match(/^window\.__qbSolution\(([\s\S]*)\);?$/);
  if (!match) throw new Error("Unsupported solution format");
  const [storedCourse, storedId, data] = JSON.parse(`[${match[1]}]`);
  if (storedCourse !== course || storedId !== questionId || !Array.isArray(data?.s?.solution)) throw new Error("Invalid solution identity");
  return data.s.solution.flatMap((part: { part?: string; steps?: { title?: string; text?: string; work?: string }[] }, partIndex: number) =>
    (part.steps ?? []).map((step, index) => ({
      part: String(part.part || ""), step: index + 1,
      title: String(step.title || ""), text: String(step.text || ""), work: String(step.work || ""),
      figure: String(data.f?.[`${partIndex}.${index}`] || ""),
    })),
  );
}
