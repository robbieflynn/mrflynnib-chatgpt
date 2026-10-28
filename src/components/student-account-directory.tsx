"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { changeAccountRole } from "@/app/teacher/actions";
import type { StudentAccountSummary } from "@/lib/student-accounts";

type CurriculumFilter = "all" | "ib" | "igcse";
type ConfirmationFilter = "all" | "confirmed" | "unconfirmed";
type ClassFilter = "all" | "in_class" | "not_in_class";
type SortOrder = "newest" | "oldest" | "name" | "last_sign_in";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dubai",
});

function dateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Not yet";
}

export function StudentAccountDirectory({ accounts }: { accounts: StudentAccountSummary[] }) {
  const [query, setQuery] = useState("");
  const [curriculum, setCurriculum] = useState<CurriculumFilter>("all");
  const [confirmation, setConfirmation] = useState<ConfirmationFilter>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredAccounts = useMemo(() => accounts
    .filter((account) => {
      const matchesQuery = !deferredQuery || `${account.display_name} ${account.email}`.toLowerCase().includes(deferredQuery);
      const matchesCurriculum = curriculum === "all" || account.curriculum === curriculum;
      const isConfirmed = Boolean(account.email_confirmed_at);
      const matchesConfirmation = confirmation === "all"
        || (confirmation === "confirmed" ? isConfirmed : !isConfirmed);
      const isInClass = Number(account.class_count) > 0;
      const matchesClass = classFilter === "all"
        || (classFilter === "in_class" ? isInClass : !isInClass);
      return matchesQuery && matchesCurriculum && matchesConfirmation && matchesClass;
    })
    .sort((left, right) => {
      if (sortOrder === "name") {
        return (left.display_name || left.email).localeCompare(right.display_name || right.email, "en", { sensitivity: "base" });
      }
      if (sortOrder === "last_sign_in") {
        return new Date(right.last_sign_in_at || 0).getTime() - new Date(left.last_sign_in_at || 0).getTime();
      }
      const difference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return sortOrder === "oldest" ? -difference : difference;
    }), [accounts, classFilter, confirmation, curriculum, deferredQuery, sortOrder]);

  const filtersActive = Boolean(query.trim())
    || curriculum !== "all"
    || confirmation !== "all"
    || classFilter !== "all"
    || sortOrder !== "newest";

  function resetFilters() {
    setQuery("");
    setCurriculum("all");
    setConfirmation("all");
    setClassFilter("all");
    setSortOrder("newest");
  }

  return <div className="teacher-account-directory">
    <div className="teacher-account-toolbar" aria-label="Student account filters">
      <label className="teacher-account-search">
        <span>Search students</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email address" />
      </label>
      <label>
        <span>Area</span>
        <select value={curriculum} onChange={(event) => setCurriculum(event.target.value as CurriculumFilter)}>
          <option value="all">All areas</option><option value="ib">IB</option><option value="igcse">IGCSE</option>
        </select>
      </label>
      <label>
        <span>Email</span>
        <select value={confirmation} onChange={(event) => setConfirmation(event.target.value as ConfirmationFilter)}>
          <option value="all">All email states</option><option value="confirmed">Confirmed</option><option value="unconfirmed">Awaiting confirmation</option>
        </select>
      </label>
      <label>
        <span>Classes</span>
        <select value={classFilter} onChange={(event) => setClassFilter(event.target.value as ClassFilter)}>
          <option value="all">All students</option><option value="in_class">In a class</option><option value="not_in_class">Not in a class</option>
        </select>
      </label>
      <label>
        <span>Order</span>
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Student name</option><option value="last_sign_in">Recent sign-in</option>
        </select>
      </label>
    </div>
    <div className="teacher-account-results-bar" aria-live="polite">
      <span><strong>{filteredAccounts.length}</strong> {filteredAccounts.length === 1 ? "student" : "students"} shown</span>
      {filtersActive ? <button type="button" onClick={resetFilters}>Reset filters</button> : null}
    </div>
    <div className="teacher-account-table-wrap">
      <table className="teacher-account-table student-account-table">
        <thead><tr><th>Student</th><th>Area</th><th>Email</th><th>Last sign-in</th><th>Classes</th><th>Learning activity</th><th>Account type</th></tr></thead>
        <tbody>
          {filteredAccounts.map((account) => <tr key={account.user_id}>
            <td><strong>{account.display_name || "Student"}</strong><small>Registered {dateTime(account.created_at)}</small></td>
            <td><span className="status-pill">{account.curriculum === "igcse" ? "IGCSE" : "IB"}</span></td>
            <td><strong className="teacher-account-email">{account.email}</strong><span className={`account-state-badge ${account.email_confirmed_at ? "is-positive" : "is-waiting"}`}>{account.email_confirmed_at ? "Confirmed" : "Awaiting confirmation"}</span></td>
            <td>{dateTime(account.last_sign_in_at)}</td>
            <td><strong>{Number(account.class_count) || 0}</strong><small>{Number(account.class_count) === 1 ? "class joined" : "classes joined"}</small></td>
            <td><strong>{Number(account.completed_question_count) || 0} completed questions</strong><small>{Number(account.submitted_assignment_count) || 0} submitted assignments</small></td>
            <td><form action={changeAccountRole} className="teacher-account-actions"><input name="accountId" type="hidden" value={account.user_id} /><input name="role" type="hidden" value="teacher" /><input name="returnTo" type="hidden" value="/teacher/students" /><button className="text-button" type="submit" onClick={(event) => { if (!window.confirm(`Change ${account.display_name || account.email} to a teacher account? Their existing progress, classes and access will be kept.`)) event.preventDefault(); }}>Make teacher</button></form></td>
          </tr>)}
          {!filteredAccounts.length ? <tr><td className="teacher-account-empty" colSpan={7}>{accounts.length ? "No student accounts match those filters." : "No student accounts have been recorded."}</td></tr> : null}
        </tbody>
      </table>
    </div>
  </div>;
}
