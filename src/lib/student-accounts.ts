export type StudentAccountSummary = {
  user_id: string;
  display_name: string;
  email: string;
  curriculum: "ib" | "igcse";
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  class_count: number;
  completed_question_count: number;
  submitted_assignment_count: number;
};

export function studentAccountSummaries(value: unknown): StudentAccountSummary[] {
  return Array.isArray(value) ? value as StudentAccountSummary[] : [];
}
