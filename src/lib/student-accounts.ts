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
