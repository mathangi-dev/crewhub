import { need } from "@/lib/auth"; import { saveProfile } from "@/app/actions"; import BankForm from "@/components/BankForm"
export default async function Page({ searchParams }: { searchParams: { bank?: string } }) {
  const u = await need("VOLUNTEER")
  return <><div className="dh"><div><span className="mute">Volunteer dashboard</span><h1>Profile</h1></div></div><p className="mute">Keep your details up to date so organizers can pick you.</p>
    <form action={saveProfile} className="card"><label htmlFor="name">Name</label><input id="name" name="name" defaultValue={u.name} required /><label htmlFor="city">City</label><input id="city" name="city" defaultValue={u.city} />
      <label htmlFor="skills">Skills</label><input id="skills" name="skills" defaultValue={u.skills} placeholder="comma separated" /><label htmlFor="interests">Interests</label><input id="interests" name="interests" defaultValue={u.interests} />
      <label htmlFor="availability">Availability</label><input id="availability" name="availability" defaultValue={u.availability} placeholder="e.g. weekends, evenings" /><label htmlFor="bio">About you</label><textarea id="bio" name="bio" defaultValue={u.bio} /><p><button>Save profile</button></p></form>
    <BankForm u={u} msg={searchParams.bank} purpose="Add this so the admin can pay you after your events." /></>
}
