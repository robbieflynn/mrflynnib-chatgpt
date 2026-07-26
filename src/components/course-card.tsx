import Link from "next/link";
import type { Course } from "@/lib/content";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className={`card card-hover course-card ${course.featured ? "course-card-featured" : ""}`}>
      <div className="card-body">
        <div className="course-card-heading">
          <span className="course-code">{course.shortTitle}</span>
          {course.featured && <span className="badge">Popular</span>}
        </div>
        <div className="stack">
          <h3>{course.pathway}</h3>
          <p className="muted">{course.promise}</p>
        </div>
        <div className="course-price"><strong>${course.price}</strong><span>{course.access}</span></div>
      </div>
      <Link className="text-link" href={`/courses/${course.slug}`}>Explore {course.shortTitle}</Link>
    </article>
  );
}
