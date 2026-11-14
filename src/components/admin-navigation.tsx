import Link from "next/link";
import styles from "./admin-navigation.module.css";

export const administrationSections = [
  { key: "teachers", label: "Teachers & approvals", href: "/teacher/accounts", description: "Review requests, filter Plus and Standard accounts, and manage teacher access." },
  { key: "students", label: "Students", href: "/teacher/students", description: "Find student accounts, check course access and review account activity." },
  { key: "access", label: "Payments & access", href: "/teacher/platform-access", description: "Review purchases, grant course access and manage redemption codes." },
  { key: "transfers", label: "Access transfers", href: "/teacher/access-claims", description: "Review existing customers’ course-access requests." },
  { key: "schools", label: "School licences", href: "/school/access", description: "Open your connected school licences and allocate student seats." },
] as const;

export function AdminNavigation({ current }: { current: string }) {
  return <nav className={styles.navigation} aria-label="Account administration">
    <Link href="/teacher/administration" aria-current={current === "overview" ? "page" : undefined}>Overview</Link>
    {administrationSections.map((section) => <Link key={section.key} href={section.href} aria-current={current === section.key ? "page" : undefined}>{section.label}</Link>)}
  </nav>;
}

export function AdministrationCards() {
  return <div className={styles.cards}>{administrationSections.map((section) =>
    <Link className={styles.card} href={section.href} key={section.key}>
      <h2>{section.label}<span aria-hidden="true">↗</span></h2>
      <p>{section.description}</p>
    </Link>,
  )}</div>;
}
