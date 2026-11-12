import { StudentAssignmentPage } from "@/components/student-assignment-page";

export const metadata = { title: "My assignment", robots: { index: false, follow: false } };

export default function IgcseAssignmentPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  return <StudentAssignmentPage {...props} igcseRoute />;
}
