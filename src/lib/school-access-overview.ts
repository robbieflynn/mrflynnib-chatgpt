import type { SupabaseClient } from "@supabase/supabase-js";
import { approvedSchools } from "./approved-schools";

/** Use the signed-in administrator's RLS-protected client, never a public query. */
export async function loadApprovedSchoolAccounts(supabase: SupabaseClient) {
  const accounts = new Map<string, Set<string>>(approvedSchools.map((school) => [school.domain, new Set<string>()]));
  const now = new Date().toISOString();
  const pageSize = 500;
  let expectedCount: number | null = null;
  let received = 0;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error, count } = await supabase.from("platform_entitlements")
      .select("id,user_id,metadata", { count: "exact" })
      .eq("external_provider", "school-domain")
      .eq("status", "active")
      .lte("starts_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error || !data || count === null) return null;
    if (expectedCount !== null && count !== expectedCount) return null;
    expectedCount = count;
    received += data.length;
    for (const row of data) {
      const domain = typeof row.metadata?.domain === "string" ? row.metadata.domain : "";
      accounts.get(domain)?.add(row.user_id);
    }
    if (received >= expectedCount) return received === expectedCount ? accounts : null;
    if (!data.length) return null;
  }
}
