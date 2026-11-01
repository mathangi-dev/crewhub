import AdminPeople from "@/components/AdminPeople"
export default function Page({ searchParams }: { searchParams: { s?: string; id?: string } }) {
  return <div className="compact"><AdminPeople role="ORGANIZER" base="/admin/organizers" sp={searchParams} title="Organizers" desc="Open a status card, then tap an organizer to see details and verify them." /></div>
}
