import type { Metadata } from "next";
import { PasswordResetForm } from "@/components/password-reset-form";
import { Breadcrumbs, Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reset question bank password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <section className="account-page">
      <Container className="account-shell account-shell-narrow">
        <Breadcrumbs items={[{ label: "Account", href: "/account" }, { label: "Reset password" }]} />
        <PasswordResetForm />
      </Container>
    </section>
  );
}
