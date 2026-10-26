import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { CourseCheckoutButton } from "@/components/platform/course-checkout-button";
import { CheckoutActivationNotice } from "@/components/platform/checkout-activation-notice";
import { Container, Eyebrow } from "@/components/ui";
import type { Curriculum } from "@/lib/account-access";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct, productsForCurriculum } from "@/lib/platform-products";
import { redeemAccessCode, requestTeachableTransfer } from "@/app/account/access/actions";

export async function CourseAccessPage({ curriculum, searchParams }: { curriculum: Curriculum; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const accountPath = curriculum === "igcse" ? "/igcse/account" : "/account";
  const accessPath = curriculum === "igcse" ? "/igcse/account/access" : "/account/access";
  const learnPath = curriculum === "igcse" ? "/igcse/learn" : "/learn";
  const session = await getPlatformAccess(curriculum);
  if (!session.user || !session.curriculum) {
    const accountQuery = new URLSearchParams({ next: accessPath });
    if (curriculum === "ib") accountQuery.set("plan", "plus");
    redirect(`${accountPath}?${accountQuery.toString()}`);
  }
  const products = productsForCurriculum(curriculum);
  const requestedProduct = getCourseProduct(typeof query.course === "string" ? query.course : "");
  const selectedProduct = requestedProduct?.curriculum === curriculum ? requestedProduct : null;
  const visibleProducts = selectedProduct ? [selectedProduct] : products;
  const owned = new Set(session.profile?.role === "admin" ? products.map((course) => course.id) : session.ownedCourses.map((course) => course.id));
  const claim = typeof query.claim === "string" ? query.claim : "";
  const checkoutSessionId = typeof query.session_id === "string" ? query.session_id : "";
  const codeStatus = typeof query.code === "string" ? query.code : "";
  const checkoutSucceeded = query.checkout === "success";
  const successCourseHref = selectedProduct ? `${learnPath}?course=${selectedProduct.id}` : `${learnPath}?view=courses`;
  return <>
    <section className={`dashboard-hero student-dashboard-hero access-page-hero ${curriculum === "igcse" ? "student-dashboard-hero-igcse" : ""}`}>
      <Container className="dashboard-hero-shell"><div className="dashboard-account-row"><Link className="dashboard-back-link" href={accountPath}>← Learning home</Link><AccountMenu signOutHref={accountPath} /></div><div className="dashboard-hero-copy"><span className="dashboard-role-label">{checkoutSucceeded ? "Purchase complete" : curriculum === "igcse" ? "IGCSE course access" : "Mr Flynn IB Plus"}</span><h1>{checkoutSucceeded ? "Thank you — your Plus course is ready." : curriculum === "igcse" ? "Your Edexcel IGCSE Mathematics course" : selectedProduct ? `Unlock the complete ${selectedProduct.shortTitle} course` : "Choose your complete course"}</h1><p>{checkoutSucceeded ? "Your payment was successful. This account now has access to the complete course." : curriculum === "igcse" ? "Your IGCSE course, question bank, classes and assignments stay together in the IGCSE Mathematics area." : "Every video lesson and the full set of extra practice attached to the course. Two years of access with one payment and no automatic renewal."}</p></div></Container>
    </section>
    <section className="section-tight platform-access-page"><Container className="stack-xl">
      {checkoutSucceeded ? <CheckoutActivationNotice sessionId={checkoutSessionId} accessPath={accessPath} title={selectedProduct ? `The complete ${selectedProduct.shortTitle} course` : "Your complete course"} openHref={successCourseHref} /> : null}
      {query.checkout === "cancelled" ? <p className="form-message">Checkout was cancelled. You have not been charged.</p> : null}
      {claim === "sent" ? <p className="form-message form-success">Transfer request sent. We will verify your existing Teachable enrolment and add access to this account.</p> : null}
      {claim === "already-pending" ? <p className="form-message">Your Teachable transfer request is already waiting for review.</p> : null}
      {claim === "error" ? <p className="form-message form-error">The transfer request could not be sent. Please try again.</p> : null}
      {codeStatus === "redeemed" ? <p className="form-message form-success">Access code accepted. Your course is ready to open.</p> : null}
      {codeStatus === "already_active" ? <p className="form-message form-success">Your account already has this course access.</p> : null}
      {codeStatus === "already_redeemed" ? <p className="form-message">This account has already used that access code.</p> : null}
      {codeStatus === "teacher_required" ? <p className="form-message form-error">That code is for an approved teacher account.</p> : null}
      {["invalid", "unavailable", "error"].includes(codeStatus) ? <p className="form-message form-error">That access code is invalid, expired or no longer available.</p> : null}
      <div className="platform-access-intro"><div><Eyebrow>Current access</Eyebrow><h2>{session.access?.label || "Free account"}</h2><p>{session.access?.detail || "Complete question bank and classroom tools"}</p></div>{session.access?.paid ? <div className="access-plus-summary"><strong>Plus is active</strong><span>Complete lessons and lesson practice are unlocked for your course.</span></div> : <div className="access-free-summary"><strong>Free account</strong><span>Question bank, classes, assignments and saved work</span></div>}</div>
      {curriculum === "ib" ? <nav className="access-course-selector" aria-label="Choose course">{products.map((product) => <Link aria-current={product.id === selectedProduct?.id ? "page" : undefined} className={product.id === selectedProduct?.id ? "is-selected" : ""} href={`${accessPath}?course=${product.id}`} key={product.id}><strong>{product.shortTitle}</strong><span>{product.title}</span></Link>)}</nav> : null}
      <div className={`access-course-grid ${selectedProduct ? "is-focused" : ""}`}>{visibleProducts.map((product) => {
        const hasAccess = owned.has(product.id);
        return <article className={`access-course-card ${hasAccess ? "has-access" : ""}`} key={product.id}><div><span className="course-detail-code">{product.shortTitle}</span><small>{hasAccess ? "Course access active" : curriculum === "igcse" ? "Free course preview" : "Mr Flynn IB Plus"}</small></div><h2>{product.title}</h2><p>The complete video course, with every lesson and the full set of extra practice questions inside it.</p>{hasAccess ? <Link className="button" href={`${learnPath}?course=${product.id}`}>Open course</Link> : product.plans.length ? <CourseCheckoutButton courseId={product.id} plans={product.plans.map(({ id, label, priceUsd, badge }) => ({ id, label, priceUsd, badge }))} /> : <div className="stack-sm"><p className="small muted">Explore the complete native IGCSE course structure and open the free sample lessons. Paid IGCSE access has not been announced.</p><Link className="button" href="/igcse/learn">Open the IGCSE course</Link><Link className="text-link" href="/go/igcse-course">Open the previous Teachable course ↗</Link></div>}</article>;
      })}</div>
      <div className="access-support-grid">
        <article className="card stack"><Eyebrow>Already paid on Teachable?</Eyebrow><h2>Your access should appear automatically.</h2><p>Use the same confirmed email address as your Teachable account. A matching valid paid or code enrolment is added without another payment and keeps its remaining access period.</p><div className="stack-sm"><h3>Can&apos;t see your course?</h3><p className="small muted">Send a request and we will check the enrolment manually.</p></div><form className="stack" action={requestTeachableTransfer}><label>Course<select name="courseId" required>{products.map((product) => <option value={product.id} key={product.id}>{product.shortTitle}</option>)}</select></label><label>Anything we should know? <span className="muted">(optional)</span><textarea name="note" rows={3} /></label><button className="button button-secondary" type="submit">Request an access check</button></form></article>
        <article className="card stack"><Eyebrow>Previous Teachable course</Eyebrow><h2>Your previous course remains available.</h2><p>Nothing is being removed while the new platform is introduced. You can continue learning on Teachable during the transition.</p><Link className="button button-secondary" href={curriculum === "igcse" ? "/go/igcse-course" : "/go/my-courses"}>Open previous Teachable course</Link></article>
      </div>
      <article className="access-code-card"><div><Eyebrow>Have an access code?</Eyebrow><h2>Unlock your course</h2><p>Enter the code supplied by Mr Flynn IB or your school. It will be connected permanently to this account.</p></div><form action={redeemAccessCode}><input name="curriculum" type="hidden" value={curriculum} /><label><span>Access code</span><input name="accessCode" autoCapitalize="characters" autoComplete="off" placeholder="MFI-…" required /></label><button className="button" type="submit">Redeem code</button></form></article>
    </Container></section>
  </>;
}
