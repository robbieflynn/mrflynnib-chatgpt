import { redirect } from "next/navigation";

export default function CoursesPage() {
  redirect("/learn/index.html?curriculum=ib&view=courses");
}
