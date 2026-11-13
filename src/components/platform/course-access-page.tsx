import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { CourseCheckoutButton } from "@/components/platform/course-checkout-button";
import { CheckoutActivationNotice } from "@/components/platform/checkout-activation-notice";
import { Container } from "@/components/ui";
import type { Curriculum } from "@/lib/account-access";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct, productsForCurriculum } from "@/lib/platform-products";
import { redeemAccessCode, requestTeachableTransfer } from "@/app/account/access/actions";

export async function CourseAccessPage({ curriculum, searchParams }: { curriculum: Curriculum; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const accountPath = curriculum === "igcse" ? "/igcse/account" : "/account";
  const accessPath = curriculum === "igcse" ? "/igcse/account/access" : "/account/access";
  const session = await getPlatformAccess(curriculum);
  if (!session.user || !session.curriculum) {
    const nextPath = typeof query.course === "string" ? `${accessPath}?course=${encodeURIComponent(query.course)}` : accessPath;
    const accountQuery = new URLSearchParams({ next: nextPath });
    if (curriculum === "ib") accountQuery.set("plan", "plus");
    if (typeof query.course === "string") accountQuery.set("course", query.course);
    redirect(`${accountPath}?${accountQuery.toString()}`);
  }
  if (curriculum === "ib" && ["teacher", "admin"].includes(session.profile?.role || "")) redirect("/teacher/access");
  return <CourseAccessView curriculum={curriculum} query={query} session={session} />;
}

export function CourseAccessView({ curriculum, query, session }: {
  curriculum: Curriculum;
  query: Record<string, string | string[] | undefined>;
  session: Pick<Awaited<ReturnType<typeof getPlatformAccess>>, "profile" | "access" | "ownedCourses">;
}) {
  const accountPath = curriculum === "igcse" ? "/igcse/account" : "/account";
  const accessPath = curriculum === "igcse" ? "/igcse/account/access" : "/account/access";
  const learnPath = curriculum === "igcse" ? "/igcse/learn" : "/learn";
  const products = productsForCurriculum(curriculum);
  const requestedProduct = getCourseProduct(typeof query.course === "string" ? query.course : "");
  const selectedProduct = requestedProduct?.curriculum === curriculum ? requestedProduct : null;
  const focusedProduct = selectedProduct ?? products.find((product) => session.ownedCourses.some((course) => course.id === product.id)) ?? products[0];
  const owned = new Set(session.profile?.role === "admin" ? products.map((course) => course.id) : session.ownedCourses.map((course) => course.id));
  const claim = typeof query.claim === "string" ? query.claim : "";
  const checkoutSessionId = typeof query.session_id === "string" ? query.session_id : "";
  const codeStatus = typeof query.code === "string" ? query.code : "";
  const checkoutSucceeded = query.checkout === "success";
  const checkoutProduct = selectedProduct ?? (curriculum === "igcse" ? products[0] : null);
  const checkoutReady = Boolean(checkoutSucceeded && checkoutProduct && owned.has(checkoutProduct.id));
  const teacherApprovalPending = session.profile?.role === "student" && session.profile?.teacher_status === "pending";
  const successCourseHref = checkoutProduct ? `${learnPath}?course=${checkoutProduct.id}` : `${learnPath}?view=courses`;
  const checkoutCourseName = checkoutProduct?.shortTitle ?? (curriculum === "igcse" ? "IGCSE Mathematics" : "Plus");
  return <>
    <section className={`dashboard-hero student-dashboard-hero access-page-hero access-redesign-hero ${checkoutSucceeded ? "is-checkout-complete" : ""} ${curriculum === "igcse" ? "student-dashboard-hero-igcse" : ""}`}>
      <Container className="dashboard-hero-shell"><div className="dashboard-account-row"><Link className="dashboard-back-link" href={accountPath}>← Learning home</Link><AccountMenu signOutHref={accountPath} /></div><div className="dashboard-hero-copy"><span className="dashboard-role-label">{checkoutSucceeded ? checkoutReady ? "Purchase complete" : "Payment received" : curriculum === "igcse" ? "IGCSE course access" : "Mr Flynn IB Plus"}</span><h1>{checkoutSucceeded ? checkoutReady ? "You’re all set." : `We’re activating your ${checkoutCourseName} course.` : curriculum === "igcse" ? "Your Edexcel IGCSE Mathematics course" : selectedProduct ? owned.has(selectedProduct.id) ? `Your ${selectedProduct.shortTitle} course is ready` : `Unlock the complete ${selectedProduct.shortTitle} course` : session.ownedCourses.length ? "Your course access" : "Your next step in IB Maths"}</h1><p>{checkoutSucceeded ? checkoutReady ? `Thank you. The complete ${checkoutCourseName} course is now unlocked on this account.` : "Your purchase was successful. Course access normally appears within a few seconds." : curriculum === "igcse" ? "Your IGCSE course, question bank, classes and assignments stay together in the IGCSE Mathematics area." : session.ownedCourses.length ? "Open your course below, or explore another IB Mathematics course." : "Build your understanding with complete video lessons and extra practice, all in one place."}</p></div></Container>
    </section>
    {checkoutSucceeded ? <section className="section-tight platform-access-page platform-access-complete"><Container className="checkout-complete-shell">
      {checkoutReady ? <div className="checkout-complete-actions"><div className="checkout-complete-status"><span aria-hidden="true">✓</span><p><strong>{checkoutCourseName} Plus is active</strong><small>Every lesson and its extra practice are ready.</small></p></div><div className="cluster"><Link className="button" href={successCourseHref}>Start learning</Link><Link className="button button-secondary" href={accountPath}>Learning home</Link></div></div> : <CheckoutActivationNotice sessionId={checkoutSessionId} accessPath={accessPath} title={`The complete ${checkoutCourseName} course`} openHref={successCourseHref} />}
    </Container></section> : <section className="section-tight platform-access-page access-redesign"><Container className="access-review-shell">
      {query.checkout === "cancelled" ? <p className="form-message">Checkout was cancelled. You have not been charged.</p> : null}
      {claim === "sent" ? <p className="form-message form-success">Transfer request sent. We will verify your existing Teachable enrolment and add access to this account.</p> : null}
      {claim === "already-pending" ? <p className="form-message">Your Teachable transfer request is already waiting for review.</p> : null}
      {claim === "error" ? <p className="form-message form-error">The transfer request could not be sent. Please try again.</p> : null}
      {codeStatus === "redeemed" ? <p className="form-message form-success">Access code accepted. Your course is ready to open.</p> : null}
      {codeStatus === "already_active" ? <p className="form-message form-success">Your account already has this course access.</p> : null}
      {codeStatus === "already_redeemed" ? <p className="form-message">This account has already used that access code.</p> : null}
      {codeStatus === "teacher_required" ? <p className="form-message form-error">That code is for a teacher account.</p> : null}
      {codeStatus === "student_required" ? <p className="form-message form-error">That code is for a student account.</p> : null}
      {codeStatus === "course_required" ? <p className="form-message form-error">Choose the one IB course you want this code to unlock, then try again.</p> : null}
      {["invalid", "unavailable", "error"].includes(codeStatus) ? <p className="form-message form-error">That access code is invalid, expired or no longer available.</p> : null}
      {teacherApprovalPending ? <div className="teacher-pending-note" role="status"><strong>Your teacher request is awaiting approval.</strong><span>You can keep using the student learning area while you wait. This account will change to a teacher account as soon as it is approved.</span></div> : null}
      <div className="access-status-line"><span><strong>{session.access?.label || "Standard account"}</strong><span>{session.access?.detail || "Question bank, classes, assignments and saved work"}</span></span><Link href={accountPath}>Back to learning <span aria-hidden="true">↗</span></Link></div>
      <div className="access-offer-layout">
        <div className="access-offer-main">
          {curriculum === "ib" ? <nav className="access-course-tabs" aria-label="Choose your IB course">{products.map((product) => <Link aria-current={product.id === focusedProduct.id ? "page" : undefined} href={`${accessPath}?course=${product.id}`} key={product.id}><span>{product.shortTitle}</span>{owned.has(product.id) ? <span className="access-tab-owned" aria-label="Access active">✓</span> : null}</Link>)}</nav> : null}
          <article className="access-offer-copy">
            <span className="access-offer-label">{focusedProduct.shortTitle} · {owned.has(focusedProduct.id) ? "Access active" : "Complete course"}</span>
            <h2>{focusedProduct.title}</h2>
            <p>Clear explanations. Practice that puts them to work.</p>
            <ul className="access-benefits">
              <li><span aria-hidden="true">01</span><div><strong>Learn every topic</strong><p>Work through the complete video course with Mr Flynn IB, at your own pace.</p></div></li>
              <li><span aria-hidden="true">02</span><div><strong>Put each lesson into practice</strong><p>Build your understanding with the extra practice attached to the lessons.</p></div></li>
              <li><span aria-hidden="true">03</span><div><strong>Keep your learning together</strong><p>Your lessons sit alongside your question bank, classes and saved work.</p></div></li>
            </ul>
          </article>
        </div>
        <aside className={`access-purchase-panel ${owned.has(focusedProduct.id) ? "has-access" : ""}`} aria-label={`${focusedProduct.shortTitle} access`}>
          {owned.has(focusedProduct.id) ? <><span className="access-active-badge">✓ Access active</span><h3>Your course is ready.</h3><p>Every video lesson and its extra practice are unlocked.</p><Link className="button" href={`${learnPath}?course=${focusedProduct.id}`}>Open {focusedProduct.shortTitle} course</Link><small>No additional purchase needed.</small></> : <><span className="access-offer-label">{focusedProduct.shortTitle} Plus</span><h3>The complete course</h3><p>Access for one selected course.</p>{focusedProduct.plans.length ? <CourseCheckoutButton key={focusedProduct.id} courseId={focusedProduct.id} compact plans={focusedProduct.plans.map(({ id, label, priceUsd }) => ({ id, label, priceUsd }))} /> : <p>Browse the course and its sample lessons below.</p>}<Link className="access-sample-link" href={`${learnPath}?course=${focusedProduct.id}`}>Explore sample lessons <span aria-hidden="true">→</span></Link></>}
        </aside>
      </div>
      <div className="access-help">
        <details open={Boolean(codeStatus)}><summary>Have a school or access code?</summary><div className="access-help-content"><p>{curriculum === "ib" ? "Enter your code below. For a student code that covers any one IB course, your course choice is fixed when you redeem it." : "Enter the code supplied by Mr Flynn IB or your school to unlock your IGCSE course."}</p><form className="access-code-form" action={redeemAccessCode}><input name="curriculum" type="hidden" value={curriculum} />{curriculum === "ib" ? <label>Course to unlock<select name="courseId" defaultValue={focusedProduct.id} key={focusedProduct.id} required>{products.map((product) => <option value={product.id} key={product.id}>{product.shortTitle}</option>)}</select></label> : <input name="courseId" type="hidden" value={products[0]?.id || "igcse"} />}<label>Access code<input name="accessCode" autoCapitalize="characters" autoComplete="off" placeholder="MFI-…" required /></label><button className="button button-secondary" type="submit">Redeem code</button></form></div></details>
        <details open={Boolean(claim)}><summary>Already purchased a course?</summary><div className="access-help-content"><p>Use the same confirmed email as your previous Teachable purchase. A verified enrollment keeps its remaining access period. If your course is missing, request an access check.</p><form className="access-transfer-form" action={requestTeachableTransfer}><label>Course<select name="courseId" defaultValue={focusedProduct.id} key={focusedProduct.id} required>{products.map((product) => <option value={product.id} key={product.id}>{product.shortTitle}</option>)}</select></label><label>Anything we should know? (optional)<textarea name="note" rows={3} /></label><button className="button button-secondary" type="submit">Request an access check</button></form></div></details>
      </div>
    </Container></section>}
  </>;
}
