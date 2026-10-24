export const platformProductLabels: Record<string, string> = {
  course_ib_aa_hl: "AA HL course access",
  course_ib_aa_sl: "AA SL course access",
  course_ib_ai_hl: "AI HL course access",
  course_ib_ai_sl: "AI SL course access",
  course_igcse: "IGCSE course access",
  question_bank_plus_ib: "Question Bank Plus",
  question_bank_plus_igcse: "Question Bank Plus",
  teacher_plus_ib: "Teacher Plus",
  teacher_plus_igcse: "Teacher Plus",
};

export type PlatformEntitlement = {
  product_code: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
};

export type PlatformLicenseSeat = {
  revoked_at: string | null;
  organization_licenses: {
    product_code: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
  } | {
    product_code: string;
    status: string;
    starts_at: string;
    ends_at: string | null;
  }[] | null;
};

function isActive(entitlement: PlatformEntitlement, now: Date) {
  if (entitlement.status !== "active") return false;
  if (new Date(entitlement.starts_at).getTime() > now.getTime()) return false;
  return !entitlement.expires_at || new Date(entitlement.expires_at).getTime() > now.getTime();
}

export function activePlatformEntitlements(entitlements: PlatformEntitlement[] | null | undefined, now = new Date()) {
  return (entitlements ?? []).filter((entitlement) => isActive(entitlement, now));
}

function activeSchoolEntitlements(seats: PlatformLicenseSeat[] | null | undefined) {
  return (seats ?? []).flatMap((seat) => {
    const licence = Array.isArray(seat.organization_licenses)
      ? seat.organization_licenses[0]
      : seat.organization_licenses;
    if (!licence || seat.revoked_at || !["active", "pilot"].includes(licence.status)) return [];
    return [{
      product_code: licence.product_code,
      status: "active",
      starts_at: licence.starts_at,
      expires_at: licence.ends_at,
    } satisfies PlatformEntitlement];
  });
}

export function platformAccessSummary(
  entitlements: PlatformEntitlement[] | null | undefined,
  schoolSeats: PlatformLicenseSeat[] | null | undefined,
  now = new Date(),
) {
  const personalAccess = activePlatformEntitlements(entitlements, now);
  const schoolAccess = activePlatformEntitlements(activeSchoolEntitlements(schoolSeats), now);
  const active = [...personalAccess, ...schoolAccess];
  const courseAccess = active
    .filter((entitlement) => entitlement.product_code.startsWith("course_"))
    .sort((first, second) => {
      const firstExpiry = first.expires_at ? new Date(first.expires_at).getTime() : Number.POSITIVE_INFINITY;
      const secondExpiry = second.expires_at ? new Date(second.expires_at).getTime() : Number.POSITIVE_INFINITY;
      return secondExpiry - firstExpiry;
    });
  const primary = courseAccess[0]
    ?? active.find((entitlement) => entitlement.product_code.startsWith("question_bank_plus"))
    ?? active[0];

  if (!primary) {
    return {
      label: "Free account",
      detail: "Complete question bank and classroom tools",
      paid: false,
    };
  }

  return {
    label: platformProductLabels[primary.product_code] ?? "Paid access",
    detail: schoolAccess.includes(primary)
      ? "Provided by your school"
      : primary.expires_at
      ? `Active until ${new Date(primary.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : "Active",
    paid: true,
  };
}
