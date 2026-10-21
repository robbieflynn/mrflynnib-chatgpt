import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  savedTestRecordFromRow,
  type SavedTestCourse,
  type SavedTestPaper,
  type SavedTestPayload,
  type SavedTestQuestionReference,
} from "@/lib/saved-test";

const courses = new Set<SavedTestCourse>(["AA HL", "AA SL", "AI HL", "AI SL", "IGCSE Higher"]);
const papers = new Set<SavedTestPaper>(["Paper 1", "Paper 2", "Paper 1 and Paper 2"]);

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function questionReferences(value: unknown): SavedTestQuestionReference[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const seen = new Set<string>();
  const references: SavedTestQuestionReference[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const source = item as Record<string, unknown>;
    const id = shortText(source.id, 160);
    if (!id || seen.has(id)) return null;
    seen.add(id);
    references.push({
      id,
      section: source.section === "B" ? "B" : "A",
      paper: source.paper === "Paper 2" ? "Paper 2" : source.paper === "Paper 1" ? "Paper 1" : undefined,
    });
  }
  return references;
}

function payloadFrom(value: unknown): SavedTestPayload | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const questions = questionReferences(raw.questions);
  const shadowQuestions = questionReferences(raw.shadowQuestions);
  if (!questions?.length || !shadowQuestions) return null;
  return {
    version: 1,
    school: shortText(raw.school, 100),
    durationPaper1: shortText(raw.durationPaper1, 3).replace(/[^0-9]/g, "") || "90",
    durationPaper2: shortText(raw.durationPaper2, 3).replace(/[^0-9]/g, "") || "90",
    testDate: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.testDate ?? "")) ? String(raw.testDate) : "",
    includeMarkScheme: raw.includeMarkScheme !== false,
    includeAnalysis: raw.includeAnalysis !== false,
    questions,
    shadowQuestions,
  };
}

async function teacherAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Please sign in again." }, { status: 401 }) } as const;
  const { data: profile } = await supabase.from("profiles").select("role,curriculum").eq("user_id", user.id).maybeSingle();
  if (!profile || !new Set(["teacher", "admin"]).has(profile.role)) {
    return { error: NextResponse.json({ message: "Teacher access is required." }, { status: 403 }) } as const;
  }
  return { supabase, user, profile } as const;
}

export async function POST(request: Request) {
  const access = await teacherAccess();
  if ("error" in access) return access.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "That saved test was not valid." }, { status: 400 });
  }

  const id = shortText(body.id, 80);
  const title = shortText(body.title, 100) || "Mathematics practice test";
  const course = body.course as SavedTestCourse;
  const paper = body.paper as SavedTestPaper;
  const questionCount = Number(body.questionCount);
  const totalMarks = Number(body.totalMarks);
  const payload = payloadFrom(body.payload);
  if (!courses.has(course) || !papers.has(paper) || !payload || questionCount !== payload.questions.length || !Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 1000) {
    return NextResponse.json({ message: "Choose at least one valid question before saving the test." }, { status: 400 });
  }
  const requiredCurriculum = course === "IGCSE Higher" ? "igcse" : "ib";
  if (access.profile.role !== "admin" && access.profile.curriculum && access.profile.curriculum !== requiredCurriculum) {
    return NextResponse.json({ message: `Teacher access to the ${requiredCurriculum === "igcse" ? "IGCSE" : "IB"} Test Maker is required.` }, { status: 403 });
  }

  const values = {
    teacher_id: access.user.id,
    title,
    course,
    paper,
    question_count: questionCount,
    total_marks: totalMarks,
    payload,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? access.supabase.from("saved_tests").update(values).eq("id", id).eq("teacher_id", access.user.id)
    : access.supabase.from("saved_tests").insert(values);
  const { data, error } = await query.select("id,title,course,paper,question_count,total_marks,payload,created_at,updated_at").maybeSingle();
  if (error || !data) {
    console.error("Saved test write failed", error);
    return NextResponse.json({ message: "The test could not be saved. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ test: savedTestRecordFromRow(data as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  const access = await teacherAccess();
  if ("error" in access) return access.error;
  const id = shortText(new URL(request.url).searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ message: "Choose a saved test first." }, { status: 400 });
  const { error } = await access.supabase.from("saved_tests").delete().eq("id", id).eq("teacher_id", access.user.id);
  if (error) {
    console.error("Saved test delete failed", error);
    return NextResponse.json({ message: "The saved test could not be deleted." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
