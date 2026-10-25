#!/usr/bin/env node

const argumentsMap = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.split("=");
    return [key, value.join("=") || true];
  }),
);

const loadMode = argumentsMap.has("--load");
const baseUrl = String(argumentsMap.get("--url") || "http://localhost:3000").replace(/\/$/, "");
const concurrency = Number(argumentsMap.get("--concurrency") || (loadMode ? 100 : 4));
const requestCount = Number(argumentsMap.get("--requests") || (loadMode ? 200 : 12));
const timeoutMs = Number(argumentsMap.get("--timeout") || 15_000);
const maxP95Ms = Number(argumentsMap.get("--max-p95") || (loadMode ? 5_000 : 4_000));

if (![concurrency, requestCount, timeoutMs, maxP95Ms].every(Number.isFinite) || concurrency < 1 || requestCount < 1) {
  throw new Error("Concurrency, request count, timeout and p95 threshold must be positive numbers.");
}

const routes = loadMode
  ? ["/api/health"]
  : [
      "/api/health",
      "/",
      "/learn/index.html?curriculum=ib&view=courses",
      "/question-bank",
    ];

const results = [];
let nextRequest = 0;

async function runWorker() {
  while (nextRequest < requestCount) {
    const requestIndex = nextRequest++;
    const route = routes[requestIndex % routes.length];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        cache: "no-store",
        headers: { "User-Agent": "MrFlynnIB reliability check" },
        redirect: "follow",
        signal: controller.signal,
      });
      const body = await response.text();
      let healthy = response.ok;
      if (route === "/api/health") {
        try {
          const payload = JSON.parse(body);
          healthy = healthy && payload.website === "operational" && payload.database === "operational";
        } catch {
          healthy = false;
        }
      }
      results.push({ route, status: response.status, durationMs: performance.now() - startedAt, healthy });
    } catch (error) {
      results.push({
        route,
        status: 0,
        durationMs: performance.now() - startedAt,
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function percentile(values, fraction) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)] || 0;
}

console.log(`Checking ${baseUrl} with ${Math.min(concurrency, requestCount)} concurrent clients (${requestCount} requests).`);
await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => runWorker()));

const durations = results.map((result) => result.durationMs);
const failures = results.filter((result) => !result.healthy);
const summary = {
  requests: results.length,
  passed: results.length - failures.length,
  failed: failures.length,
  p50Ms: Math.round(percentile(durations, 0.5)),
  p95Ms: Math.round(percentile(durations, 0.95)),
  p99Ms: Math.round(percentile(durations, 0.99)),
  slowestMs: Math.round(Math.max(...durations)),
};

console.table(summary);
for (const route of routes) {
  const routeResults = results.filter((result) => result.route === route);
  const routeDurations = routeResults.map((result) => result.durationMs);
  console.log(
    `${route}: ${routeResults.filter((result) => result.healthy).length}/${routeResults.length} passed, ` +
      `p50 ${Math.round(percentile(routeDurations, 0.5))} ms, p95 ${Math.round(percentile(routeDurations, 0.95))} ms`,
  );
}

if (failures.length) {
  console.error("Failures:", failures.slice(0, 10));
  process.exitCode = 1;
} else if (summary.p95Ms > maxP95Ms) {
  console.error(`The p95 response time (${summary.p95Ms} ms) exceeded the ${maxP95Ms} ms limit.`);
  process.exitCode = 1;
}
