import Link from "next/link";
import type { Course } from "@/lib/content";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card card-hover course-card">
      <div className="card-body">
        <div className="course-card-heading">
          <span className="course-code">{course.shortTitle}</span>
        </div>
        <h3>{course.pathway} {course.level}</h3>
      </div>
      <Link className="text-link" href={`/courses/${course.slug}`}>View course</Link>
    </article>
  );
}
