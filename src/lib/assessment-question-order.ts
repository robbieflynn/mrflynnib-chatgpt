export type AssessmentCourse = "AA HL" | "AA SL" | "AI HL" | "AI SL" | "IGCSE Higher";

type OrderableQuestion = {
  difficulty?: string | null;
  paper?: string | null;
  section?: string | null;
};

export function assessmentDifficultyRank(value: string | null | undefined) {
  const difficulty = String(value || "").trim().toLowerCase();
  if (difficulty.includes("easy")) return 0;
  if (difficulty.includes("hard") || difficulty.includes("difficult")) return 2;
  return 1;
}

export function assessmentPaperRank(value: string | null | undefined) {
  return /paper\s*2/i.test(String(value || "")) ? 1 : 0;
}

export function orderAssessmentQuestions<T extends OrderableQuestion>(items: T[], course: AssessmentCourse, groupByPaper = false) {
  const aaCourse = course === "AA HL" || course === "AA SL";
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      if (groupByPaper) {
        const paperDifference = assessmentPaperRank(left.item.paper) - assessmentPaperRank(right.item.paper);
        if (paperDifference) return paperDifference;
      }
      if (aaCourse) {
        const leftSection = left.item.section === "B" ? 1 : 0;
        const rightSection = right.item.section === "B" ? 1 : 0;
        if (leftSection !== rightSection) return leftSection - rightSection;
      }
      const difficultyDifference = assessmentDifficultyRank(left.item.difficulty) - assessmentDifficultyRank(right.item.difficulty);
      return difficultyDifference || left.index - right.index;
    })
    .map(({ item }) => item);
}
