"use client";

import { useEffect } from "react";

export function AssignmentDraftClearer({ classId, enabled }: { classId: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    try {
      const prefixes = [`mrflynnib-assignment-draft:${classId}`, `mrflynnib-assignment-setup:${classId}`];
      Object.keys(window.sessionStorage).forEach((key) => {
        if (prefixes.some((prefix) => key.startsWith(prefix))) window.sessionStorage.removeItem(key);
      });
    } catch {
      // Saving a draft is a convenience; restricted storage must not affect the assignment.
    }
  }, [classId, enabled]);

  return null;
}
