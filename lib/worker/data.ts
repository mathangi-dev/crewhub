// SAMPLE DATA for fallback or preview
import type { App, Ev, Hist, Notice, Offer, Pay, Profile } from "./types";

export const EVENTS: Ev[] = [
  {
    id: "sample-1",
    n: "Music Concert",
    c: "Concert",
    v: "Reliance Mall",
    city: "Erode",
    d: "20 Dec 2026",
    t: "2026-12-20",
    i: "music_note",
    tags: ["Popular"],
    b: "#27303f",
    org: "Stage Works Events",
    time: "6:00 PM to 10:00 PM",
    rep: "5:00 PM",
    dl: "18 Dec 2026",
    desc: "An open-air evening of live bands. Crew will manage entry queues, seating areas and guest assistance.",
    jobs: [
      { id: "j1", n: "Crowd management", w: 450, v: 10, s: 6, req: "Calm under pressure. Comfortable standing for 5+ hours." },
      { id: "j2", n: "Guest management", w: 350, v: 4, s: 3, req: "Good communication in Tamil and English." },
    ],
  },
  {
    id: "sample-2",
    n: "Trade Expo",
    c: "Exhibition",
    v: "Chennai Trade Centre",
    city: "Chennai",
    d: "4 Jan 2027",
    t: "2027-01-04",
    i: "storefront",
    tags: ["New"],
    b: "#2e2a22",
    org: "Expo India",
    time: "9:00 AM to 6:00 PM",
    rep: "8:30 AM",
    dl: "1 Jan 2027",
    desc: "A business exhibition. Crew will run registration desks and guide visitors to stalls.",
    jobs: [
      { id: "j3", n: "Registration", w: 350, v: 6, s: 4, req: "Comfortable with tablets and data entry." },
    ],
  },
  {
    id: "sample-3",
    n: "Comedy Night",
    c: "Stand-up",
    v: "City Auditorium",
    city: "Coimbatore",
    d: "18 Jan 2027",
    t: "2027-01-18",
    i: "mic",
    tags: ["Trending"],
    b: "#2a2630",
    org: "Laugh Factory",
    time: "7:00 PM to 10:30 PM",
    rep: "6:00 PM",
    dl: "15 Jan 2027",
    desc: "A stand-up show with four comedians. Crew will seat guests and manage the entrance.",
    jobs: [
      { id: "j4", n: "Guest management", w: 300, v: 3, s: 0, req: "Friendly and punctual." },
    ],
  },
  {
    id: "sample-4",
    n: "Rooftop Party",
    c: "Party",
    v: "Sky Deck",
    city: "Salem",
    d: "25 Jan 2027",
    t: "2027-01-25",
    i: "celebration",
    tags: ["New", "Popular"],
    b: "#1f2f28",
    org: "Night Owl Events",
    time: "8:00 PM to 1:00 AM",
    rep: "7:00 PM",
    dl: "22 Jan 2027",
    desc: "A ticketed rooftop party. Crew will support the stage team and artists.",
    jobs: [
      { id: "j5", n: "Backstage support", w: 500, v: 4, s: 3, req: "Late-night availability. Experience preferred." },
      { id: "j6", n: "Social media support", w: 400, v: 2, s: 2, req: "Can shoot and post short videos." },
    ],
  },
];

export const APPS0: App[] = [
  { id: "app-1", ev: "sample-1", job: "Crowd management", at: "14 Nov 2026", st: "Confirmed" },
  { id: "app-2", ev: "sample-2", job: "Registration", at: "12 Nov 2026", st: "Confirmed" },
  { id: "app-3", ev: "sample-3", job: "Guest management", at: "16 Nov 2026", st: "Waitlisted", pos: 2 },
  { id: "app-4", name: "Night Market", job: "Crowd management", at: "8 Nov 2026", st: "Rejected" },
  { id: "app-5", name: "Food Festival", job: "Registration", at: "10 Nov 2026", st: "Cancelled" },
];

export const OFFER0: Offer | null = { id: "off-1", app: "app-3", until: "25 Nov 2026, 6:00 PM" };

export const HIST: Hist[] = [
  { id: "h1", n: "Night Market", d: "20 Nov 2026", v: "Erode Fairground", job: "Crowd management", w: 300 },
  { id: "h2", n: "Tech Expo", d: "15 Nov 2026", v: "Convention Hall, Coimbatore", job: "Registration", w: 400 },
  { id: "h3", n: "Food Festival", d: "2 Nov 2026", v: "Island Grounds, Chennai", job: "Registration", w: 350 },
  { id: "h4", n: "College Fest", d: "28 Oct 2026", v: "MCC, Chennai", job: "Crowd management", w: 450 },
];

export const PAY0: Pay[] = [
  { id: "pay-1", ev: "Night Market", w: 300, st: "Recorded", date: "21 Nov 2026", ref: "UPI9921001834" },
  { id: "pay-2", ev: "Tech Expo", w: 400, st: "Pending", date: "", ref: "" },
  { id: "pay-3", ev: "Food Festival", w: 350, st: "Confirmed", date: "3 Nov 2026", ref: "UPI4829104617" },
  { id: "pay-4", ev: "College Fest", w: 450, st: "Disputed", date: "29 Oct 2026", ref: "UPI7742019983" },
];

export const NOTICES0: Notice[] = [
  { id: "n1", t: "Replacement offer", b: "Comedy Night: a spot opened up. Respond by 25 Nov, 6:00 PM.", h: "/worker/applications", r: 0 },
  { id: "n2", t: "Payment recorded", b: "Night Market: Rs 300 recorded by the organizer. Confirm if you received it.", h: "/worker/payments", r: 0 },
  { id: "n3", t: "Application confirmed", b: "Trade Expo: you are confirmed as Registration.", h: "/worker/applications", r: 1 },
];

export const CATS: string[] = [
  "Registration",
  "Crowd management",
  "Backstage support",
  "Guest management",
  "Social media support",
];

export const PROFILE0: Profile = {
  name: "",
  email: "",
  phone: "",
  upi: "",
  city: "Erode",
  skills: ["Crowd control", "First aid"],
  exp: "Two years of volunteering at college fests.",
  cats: ["Crowd management", "Guest management"],
  notif: { email: true, push: true, remind: true },
};
