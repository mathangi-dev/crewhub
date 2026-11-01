import AdminPeople from "@/components/AdminPeople"
export default function Page({ searchParams }: { searchParams: { s?: string; id?: string } }) {
  return <div className="compact"><AdminPeople role="VOLUNTEER" base="/admin/volunteers" sp={searchParams} title="Volunteers" desc="Open a status card, then tap a volunteer to see details and approve them." /></div>
}
