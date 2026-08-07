"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { navItems } from "@/lib/site";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  return (
    <div className="mobile-nav">
      <button
        ref={toggleRef}
        className="mobile-menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Close" : "Menu"}
      </button>
      {open ? (
        <>
          <button className="mobile-nav-backdrop" type="button" aria-label="Close menu" onClick={closeMenu} />
          <nav id="mobile-navigation-panel" className="mobile-panel" aria-label="Mobile navigation">
            {navItems.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu}>{item.label}</Link>)}
            <Link href="/tutoring" onClick={closeMenu}>Tutoring</Link>
            <Link className="mobile-student-link" href="/go/my-courses" onClick={closeMenu}>My courses</Link>
            <Link href="/contact" onClick={closeMenu}>Contact</Link>
          </nav>
        </>
      ) : null}
    </div>
  );
}
