export const assignmentFeedbackModes = ["immediate", "after_question", "after_assignment", "hidden"] as const;

export type AssignmentFeedbackMode = (typeof assignmentFeedbackModes)[number];

export const assignmentFeedbackOptions: Array<{
  value: AssignmentFeedbackMode;
  label: string;
  description: string;
}> = [
  {
    value: "immediate",
    label: "Available from the start",
    description: "Students can open the complete mark scheme and worked solution at any time.",
  },
  {
    value: "after_question",
    label: "After each question is completed",
    description: "Reveal that question after a correct answer or the student’s second attempt.",
  },
  {
    value: "after_assignment",
    label: "Only after the assignment is submitted",
    description: "Keep every mark scheme and solution hidden until the student submits the assignment.",
  },
  {
    value: "hidden",
    label: "Never show students",
    description: "Mark schemes and worked solutions remain available only to teachers.",
  },
];

export function isAssignmentFeedbackMode(value: string): value is AssignmentFeedbackMode {
  return assignmentFeedbackModes.includes(value as AssignmentFeedbackMode);
}

export function assignmentFeedbackModeFromRecord(record: { feedback_mode?: string | null; show_mark_scheme?: boolean | null }): AssignmentFeedbackMode {
  if (record.feedback_mode && isAssignmentFeedbackMode(record.feedback_mode)) return record.feedback_mode;
  return record.show_mark_scheme === false ? "hidden" : "immediate";
}

export function assignmentFeedbackLabel(mode: AssignmentFeedbackMode) {
  return assignmentFeedbackOptions.find((option) => option.value === mode)?.label ?? assignmentFeedbackOptions[0].label;
}
