import { prisma } from "@/lib/db";
import { geocodeWithPhoton, notifyNearbyWorkersForEvent } from "@/lib/location";
import { evaluateOrganizerPaymentDiscipline } from "@/lib/discipline";
import type {
  OrganizerDashboardData,
  OrganizerProfileData,
  OrganizerEvent,
  OrganizerJob,
  OrganizerApplicant,
  OrganizerStats,
  CreateEventInput,
} from "./types";

export async function getOrganizerDashboardData(userId: string): Promise<OrganizerDashboardData> {
  // Check and process automated reminders & overdue flags
  await processPaymentRemindersAndOverdue(userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organizerProfile: true },
  });

  if (!user) throw new Error("User not found");

  const op = user.organizerProfile;
  const profile: OrganizerProfileData = {
    id: user.id,
    name: user.name,
    email: user.email,
    orgName: op?.orgName || user.name,
    phone: op?.phone || "",
    description: op?.description || "",
    verified: op?.verified ?? false,
  };

  const rawEvents = await prisma.event.findMany({
    where: { organizerId: userId },
    include: {
      jobs: {
        include: {
          applications: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      applications: {
        include: {
          worker: {
            include: {
              workerProfile: true,
            },
          },
          eventJob: true,
          attendance: true,
          payment: true,
        },
        orderBy: { createdAt: "desc" },
      },
      platformFee: true,
    },
    orderBy: { startsAt: "desc" },
  });

  const events: OrganizerEvent[] = (rawEvents as any[]).map((e: any) => {
    let totalVacancies = 0;
    let confirmedCrew = 0;

    const jobs: OrganizerJob[] = (e.jobs || []).map((j: any) => {
      totalVacancies += j.vacancies;
      const confirmed = (j.applications || []).filter((a: any) => a.status === "CONFIRMED").length;
      confirmedCrew += confirmed;
      const skills = Array.isArray(j.requiredSkills) ? (j.requiredSkills as string[]) : [];

      return {
        id: j.id,
        name: j.name,
        vacancies: j.vacancies,
        substituteCount: j.substituteCount ?? 0,
        wageType: j.wageType as "DAILY" | "HOURLY",
        wage: Number(j.wage),
        requiredSkills: skills,
        eligibility: j.eligibility || "",
        confirmedCount: confirmed,
        appliedCount: j.applications ? j.applications.length : 0,
      };
    });

    return {
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      venue: e.venue,
      city: e.city,
      latitude: e.latitude ? Number(e.latitude) : null,
      longitude: e.longitude ? Number(e.longitude) : null,
      posterUrl: e.posterUrl,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      applicationDeadline: e.applicationDeadline.toISOString(),
      status: e.status as "DRAFT" | "PUBLISHED" | "SUSPENDED" | "CANCELLED" | "COMPLETED",
      createdAt: e.createdAt.toISOString(),
      jobs,
      totalVacancies,
      confirmedCrew,
      totalApplicants: e.applications.length,
      platformFee: e.platformFee
        ? {
            id: e.platformFee.id,
            baseAmount: Number(e.platformFee.baseAmount),
            rate: Number(e.platformFee.rate),
            feeAmount: Number(e.platformFee.feeAmount),
            status: e.platformFee.status as "PENDING" | "PAID" | "WAIVED",
            receiptRef: e.platformFee.receiptRef,
            paidAt: e.platformFee.paidAt?.toISOString() || null,
          }
        : null,
    };
  });

  const applicants: OrganizerApplicant[] = [];
  for (const e of rawEvents as any[]) {
    for (const a of (e.applications || [])) {
      const wp = a.worker?.workerProfile;
      const skills = Array.isArray(wp?.skills) ? (wp.skills as string[]) : [];
      applicants.push({
        id: a.id,
        eventId: e.id,
        eventTitle: e.title,
        eventCategory: e.category,
        eventDate: e.startsAt.toISOString(),
        jobId: a.eventJobId,
        jobName: a.eventJob.name,
        wage: Number(a.eventJob.wage),
        wageType: a.eventJob.wageType,
        workerId: a.workerId,
        workerName: a.worker.name,
        workerEmail: a.worker.email,
        workerPhone: wp?.phone || "–",
        workerCity: wp?.city || "–",
        workerSkills: skills,
        status: a.status as "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "REJECTED",
        isSubstitute: a.isSubstitute ?? false,
        waitlistPosition: a.waitlistPosition,
        createdAt: a.createdAt.toISOString(),
        workerUpi: wp?.upi || null,
        attendance: a.attendance
          ? {
              id: a.attendance.id,
              status: a.attendance.status as any,
              checkInAt: a.attendance.checkInAt?.toISOString() || null,
              checkOutAt: a.attendance.checkOutAt?.toISOString() || null,
              note: a.attendance.note,
            }
          : null,
        payment: a.payment
          ? {
              id: a.payment.id,
              amount: Number(a.payment.amount),
              status: a.payment.status as any,
              upiReference: a.payment.upiReference,
              paidAt: a.payment.paidAt?.toISOString() || null,
              confirmedAt: a.payment.confirmedAt?.toISOString() || null,
              deadlineAt: a.payment.deadlineAt?.toISOString() || null,
              disputeNote: a.payment.disputeNote || null,
            }
          : null,
      });
    }
  }

  // Calculate statistics
  let activeEvents = 0;
  let draftEvents = 0;
  let totalVacancies = 0;
  let confirmedWorkers = 0;
  let totalApplicants = applicants.length;
  let totalPayout = 0;
  let pendingPaymentsCount = 0;
  let overduePaymentsCount = 0;
  let platformFeeDue = 0;

  for (const ev of events) {
    if (ev.status === "PUBLISHED") activeEvents++;
    if (ev.status === "DRAFT") draftEvents++;
    totalVacancies += ev.totalVacancies;
    if (ev.platformFee && ev.platformFee.status === "PENDING") {
      platformFeeDue += ev.platformFee.feeAmount;
    }
    for (const j of ev.jobs) {
      totalPayout += j.vacancies * j.wage;
    }
  }

  const nowTime = new Date();
  for (const app of applicants) {
    if (app.status === "CONFIRMED") {
      confirmedWorkers++;
      if (!app.payment || app.payment.status === "PENDING") {
        pendingPaymentsCount++;
      }
      if (
        app.payment &&
        (app.payment.status === "PENDING" || app.payment.status === "DISPUTED") &&
        app.payment.deadlineAt &&
        new Date(app.payment.deadlineAt) < nowTime
      ) {
        overduePaymentsCount++;
      }
    }
  }

  const isRestricted = overduePaymentsCount > 0;

  const stats: OrganizerStats = {
    totalEvents: events.length,
    activeEvents,
    draftEvents,
    totalVacancies,
    confirmedWorkers,
    totalApplicants,
    totalPayout,
    pendingPaymentsCount,
    overduePaymentsCount,
    isRestricted,
    platformFeeDue,
  };

  return {
    profile,
    events,
    applicants,
    stats,
    isRestricted,
    overdueCount: overduePaymentsCount,
  };
}

export async function createOrganizerEvent(userId: string, input: CreateEventInput) {
  // Check organizer payment restriction: overdue worker settlements
  const restriction = await checkOrganizerRestrictions(userId);
  if (restriction.isRestricted) {
    throw new Error(
      `Account temporarily restricted: You have ${restriction.overdueCount} overdue worker wage settlement(s). Please transfer pending wages to workers via UPI before creating new events.`
    );
  }

  if (!input.title?.trim()) throw new Error("Event title is required");
  if (!input.category?.trim()) throw new Error("Category is required");
  if (!input.venue?.trim()) throw new Error("Venue is required");
  if (!input.city?.trim()) throw new Error("City is required");
  if (!input.startsAt) throw new Error("Start date & time is required");
  if (!input.endsAt) throw new Error("End date & time is required");
  if (!input.jobs || input.jobs.length === 0) throw new Error("At least one crew role is required");

  const starts = new Date(input.startsAt);
  const ends = new Date(input.endsAt);
  const dl = input.applicationDeadline
    ? new Date(input.applicationDeadline)
    : new Date(starts.getTime() - 24 * 60 * 60 * 1000);

  let totalPayout = 0;
  const jobsData = input.jobs.map((j) => {
    const vac = Math.max(1, Number(j.vacancies) || 1);
    const subCount = Math.max(0, Number(j.substituteCount) || 0);
    const wage = Math.max(0, Number(j.wage) || 0);
    totalPayout += vac * wage; // Upfront platform fee calculated on primary crew. Substitutes paid ONLY if they work!

    return {
      name: j.name.trim(),
      vacancies: vac,
      substituteCount: subCount,
      wageType: j.wageType || "DAILY",
      wage: wage,
      requiredSkills: j.requiredSkills || [],
      eligibility: j.eligibility?.trim() || null,
    };
  });

  const feeAmount = Math.round(totalPayout * 0.1);
  const feeReceipt = input.platformFeeReceipt?.trim();

  // If publishing, require the 10% platform fee payment reference
  if (input.status === "PUBLISHED" && feeAmount > 0 && !feeReceipt) {
    throw new Error("Please pay the 10% platform fee and provide the UPI reference before publishing the event.");
  }

  const feeStatus = feeReceipt ? "PAID" : "PENDING";

  // Geocode event venue & city if coordinates not provided
  let lat = input.latitude ? Number(input.latitude) : null;
  let lon = input.longitude ? Number(input.longitude) : null;
  if (lat === null || lon === null) {
    const geo = await geocodeWithPhoton(`${input.venue}, ${input.city}`);
    if (geo) {
      lat = geo.latitude;
      lon = geo.longitude;
    }
  }

  const event = await prisma.event.create({
    data: {
      organizerId: userId,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      category: input.category.trim(),
      venue: input.venue.trim(),
      city: input.city.trim(),
      latitude: lat,
      longitude: lon,
      posterUrl: input.posterUrl?.trim() || null,
      startsAt: starts,
      endsAt: ends,
      applicationDeadline: dl,
      status: input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      jobs: {
        create: jobsData,
      },
      platformFee: {
        create: {
          baseAmount: totalPayout,
          rate: 0.1,
          feeAmount: feeAmount,
          status: feeStatus,
          receiptRef: feeReceipt || null,
          paidAt: feeReceipt ? new Date() : null,
        },
      },
    },
    include: {
      jobs: true,
      platformFee: true,
    },
  });

  if (event.status === "PUBLISHED") {
    notifyNearbyWorkersForEvent(event.id).catch((err: unknown) => {
      console.error("Failed to notify nearby workers:", err);
    });
  }

  return event;
}

export async function updateEventStatus(
  organizerId: string,
  eventId: string,
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED",
  receiptRef?: string
) {
  const ev = await prisma.event.findFirst({
    where: { id: eventId, organizerId },
    include: { platformFee: true },
  });
  if (!ev) throw new Error("Event not found or unauthorized");

  if (status === "PUBLISHED") {
    const restriction = await checkOrganizerRestrictions(organizerId);
    if (restriction.isRestricted) {
      throw new Error(
        `Account temporarily restricted: You have ${restriction.overdueCount} overdue worker wage settlement(s). Please settle all overdue worker payouts via UPI before publishing events.`
      );
    }
  }

  if (status === "PUBLISHED" && ev.platformFee && ev.platformFee.status !== "PAID") {
    if (!receiptRef?.trim()) {
      throw new Error("Platform fee payment reference is required to publish this event.");
    }
    await prisma.platformFee.update({
      where: { id: ev.platformFee.id },
      data: {
        status: "PAID",
        receiptRef: receiptRef.trim(),
        paidAt: new Date(),
      },
    });
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { status },
  });

  if (status === "PUBLISHED") {
    notifyNearbyWorkersForEvent(eventId).catch((err: unknown) => {
      console.error("Failed to notify nearby workers:", err);
    });
  }

  return updated;
}

