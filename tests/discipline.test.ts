import { describe, it, expect } from "vitest";
import {
  evaluateVolunteerCancellationDiscipline,
  evaluateOrganizerPaymentDiscipline,
} from "../lib/discipline";

describe("CrewHub User Reliability & Discipline System", () => {
  describe("Volunteer Cancellation Policy", () => {
    it("permits standard applications without warning when cancellations are below 3", () => {
      const zero = evaluateVolunteerCancellationDiscipline(0);
      expect(zero.disciplineStatus).toBe("GOOD");
      expect(zero.shouldWarn).toBe(false);
      expect(zero.shouldSuspend).toBe(false);

      const two = evaluateVolunteerCancellationDiscipline(2);
      expect(two.disciplineStatus).toBe("GOOD");
      expect(two.shouldWarn).toBe(false);
      expect(two.shouldSuspend).toBe(false);
    });

    it("triggers a formal warning notification when volunteer cancels 3 times", () => {
      const three = evaluateVolunteerCancellationDiscipline(3);
      expect(three.disciplineStatus).toBe("WARNING");
      expect(three.shouldWarn).toBe(true);
      expect(three.shouldSuspend).toBe(false);
      expect(three.warningTitle).toContain("3/5");
      expect(three.warningBody).toContain("reaching 5 cancellations results in automatic account suspension");
    });

    it("triggers a final warning notification on the 4th cancellation", () => {
      const four = evaluateVolunteerCancellationDiscipline(4);
      expect(four.disciplineStatus).toBe("WARNING");
      expect(four.shouldWarn).toBe(true);
      expect(four.shouldSuspend).toBe(false);
      expect(four.warningTitle).toContain("4/5");
    });

    it("triggers automatic account suspension when volunteer reaches 5 or more cancellations", () => {
      const five = evaluateVolunteerCancellationDiscipline(5);
      expect(five.disciplineStatus).toBe("SUSPENDED");
      expect(five.shouldSuspend).toBe(true);
      expect(five.warningTitle).toContain("Cancellation Limit Exceeded");

      const eight = evaluateVolunteerCancellationDiscipline(8);
      expect(eight.disciplineStatus).toBe("SUSPENDED");
      expect(eight.shouldSuspend).toBe(true);
    });
  });

  describe("Organizer Payment Discipline Policy", () => {
    it("maintains good standing when organizer has zero overdue wage payments", () => {
      const zero = evaluateOrganizerPaymentDiscipline(0);
      expect(zero.disciplineStatus).toBe("GOOD");
      expect(zero.isRestricted).toBe(false);
      expect(zero.shouldSuspend).toBe(false);
    });

    it("restricts event publishing when 1 payment passes the 24-hour deadline", () => {
      const one = evaluateOrganizerPaymentDiscipline(1);
      expect(one.disciplineStatus).toBe("RESTRICTED");
      expect(one.isRestricted).toBe(true);
      expect(one.shouldSuspend).toBe(false);
    });

    it("triggers automatic account suspension when 2 or more worker payments remain overdue", () => {
      const two = evaluateOrganizerPaymentDiscipline(2);
      expect(two.disciplineStatus).toBe("SUSPENDED");
      expect(two.isRestricted).toBe(true);
      expect(two.shouldSuspend).toBe(true);
      expect(two.suspensionNotice).toContain("2 overdue worker payouts");

      const four = evaluateOrganizerPaymentDiscipline(4);
      expect(four.disciplineStatus).toBe("SUSPENDED");
      expect(four.shouldSuspend).toBe(true);
    });
  });
});
