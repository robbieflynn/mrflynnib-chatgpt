import { accountTier, platformAccessSummary } from "@/lib/platform-access";
import type { StudentAccessRecord } from "@/lib/student-accounts";

export function directoryAccountTier(account: {
  role: "student" | "teacher" | "admin";
  curriculum: "ib" | "igcse";
  access?: StudentAccessRecord[];
}, now: number) {
  if (!account.access) return "unknown";
  return accountTier(account.role, platformAccessSummary(account.access, [], new Date(now), account.curriculum), account.curriculum);
}
