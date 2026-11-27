"use client";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type NavItem = { label: string; href: string; icon: string; match: (path: string) => boolean };

/**
 * Pill-shaped nav: fill-rise hover with rolling label (CSS), sliding dot under the current page,
 * unroll intro (CSS). Below 960px it shows icons only (see worker.css).
 */
export default function PillNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const active = items.findIndex((i) => i.match(pathname));
  const slots = useRef<(HTMLLIElement | null)[]>([]);
  const dot = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const [lit, setLit] = useState(false);

  const place = useCallback(() => {
    const d = dot.current;
    if (!d) return;
    slots.current.forEach((sl) => {
      if (!sl) return;
      const reach = Math.ceil(2 * Math.sqrt((sl.offsetWidth / 2) ** 2 + sl.offsetHeight ** 2)) + 2;
      sl.style.setProperty("--f", reach + "px");
    });
    const s = slots.current[active];
    if (!s || !s.offsetWidth) {
      d.style.opacity = "0";
      placed.current = false;
      return;
    }
    const first = !placed.current;
    if (first) d.style.transition = "none";
    d.style.transform = `translateX(${s.offsetLeft + s.offsetWidth / 2}px)`;
    d.style.opacity = "1";
    if (first) {
      void d.offsetWidth;
      d.style.transition = "";
      placed.current = true;
    }
  }, [active]);

  useLayoutEffect(() => {
    place();
  }, [place]);

  useEffect(() => {
    window.addEventListener("resize", place);
    document.fonts?.ready?.then(place);
    return () => window.removeEventListener("resize", place);
  }, [place]);

  return (
    <nav className="pn" id="pn" aria-label="Worker">
      <div className="pn-bar">
        <div className="pn-track">
          <ul className="pn-list">
            {items.map((it, i) => (
              <li
                key={it.href}
                className="pn-slot"
                ref={(el) => {
                  slots.current[i] = el;
                }}
                onPointerEnter={() => i === active && setLit(true)}
                onPointerLeave={() => setLit(false)}
              >
                <Link
                  className={"pn-item" + (i === active ? " cur" : "")}
                  href={it.href}
                  aria-label={it.label}
                  title={it.label}
                  aria-current={i === active ? "page" : undefined}
                >
                  <i className="pn-fill" />
                  <span className="pn-face">
                    <span className="ms">{it.icon}</span>
                    <span className="lb">{it.label}</span>
                  </span>
                  <span className="pn-alt" aria-hidden="true">
                    <span className="ms">{it.icon}</span>
                    <span className="lb">{it.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <span ref={dot} className={"pn-dot" + (lit ? " lit" : "")} id="pdot" aria-hidden="true" />
        </div>
      </div>
    </nav>
  );
}
