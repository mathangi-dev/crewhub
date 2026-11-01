"use client"
import { useState } from "react"
export default function ImageInput({ name, label, hint, ratio, w }: { name: string; label: string; hint: string; ratio: string; w?: number }) {
  const [src, setSrc] = useState(""), [err, setErr] = useState("")
  return <div className="imgin"><label htmlFor={name}>{label}</label><p className="mute" style={{ margin: "0 0 6px" }}>{hint}</p>
    <input id={name} name={name} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
      const f = e.target.files?.[0]; if (!f) return setSrc("")
      if (f.size > 5 * 1024 * 1024) { setErr("That file is over 5 MB. Pick a smaller one."); e.target.value = ""; return setSrc("") }
      setErr(""); setSrc(URL.createObjectURL(f)) }} />
    {err && <p className="err" role="alert">{err}</p>}
    <div className="imgbox" style={{ aspectRatio: ratio, maxWidth: w }}>{src ? <img src={src} alt={`${label} preview`} /> : <span className="mute">Preview</span>}</div></div>
}