export async function updateApplicationStatus(
  organizerId: string,
  applicationId: string,
  status: "CONFIRMED" | "WAITLISTED" | "REJECTED"
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { event: true, eventJob: true, payment: true },
  });

  if (!app || app.event.organizerId !== organizerId) {
    throw new Error("Application not found or unauthorized");
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });

  // When confirming, ensure a pending WorkerPayment record exists
  if (status === "CONFIRMED" && !app.payment) {
    await prisma.workerPayment.create({
      data: {
        applicationId: app.id,
        amount: app.eventJob.wage,
        status: "PENDING",
      },
    });
  }

  // Send notification to worker
  await prisma.notification.create({
    data: {
      userId: app.workerId,
      type: "APPLICATION",
      title: `Application ${status.toLowerCase()}`,
      body: `Your application for ${app.eventJob.name} at ${app.event.title} is now ${status}.`,
      link: `/worker/applications`,
    },
  });

  return updated;
}

export async function updateAttendance(
  organizerId: string,
  applicationId: string,
  status: "CHECKED_IN" | "CHECKED_OUT" | "LATE" | "ABSENT" | "NO_SHOW",
  note?: string
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      event: true,
      attendance: true,
      eventJob: true,
      worker: { include: { workerProfile: true } },
      payment: true,
    },
  });

  if (!app || app.event.organizerId !== organizerId) {
    throw new Error("Application not found or unauthorized");
  }

  const now = new Date();
  const checkInAt = status === "CHECKED_IN" || status === "LATE" ? now : undefined;
  const checkOutAt = status === "CHECKED_OUT" ? now : undefined;

  const attendance = await prisma.attendance.upsert({
    where: { applicationId },
    update: {
      status,
      ...(checkInAt && { checkInAt }),
      ...(checkOutAt && { checkOutAt }),
      note: note || undefined,
    },
    create: {
      applicationId,
      status,
      checkInAt: checkInAt || null,
      checkOutAt: checkOutAt || null,
      note: note || null,
    },
  });

  // When worker is checked out, trigger individual 24-hour payment deadline
  if (status === "CHECKED_OUT") {
    const deadlineAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const wageAmount = Number(app.eventJob.wage);

    if (app.payment) {
      if (app.payment.status === "PENDING") {
        await (prisma.workerPayment.update as any)({
          where: { id: app.payment.id },
          data: { deadlineAt },
        });
      }
    } else {
      await (prisma.workerPayment.create as any)({
        data: {
          applicationId: app.id,
          amount: wageAmount,
          status: "PENDING",
          deadlineAt,
        },
      });
    }

    // In-app notification to organizer (24h window notice)
    await prisma.notification.create({
      data: {
        userId: organizerId,
        type: "PAYMENT_DEADLINE",
        title: "24-Hour Wage Payment Window Started",
        body: `Worker ${app.worker.name} checked out from ${app.event.title}. You have 24 hours to transfer ₹${wageAmount} via UPI directly without any deductions.`,
        link: "/organizer?tab=payments",
      },
    });

    // In-app notification to worker
    await prisma.notification.create({
      data: {
        userId: app.workerId,
        type: "PAYMENT_DEADLINE",
        title: "Checked Out - Wage Settlement Window Started",
        body: `You checked out from ${app.event.title}. The organizer has 24 hours to transfer your agreed wage of ₹${wageAmount} directly via UPI.`,
        link: "/worker/payments",
      },
    });
  }

  return attendance;
}

