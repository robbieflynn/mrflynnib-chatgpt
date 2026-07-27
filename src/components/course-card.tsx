import Link from "next/link";
import type { Course } from "@/lib/content";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card card-hover course-card">
      <div className="card-body">
        <div className="course-card-heading">
          <span className="course-code">{course.shortTitle}</span>
          <span className="course-level">{course.level === "HL" ? "Higher Level" : "Standard Level"}</span>
        </div>
        <div className="stack">
          <h3>{course.pathway}</h3>
          <p className="muted">{course.promise}</p>
        </div>
      </div>
      <Link className="text-link" href={`/courses/${course.slug}`}>View {course.shortTitle} course</Link>
    </article>
  );
}
