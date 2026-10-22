import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { CourseCheckoutButton } from "@/components/platform/course-checkout-button";
import { Container, Eyebrow } from "@/components/ui";
import { getPlatformAccess } from "@/lib/platform-server";
import { productsForCurriculum } from "@/lib/platform-products";
import { requestTeachableTransfer } from "./actions";

export const metadata: Metadata = { title: "Course access", robots: { index: false, follow: false } };

export default async function AccessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const session = await getPlatformAccess();
  if (!session.user || !session.curriculum) redirect(`/account?next=${encodeURIComponent("/account/access")}${query.qualification === "igcse" ? "&qualification=igcse" : ""}`);
  const products = productsForCurriculum(session.curriculum);
  const owned = new Set(session.ownedCourses.map((course) => course.id));
  const claim = typeof query.claim === "string" ? query.claim : "";
  return <>
    <section className={`dashboard-hero student-dashboard-hero ${session.curriculum === "igcse" ? "student-dashboard-hero-igcse" : ""}`}>
      <Container className="dashboard-hero-shell"><div className="dashboard-account-row"><Link className="dashboard-back-link" href={session.curriculum === "igcse" ? "/igcse/account" : "/account"}>← Learning home</Link><AccountMenu signOutHref={session.curriculum === "igcse" ? "/account?qualification=igcse" : "/account"} /></div><div className="dashboard-hero-copy"><span className="dashboard-role-label">Access</span><h1>Your courses and account</h1><p>Start with the free question bank, try real course lessons, then unlock the complete course when you are ready.</p></div></Container>
    </section>
    <section className="section-tight platform-access-page"><Container className="stack-xl">
      {query.checkout === "success" ? <p className="form-message form-success">Payment received. Your course access is being activated now. Refresh this page if it does not appear within a few seconds.</p> : null}
      {claim === "sent" ? <p className="form-message form-success">Transfer request sent. We will verify your existing Teachable enrolment and add access to this account.</p> : null}
      {claim === "already-pending" ? <p className="form-message">Your Teachable transfer request is already waiting for review.</p> : null}
      {claim === "error" ? <p className="form-message form-error">The transfer request could not be sent. Please try again.</p> : null}
      <div className="platform-access-intro"><div><Eyebrow>Current access</Eyebrow><h2>{session.access?.label || "Free account"}</h2><p>{session.access?.detail || "Question bank and classroom access"}</p></div><div className="access-free-summary"><strong>Always available</strong><span>Question bank, classes, assignments and saved work</span></div></div>
      <div className="access-course-grid">{products.map((product) => {
        const hasAccess = owned.has(product.id);
        return <article className={`access-course-card ${hasAccess ? "has-access" : ""}`} key={product.id}><div><span className="course-detail-code">{product.shortTitle}</span><small>{hasAccess ? "Active course" : "Complete course"}</small></div><h2>{product.title}</h2><p>Structured lessons, selected question-bank practice and worked past-paper solutions in one learning space.</p>{hasAccess ? <Link className="button" href={`/learn?course=${product.id}`}>Open course</Link> : <CourseCheckoutButton courseId={product.id} />}</article>;
      })}</div>
      <div className="access-support-grid">
        <article className="card stack"><Eyebrow>Already paid on Teachable?</Eyebrow><h2>Bring your access across.</h2><p>Use the same email address if possible. We will verify the enrolment before activating your course here.</p><form className="stack" action={requestTeachableTransfer}><label>Course<select name="courseId" required>{products.map((product) => <option value={product.id} key={product.id}>{product.shortTitle}</option>)}</select></label><label>Anything we should know? <span className="muted">(optional)</span><textarea name="note" rows={3} /></label><button className="button button-secondary" type="submit">Request access transfer</button></form></article>
        <article className="card stack"><Eyebrow>Still using Teachable?</Eyebrow><h2>Your old course remains available.</h2><p>Nothing is being removed while the new platform is introduced. You can continue learning on Teachable during the transition.</p><Link className="button button-secondary" href="/go/my-courses">Continue on Teachable</Link></article>
      </div>
    </Container></section>
  </>;
}
