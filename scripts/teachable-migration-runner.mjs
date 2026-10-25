import { createServer } from "node:http";
import { URLSearchParams } from "node:url";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const HOST = "127.0.0.1";
const PORT = Number(process.env.TEACHABLE_MIGRATION_PORT || 3847);

let teachableKey = "";
let lastProbe = null;
let preparedRows = [];
let collectionSummary = null;
let collectionPromise = null;
let collectionError = null;
let supabaseUrl = "";
let supabaseSecret = "";
let applySummary = null;

const productCodes = new Map([
  ["Analysis and Approaches HL", "course_ib_aa_hl"],
  ["Analysis and Approaches SL", "course_ib_aa_sl"],
  ["Applications and Interpretation HL", "course_ib_ai_hl"],
  ["Applications and Interpretation SL", "course_ib_ai_sl"],
  ["IGCSE", "course_igcse"],
]);
const schoolDomains = new Set(["jess.sch.ae", "beausoleil.ch", "westminsteracademy.org.uk"]);

function html(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mr Flynn IB migration</title>
  <style>body{font:16px/1.5 system-ui;max-width:720px;margin:48px auto;padding:0 24px;color:#10213d}input{width:100%;padding:12px;margin:8px 0 18px;box-sizing:border-box}button{padding:12px 18px;background:#1268b3;color:white;border:0;border-radius:8px}code{background:#eef4fa;padding:2px 5px}</style></head><body>${body}</body></html>`;
}

function jsonShape(value, depth = 0) {
  if (depth > 4) return typeof value;
  if (Array.isArray(value)) return value.length ? [jsonShape(value[0], depth + 1)] : [];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonShape(child, depth + 1)]));
  }
  return typeof value;
}

