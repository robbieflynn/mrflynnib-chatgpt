import { Container } from "@/components/ui";

export default function AccountLoading() {
  return (
    <>
      <section className="dashboard-hero student-dashboard-hero student-dashboard-loading-hero">
        <Container className="dashboard-hero-shell">
          <div className="student-dashboard-loading-copy" aria-hidden="true">
            <span />
            <strong />
            <i />
          </div>
        </Container>
      </section>
      <section className="student-dashboard section-tight" aria-busy="true" aria-live="polite">
        <Container className="stack-xl">
          <p className="student-dashboard-loading-label">Opening your dashboard…</p>
          <div className="student-next-grid student-dashboard-loading-grid" aria-hidden="true">
            <div className="student-dashboard-loading-card">
              <span />
              <strong />
              <i />
              <i />
            </div>
            <div className="student-dashboard-loading-card is-summary">
              <span />
              <strong />
              <i />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
