export type Job = { id: string; n: string; w: number; v: number; s: number; sub?: number; req: string };
export type Ev = {
  id: string;
  n: string; c: string; v: string; city: string; d: string; t: string; i: string; tags: string[]; b: string;
  org: string; time: string; rep: string; dl: string; desc: string; jobs: Job[];
};
export type AppStatus = "Pending" | "Confirmed" | "Waitlisted" | "Rejected" | "Cancelled";
export type WorkerAttendance = {
  status: "CHECKED_IN" | "CHECKED_OUT" | "LATE" | "ABSENT" | "NO_SHOW";
  checkInAt?: string | null;
  checkOutAt?: string | null;
  note?: string | null;
};
export type App = {
  id: string;
  ev?: string;
  name?: string;
  job: string;
  at: string;
  st: AppStatus;
  pos?: number | null;
  attendance?: WorkerAttendance | null;
};
export type Offer = { id: string; app: string; until: string };
export type PayStatus = "Pending" | "Recorded" | "Confirmed" | "Disputed";
export type Pay = {
  id: string;
  ev: string;
  w: number;
  st: PayStatus;
  date: string;
  ref: string;
  deadlineAt?: string | null;
  disputeNote?: string | null;
};
export type Hist = { id?: string; n: string; d: string; v: string; job: string; w: number };
export type Notice = { id: string; t: string; b: string; h: string; r: 0 | 1 };
export type Profile = {
  name: string;
  email: string;
  phone: string;
  upi: string;
  address?: string;
  area?: string;
  city: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  nearbyNotif?: boolean;
  skills: string[];
  exp: string;
  cats: string[];
  notif: { email: boolean; push: boolean; remind: boolean; nearby?: boolean };
};
