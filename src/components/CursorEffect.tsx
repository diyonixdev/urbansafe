"use client";
import { useEffect, useRef } from "react";

export default function CursorEffect() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = ref.current;
    if (!cursor) return;

    let mx = 0, my = 0, cx = 0, cy = 0, afId: number;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (Math.random() > 0.5) {
        const t = document.createElement("div");
        t.className = "cursor-trail";
        t.style.left = `${mx}px`; t.style.top = `${my}px`;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 500); }, 100);
      }
    };

    const tick = () => {
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      cursor.style.left = `${cx}px`; cursor.style.top = `${cy}px`;
      afId = requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener("mousemove", onMove);

    const update = () => {
      const els = document.querySelectorAll("a, button, [role='button'], .hover-target");
      const add = () => cursor.classList.add("hovering");
      const rem = () => cursor.classList.remove("hovering");
      els.forEach(el => { el.addEventListener("mouseenter", add); el.addEventListener("mouseleave", rem); });
    };
    // Re-run after render settles
    setTimeout(update, 500);

    return () => {
      cancelAnimationFrame(afId);
      document.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <div className="custom-cursor" aria-hidden="true" ref={ref} />;
}
