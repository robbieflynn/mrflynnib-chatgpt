"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="section">
      <div className="narrow stack-lg">
        <p className="eyebrow">Something went wrong</p>
        <h1>That page did not load properly.</h1>
        <p className="lede">Please try loading it again. If the problem continues, return to the homepage or email contact@mrflynnib.com.</p>
        <div className="cluster">
          <button className="button" onClick={reset} type="button">Try again</button>
          <Link className="button button-secondary" href="/">Return home</Link>
        </div>
      </div>
    </section>
  );
}
