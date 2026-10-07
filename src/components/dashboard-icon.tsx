type DashboardIconName = "add" | "class" | "check";

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  const path = name === "add"
    ? <><path d="M12 5v14" /><path d="M5 12h14" /></>
    : name === "check"
      ? <path d="m5 12 4 4L19 6" />
      : <><path d="M4 7.5h16v11H4z" /><path d="M8 7.5V5h8v2.5" /></>;

  return (
    <span className={`dashboard-icon dashboard-icon-${name}`} aria-hidden="true">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {path}
      </svg>
    </span>
  );
}
