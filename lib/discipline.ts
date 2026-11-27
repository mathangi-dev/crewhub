/**
 * CrewHub Reliability & Discipline Policy Standards:
 * 
 * 1. Volunteer Cancellation Discipline:
 *    - 3 cancellations: Warning notification sent to volunteer.
 *    - 4 cancellations: Final warning notification sent.
 *    - 5 cancellations: Automatic account suspension (status: "SUSPENDED").
 * 
 * 2. Organizer Payment Discipline:
 *    - 1 overdue payment past 24h deadline: Account restricted from publishing new events.
 *    - 2+ overdue payments past 24h deadline: Automatic account suspension (status: "SUSPENDED").
 */

export type VolunteerDisciplineStatus = "GOOD" | "WARNING" | "SUSPENDED";
export type OrganizerDisciplineStatus = "GOOD" | "RESTRICTED" | "SUSPENDED";

export function evaluateVolunteerCancellationDiscipline(cancelCount: number): {
  disciplineStatus: VolunteerDisciplineStatus;
  shouldWarn: boolean;
  shouldSuspend: boolean;
  warningTitle?: string;
  warningBody?: string;
} {
  if (cancelCount >= 5) {
    return {
      disciplineStatus: "SUSPENDED",
      shouldWarn: false,
      shouldSuspend: true,
      warningTitle: "Account Suspended: Cancellation Limit Exceeded",
      warningBody: `You have cancelled ${cancelCount} event shifts. In accordance with CrewHub reliability standards, your account has been automatically suspended. Contact admin support if you wish to appeal.`,
    };
  }

  if (cancelCount === 3 || cancelCount === 4) {
    return {
      disciplineStatus: "WARNING",
      shouldWarn: true,
      shouldSuspend: false,
      warningTitle: cancelCount === 4 ? "Final Cancellation Warning (4/5)" : "Cancellation Policy Warning (3/5)",
      warningBody: `You have cancelled ${cancelCount} event shifts. Please note that reaching 5 cancellations results in automatic account suspension.`,
    };
  }

  return {
    disciplineStatus: "GOOD",
    shouldWarn: false,
    shouldSuspend: false,
  };
}

export function evaluateOrganizerPaymentDiscipline(overdueCount: number): {
  disciplineStatus: OrganizerDisciplineStatus;
  isRestricted: boolean;
  shouldSuspend: boolean;
  suspensionNotice?: string;
} {
  if (overdueCount >= 2) {
    return {
      disciplineStatus: "SUSPENDED",
      isRestricted: true,
      shouldSuspend: true,
      suspensionNotice: `You have ${overdueCount} overdue worker payouts past the 24-hour deadline. Your organizer account has been automatically suspended. Please settle all worker payouts or contact admin support.`,
    };
  }

  if (overdueCount === 1) {
    return {
      disciplineStatus: "RESTRICTED",
      isRestricted: true,
      shouldSuspend: false,
    };
  }

  return {
    disciplineStatus: "GOOD",
    isRestricted: false,
    shouldSuspend: false,
  };
}
