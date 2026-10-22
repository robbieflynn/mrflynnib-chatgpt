"use client";

import { useEffect, useRef, useState } from "react";

type SyncState = "online" | "offline" | "syncing";

export function AssignmentConnectionStatus() {
  const [state, setState] = useState<SyncState>("online");
  const [pending, setPending] = useState(0);
  const pendingRef = useRef(0);

  useEffect(() => {
    const updateNetworkState = () => setState(navigator.onLine ? (pendingRef.current ? "syncing" : "online") : "offline");
    const updateSyncState = (event: Event) => {
      const detail = (event as CustomEvent<{ pending?: number; state?: SyncState }>).detail || {};
      pendingRef.current = Number(detail.pending || 0);
      setPending(pendingRef.current);
      setState(detail.state || (navigator.onLine ? "online" : "offline"));
    };
    updateNetworkState();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    window.addEventListener("mrflynnib-sync-status", updateSyncState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
      window.removeEventListener("mrflynnib-sync-status", updateSyncState);
    };
  }, []);

  if (state === "online" && pending === 0) return null;
  return <div className={`assignment-connection-status is-${state}`} role="status" aria-live="polite">
    <strong>{state === "offline" ? "Connection interrupted" : "Reconnecting"}</strong>
    <span>{pending
      ? `${pending} ${pending === 1 ? "piece" : "pieces"} of work ${pending === 1 ? "is" : "are"} safe on this device and will sync automatically.`
      : "Your work will continue syncing automatically when the connection returns."}</span>
  </div>;
}
