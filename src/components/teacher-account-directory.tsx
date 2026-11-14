"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { changeAccountRole, reviewTeacherApplication } from "@/app/teacher/actions";
import { directoryAccountTier } from "@/lib/admin-account-tier";
import { currentStudentAccess, studentAccessFilters, matchesStudentAccess } from "@/lib/student-accounts";
import { courseProducts } from "@/lib/platform-products";
import type { TeacherAccountSummary } from "@/lib/teacher-accounts";

type CurriculumFilter = "all" | "ib" | "igcse";
type AccessFilter = "all" | "pending" | "approved" | "rejected";
type ConfirmationFilter = "all" | "confirmed" | "unconfirmed";
type SortOrder = "newest" | "oldest" | "name";

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

function accessLabel(status: TeacherAccountSummary["teacher_status"]) {
  if (status === "approved") return "Active teacher";
  if (status === "rejected") return "Declined";
  return "Awaiting approval";
}

export function TeacherAccountDirectory({ accounts, now, initialAccess = "all" }: { accounts: TeacherAccountSummary[]; now: number; initialAccess?: AccessFilter }) {
  const [tier, setTier] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [curriculum, setCurriculum] = useState<CurriculumFilter>("all");
  const [access, setAccess] = useState<AccessFilter>(initialAccess);
  const [confirmation, setConfirmation] = useState<ConfirmationFilter>(initialAccess === "pending" ? "confirmed" : "all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredAccounts = useMemo(() => accounts
    .filter((account) => {
      const matchesQuery = !deferredQuery || `${account.display_name} ${account.email}`.toLowerCase().includes(deferredQuery);
      const matchesCurriculum = curriculum === "all" || account.curriculum === curriculum;
      const matchesAccess = access === "all" || account.teacher_status === access;
      const isConfirmed = Boolean(account.email_confirmed_at);
      const matchesConfirmation = confirmation === "all"
        || (confirmation === "confirmed" ? isConfirmed : !isConfirmed);
      return matchesQuery && matchesCurriculum && matchesAccess && matchesConfirmation
        && (tier === "all" || directoryAccountTier(account, now) === tier)
        && matchesStudentAccess(account.access, source, now);
    })
    .sort((left, right) => {
      if (sortOrder === "name") {
        return (left.display_name || left.email).localeCompare(right.display_name || right.email, "en", { sensitivity: "base" });
      }
      const difference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return sortOrder === "oldest" ? -difference : difference;
    }), [accounts, access, confirmation, curriculum, deferredQuery, sortOrder, tier, source, now]);

  const filtersActive = tier !== "all" || source !== "all" || Boolean(query.trim())
    || curriculum !== "all"
    || access !== "all"
    || confirmation !== "all"
    || sortOrder !== "newest";

  function resetFilters() {
    setTier("all");
    setSource("all");
    setQuery("");
    setCurriculum("all");
    setAccess("all");
    setConfirmation("all");
    setSortOrder("newest");
  }

  return <div className="teacher-account-directory">
    <div className="teacher-account-toolbar" aria-label="Teacher account filters">
      <label className="teacher-account-search">
        <span>Search teachers</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or email address"
        />
      </label>
      <label>
        <span>Area</span>
        <select value={curriculum} onChange={(event) => setCurriculum(event.target.value as CurriculumFilter)}>
          <option value="all">All areas</option>
          <option value="ib">IB</option>
          <option value="igcse">IGCSE</option>
        </select>
      </label>
      <label><span>Account tier</span><select value={tier} onChange={(event) => setTier(event.target.value)}>
        <option value="all">All tiers</option><option value="plus">Plus</option><option value="standard">Standard</option><option value="unknown">Access unavailable</option>
      </select></label>
      <label><span>Access source</span><select value={source} onChange={(event) => setSource(event.target.value)}>
        <option value="all">All sources</option>{Object.entries(studentAccessFilters).filter(([key]) => !["all", "plus", "free"].includes(key)).map(([value, label]) => <option key={value} value={value}>{value === "admin" ? "Administrator grant" : label}</option>)}
      </select></label>
      <label>
        <span>Teacher status</span>
        <select value={access} onChange={(event) => setAccess(event.target.value as AccessFilter)}>
          <option value="all">All teacher states</option>
          <option value="pending">Awaiting approval</option>
          <option value="approved">Active teacher</option>
          <option value="rejected">Declined</option>
        </select>
      </label>
      <label>
        <span>Email</span>
        <select value={confirmation} onChange={(event) => setConfirmation(event.target.value as ConfirmationFilter)}>
          <option value="all">All email states</option>
          <option value="confirmed">Confirmed</option>
          <option value="unconfirmed">Awaiting confirmation</option>
        </select>
      </label>
      <label>
        <span>Order</span>
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Teacher name</option>
        </select>
      </label>
    </div>
    <div className="teacher-account-results-bar" aria-live="polite">
      <span><strong>{filteredAccounts.length}</strong> {filteredAccounts.length === 1 ? "teacher" : "teachers"} shown</span>
      {filtersActive ? <button type="button" onClick={resetFilters}>Reset filters</button> : null}
    </div>
    <p className="muted">Plus status follows the account’s role and area. Teacher approval is separate from course access. Teachable transfers and administrator grants do not by themselves confirm a payment.</p>
    <div className="teacher-account-table-wrap">
      <table className="teacher-account-table">
        <thead><tr><th>Teacher</th><th>Area</th><th>Email</th><th>Account tier</th><th>Teacher status</th><th>Course access, source and expiry</th><th>Last sign-in</th><th>Activity</th><th>Admin notice</th><th>Account type</th></tr></thead>
        <tbody>
          {filteredAccounts.map((account) => <tr key={account.user_id}>
            <td><strong>{account.display_name || "Teacher applicant"}</strong><small>Registered {dateTime(account.created_at)}</small></td>
            <td><span className="status-pill">{account.curriculum === "igcse" ? "IGCSE" : "IB"}</span></td>
            <td><strong className="teacher-account-email">{account.email}</strong><span className={`account-state-badge ${account.email_confirmed_at ? "is-positive" : "is-waiting"}`}>{account.email_confirmed_at ? "Confirmed" : "Awaiting confirmation"}</span></td>
            <td><span className={`account-state-badge ${directoryAccountTier(account, now) === "plus" ? "is-positive" : ""}`}>{directoryAccountTier(account, now) === "plus" ? "Plus" : directoryAccountTier(account, now) === "standard" ? "Standard" : "Access unavailable"}</span></td>
            <td><span className={`account-state-badge is-${account.teacher_status}`}>{accessLabel(account.teacher_status)}</span>{account.teacher_status === "pending" && account.email_confirmed_at ? <form action={reviewTeacherApplication} className="teacher-account-actions"><input name="applicantId" type="hidden" value={account.user_id} /><input name="returnTo" type="hidden" value="/teacher/accounts?access=pending" /><button className="text-button" name="decision" type="submit" value="approve">Approve teacher</button><button className="text-button is-danger" name="decision" type="submit" value="decline">Keep as student</button></form> : null}</td>
            <td>{account.access ? <>
              <strong>{(() => {
                const active = currentStudentAccess(account.access, now);
                const codes = new Set(active.map((record) => record.product_code));
                const allIB = codes.has("teacher_plus_ib") && account.role === "teacher" || codes.has("student_all_courses_ib") || courseProducts.filter((course) => course.curriculum === "ib").every((course) => codes.has(course.productCode));
                return allIB ? "Full IB access: all four courses" : active.length ? "Active course access" : "Standard access only";
              })()}</strong>
              {account.access.map((record, index) => {
                const active = currentStudentAccess([record], now).length > 0;
                const label = record.product_code === "teacher_plus_ib" ? "Teacher Plus: AA HL, AA SL, AI HL, AI SL"
                  : record.product_code === "student_all_courses_ib" ? "All four IB courses"
                  : record.product_code === "teacher_plus_igcse" ? "IGCSE Teacher Plus"
                  : courseProducts.find((course) => course.productCode === record.product_code)?.shortTitle || record.product_code.replaceAll("_", " ");
                const source = record.source === "admin" ? "Administrator grant" : studentAccessFilters[record.source] || record.source;
                const state = record.status !== "active" ? record.status : active ? "Active" : Date.parse(record.starts_at) > now ? "Scheduled" : "Expired";
                return <small key={index}><strong>{label}</strong><br />{source}<br />{state} · {record.expires_at ? `Ends ${dateTime(record.expires_at)}${active ? ` (${Math.ceil((Date.parse(record.expires_at) - now) / 86400000)} days left)` : ""}` : "No expiry"}</small>;
              })}
              <a className="text-link" href={`/teacher/platform-access?q=${encodeURIComponent(account.email)}`}>Manage course access</a>
            </> : "Access unavailable"}</td>
            <td>{dateTime(account.last_sign_in_at)}</td>
            <td><strong>{Number(account.class_count) || 0} classes</strong><small>{Number(account.assignment_count) || 0} assignments · {Number(account.saved_test_count) || 0} saved tests</small></td>
            <td>{account.teacher_notification_sent_at ? <><span className="account-state-badge is-positive">Sent</span><small>{dateTime(account.teacher_notification_sent_at)}</small></> : <span className="account-state-badge is-waiting">Not sent</span>}</td>
            <td>{account.role === "teacher" ? <form action={changeAccountRole} className="teacher-account-actions"><input name="accountId" type="hidden" value={account.user_id} /><input name="role" type="hidden" value="student" /><input name="returnTo" type="hidden" value="/teacher/accounts" /><button className="text-button is-danger" type="submit" onClick={(event) => { if (!window.confirm(`Change ${account.display_name || account.email} to a student account? Their existing progress, classes and access will be kept.`)) event.preventDefault(); }}>Change to student</button></form> : <span className="muted">Student</span>}</td>
          </tr>)}
          {!filteredAccounts.length ? <tr><td className="teacher-account-empty" colSpan={10}>{accounts.length ? "No teacher registrations match those filters." : "No teacher registrations have been recorded."}</td></tr> : null}
        </tbody>
      </table>
    </div>
  </div>;
}
