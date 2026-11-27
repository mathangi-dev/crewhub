import { describe, expect, it } from "vitest";
import { registerSchema } from "../lib/validation";

describe("registerSchema", () => {
  const base = { name: "Asha K", email: "A@Example.com", password: "longenough1" };
  it("accepts a worker and lowercases the email", () => {
    const r = registerSchema.parse({ ...base, role: "WORKER" });
    expect(r.email).toBe("a@example.com");
  });
  it("rejects ADMIN self-registration", () => {
    expect(registerSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
  });
  it("requires orgName for organizers", () => {
    expect(registerSchema.safeParse({ ...base, role: "ORGANIZER" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: "ORGANIZER", orgName: "Stage Co" }).success).toBe(true);
  });
  it("rejects short passwords", () => {
    expect(registerSchema.safeParse({ ...base, password: "short", role: "WORKER" }).success).toBe(false);
  });
});
