import { prisma } from "@/lib/db";
import { notifyNearbyWorkersForEvent } from "@/lib/location";
import type {
  AdminDashboardData,
  AdminStats,
  AdminEvent,
  AdminPlatformFee,
  AdminAttendanceRecord,
  AdminOrganizer,
  AdminVolunteer,
  AdminDispute,
  AdminOverduePayment,
  AdminSupportTicket,
} from "./types";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [events, applications, users, platformFees, tickets, payments, overdueRaw] = await Promise.all([
    prisma.event.findMany({
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            organizerProfile: true,
          },
        },
        jobs: {
          include: {
            applications: {
              select: { id: true, status: true },
            },
          },
        },
        platformFee: true,
      },
      orderBy: { startsAt: "desc" },
    }),
    prisma.application.findMany({
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
            workerProfile: { select: { phone: true, city: true, skills: true } },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            venue: true,
            city: true,
            startsAt: true,
            organizer: { select: { id: true, name: true, email: true } },
          },
        },
        eventJob: { select: { id: true, name: true, wage: true, wageType: true } },
        attendance: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      include: {
        organizerProfile: true,
        workerProfile: true,
        events: {
          include: { platformFee: true },
        },
        applications: {
          include: { attendance: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.platformFee.findMany({
      include: {
        event: {
          include: {
            organizer: {
              include: { organizerProfile: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supportTicket.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workerPayment.findMany({
      where: {
        OR: [
          { status: "DISPUTED" },
          { disputeNote: { not: null } },
        ],
      },
      include: {
        application: {
          include: {
            worker: { select: { id: true, name: true, workerProfile: true } },
            event: {
              include: {
                organizer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    (prisma.workerPayment.findMany as any)({
      where: {
        status: { in: ["PENDING", "DISPUTED"] },
        deadlineAt: { lt: new Date() },
      },
      include: {
        application: {
          include: {
            worker: { select: { id: true, name: true, workerProfile: true } },
            event: {
              include: {
                organizer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      orderBy: { deadlineAt: "asc" },
    }),
  ]);

  // 1. Calculate Financials & GMV
  let totalGMV = 0;
  let totalRevenueCollected = 0;
  let pendingRevenue = 0;

  for (const fee of platformFees) {
    if (fee.status === "PAID") {
      totalRevenueCollected += Number(fee.feeAmount);
    } else if (fee.status === "PENDING") {
      pendingRevenue += Number(fee.feeAmount);
    }
  }

  // 2. Transform Events
  const adminEvents: AdminEvent[] = events.map((e) => {
    let budget = 0;
    let vacancies = 0;
    let confirmed = 0;

    for (const j of e.jobs) {
      vacancies += j.vacancies;
      budget += j.vacancies * Number(j.wage);
      confirmed += j.applications.filter((a) => a.status === "CONFIRMED").length;
    }
    totalGMV += budget;

    return {
      id: e.id,
      title: e.title,
      category: e.category,
      city: e.city,
      venue: e.venue,
      status: e.status as any,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      organizerId: e.organizerId,
      organizerName: e.organizer.organizerProfile?.orgName || e.organizer.name,
      organizerEmail: e.organizer.email,
      totalVacancies: vacancies,
      confirmedCrew: confirmed,
      totalBudget: budget,
      platformFeeAmount: e.platformFee ? Number(e.platformFee.feeAmount) : Math.round(budget * 0.1),
      platformFeeStatus: (e.platformFee?.status || "NONE") as any,
      suspendedReason: e.suspendedReason,
    };
  });

  // 3. Transform Platform Fees
  const adminFees: AdminPlatformFee[] = platformFees.map((f) => ({
    id: f.id,
    eventId: f.eventId,
    eventTitle: f.event.title,
    organizerName: f.event.organizer.organizerProfile?.orgName || f.event.organizer.name,
    organizerEmail: f.event.organizer.email,
    organizerPhone: f.event.organizer.organizerProfile?.phone || "–",
    baseAmount: Number(f.baseAmount),
    rate: Number(f.rate),
    feeAmount: Number(f.feeAmount),
    status: f.status as any,
    receiptRef: f.receiptRef,
    paidAt: f.paidAt?.toISOString() || null,
    createdAt: f.createdAt.toISOString(),
  }));

  // 4. Transform Attendance Records
  const attendanceList: AdminAttendanceRecord[] = applications
    .filter((a) => a.status === "CONFIRMED")
    .map((a) => {
      const att = a.attendance;
      return {
        applicationId: a.id,
        workerId: a.workerId,
        workerName: a.worker.name,
        workerEmail: a.worker.email,
        workerPhone: a.worker.workerProfile?.phone || "–",
        workerCity: a.worker.workerProfile?.city || "–",
        eventId: a.eventId,
        eventTitle: a.event.title,
        eventCity: a.event.city,
        organizerName: a.event.organizer.name,
        jobName: a.eventJob.name,
        wage: Number(a.eventJob.wage),
        status: (att?.status || "NOT_CHECKED_IN") as any,
        checkInAt: att?.checkInAt?.toISOString() || null,
        checkOutAt: att?.checkOutAt?.toISOString() || null,
        note: att?.note || null,
      };
    });

  // 5. Transform Organizers
  const organizers: AdminOrganizer[] = users
    .filter((u) => u.role === "ORGANIZER")
    .map((u) => {
      let feesOwed = 0;
      let feesPaid = 0;

      for (const ev of u.events) {
        if (ev.platformFee) {
          if (ev.platformFee.status === "PAID") {
            feesPaid += Number(ev.platformFee.feeAmount);
          } else if (ev.platformFee.status === "PENDING") {
            feesOwed += Number(ev.platformFee.feeAmount);
          }
        }
      }

      const overduePaymentsCount = (overdueRaw as any[]).filter(
        (p) => p.application?.event?.organizerId === u.id
      ).length;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        orgName: u.organizerProfile?.orgName || u.name,
        phone: u.organizerProfile?.phone || "–",
        description: u.organizerProfile?.description || "",
        verified: u.organizerProfile?.verified ?? false,
        eventsCount: u.events.length,
        totalFeesOwed: feesOwed,
        totalFeesPaid: feesPaid,
        overduePaymentsCount,
        status: u.status as any,
        createdAt: u.createdAt.toISOString(),
      };
    });

  // 6. Transform Volunteers
  const volunteers: AdminVolunteer[] = users
    .filter((u) => u.role === "WORKER")
    .map((u) => {
      const confirmed = u.applications.filter((a) => a.status === "CONFIRMED");
      const checkedIn = confirmed.filter(
        (a) => a.attendance?.status === "CHECKED_IN" || a.attendance?.status === "CHECKED_OUT"
      ).length;

      const cancelledCount = u.applications.filter((a) => a.status === "CANCELLED").length;
      const attRate = confirmed.length > 0 ? Math.round((checkedIn / confirmed.length) * 100) : 100;
      const skills = Array.isArray(u.workerProfile?.skills) ? (u.workerProfile?.skills as string[]) : [];

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.workerProfile?.phone || "–",
        city: u.workerProfile?.city || "–",
        skills,
        totalApplications: u.applications.length,
        confirmedAssignments: confirmed.length,
        cancelledCount,
        attendanceRate: attRate,
        status: u.status as any,
        createdAt: u.createdAt.toISOString(),
      };
    });

  // 7. Transform Disputes
  const disputes: AdminDispute[] = payments.map((p) => ({
    id: p.id,
    paymentId: p.id,
    applicationId: p.applicationId,
    eventTitle: p.application.event.title,
    workerName: p.application.worker.name,
    workerPhone: p.application.worker.workerProfile?.phone || "–",
    organizerName: p.application.event.organizer.name,
    organizerEmail: p.application.event.organizer.email,
    amount: Number(p.amount),
    status: p.status as any,
    upiReference: p.upiReference,
    disputeNote: p.disputeNote,
    createdAt: p.createdAt.toISOString(),
  }));

  // 8. Transform Overdue Payments
  const now = new Date();
  const overduePayments: AdminOverduePayment[] = (overdueRaw as any[]).map((p: any) => {
    const dl = p.deadlineAt ? new Date(p.deadlineAt) : now;
    const hoursOverdue = Math.max(1, Math.round((now.getTime() - dl.getTime()) / (1000 * 60 * 60)));
    return {
      id: p.id,
      paymentId: p.id,
      applicationId: p.applicationId,
      eventTitle: p.application?.event?.title || "–",
      workerName: p.application?.worker?.name || "Worker",
      workerPhone: p.application?.worker?.workerProfile?.phone || "–",
      workerUpi: p.application?.worker?.workerProfile?.upi || null,
      organizerName: p.application?.event?.organizer?.name || "Organizer",
      organizerEmail: p.application?.event?.organizer?.email || "–",
      amount: Number(p.amount),
      status: p.status as any,
      deadlineAt: p.deadlineAt ? new Date(p.deadlineAt).toISOString() : now.toISOString(),
      hoursOverdue,
      upiReference: p.upiReference || null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : now.toISOString(),
    };
  });

  // 9. Transform Tickets
  const supportTickets: AdminSupportTicket[] = tickets.map((t) => ({
    id: t.id,
    userId: t.userId,
    userName: t.user.name,
    userEmail: t.user.email,
    userRole: t.user.role,
    subject: t.subject,
    message: t.message,
    status: t.status as any,
    createdAt: t.createdAt.toISOString(),
  }));

  // 10. Stats Summary
  const checkedInToday = attendanceList.filter((a) => a.status === "CHECKED_IN").length;
  const checkedOutCount = attendanceList.filter((a) => a.status === "CHECKED_OUT").length;

  const stats: AdminStats = {
    totalGMV,
    totalRevenueCollected,
    pendingRevenue,
    totalEvents: events.length,
    activeEvents: events.filter((e) => e.status === "PUBLISHED").length,
    totalWorkers: volunteers.length,
    totalOrganizers: organizers.length,
    verifiedOrganizers: organizers.filter((o) => o.verified).length,
    checkedInToday,
    checkedOutCount,
    totalConfirmedAssignments: attendanceList.length,
    activeDisputesCount: disputes.length,
    overduePaymentsCount: overduePayments.length,
    openTicketsCount: supportTickets.filter((t) => t.status === "OPEN").length,
  };

  return {
    stats,
    events: adminEvents,
    platformFees: adminFees,
    attendanceList,
    organizers,
    volunteers,
    disputes,
    overduePayments,
    supportTickets,
  };
}

// Admin Action Functions
export async function updatePlatformFeeStatus(
  feeId: string,
  status: "PAID" | "PENDING" | "WAIVED",
  receiptRef?: string
) {
  return await prisma.platformFee.update({
    where: { id: feeId },
    data: {
      status,
      receiptRef: receiptRef?.trim() || undefined,
      paidAt: status === "PAID" ? new Date() : undefined,
    },
  });
}

export async function toggleOrganizerVerification(userId: string, verified: boolean) {
  return await prisma.organizerProfile.update({
    where: { userId },
    data: { verified },
  });
}

export async function updateUserAccountStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
  reason?: string
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  const isSuspended = status === "SUSPENDED";
  await prisma.notification.create({
    data: {
      userId,
      type: isSuspended ? "ACCOUNT_SUSPENDED" : "ACCOUNT_REACTIVATED",
      title: isSuspended ? "Account Suspended by Admin" : "Account Reactivated",
      body: isSuspended
        ? (reason?.trim()
            ? `Your CrewHub account was suspended by admin. Reason: ${reason}`
            : "Your CrewHub account was suspended by admin for policy violation.")
        : "Your CrewHub account has been reactivated by the admin. You may now resume activities.",
      link: updated.role === "ORGANIZER" ? "/organizer" : "/worker/profile",
    },
  });

  return updated;
}

export async function updateAdminEventStatus(
  eventId: string,
  status: "DRAFT" | "PUBLISHED" | "SUSPENDED" | "COMPLETED" | "CANCELLED",
  suspendedReason?: string
) {
  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      status,
      suspendedReason: suspendedReason?.trim() || null,
    },
  });

  if (status === "PUBLISHED") {
    notifyNearbyWorkersForEvent(eventId).catch((err: unknown) => {
      console.error("Failed to notify nearby workers:", err);
    });
  }

  return updated;
}

export async function resolvePaymentDispute(
  paymentId: string,
  status: "RECORDED" | "CONFIRMED" | "DISPUTED",
  disputeNote?: string
) {
  return await prisma.workerPayment.update({
    where: { id: paymentId },
    data: {
      status,
      disputeNote: disputeNote?.trim() || null,
      confirmedAt: status === "CONFIRMED" ? new Date() : undefined,
    },
  });
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
) {
  return await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status },
  });
}
