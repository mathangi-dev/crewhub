import { need } from "@/lib/auth"
export default async function Page() {
  const u = await need("ADMIN")
  return <div className="compact"><div className="dh"><div><span className="mute">Admin dashboard</span><h1>Profile</h1></div></div>
    <div className="card"><p className="kv"><span className="mute">Name</span><br /><b>{u.name}</b></p><p className="kv"><span className="mute">Email</span><br /><b>{u.email}</b></p><p className="kv" style={{ margin: 0 }}><span className="mute">Role</span><br /><b>Admin</b></p></div></div>
}
