import { SiteChrome } from "../../../components";
import StudentDetailClient from "./StudentDetailClient";

export default function AdminStudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <SiteChrome cleanBackground>
      <StudentDetailClient studentId={params.id} />
    </SiteChrome>
  );
}
