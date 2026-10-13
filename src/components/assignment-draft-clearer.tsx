"use client";

import { useEffect } from "react";

export function AssignmentDraftClearer({ classId, enabled }: { classId: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    try {
      window.sessionStorage.removeItem(`mrflynnib-assignment-draft:${classId}`);
      window.sessionStorage.removeItem(`mrflynnib-assignment-setup:${classId}`);
    } catch {
      // Saving a draft is a convenience; restricted storage must not affect the assignment.
    }
  }, [classId, enabled]);

  return null;
}
