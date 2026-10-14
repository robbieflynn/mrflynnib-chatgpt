export type TeacherAccountSummary = {
  user_id: string;
  display_name: string;
  email: string;
  curriculum: "ib" | "igcse";
  role: "student" | "teacher" | "admin";
  teacher_status: "none" | "pending" | "approved" | "rejected";
  teacher_requested_at: string | null;
  teacher_notification_sent_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  class_count: number;
  assignment_count: number;
  saved_test_count: number;
};

export function teacherAccountSummaries(value: unknown): TeacherAccountSummary[] {
  return Array.isArray(value) ? value as TeacherAccountSummary[] : [];
}
