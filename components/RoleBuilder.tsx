"use client"
import { useState } from "react"
export default function RoleBuilder() {
  const [ids, setIds] = useState([0]), [next, setNext] = useState(1)
  return <div><datalist id="hrs">{[2, 3, 4, 5, 6, 8].map(h => <option key={h} value={h} />)}</datalist>
    <div className="rb-head"><label>Roles</label><button type="button" className="plus" aria-label="Add role" onClick={() => { setIds([...ids, next]); setNext(next + 1) }}>+</button><span className="mute">Add another role</span></div>
    {ids.map((id, i) => <div key={id} className="rb-row">
      <div className="rb-top"><b>Role {i + 1}</b>{ids.length > 1 && <button type="button" className="ghost" aria-label={`Remove role ${i + 1}`} onClick={() => setIds(ids.filter(x => x !== id))}>Remove</button>}</div>
      <div className="row">
        <div><label className="sm" htmlFor={`rt${id}`}>Role title</label><input id={`rt${id}`} name="roleTitle" placeholder="e.g. Stage crew" required /></div>
        <div><label className="sm" htmlFor={`rk${id}`}>People needed</label><input id={`rk${id}`} name="roleSlots" type="number" min={1} defaultValue={1} required /></div>
        <div><label className="sm" htmlFor={`rh${id}`}>Duration (hours)</label><input id={`rh${id}`} name="roleHours" type="number" list="hrs" min={0.5} step={0.5} defaultValue={3} required /></div>
        <div><label className="sm" htmlFor={`rp${id}`}>Pay per person ₹</label><input id={`rp${id}`} name="rolePay" type="number" min={0} defaultValue={0} /></div>
        <div><label className="sm" htmlFor={`rs${id}`}>Skills (optional)</label><input id={`rs${id}`} name="roleSkills" placeholder="e.g. AV basics" /></div>
      </div></div>)}</div>
}