export async function checkOrganizerRestrictions(organizerId: string): Promise<{
  isRestricted: boolean;
  overdueCount: number;
}> {
  const overdueCount = await (prisma.workerPayment.count as any)({
    where: {
      application: { event: { organizerId } },
      status: { in: ["PENDING", "DISPUTED"] },
      deadlineAt: { lt: new Date() },
    },
  });

  return {
    isRestricted: overdueCount > 0,
    overdueCount,
  };
}

export async function processPaymentRemindersAndOverdue(organizerId?: string) {
  const now = new Date();
  const whereClause: any = {
    status: { in: ["PENDING", "DISPUTED"] },
    deadlineAt: { not: null },
  };

  if (organizerId) {
    whereClause.application = { event: { organizerId } };
  }

  const payments = await (prisma.workerPayment.findMany as any)({
    where: whereClause,
    include: {
      application: {
        include: {
          event: true,
          worker: true,
        },
      },
    },
  });

  for (const pay of (payments as any[])) {
    const deadline = pay.deadlineAt ? new Date(pay.deadlineAt) : null;
    if (!deadline) continue;

    // 1. Check for OVERDUE (deadline passed & not notified overdue yet)
    if (now > deadline && !pay.overdueNotifiedAt) {
      await (prisma.workerPayment.update as any)({
        where: { id: pay.id },
        data: { overdueNotifiedAt: now },
      });

      // Organizer alert: account restricted
      await prisma.notification.create({
        data: {
          userId: pay.application?.event?.organizerId,
          type: "PAYMENT_OVERDUE",
          title: "Overdue Worker Payment - Account Restricted",
          body: `24-hour payment deadline passed for worker ${pay.application?.worker?.name} (₹${pay.amount}) on "${pay.application?.event?.title}". Event publishing is paused until settled.`,
          link: "/organizer?tab=payments",
        },
      });

      // Worker alert
      await prisma.notification.create({
        data: {
          userId: pay.application?.workerId,
          type: "PAYMENT_OVERDUE",
          title: "Payment Overdue Alert",
          body: `The 24-hour deadline for your payout of ₹${pay.amount} for "${pay.application?.event?.title}" has elapsed. CrewHub team has restricted organizer actions until settled.`,
          link: "/worker/payments",
        },
      });

      // Check organizer payment discipline: if 2+ overdue payments, auto-suspend organizer
      const orgId = pay.application?.event?.organizerId;
      if (orgId) {
        const totalOverdue = await (prisma.workerPayment.count as any)({
          where: {
            status: { in: ["PENDING", "DISPUTED"] },
            deadlineAt: { lt: now },
            application: { event: { organizerId: orgId } },
          },
        });

        const discipline = evaluateOrganizerPaymentDiscipline(totalOverdue);

        if (discipline.shouldSuspend) {
          const orgUser = await prisma.user.findUnique({
            where: { id: orgId },
            select: { id: true, status: true },
          });

          if (orgUser && orgUser.status === "ACTIVE") {
            await prisma.user.update({
              where: { id: orgId },
              data: { status: "SUSPENDED" },
            });

            await prisma.notification.create({
              data: {
                userId: orgId,
                type: "ACCOUNT_SUSPENDED",
                title: "Account Suspended: Overdue Payments Policy",
                body: discipline.suspensionNotice || `You have ${totalOverdue} overdue worker payouts past the 24-hour deadline. Your organizer account has been automatically suspended.`,
                link: "/organizer?tab=payments",
              },
            });
          }
        }
      }
    }
    // 2. Check for URGENT REMINDER (<= 6 hours left & not reminded yet)
    else if (now <= deadline && !pay.remindedAt) {
      const hoursRemaining = Math.max(1, Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
      if (hoursRemaining <= 6) {
        await (prisma.workerPayment.update as any)({
          where: { id: pay.id },
          data: { remindedAt: now },
        });

        await prisma.notification.create({
          data: {
            userId: pay.application?.event?.organizerId,
            type: "PAYMENT_REMINDER",
            title: `Urgent: ${hoursRemaining}h Left to Settle Worker Wage`,
            body: `Only ${hoursRemaining} hours remaining before deadline for worker ${pay.application?.worker?.name} (₹${pay.amount}) on "${pay.application?.event?.title}". Pay via UPI directly to avoid account restrictions.`,
            link: "/organizer?tab=payments",
          },
        });
      }
    }
  }
}

export async function recordWorkerPayment(
  organizerId: string,
  paymentId: string,
  upiReference: string
) {
  if (!upiReference?.trim()) throw new Error("UPI Reference or Transaction ID is required");

  const pay = await prisma.workerPayment.findUnique({
    where: { id: paymentId },
    include: {
      application: {
        include: { event: true, eventJob: true, worker: true },
      },
    },
  });

  if (!pay || pay.application.event.organizerId !== organizerId) {
    throw new Error("Payment not found or unauthorized");
  }

  const updated = await prisma.workerPayment.update({
    where: { id: paymentId },
    data: {
      status: "RECORDED",
      upiReference: upiReference.trim(),
      paidAt: new Date(),
    },
  });

  // Notify the worker to confirm receipt
  await prisma.notification.create({
    data: {
      userId: pay.application.workerId,
      type: "PAYMENT",
      title: "Payment recorded",
      body: `Organizer recorded ₹${pay.amount} via UPI (${upiReference.trim()}) for ${pay.application.event.title}. Please confirm receipt.`,
      link: `/worker/payments`,
    },
  });

  return updated;
}

export async function payPlatformFee(
  organizerId: string,
  feeId: string,
  receiptRef: string
) {
  const fee = await prisma.platformFee.findUnique({
    where: { id: feeId },
    include: { event: true },
  });

  if (!fee || fee.event.organizerId !== organizerId) {
    throw new Error("Platform fee not found or unauthorized");
  }

  return await prisma.platformFee.update({
    where: { id: feeId },
    data: {
      status: "PAID",
      receiptRef: receiptRef.trim() || `UPI-FEE-${Date.now()}`,
      paidAt: new Date(),
    },
  });
}
