import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, Eyebrow } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { getCourseProduct, productsForCurriculum } from "@/lib/platform-products";

export const metadata: Metadata = {
  title: "Mr Flynn IB Plus",
  description: "Choose an IB Mathematics course and unlock every video lesson and its complete lesson practice.",
  robots: { index: false, follow: false },
};

const covers: Record<string, string> = {
  "aa-hl": "/learn/assets/course-aa-hl.png",
  "aa-sl": "/learn/assets/course-aa-sl.png",
  "ai-hl": "/learn/assets/course-ai-hl.png",
  "ai-sl": "/learn/assets/course-ai-sl.png",
};

type PlusSearchParams = { course?: string | string[] };

export default async function PlusPage({ searchParams }: { searchParams: Promise<PlusSearchParams> }) {
  const query = await searchParams;
  const requestedCourse = typeof query.course === "string" ? query.course : "";
  const requestedProduct = getCourseProduct(requestedCourse);
  const selected = requestedProduct?.curriculum === "ib" ? requestedProduct : undefined;
  const courses = productsForCurriculum("ib");
  if (hasSupabaseBrowserConfig()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect(`/account/access${selected ? `?course=${selected.id}` : ""}`);
  }

  const nextPath = selected ? `/account/access?course=${selected.id}` : "/account/access";
  const accountQuery = new URLSearchParams({ mode: "sign-up", plan: "plus", next: nextPath });
  if (selected) accountQuery.set("course", selected.id);

  return (
    <div className="plus-page">
      <section className="plus-hero">
        <Container className="plus-hero-grid">
          <div className="stack-lg">
            <Eyebrow>Mr Flynn IB Plus</Eyebrow>
            <h1>{selected ? `Unlock the complete ${selected.shortTitle} course.` : "Choose your IB Mathematics course."}</h1>
            <p className="lede">Every video lesson, the complete course structure and the extra practice attached to each lesson.</p>
            <div className="plus-inclusions" aria-label="Plus includes">
              <span>✓ Complete video course</span>
              <span>✓ Lesson practice</span>
              <span>✓ 12 or 24 months</span>
            </div>
          </div>
          <aside className="plus-free-note">
            <span className="plus-symbol" aria-hidden="true">+</span>
            <div><strong>Your free account stays useful.</strong><p>The independent question bank, whiteboards, classes and assignments remain free.</p></div>
          </aside>
        </Container>
      </section>

      <section className="section-tight">
        <Container className="stack-xl">
          <div className="plus-section-heading stack-sm">
            <Eyebrow>Step 1</Eyebrow>
            <h2>Select your course</h2>
            <p>You will be able to preview the free lessons before deciding to pay.</p>
          </div>
          <div className="plus-course-grid">
            {courses.map((course) => {
              const isSelected = course.id === selected?.id;
              return (
                <Link className={`plus-course-choice ${isSelected ? "is-selected" : ""}`} href={`/plus?course=${course.id}`} key={course.id} aria-current={isSelected ? "page" : undefined}>
                  <Image alt={`${course.shortTitle} course cover`} height={150} src={covers[course.id]} width={210} />
                  <span><small>{course.shortTitle}</small><strong>{course.title}</strong></span>
                  <b>{isSelected ? "Selected" : "Choose"}</b>
                </Link>
              );
            })}
          </div>

          {selected ? (
            <section className="plus-choice-summary">
              <div className="stack-sm">
                <Eyebrow>Step 2</Eyebrow>
                <h2>Create or sign in to your account</h2>
                <p>Choose your access length after signing in. You will not be charged when you create the account.</p>
              </div>
              <div className="plus-price-preview" aria-label="Available access lengths">
                {selected.plans.map((plan) => <div className={plan.badge ? "is-best-value" : ""} key={plan.id}>{plan.badge ? <small>{plan.badge}</small> : null}<strong>${plan.priceUsd}</strong><span>{plan.label}</span></div>)}
              </div>
              <div className="plus-choice-actions">
                <Link className="button" href={`/account?${accountQuery.toString()}`}>Create account and continue</Link>
                <Link className="button button-secondary" href={`/account?plan=plus&course=${selected.id}&next=${encodeURIComponent(nextPath)}`}>Sign in to continue</Link>
                <Link className="text-link" href={`/learn?course=${selected.id}`}>Keep browsing {selected.shortTitle}</Link>
              </div>
              <small className="plus-payment-note">One payment · No automatic renewal · Secure checkout follows after sign-in</small>
            </section>
          ) : (
            <p className="plus-select-prompt">Choose one of the four courses above to see its access options.</p>
          )}
        </Container>
      </section>
    </div>
  );
}
