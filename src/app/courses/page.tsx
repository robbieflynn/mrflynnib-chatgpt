import { redirect } from "next/navigation";

export default function CoursesPage() {
  redirect("/learn?view=courses");
}
