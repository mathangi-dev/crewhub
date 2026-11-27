export interface AdminStats {
  totalGMV: number;
  totalRevenueCollected: number;
  pendingRevenue: number;
  totalEvents: number;
  activeEvents: number;
  totalWorkers: number;
  totalOrganizers: number;
  verifiedOrganizers: number;
  checkedInToday: number;
  checkedOutCount: number;
  totalConfirmedAssignments: number;
  activeDisputesCount: number;
  overduePaymentsCount: number;
  openTicketsCount: number;
}

export interface AdminEvent {
  id: string;
  title: string;
  category: string;
  city: string;
  venue: string;
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "COMPLETED";
  startsAt: string;
  endsAt: string;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  totalVacancies: number;
  confirmedCrew: number;
  totalBudget: number;
  platformFeeAmount: number;
  platformFeeStatus: "PENDING" | "PAID" | "WAIVED" | "NONE";
  suspendedReason?: string | null;
}

export interface AdminPlatformFee {
  id: string;
  eventId: string;
  eventTitle: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  baseAmount: number;
  rate: number;
  feeAmount: number;
  status: "PENDING" | "PAID" | "WAIVED";
  receiptRef: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminAttendanceRecord {
  applicationId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workerPhone: string;
  workerCity: string;
  eventId: string;
  eventTitle: string;
  eventCity: string;
  organizerName: string;
  jobName: string;
  wage: number;
  status: "CHECKED_IN" | "CHECKED_OUT" | "LATE" | "ABSENT" | "NO_SHOW" | "NOT_CHECKED_IN";
  checkInAt: string | null;
  checkOutAt: string | null;
  note: string | null;
}

export interface AdminOrganizer {
  id: string;
  name: string;
  email: string;
  orgName: string;
  phone: string;
  description: string;
  verified: boolean;
  eventsCount: number;
  totalFeesOwed: number;
  totalFeesPaid: number;
  overduePaymentsCount: number;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface AdminVolunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  skills: string[];
  totalApplications: number;
  confirmedAssignments: number;
  cancelledCount: number;
  attendanceRate: number;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface AdminDispute {
  id: string;
  paymentId: string;
  applicationId: string;
  eventTitle: string;
  workerName: string;
  workerPhone: string;
  organizerName: string;
  organizerEmail: string;
  amount: number;
  status: "PENDING" | "RECORDED" | "CONFIRMED" | "DISPUTED";
  upiReference: string | null;
  disputeNote: string | null;
  createdAt: string;
}

export interface AdminOverduePayment {
  id: string;
  paymentId: string;
  applicationId: string;
  eventTitle: string;
  workerName: string;
  workerPhone: string;
  workerUpi: string | null;
  organizerName: string;
  organizerEmail: string;
  amount: number;
  status: "PENDING" | "RECORDED" | "CONFIRMED" | "DISPUTED";
  deadlineAt: string;
  hoursOverdue: number;
  upiReference: string | null;
  createdAt: string;
}

export interface AdminSupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
}

export interface AdminDashboardData {
  stats: AdminStats;
  events: AdminEvent[];
  platformFees: AdminPlatformFee[];
  attendanceList: AdminAttendanceRecord[];
  organizers: AdminOrganizer[];
  volunteers: AdminVolunteer[];
  disputes: AdminDispute[];
  overduePayments: AdminOverduePayment[];
  supportTickets: AdminSupportTicket[];
}
