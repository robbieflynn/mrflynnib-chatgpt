import type { Metadata } from "next";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Course payment", robots: { index: false, follow: false } };

type SearchParams = { order?: string | string[]; result?: string | string[] };

export default async function CheckoutCompletePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const orderId = typeof query.order === "string" ? query.order : "";
  const result = typeof query.result === "string" ? query.result : "";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: order } = user && orderId
    ? await supabase.from("checkout_orders").select("course_code,status,is_test").eq("id", orderId).maybeSingle()
    : { data: null };

  const canceled = result === "canceled";
  const failed = result === "failed";
  const completed = order?.status === "completed";
  const title = completed ? "Payment confirmed." : canceled ? "Checkout canceled." : failed ? "Payment was not completed." : "Confirming your payment.";
  const message = completed
    ? `${order.course_code} access has been attached to your account${order.is_test ? " as a test entitlement" : ""}.`
    : canceled
      ? "Nothing has been charged. You can return to the course and choose a plan whenever you are ready."
      : failed
        ? "Nothing has been added to your account. Please try again or contact us if the problem continues."
        : "Ziina is sending the secure confirmation now. This normally takes only a few moments.";

  return (
    <main className="checkout-page">
      <Container className="narrow">
        <section className="checkout-result-card stack-lg">
          <Eyebrow>Course access</Eyebrow>
          <h1>{title}</h1>
          <p className="lede">{message}</p>
          <div className="checkout-result-actions">
            {completed ? <Link className="button" href="/account">Open my account</Link> : null}
            {!completed && !canceled && !failed ? <Link className="button" href={`/courses/checkout/complete?order=${encodeURIComponent(orderId)}`}>Check again</Link> : null}
            <Link className="button button-secondary" href="/courses">Return to courses</Link>
          </div>
        </section>
      </Container>
    </main>
  );
}
