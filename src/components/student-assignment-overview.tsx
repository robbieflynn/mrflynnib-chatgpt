import Link from "next/link";
import styles from "./student-assignment-overview.module.css";

export type AssignmentPreviewItem = {
  id: string;
  title: string;
  className: string;
  dateLabel: string;
  progressCount: number;
  questionCount: number;
};

function AssignmentRows({ assignments, href, submitted = false }: {
  assignments: AssignmentPreviewItem[];
  href: string;
  submitted?: boolean;
}) {
  return <ul className={styles.list}>
    {assignments.map((assignment) => <li key={assignment.id}>
      <Link className={styles.row} href={`${href}/${assignment.id}`}>
        <span className={styles.identity}><small>{assignment.className}</small><strong>{assignment.title}</strong></span>
        <span className={styles.date}>{assignment.dateLabel}</span>
        <span className={styles.progress} aria-label={`${assignment.progressCount} of ${assignment.questionCount} questions complete`}><strong>{assignment.progressCount}/{assignment.questionCount}</strong><small>questions</small></span>
        <span className={styles.action}>{submitted ? "Review" : assignment.progressCount ? "Continue" : "Start"}<span aria-hidden="true">→</span></span>
      </Link>
    </li>)}
  </ul>;
}

export function StudentAssignmentOverview({ active, completed, assignmentsHref, loadError = false }: {
  /** Current assignments are already sorted by due date; submitted work by submission date. */
  active: AssignmentPreviewItem[];
  completed: AssignmentPreviewItem[];
  assignmentsHref: string;
  loadError?: boolean;
}) {
  const visible = active.slice(0, 4);
  return <section className={`student-home-section ${styles.overview}`} id="assignments" aria-labelledby="student-assignments-heading">
    <div className={styles.heading}>
      <div><p className="eyebrow">Classwork</p><h2 id="student-assignments-heading">Your assignments</h2>
        <p>{active.length ? `${active.length} current ${active.length === 1 ? "assignment" : "assignments"}. ${active.length > visible.length ? `Showing the first ${visible.length}, earliest due first.` : "Earliest due first."}` : loadError ? "Check your assignment list for the latest work." : completed.length ? "All your current work is submitted." : "Your teacher’s assignments will appear here."}</p>
      </div>
      <Link className="student-section-link" href={assignmentsHref}>View all assignments <span aria-hidden="true">→</span></Link>
    </div>
    {loadError ? <p className="form-message form-error" role="alert">Your assignments could not be refreshed just now. Please reload the page.</p> : null}
    {visible.length ? <AssignmentRows assignments={visible} href={assignmentsHref} /> : !loadError ? <p className={styles.empty}>{completed.length ? "You’re up to date." : "No assignments yet."}</p> : null}
    {active.length > visible.length ? <Link className={styles.more} href={assignmentsHref}>View {active.length - visible.length} more current {active.length - visible.length === 1 ? "assignment" : "assignments"} <span aria-hidden="true">→</span></Link> : null}
    {completed.length ? <details className={styles.completed}>
      <summary>Submitted work <span>{completed.length}</span></summary>
      <AssignmentRows assignments={completed.slice(0, 3)} href={assignmentsHref} submitted />
      {completed.length > 3 ? <Link className={styles.more} href={assignmentsHref}>View all submitted work <span aria-hidden="true">→</span></Link> : null}
    </details> : null}
  </section>;
}
