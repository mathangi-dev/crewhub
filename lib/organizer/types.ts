export interface OrganizerProfileData {
  id: string;
  name: string;
  email: string;
  orgName: string;
  phone: string;
  description: string;
  verified: boolean;
}

export interface OrganizerJob {
  id: string;
  name: string;
  vacancies: number;
  substituteCount: number;
  wageType: "DAILY" | "HOURLY";
  wage: number;
  requiredSkills: string[];
  eligibility: string;
  confirmedCount: number;
  appliedCount: number;
}

export interface OrganizerPlatformFee {
  id: string;
  baseAmount: number;
  rate: number;
  feeAmount: number;
  status: "PENDING" | "PAID" | "WAIVED";
  receiptRef?: string | null;
  paidAt?: string | null;
}

export interface OrganizerEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  posterUrl?: string | null;
  startsAt: string;
  endsAt: string;
  applicationDeadline: string;
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  jobs: OrganizerJob[];
  totalVacancies: number;
  confirmedCrew: number;
  totalApplicants: number;
  platformFee?: OrganizerPlatformFee | null;
}

export interface OrganizerApplicant {
  id: string;
  eventId: string;
  eventTitle: string;
  eventCategory: string;
  eventDate: string;
  jobId: string;
  jobName: string;
  wage: number;
  wageType: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workerPhone: string;
  workerCity: string;
  workerSkills: string[];
  status: "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "REJECTED";
  isSubstitute: boolean;
  waitlistPosition?: number | null;
  createdAt: string;
  workerUpi?: string | null;
  attendance?: {
    id: string;
    status: "CHECKED_IN" | "CHECKED_OUT" | "LATE" | "ABSENT" | "NO_SHOW";
    checkInAt?: string | null;
    checkOutAt?: string | null;
    note?: string | null;
  } | null;
  payment?: {
    id: string;
    amount: number;
    status: "PENDING" | "RECORDED" | "CONFIRMED" | "DISPUTED";
    upiReference?: string | null;
    paidAt?: string | null;
    confirmedAt?: string | null;
    deadlineAt?: string | null;
    disputeNote?: string | null;
  } | null;
}

export interface OrganizerStats {
  totalEvents: number;
  activeEvents: number;
  draftEvents: number;
  totalVacancies: number;
  confirmedWorkers: number;
  totalApplicants: number;
  totalPayout: number;
  pendingPaymentsCount: number;
  overduePaymentsCount: number;
  isRestricted: boolean;
  platformFeeDue: number;
}

export interface OrganizerDashboardData {
  profile: OrganizerProfileData;
  events: OrganizerEvent[];
  applicants: OrganizerApplicant[];
  stats: OrganizerStats;
  isRestricted: boolean;
  overdueCount: number;
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  posterUrl?: string | null;
  startsAt: string;
  endsAt: string;
  applicationDeadline: string;
  status?: "DRAFT" | "PUBLISHED";
  platformFeeReceipt?: string;
  jobs: {
    name: string;
    vacancies: number;
    substituteCount?: number;
    wageType: "DAILY" | "HOURLY";
    wage: number;
    requiredSkills?: string[];
    eligibility?: string;
  }[];
}
