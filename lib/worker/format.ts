import type { App, Ev, Profile } from "./types";

export const money = (n: number) => "₹" + n.toLocaleString("en-IN");
export const spots = (e: Ev) => e.jobs.reduce((a, j) => a + j.s, 0);
export const maxWage = (e: Ev) => Math.max(...e.jobs.map((j) => j.w));
export const roleLabel = (e: Ev) => e.jobs[0].n + (e.jobs.length > 1 ? ` +${e.jobs.length - 1} more` : "");
export const wageOf = (events: Ev[], a: App) => {
  if (!a.ev) return 0;
  const ev = events.find((e) => e.id === a.ev) || (typeof a.ev === "number" ? events[a.ev] : undefined);
  return ev?.jobs.find((j) => j.n === a.job)?.w ?? 0;
};
export const completion = (p: Profile) =>
  Math.round(([p.name, p.phone, p.upi, p.city, p.skills.length, p.exp, p.cats.length].filter(Boolean).length / 7) * 100);
export const validUpi = (x: string) =>
  /^[6-9]\d{9}$/.test(x) || /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9]{1,31}$/.test(x);

export const PAST = ["#D5C3FF", "#B9D9FF", "#FFC9AD", "#B9E8D0"];
export const PASTEL = ["#B9D9FF", "#FFC9AD", "#B9E8D0", "#FFE69A", "#F4C5DC"];
export const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
