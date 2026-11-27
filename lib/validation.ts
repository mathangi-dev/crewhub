import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(190);
const password = z.string().min(8, "Use at least 8 characters").max(72);

export const registerSchema = z
  .object({
    role: z.enum(["WORKER", "ORGANIZER"]), // Admin accounts are never self-registered
    name: z.string().trim().min(2).max(80),
    email,
    password,
    orgName: z.string().trim().min(2).max(120).optional(),
  })
  .refine((d) => d.role !== "ORGANIZER" || !!d.orgName, {
    path: ["orgName"],
    message: "Organization name is required for organizers",
  });

export const loginSchema = z.object({ email, password: z.string().min(1).max(72) });
