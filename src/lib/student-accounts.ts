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
  all: "All access", plus: "Plus (any source)", free: "Standard",
  stripe: "Paid individually (Stripe)", stripe_test: "Test payment", licence: "School licence",
  school: "Approved school (complimentary)", teachable: "Transferred from Teachable",
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

// The API caps each response. Never present a truncated batch as the full directory.
export async function loadStudentAccounts(fetchPage: (from: number, to: number) => PromiseLike<{
  data: StudentAccountSummary[] | null;
  count: number | null;
  error: unknown;
}>) {
  const accounts: StudentAccountSummary[] = [];
  const ids = new Set<string>();
  let total: number | null = null;
  try {
    do {
      const page = await fetchPage(accounts.length, accounts.length + 499);
      if (page.error || page.count === null || !page.data) throw new Error("Directory unavailable");
      if (total !== null && page.count !== total) throw new Error("Directory changed during loading");
      total = page.count;
      if (!page.data.length && accounts.length < total) throw new Error("Incomplete directory");
      for (const account of page.data) {
        if (ids.has(account.user_id)) throw new Error("Directory changed during loading");
        ids.add(account.user_id);
        accounts.push(account);
      }
    } while (accounts.length < total);
    if (accounts.length !== total) throw new Error("Incomplete directory");
    return { accounts, total, error: false };
  } catch {
    return { accounts: [] as StudentAccountSummary[], total: null, error: true };
  }
}
