import Link from "next/link";
import type { Course } from "@/lib/content";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card card-hover course-card">
      <div className="card-body">
        <span className="badge">{course.shortTitle}</span>
        <div className="stack">
          <h3>{course.pathway}</h3>
          <p className="muted">{course.promise}</p>
        </div>
        <ul className="check-list small">
          {course.outcomes.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <Link className="text-link" href={`/courses/${course.slug}`}>Explore {course.shortTitle}</Link>
    </article>
  );
}
