import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const JOB_CATEGORIES = [
  "Registration",
  "Crowd management",
  "Backstage support",
  "Guest management",
  "Social media support",
] as const;

export const eventQuery = z.object({
  q: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  category: z.enum(JOB_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
});

/** Public list of published events that are still open for applications. */
export async function listPublicEvents(input: unknown) {
  const { q, city, category, page, pageSize } = eventQuery.parse(input);
  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    applicationDeadline: { gt: new Date() },
    ...(q ? { OR: [{ title: { contains: q } }, { venue: { contains: q } }] } : {}),
    ...(city ? { city: { contains: city } } : {}),
    ...(category ? { jobs: { some: { name: category } } } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, venue: true, city: true, posterUrl: true, startsAt: true,
        jobs: { select: { name: true, vacancies: true, wage: true } },
      },
    }),
  ]);
  const items = rows.map((e) => ({
    id: e.id,
    title: e.title,
    venue: e.venue,
    city: e.city,
    posterUrl: e.posterUrl,
    startsAt: e.startsAt.toISOString(),
    maxWage: e.jobs.reduce((m, j) => Math.max(m, Number(j.wage)), 0),
    jobs: e.jobs.map((j) => ({ name: j.name, vacancies: j.vacancies, wage: Number(j.wage) })),
  }));
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
