import "server-only";

import fixedAssignmentConfigs from "@/data/assignment-answer-configs.json";

export type AssignmentBank = "ib" | "igcse";

export type FixedAssignmentPart = {
  label: string;
  mode: "multiple_choice" | "whiteboard";
  acceptedAnswers: string[];
  options: string[];
  correctOption: number | null;
};

export type FixedAssignmentConfig = {
  id: string;
  type: "multiple_choice" | "multipart" | "teacher_review";
  acceptedAnswers: string[];
  options: string[];
  correctOption: number | null;
  parts: FixedAssignmentPart[];
};

const banks = fixedAssignmentConfigs as {
  ib: Record<string, FixedAssignmentConfig>;
  igcse: Record<string, FixedAssignmentConfig>;
};

export function getFixedAssignmentConfig(bank: string | null | undefined, questionId: string) {
  const bankKey: AssignmentBank = bank === "igcse" ? "igcse" : "ib";
  return banks[bankKey][questionId] ?? null;
}

export function responseOptionsForFixedConfig(config: FixedAssignmentConfig) {
  if (config.type === "multipart") {
    return config.parts.map((part) => ({
      label: part.label,
      mode: part.mode,
      options: part.options,
    }));
  }
  return config.options;
}

