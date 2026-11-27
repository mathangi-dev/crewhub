// In-memory limiter. Fine for local dev and a single server.
// On Vercel (serverless) replace with a shared store such as Upstash Redis before launch.
const hits = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= limit;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
