import Link from "next/link";
import "./landing.css";
import { JOB_CATEGORIES, eventQuery, listPublicEvents } from "@/lib/services/events";
import { readSession, roleHome } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default async function Home({ searchParams }: { searchParams: SP }) {
  const session = await readSession();
  const parsed = eventQuery.safeParse(searchParams);
  const filters = parsed.success ? parsed.data : eventQuery.parse({});
  let data: Awaited<ReturnType<typeof listPublicEvents>> | null = null;
  try {
    data = await listPublicEvents(filters);
  } catch (e) {
    console.error("Could not load events", e);
  }
  const link = (page: number) => {
    const p = new URLSearchParams();
    if (filters.q) p.set("q", filters.q);
    if (filters.city) p.set("city", filters.city);
    if (filters.category) p.set("category", filters.category);
    p.set("page", String(page));
    return `/?${p.toString()}#events`;
  };

  return (
    <div className="lp">
      <header>
        <div className="wrap nav">
          <Link className="logo" href="/">CrewHub</Link>
          <nav aria-label="Public">
            <a href="#events">Events</a><a href="#how">How it works</a><a href="#trust">Trust and safety</a><a href="#faq">FAQ</a><a href="#contact">Contact</a>
          </nav>
          <span className="sp" />
          {session ? (
            <>
              <Link className="btn" href={roleHome[session.role]}>Dashboard</Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link className="btn ghost" href="/login">Log in</Link>
              <Link className="btn" href="/register">Register</Link>
            </>
          )}
        </div>
      </header>

      <main id="top">
        <div className="hero-card">
          {/* Add your hero photo: <div className="stage" style={{backgroundImage:"url(/hero.jpg)"}} /><div className="shade" /> and add "has-photo" to hero-card */}
          <div className="hero-in">
            <p className="kick">Event staffing, sorted</p>
            <h1>Crew your event. Join the show.</h1>
            <p className="lead">Organizers post roles for concerts, parties, exhibitions and shows. Workers apply, check in, get paid and build a verified record.</p>
            <div className="cta">
              <Link className="btn outline" href="/register?role=worker">Join as Volunteer</Link>
              <Link className="btn dark" href="/register?role=organizer">Join as Organizer</Link>
            </div>
            <p className="login">Already a member? <Link href="/login">Log in</Link></p>
          </div>
        </div>

        <section id="events">
          <div className="wrap">
            <h2>Upcoming public events</h2>
            <p className="sub">Open roles you can apply for right now.</p>
            <form className="fbar" action="/" method="get" role="search">
              <input name="q" type="search" placeholder="Search events" aria-label="Search events" defaultValue={filters.q} />
              <input name="city" type="search" placeholder="City" aria-label="City" defaultValue={filters.city} />
              <select name="category" aria-label="Category" defaultValue={filters.category ?? ""}>
                <option value="">All categories</option>
                {JOB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn" type="submit">Search</button>
            </form>

            {!data ? (
              <p className="empty">We could not load events right now. Please try again in a moment.</p>
            ) : data.items.length === 0 ? (
              <p className="empty">No events match your search yet. Try a different city or category.</p>
            ) : (
              <>
                <div className="events">
                  {data.items.map((e) => (
                    <article className="ec" key={e.id}>
                      <div className="img">{e.posterUrl && (/^https?:\/\//.test(e.posterUrl) || e.posterUrl.startsWith("/")) && <img src={e.posterUrl} alt={`${e.title} poster`} />}</div>
                      <div className="t"><b>{e.title}</b><span className="pill">Up to ₹{e.maxWage}</span></div>
                      <p className="m">{e.venue}, {e.city} · {fmtDate(e.startsAt)}</p>
                      <Link className="btn" href="/login">Apply</Link>
                    </article>
                  ))}
                </div>
                {data.pages > 1 && (
                  <nav className="pager" aria-label="Pagination">
                    {data.page > 1 && <Link className="btn ghost" href={link(data.page - 1)}>Previous</Link>}
                    <span className="muted" style={{ alignSelf: "center" }}>Page {data.page} of {data.pages}</span>
                    {data.page < data.pages && <Link className="btn ghost" href={link(data.page + 1)}>Next</Link>}
                  </nav>
                )}
              </>
            )}
          </div>
        </section>

        <section id="how" className="alt">
          <div className="wrap">
            <h2>How CrewHub works</h2>
            <p className="sub">Three steps, in order.</p>
            <div className="grid3">
              <div className="step"><span className="ms i">assignment</span><b>1. Organizers post an event</b><span>Add venue, date, job categories, vacancies and the wage for each role.</span></div>
              <div className="step"><span className="ms i">how_to_reg</span><b>2. Workers apply</b><span>Eligible applicants fill the vacancies in order. The rest join a waitlist.</span></div>
              <div className="step"><span className="ms i">payments</span><b>3. Event day and payment</b><span>Attendance is tracked on site. The organizer pays each worker directly by UPI.</span></div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap two">
            <div><h2>For workers</h2><ul><li>Find jobs near you by category, date and distance.</li><li>See your status: confirmed, waitlisted or offered.</li><li>Get wages from the organizer in full. CrewHub never deducts its fee from you.</li></ul><p><Link className="btn" href="/register?role=worker">Create volunteer account</Link></p></div>
            <div><h2>For organizers</h2><ul><li>Set separate vacancies and wages for each role.</li><li>Replacements are offered to the waitlist automatically.</li><li>CrewHub charges a 10% platform fee on total wages, billed separately.</li></ul><p><Link className="btn ghost" href="/register?role=organizer">Create organizer account</Link></p></div>
          </div>
        </section>

        <section id="trust" className="alt">
          <div className="wrap">
            <h2>Trust and safety</h2>
            <p className="sub">What we do to keep both sides protected.</p>
            <div className="grid3">
              <div><b>Verified organizers</b><p className="sub" style={{ margin: "6px 0 0" }}>New organizer accounts are reviewed by our team.</p></div>
              <div><b>Clear payment records</b><p className="sub" style={{ margin: "6px 0 0" }}>Every wage and transaction reference is recorded. Payments are not marked complete without verification.</p></div>
              <div><b>Reporting and support</b><p className="sub" style={{ margin: "6px 0 0" }}>Report a user or event and an admin will review it.</p></div>
            </div>
          </div>
        </section>

        <section id="faq">
          <div className="wrap">
            <h2>Frequently asked questions</h2>
            <div style={{ marginTop: 24, maxWidth: 900 }}>
              <details><summary>How are workers selected?</summary><p>Automatically, first come, first served among eligible applicants. Extra applicants join an ordered waitlist.</p></details>
              <details><summary>What happens if someone cancels?</summary><p>The next waitlisted worker gets an offer with a deadline. If they decline or do not reply, it moves to the next person.</p></details>
              <details><summary>How do workers get paid?</summary><p>The organizer pays each worker directly through UPI. CrewHub records the payment and its transaction reference.</p></details>
              <details><summary>Does CrewHub take a cut of wages?</summary><p>No. CrewHub charges organizers a separate 10% platform fee. Worker wages are never reduced.</p></details>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="wrap cols">
          <div><strong style={{ fontSize: 20 }}>CrewHub</strong><p style={{ color: "#bbb", maxWidth: "28em" }}>Event workforce platform for concerts, parties, exhibitions and comedy shows.</p><p style={{ color: "#bbb" }}>Contact: replace with your support email</p></div>
          <div><b>Platform</b><a href="#events">Events</a><a href="#how">How it works</a><a href="#faq">FAQ</a></div>
          <div><b>Account</b><Link href="/login">Log in</Link><Link href="/register">Register</Link></div>
        </div>
      </footer>
    </div>
  );
}
