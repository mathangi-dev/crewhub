import { Suspense } from "react";
import OrganizerContent from "@/components/organizer/OrganizerContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="panel" style={{ padding: "40px", textAlign: "center" }}>Loading organizer dashboard...</div>}>
      <OrganizerContent />
    </Suspense>
  );
}
