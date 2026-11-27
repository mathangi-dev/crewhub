"use client";
import { useSearchParams } from "next/navigation";
import OverviewView from "./views/OverviewView";
import CreateEventView from "./views/CreateEventView";
import CrewView from "./views/CrewView";
import AttendanceView from "./views/AttendanceView";
import PaymentsView from "./views/PaymentsView";

export default function OrganizerContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "overview";

  switch (tab) {
    case "create":
      return <CreateEventView />;
    case "crew":
      return <CrewView />;
    case "attendance":
      return <AttendanceView />;
    case "payments":
      return <PaymentsView />;
    case "overview":
    default:
      return <OverviewView />;
  }
}
