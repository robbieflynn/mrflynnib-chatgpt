import { Container } from "@/components/ui";

export default function AccountLoading() {
  return (
    <section className="account-route-loading" aria-busy="true" aria-label="Loading account">
      <Container className="narrow">
        <div className="account-route-loading-card" aria-hidden="true">
          <span />
          <strong />
          <i />
          <i />
        </div>
      </Container>
    </section>
  );
}
