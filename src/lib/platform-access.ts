export const platformProductLabels: Record<string, string> = {
  course_ib_aa_hl: "Mr Flynn IB Plus",
  course_ib_aa_sl: "Mr Flynn IB Plus",
  course_ib_ai_hl: "Mr Flynn IB Plus",
  course_ib_ai_sl: "Mr Flynn IB Plus",
  course_igcse: "Mr Flynn IB Plus",
  question_bank_plus_ib: "Question Bank Plus",
  question_bank_plus_igcse: "Question Bank Plus",
  teacher_plus_ib: "Teacher Plus",
  teacher_plus_igcse: "Teacher Plus",
  student_all_courses_ib: "Student Plus — all four IB courses",
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
  curriculum?: "ib" | "igcse",
) {
  const personalAccess = activePlatformEntitlements(entitlements, now);
  const schoolAccess = activePlatformEntitlements(activeSchoolEntitlements(schoolSeats), now);
  const matchesCurriculum = (entitlement: PlatformEntitlement) => {
    if (!curriculum) return true;
    if (curriculum === "igcse") return entitlement.product_code === "course_igcse" || entitlement.product_code.endsWith("_igcse");
    return entitlement.product_code.startsWith("course_ib_") || entitlement.product_code.endsWith("_ib");
  };
  const active = [...personalAccess, ...schoolAccess].filter(matchesCurriculum);
  const courseAccess = active
    .filter((entitlement) => entitlement.product_code.startsWith("course_")
      || entitlement.product_code.startsWith("teacher_plus")
      || entitlement.product_code === "student_all_courses_ib")
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
      label: "Standard account",
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


export type CourseAccessStatus = { label: string; status: "Active" | "Expired" | "Upcoming"; detail: string };

/** Describe effective course access, including overlapping grants, without implying payment. */
export function courseAccessStatuses(
  entitlements: PlatformEntitlement[] | null | undefined,
  schoolSeats: PlatformLicenseSeat[] | null | undefined,
  curriculum: "ib" | "igcse",
  role: "student" | "teacher" | "admin",
  now = new Date(),
): CourseAccessStatus[] {
  const courses = curriculum === "ib"
    ? [["course_ib_aa_hl", "AA HL"], ["course_ib_aa_sl", "AA SL"], ["course_ib_ai_hl", "AI HL"], ["course_ib_ai_sl", "AI SL"]]
    : [["course_igcse", "IGCSE Mathematics"]];
  if (role === "admin") return [{ label: curriculum === "ib" ? "All four IB courses" : "IGCSE Mathematics", status: "Active", detail: "Administrator access · No expiry" }];
  const records = [...(entitlements ?? []), ...activeSchoolEntitlements(schoolSeats)];
  const formatDate = (value: string) => new Date(value).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai",
  }) + " Dubai time";
  const expiry = (record: PlatformEntitlement) => record.expires_at ? new Date(record.expires_at).getTime() : Infinity;
  const rows: CourseAccessStatus[] = [];
  for (const [code, label] of courses) {
    const matching = records.filter((record) => (record.status === "active" || record.status === "expired") && (
      record.product_code === code
      || (curriculum === "ib" && record.product_code === "student_all_courses_ib")
      || (role === "teacher" && record.product_code === `teacher_plus_${curriculum}`)
    ));
    const active = matching.filter((record) => isActive(record, now)).sort((a, b) => expiry(b) - expiry(a));
    const future = matching.filter((record) => record.status === "active" && new Date(record.starts_at).getTime() > now.getTime() && expiry(record) > new Date(record.starts_at).getTime()).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
    const past = matching.filter((record) => expiry(record) <= now.getTime()).sort((a, b) => expiry(b) - expiry(a));
    if (active[0]) rows.push({ label, status: "Active", detail: active[0].expires_at ? `Ends ${formatDate(active[0].expires_at)}` : "No expiry" });
    else if (future[0]) rows.push({ label, status: "Upcoming", detail: `Starts ${formatDate(future[0].starts_at)}${future[0].expires_at ? ` · Ends ${formatDate(future[0].expires_at)}` : " · No expiry"}` });
    else if (past[0]?.expires_at) rows.push({ label, status: "Expired", detail: `Ended ${formatDate(past[0].expires_at)}` });
  }
  if (curriculum === "ib" && rows.length === 4 && rows.every((row) => row.status === rows[0].status && row.detail === rows[0].detail)) {
    return [{ ...rows[0], label: "All four IB courses" }];
  }
  return rows;
}
