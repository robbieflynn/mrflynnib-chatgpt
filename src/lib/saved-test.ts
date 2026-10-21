export type SavedTestCourse = "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher";
export type SavedTestPaper = "Paper 1" | "Paper 2" | "Paper 1 and Paper 2";
export type SavedTestSection = "A" | "B";

export type SavedTestQuestionReference = {
  id: string;
  section: SavedTestSection;
  paper?: "Paper 1" | "Paper 2";
};

export type SavedTestPayload = {
  version: 1;
  school: string;
  durationPaper1: string;
  durationPaper2: string;
  testDate: string;
  includeMarkScheme: boolean;
  includeAnalysis: boolean;
  questions: SavedTestQuestionReference[];
  shadowQuestions: SavedTestQuestionReference[];
};

export type SavedTestRecord = {
  id: string;
  title: string;
  course: SavedTestCourse;
  paper: SavedTestPaper;
  questionCount: number;
  totalMarks: number;
  payload: SavedTestPayload;
  createdAt: string;
  updatedAt: string;
};

export function savedTestRecordFromRow(row: Record<string, unknown>): SavedTestRecord {
  return {
    id: String(row.id || ""),
    title: String(row.title || "Mathematics practice test"),
    course: row.course as SavedTestCourse,
    paper: row.paper as SavedTestPaper,
    questionCount: Number(row.question_count) || 0,
    totalMarks: Number(row.total_marks) || 0,
    payload: row.payload as SavedTestPayload,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}
