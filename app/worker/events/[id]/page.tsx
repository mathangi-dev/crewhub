import EventDetailView from "@/components/worker/views/EventDetailView";

export default function Page({ params }: { params: { id: string } }) {
  return <EventDetailView id={params.id} />;
}
