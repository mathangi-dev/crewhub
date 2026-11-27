import { handle, json, requireUser } from "@/lib/api";

export const GET = handle(async () => json({ user: await requireUser() }));