async function teachable(path) {
  const response = await fetch(`https://developers.teachable.com${path}`, {
    headers: { accept: "application/json", apiKey: teachableKey },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Teachable ${path} returned ${response.status}`);
    error.status = response.status;
    error.payloadShape = jsonShape(payload);
    throw error;
  }
  return payload;
}

async function paginated(path, property) {
  const items = [];
  let page = 1;
  let pages = 1;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const payload = await teachable(`${path}${separator}per=100&page=${page}`);
    items.push(...(payload?.[property] || []));
    pages = Number(payload?.meta?.number_of_pages || 1);
    page += 1;
  } while (page <= pages);
  return items;
}

function isApprovedSchoolEmail(email) {
  const domain = String(email).toLowerCase().split("@")[1] || "";
  return schoolDomains.has(domain);
}

function isUsableTransaction(transaction) {
  const status = String(transaction.status || "").toLowerCase();
  const statusAllowsAccess = !["failed", "unpaid", "void", "refunded", "chargeback"].includes(status);
  const notRefunded = !transaction.refunded_at && Number(transaction.amount_refunded || 0) <= 0;
  const noChargeback = !transaction.has_chargeback;
  const paid = Number(transaction.final_price || transaction.charge || transaction.revenue || 0) > 0;
  const coupon = transaction.coupon_id !== null && transaction.coupon_id !== undefined;
  return statusAllowsAccess && notRefunded && noChargeback && (paid || coupon);
}

async function collectMigrationData() {
  const coursesPayload = await teachable("/v1/courses?per=100&page=1");
  const targets = (coursesPayload?.courses || []).filter((course) => productCodes.has(course.name));
  const users = await paginated("/v1/users", "users");
  const usersById = new Map(users.map((user) => [Number(user.id), user]));
  const now = new Date();
  const rows = [];
  const summary = {
    targetCourses: targets.length,
    usersScanned: users.length,
    activeEnrollmentsScanned: 0,
    transactionsScanned: 0,
    prepared: 0,
    excludedWithoutPurchaseOrCode: 0,
    excludedExpired: 0,
    excludedMissingUser: 0,
    byCourse: {},
    byEvidence: {},
    transactionStatuses: {},
    couponTransactions: 0,
    zeroPriceTransactions: 0,
    zeroPriceCouponTransactions: 0,
    refundedOrChargedBackTransactions: 0,
    evidenceWarning: "Teachable v1 transactions omit 100%-off coupon redemptions. Excluded active enrollments require a Sale.created/v2 purchase/support-export reconciliation before they can be treated as manual or free.",
  };

  for (const course of targets) {
    const enrollments = await paginated(`/v1/courses/${course.id}/enrollments`, "enrollments");
    const transactions = await paginated(`/v1/transactions?course_id=${course.id}`, "transactions");
    summary.activeEnrollmentsScanned += enrollments.length;
    summary.transactionsScanned += transactions.length;
    for (const transaction of transactions) {
      const status = String(transaction.status || "unknown").toLowerCase();
      summary.transactionStatuses[status] = (summary.transactionStatuses[status] || 0) + 1;
      const hasCoupon = transaction.coupon_id !== null && transaction.coupon_id !== undefined;
      const zeroPrice = Number(transaction.final_price || 0) <= 0;
      if (hasCoupon) summary.couponTransactions += 1;
      if (zeroPrice) summary.zeroPriceTransactions += 1;
      if (hasCoupon && zeroPrice) summary.zeroPriceCouponTransactions += 1;
      if (transaction.refunded_at || Number(transaction.amount_refunded || 0) > 0 || transaction.has_chargeback) {
        summary.refundedOrChargedBackTransactions += 1;
      }
    }
    const transactionsByUser = new Map();
    for (const transaction of transactions) {
      const userId = Number(transaction.user_id);
      if (!transactionsByUser.has(userId)) transactionsByUser.set(userId, []);
      transactionsByUser.get(userId).push(transaction);
    }
    for (const enrollment of enrollments) {
      const user = usersById.get(Number(enrollment.user_id));
      if (!user?.email) {
        summary.excludedMissingUser += 1;
        continue;
      }
      const expiresAt = enrollment.expires_at ? new Date(enrollment.expires_at) : null;
      if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now)) {
        summary.excludedExpired += 1;
        continue;
      }
      const approvedTransaction = (transactionsByUser.get(Number(enrollment.user_id)) || []).find(isUsableTransaction);
      const schoolEmail = isApprovedSchoolEmail(user.email);
      if (!schoolEmail && !approvedTransaction) {
        summary.excludedWithoutPurchaseOrCode += 1;
        continue;
      }
      const evidence = schoolEmail
        ? "approved_school_domain_and_active_enrollment"
        : (approvedTransaction.coupon_id !== null && approvedTransaction.coupon_id !== undefined)
          ? "coupon_user_and_active_enrollment"
          : "paid_transaction_and_active_enrollment";
      rows.push({
        email: String(user.email).trim().toLowerCase(),
        product_code: productCodes.get(course.name),
        evidence,
        enrolled_at: enrollment.enrolled_at,
        expires_at: enrollment.expires_at || null,
        course_id: Number(course.id),
        user_id: Number(enrollment.user_id),
      });
      summary.byCourse[course.name] = (summary.byCourse[course.name] || 0) + 1;
      summary.byEvidence[evidence] = (summary.byEvidence[evidence] || 0) + 1;
    }
  }

  const deduplicated = new Map();
  for (const row of rows) {
    const key = `${row.email}:${row.product_code}`;
    const current = deduplicated.get(key);
    const rowExpiry = row.expires_at ? new Date(row.expires_at).getTime() : Number.POSITIVE_INFINITY;
    const currentExpiry = current?.expires_at ? new Date(current.expires_at).getTime() : Number.POSITIVE_INFINITY;
    if (!current || rowExpiry > currentExpiry) deduplicated.set(key, row);
  }
  preparedRows = [...deduplicated.values()];
  collectionSummary = {
    ...summary,
    prepared: preparedRows.length,
    duplicateEnrollmentsCollapsed: rows.length - preparedRows.length,
  };
  return collectionSummary;
}

async function runProbe() {
  const courses = await teachable("/v1/courses?per=100&page=1");
  const courseList = courses?.courses || courses?.data || (Array.isArray(courses) ? courses : []);
  const targetNames = new Set([
    "Analysis and Approaches HL",
    "Analysis and Approaches SL",
    "Applications and Interpretation HL",
    "Applications and Interpretation SL",
    "IGCSE",
  ]);
  const targets = courseList.filter((course) => targetNames.has(course.name));
  const target = targets[0];
  let enrollmentPayload = null;
  let enrollmentError = null;
  let userPayload = null;
  let userError = null;
  let transactionPayload = null;
  let transactionError = null;
  if (target?.id) {
    try {
      enrollmentPayload = await teachable(`/v1/courses/${target.id}/enrollments?per=2&page=1`);
    } catch (error) {
      enrollmentError = { message: error.message, status: error.status, payloadShape: error.payloadShape };
    }
  }
  try {
    userPayload = await teachable("/v1/users?per=2&page=1");
  } catch (error) {
    userError = { message: error.message, status: error.status, payloadShape: error.payloadShape };
  }
  try {
    transactionPayload = await teachable("/v1/transactions?per=2&page=1");
  } catch (error) {
    transactionError = { message: error.message, status: error.status, payloadShape: error.payloadShape };
  }
  lastProbe = {
    courseResponseShape: jsonShape(courses),
    courseCount: courseList.length,
    matchedCourses: targets.map((course) => ({ id: course.id, name: course.name })),
    enrollmentResponseShape: jsonShape(enrollmentPayload),
    enrollmentError,
    userResponseShape: jsonShape(userPayload),
    userError,
    transactionResponseShape: jsonShape(transactionPayload),
    transactionError,
  };
  return lastProbe;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html(`<h1>Teachable migration runner</h1><p>The API key remains only in this local process and is never written to disk or printed.</p><form method="post" action="/key"><label for="key">Existing Teachable migration API key</label><input id="key" name="key" type="password" autocomplete="off" required><button type="submit">Load migration data</button></form>`));
      return;
    }
    if (request.method === "POST" && request.url === "/key") {
      let body = "";
      for await (const chunk of request) body += chunk;
      teachableKey = new URLSearchParams(body).get("key")?.trim() || "";
      if (!teachableKey) throw new Error("No Teachable key supplied.");
      await runProbe();
      response.writeHead(303, { location: "/status" });
      response.end();
      return;
    }
    if (request.method === "GET" && request.url === "/status") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html(`<h1>Teachable connection ready</h1><p>The official API connection succeeded. The migration runner found <strong>${lastProbe?.matchedCourses?.length ?? 0}</strong> target courses.</p><p>You can close this tab. The private key remains in memory only while this local runner is open.</p>`));
      return;
    }
    if (request.method === "GET" && request.url === "/probe") {
      if (!teachableKey) throw new Error("Teachable key has not been supplied.");
      const result = lastProbe || await runProbe();
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(result, null, 2));
      return;
    }
    if (request.method === "GET" && request.url === "/collect") {
      if (!teachableKey) throw new Error("Teachable key has not been supplied.");
      if (!collectionPromise) {
        collectionError = null;
        collectionPromise = collectMigrationData().catch((error) => {
          collectionError = { message: error.message, status: error.status, payloadShape: error.payloadShape };
          throw error;
        });
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ started: true }, null, 2));
      return;
    }
    if (request.method === "GET" && request.url === "/collect-status") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        state: collectionError ? "failed" : collectionSummary ? "complete" : collectionPromise ? "running" : "not_started",
        summary: collectionSummary,
        error: collectionError,
      }, null, 2));
      return;
    }
    if (request.method === "GET" && request.url === "/supabase") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html(`<h1>Connect Supabase</h1><p>The service key remains only in this local process and is never written to disk or printed.</p><form method="post" action="/supabase"><label for="url">Supabase project URL</label><input id="url" name="url" type="url" value="https://vbehtguhhhpfrbfhevef.supabase.co" required><label for="secret">Existing Supabase service-role key</label><input id="secret" name="secret" type="password" autocomplete="off" required><button type="submit">Verify database connection</button></form>`));
      return;
    }
    if (request.method === "POST" && request.url === "/supabase") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const fields = new URLSearchParams(body);
      supabaseUrl = fields.get("url")?.trim() || "";
      supabaseSecret = fields.get("secret")?.trim() || "";
      if (!supabaseUrl || !supabaseSecret) throw new Error("Supabase URL and service key are required.");
      const client = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } });
      const { count, error } = await client.from("course_access_migrations").select("id", { count: "exact", head: true });
      if (error) throw new Error(`Supabase verification failed: ${error.message}`);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html(`<h1>Supabase connection ready</h1><p>The database connection succeeded. Existing migration records: <strong>${count ?? 0}</strong>.</p><form method="post" action="/apply"><button type="submit">Import the reviewed Teachable access</button></form>`));
      return;
    }
    if (request.method === "POST" && request.url === "/apply") {
      if (!preparedRows.length || !collectionSummary) throw new Error("Run the Teachable dry audit first.");
      if (!supabaseUrl || !supabaseSecret) throw new Error("Verify Supabase first.");
      const now = new Date().toISOString();
      const prepared = preparedRows.map((row) => ({
        normalized_email: row.email,
        product_code: row.product_code,
        source: row.evidence === "approved_school_domain_and_active_enrollment" ? "school" : "teachable",
        evidence_type: row.evidence,
        external_reference: `teachable:${row.course_id}:${row.user_id}`,
        starts_at: new Date(row.enrolled_at).toISOString(),
        expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        status: "verified",
        metadata: { teachable_course_id: row.course_id, teachable_user_id: row.user_id },
        updated_at: now,
      }));
      const client = createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } });
      for (let index = 0; index < prepared.length; index += 100) {
        const { error } = await client.from("course_access_migrations").upsert(prepared.slice(index, index + 100), {
          onConflict: "normalized_email,product_code",
        });
        if (error) throw new Error(`Supabase import failed after ${index} rows: ${error.message}`);
      }
      const { count, error } = await client.from("course_access_migrations").select("id", { count: "exact", head: true }).eq("status", "verified");
      if (error) throw new Error(`Supabase verification failed: ${error.message}`);
      applySummary = { imported: prepared.length, verifiedMigrationRecords: count ?? 0 };
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html(`<h1>Migration complete</h1><p><strong>${applySummary.imported}</strong> reviewed Teachable course-access records were imported.</p><p>Verified migration records now in Supabase: <strong>${applySummary.verifiedMigrationRecords}</strong>.</p>`));
      return;
    }
    if (request.method === "GET" && request.url === "/apply-status") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(applySummary, null, 2));
      return;
    }
    response.writeHead(404).end("Not found");
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error.message, status: error.status, payloadShape: error.payloadShape }, null, 2));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Teachable migration runner listening on http://${HOST}:${PORT}`);
});
