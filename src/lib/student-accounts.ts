export type StudentAccountSummary = {
  access?: StudentAccessRecord[];
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

export type StudentAccessRecord = {
  product_code: string;
  source: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
};

export function currentStudentAccess(records: StudentAccessRecord[], now: number) {
  return records.filter((record) => record.status === "active"
    && Date.parse(record.starts_at) <= now
    && (!record.expires_at || Date.parse(record.expires_at) > now));
}

export const studentAccessFilters: Record<string, string> = {
  all: "All access", plus: "Plus (any source)", free: "Free",
  stripe: "Paid individually (Stripe)", stripe_test: "Test payment", licence: "School licence",
  school: "Approved school (free)", teachable: "Transferred from Teachable",
  admin: "Complimentary", promotion: "Access code / promotion", expired: "Expired access",
};

export function matchesStudentAccess(records: StudentAccessRecord[] | undefined, filter: string, now: number) {
  if (filter === "all") return true;
  if (!records) return false;
  const active = currentStudentAccess(records, now);
  if (filter === "plus") return active.length > 0;
  if (filter === "free") return active.length === 0;
  if (filter === "expired") return records.some((r) => r.expires_at && Date.parse(r.expires_at) <= now);
  return active.some((r) => r.source === filter);
}
