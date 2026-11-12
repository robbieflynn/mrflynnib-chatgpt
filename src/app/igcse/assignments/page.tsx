import { StudentAssignmentsPage } from "@/components/student-assignments-page";

export const metadata = { title: "My assignments", robots: { index: false, follow: false } };

export default function IgcseAssignmentsPage() {
  return <StudentAssignmentsPage igcseRoute searchParams={Promise.resolve({})} />;
}
