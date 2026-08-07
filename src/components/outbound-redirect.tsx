"use client";

import { useEffect } from "react";

export function OutboundRedirect({ target }: { target: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = target;
    }, 300);

    return () => window.clearTimeout(timer);
  }, [target]);

  return <a className="button" href={target}>Continue now</a>;
}
