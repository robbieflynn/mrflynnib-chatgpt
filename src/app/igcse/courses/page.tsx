import { redirect } from "next/navigation";

export default function IgcseCoursesPage() {
  redirect("/learn/index.html?curriculum=igcse&course=igcse");
}
