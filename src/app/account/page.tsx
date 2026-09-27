import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-panel";
import { Breadcrumbs, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "Question bank account",
  description: "Sign in to save your Mr Flynn IB question bank progress.",
  robots: { index: false, follow: false },
};

function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/question-bank";
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const params = await searchParams;
  const error = params.error === "confirmation" ? "That confirmation link could not be completed. Please try signing in or request a new link." : undefined;

  return (
    <section className="account-page">
      <Container className="account-shell">
        <Breadcrumbs items={[{ label: "Question bank", href: "/question-bank" }, { label: "Account" }]} />
        <div className="account-layout">
          <div className="account-intro stack-lg">
            <div>
              <Eyebrow>Student progress</Eyebrow>
              <h1>Keep your question bank progress.</h1>
            </div>
            <p className="lede">Mark a question when you get it right and pick up where you left off on any device.</p>
            <ul className="account-benefits">
              <li>Save correct questions</li>
              <li>Keep one account across all four IB courses</li>
              <li>Use the question bank freely, with or without an account</li>
            </ul>
          </div>
          <AccountPanel initialError={error} nextPath={safeNextPath(params.next)} />
        </div>
      </Container>
    </section>
  );
}
