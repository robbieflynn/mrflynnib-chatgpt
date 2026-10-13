import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildTestAnalysisWorkbook, type TestAnalysisInput, type TestAnalysisQuestion } from "@/lib/test-analysis-workbook";

export const runtime = "nodejs";

const courses = new Set<TestAnalysisInput["course"]>(["AA HL", "AA SL", "AI HL", "AI SL"]);
const papers = new Set<TestAnalysisInput["paper"]>(["Paper 1", "Paper 2", "Paper 1 and Paper 2"]);

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeFilename(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${cleaned || "ib-mathematics-test"}-analysis.xlsx`;
}

function parseQuestion(value: unknown): TestAnalysisQuestion | null {
  if (!value || typeof value !== "object") return null;
  const question = value as Record<string, unknown>;
  const marks = Number(question.marks);
  const number = Number(question.number);
  if (!Number.isInteger(marks) || marks < 1 || marks > 50 || !Number.isInteger(number) || number < 1 || number > 50) return null;
  return {
    number,
    title: text(question.title, 180) || `Question ${number}`,
    topic: text(question.topic, 100) || "IB Mathematics",
    subtopic: text(question.subtopic, 120),
    marks,
    paper: text(question.paper, 30),
    section: question.section === "B" ? "B" : "A",
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Please sign in again." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,curriculum").eq("user_id", user.id).maybeSingle();
  if (!profile || !new Set(["teacher", "admin"]).has(profile.role) || (profile.role !== "admin" && profile.curriculum && profile.curriculum !== "ib")) {
    return NextResponse.json({ message: "Teacher access is required." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "The analysis workbook request was not valid." }, { status: 400 });
  }

  const title = text(body.title, 100) || "Mathematics practice test";
  const course = body.course as TestAnalysisInput["course"];
  const paper = body.paper as TestAnalysisInput["paper"];
  const rawQuestions = Array.isArray(body.questions) ? body.questions.slice(0, 50) : [];
  const questions = rawQuestions.map((question) => parseQuestion(question)).filter((question): question is TestAnalysisQuestion => Boolean(question));
  if (!courses.has(course) || !papers.has(paper) || questions.length !== rawQuestions.length || questions.length === 0) {
    return NextResponse.json({ message: "Choose at least one valid IB Mathematics question first." }, { status: 400 });
  }

  try {
    const buffer = await buildTestAnalysisWorkbook({
      title,
      course,
      paper,
      teacherOrClass: text(body.teacherOrClass, 100),
      testDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.testDate ?? "")) ? String(body.testDate) : "",
      questions,
    });
    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename(title)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Test analysis workbook generation failed", error);
    return NextResponse.json({ message: "The analysis workbook could not be prepared." }, { status: 500 });
  }
}
