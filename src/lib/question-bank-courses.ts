export type QuestionBankCourse = {
  slug: "aa-hl" | "aa-sl" | "ai-hl" | "ai-sl";
  code: "AA HL" | "AA SL" | "AI HL" | "AI SL";
  pathway: "Analysis & Approaches" | "Applications & Interpretation";
  level: "Higher Level" | "Standard Level";
};

export const questionBankCourses: QuestionBankCourse[] = [
  { slug: "aa-hl", code: "AA HL", pathway: "Analysis & Approaches", level: "Higher Level" },
  { slug: "aa-sl", code: "AA SL", pathway: "Analysis & Approaches", level: "Standard Level" },
  { slug: "ai-hl", code: "AI HL", pathway: "Applications & Interpretation", level: "Higher Level" },
  { slug: "ai-sl", code: "AI SL", pathway: "Applications & Interpretation", level: "Standard Level" },
];

export function getQuestionBankCourse(slug: string) {
  return questionBankCourses.find((course) => course.slug === slug);
}
