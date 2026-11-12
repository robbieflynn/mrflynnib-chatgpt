import { StudentAssignmentPage } from "@/components/student-assignment-page";

export default function AssignmentPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  return <StudentAssignmentPage {...props} />;
}
