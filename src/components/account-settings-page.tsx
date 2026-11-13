import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsPasswordForm } from "@/components/account-settings-password-form";
import { Container, Eyebrow } from "@/components/ui";
import { getPlatformAccess } from "@/lib/platform-server";

type AccountSettingsPageProps = { curriculum: "ib" | "igcse" };

function accountTypeLabel(role: string | null | undefined) {
  if (role === "admin") return "Administrator";
  if (role === "teacher") return "Teacher";
  return "Student";
}

export async function AccountSettingsPage({ curriculum }: AccountSettingsPageProps) {
  const session = await getPlatformAccess(curriculum);
  const { user } = session;
  const signInHref = curriculum === "igcse" ? "/igcse/account?next=/igcse/account/settings" : "/account?next=/account/settings";
  if (!user) redirect(signInHref);
  return <AccountSettingsView curriculum={curriculum} session={session} />;
}

export function AccountSettingsView({ curriculum, session }: AccountSettingsPageProps & { session: Pick<Awaited<ReturnType<typeof getPlatformAccess>>, "user" | "profile" | "access" | "ownedCourses" | "entitlements"> }) {
  const { user, profile, access, ownedCourses, entitlements } = session;
  if (!user) return null;

  const metadata = user.user_metadata || {};
  const metadataName = typeof metadata.display_name === "string"
    ? metadata.display_name
    : [metadata.first_name, metadata.last_name].filter((value) => typeof value === "string").join(" ");
  const email = user.email || "No email address";
  const displayName = profile?.display_name || metadataName || email.split("@")[0] || "Your account";
  const isTeacher = profile?.role === "teacher" || profile?.role === "admin";
  const teacherApprovalPending = profile?.role === "student" && profile?.teacher_status === "pending";
  const homeHref = curriculum === "igcse" ? isTeacher ? "/igcse/teacher" : "/igcse/account" : isTeacher ? "/teacher" : "/account";
  const accessHref = curriculum === "igcse" ? "/igcse/account/access" : isTeacher ? "/teacher/access" : "/account/access";

  const courses = ownedCourses.filter((course) => course.curriculum === curriculum);
  const learnPath = curriculum === "igcse" ? "/igcse/learn" : "/learn";
  const canUpgrade = profile?.role !== "admin" && !(isTeacher ? access?.hasTeacherPlus : access?.hasCourseAccess);
  const upgradeLabel = curriculum === "igcse" ? "Upgrade to Plus" : isTeacher ? "Upgrade to Teacher Plus" : "Upgrade to IB Plus";

  return (
    <>
      <section className={`account-settings-hero ${curriculum === "igcse" ? "is-igcse" : ""}`}>
        <Container className="stack-sm"><Eyebrow>My account</Eyebrow><h1>Hello, {displayName.split(" ")[0]}.</h1><p>Your details, course access and settings in one place.</p><Link className="text-link" href={homeHref}>Back to {isTeacher ? "teacher home" : "my learning"}</Link></Container>
      </section>
      <section className="section-tight account-settings-section">
        <Container className="account-overview-access">
          <div className="account-overview-heading"><div><p className="eyebrow">Your access</p><h2>{profile?.role === "admin" ? "Administrator access" : access?.label || "Standard account"}</h2><p className="muted">{profile?.role === "admin" ? "All courses available for administration" : access?.detail}</p></div><Link className={canUpgrade ? "button button-small" : "text-link"} href={accessHref}>{canUpgrade ? upgradeLabel : "Manage course access"}</Link></div>
          {courses.length ? <ul className="account-course-list">{courses.map((course) => {
            const grants = entitlements.filter((item) => item.product_code === course.productCode || (isTeacher && item.product_code === `teacher_plus_${curriculum}`) || (curriculum === "ib" && item.product_code === "student_all_courses_ib"));
            const expiry = grants.some((item) => !item.expires_at) ? null : grants.map((item) => item.expires_at).filter((value): value is string => Boolean(value)).sort().at(-1);
            return <li key={course.id}><div><strong>{course.shortTitle}</strong><span>{profile?.role === "admin" ? "Administrator access" : expiry ? `Access until ${new Date(expiry).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "No expiry date"}</span></div><Link href={`${learnPath}?course=${course.id}`}>Open course →</Link></li>;
          })}</ul> : <p className="account-standard-note">No complete courses are active on this account. Explore sample lessons, or choose Plus for complete course lessons and extra practice.</p>}
        </Container>
        <Container className="account-settings-layout">
          <div className="account-settings-details stack-lg">
            <div className="stack-xs"><p className="eyebrow">Account details</p><h2>Your information</h2></div>
            <dl className="account-settings-list">
              <div><dt>Name</dt><dd>{displayName}</dd></div>
              <div><dt>Email address</dt><dd>{email}</dd></div>
              <div><dt>Account type</dt><dd>{accountTypeLabel(profile?.role)}</dd></div>
              {teacherApprovalPending ? <div><dt>Teacher access</dt><dd>Awaiting approval</dd></div> : null}
            </dl>
            {teacherApprovalPending ? <div className="teacher-pending-note" role="status"><strong>Your teacher request is waiting for approval.</strong><span>You can continue using the student learning area until it is approved.</span></div> : null}
            <p className="small muted">Contact Mr Flynn IB if your name or email address needs to be corrected.</p>
          </div>
          <AccountSettingsPasswordForm />
        </Container>
      </section>
    </>
  );
}
