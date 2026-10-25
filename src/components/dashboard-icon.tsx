type DashboardIconName = "add" | "class" | "check" | "book" | "progress" | "assignment";

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  const path = name === "add"
    ? <><path d="M12 5v14" /><path d="M5 12h14" /></>
    : name === "book"
      ? <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 1 4 16.5z" /><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20" /></>
    : name === "progress"
      ? <><path d="M5 20V10" /><path d="M12 20V4" /><path d="M19 20v-7" /></>
    : name === "assignment"
      ? <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h4" /><path d="M9 12h7M9 16h7" /></>
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
