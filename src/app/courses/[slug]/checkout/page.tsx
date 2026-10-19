import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";
import { ZiinaCheckoutPlans } from "@/components/ziina-checkout-plans";
import { courseAccessPlans, courses } from "@/lib/content";
import { hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isZiinaTestMode } from "@/lib/ziina";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose course access",
  description: "Choose secure access to your Mr Flynn IB course.",
  robots: { index: false, follow: false },
};

export default async function CourseCheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courses.find((item) => item.slug === slug);
  if (!course) notFound();

  const configured = hasSupabaseBrowserConfig();
  const user = configured ? (await (await createClient()).auth.getUser()).data.user : null;
  const returnPath = `/courses/${course.slug}/checkout`;

  return (
    <main className="checkout-page">
      <Container className="stack-xl">
        <Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: course.shortTitle, href: `/courses/${course.slug}` }, { label: "Checkout" }]} />
        <div className="checkout-heading stack">
          <Eyebrow>{course.shortTitle} course access</Eyebrow>
          <h1>Choose how long you need.</h1>
          <p className="lede">Every option includes the same complete {course.shortTitle} course. Only the access period changes.</p>
        </div>
        {user ? (
          <ZiinaCheckoutPlans courseSlug={course.slug} plans={courseAccessPlans} testMode={isZiinaTestMode()} />
        ) : (
          <section className="checkout-signin-card stack">
            <Eyebrow>One quick step</Eyebrow>
            <h2>Sign in before choosing your plan.</h2>
            <p>Your purchase will be attached to this account so your course appears as soon as payment is confirmed.</p>
            <Link className="button" href={`/account?next=${encodeURIComponent(returnPath)}`}>Sign in or create an account</Link>
          </section>
        )}
      </Container>
    </main>
  );
}
