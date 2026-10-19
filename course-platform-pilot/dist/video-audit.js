(() => {
  const audit = window.MR_FLYNN_VIDEO_AUDIT;
  const libraryId = "775873";
  const courseOrder = ["AA SL", "AA HL", "AI SL", "AI HL"];
  const statusLabels = {
    exact_match: "Exact match",
    verified_equivalent: "Verified equivalent",
    needs_review: "Review",
    missing_from_preview: "Missing",
  };

  const formatDuration = (seconds) => {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = Math.floor(value % 60);
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const codeFrom = (title) => (String(title).match(/^(\d+(?:\.\d+){0,2})\b/) || [])[1] || "";
  const topicFrom = (section) => String(section || "").replace(/^Topic\s+/i, "");

  const rows = audit?.placements || [];
  const statusCounts = Object.fromEntries(Object.keys(statusLabels).map((status) => [status, rows.filter((row) => row.auditStatus === status).length]));
  const presentRows = rows.filter((row) => row.previewPresent && row.videoId);
  const uniqueIds = new Set(presentRows.map((row) => row.videoId));

  document.querySelector("#updated").textContent = `Audit generated ${new Date(audit.generatedAt).toLocaleString()}`;
  document.querySelector("#summary").innerHTML = [
    [rows.length, "Teachable video placements", ""],
    [presentRows.length, "Loaded in this preview", ""],
    [statusCounts.exact_match + statusCounts.verified_equivalent, "Matched by title + duration", ""],
    [statusCounts.needs_review, "Placements still to review", "review"],
    [statusCounts.missing_from_preview, "Missing from this preview", "missing"],
  ].map(([number, label, kind]) => `<article class="summary-card ${kind}"><strong>${number}</strong><span>${label}</span></article>`).join("");

  document.querySelector("#course-summary").innerHTML = courseOrder.map((course) => {
    const courseRows = rows.filter((row) => row.course === course);
    const review = courseRows.filter((row) => row.auditStatus === "needs_review").length;
    const missing = courseRows.filter((row) => row.auditStatus === "missing_from_preview").length;
    const lessons = courseRows.filter((row) => row.contentType === "Course lesson");
    const pastPapers = courseRows.filter((row) => row.contentType === "Past-paper solution");
    return `<article class="course-card"><h3>${course}</h3><p><b>${lessons.filter((row) => row.previewPresent).length}/${lessons.length}</b> course lessons</p><p><b>${pastPapers.filter((row) => row.previewPresent).length}/${pastPapers.length}</b> past-paper solutions</p><p><b>${review}</b> review · <b>${missing}</b> missing</p></article>`;
  }).join("");

  const courseFilter = document.querySelector("#course-filter");
  for (const course of courseOrder) courseFilter.insertAdjacentHTML("beforeend", `<option value="${course}">${course}</option>`);
  const search = document.querySelector("#search");
  const contentFilter = document.querySelector("#content-filter");
  const statusFilter = document.querySelector("#status-filter");
  const tbody = document.querySelector("#audit-rows");
  const resultCount = document.querySelector("#result-count");

  function renderRows() {
    const query = search.value.trim().toLowerCase();
    const course = courseFilter.value;
    const content = contentFilter.value;
    const status = statusFilter.value;
    const visible = rows.filter((row) => {
      if (course !== "all" && row.course !== course) return false;
      if (content !== "all" && row.contentType !== content) return false;
      if (status !== "all" && row.auditStatus !== status) return false;
      if (!query) return true;
      return [row.contentType, row.course, row.section, row.expectedTitle, row.candidateTitle, row.candidateCollection, row.videoId, row.suggestedBunnyTitle].join(" ").toLowerCase().includes(query);
    });
    resultCount.textContent = visible.length;
    tbody.innerHTML = visible.map((row, index) => {
      const delta = Number(row.durationDeltaSeconds) || 0;
      const deltaText = !row.previewPresent ? "—" : delta === 0 ? "Same" : `${delta > 0 ? "+" : ""}${delta}s`;
      const bunnyTitle = row.candidateTitle || row.suggestedBunnyTitle || "No video selected";
      const bunnyCollection = row.candidateCollection || row.suggestedCollection || "";
      const bunnyId = row.videoId || row.suggestedVideoId || "";
      const itemCode = codeFrom(row.expectedTitle);
      return `<tr>
        <td><span class="pill ${row.auditStatus}">${statusLabels[row.auditStatus]}</span></td>
        <td><strong>${esc(row.contentType)}</strong></td>
        <td><strong>${esc(row.course)}</strong><div class="subtext">${esc(topicFrom(row.section))}</div></td>
        <td class="lesson-title">${esc(row.expectedTitle)}<div class="subtext">${itemCode ? `Lesson ${esc(itemCode)}` : esc(row.section)}</div></td>
        <td class="duration">${row.expectedSeconds ? formatDuration(row.expectedSeconds) : "—"}</td>
        <td class="video-title">${esc(bunnyTitle)}<div class="subtext">${esc(bunnyCollection)}<br>${esc(bunnyId)}</div></td>
        <td class="duration">${row.previewPresent ? formatDuration(row.candidateSeconds) : "—"}</td>
        <td class="duration ${row.previewPresent && Math.abs(delta) <= 1 ? "delta-good" : "delta-bad"}">${deltaText}</td>
        <td><button class="check-button" type="button" data-index="${rows.indexOf(row)}" ${row.previewPresent && row.videoId ? "" : "disabled"}>${row.previewPresent ? "Play & compare" : "Not on preview"}</button></td>
      </tr>`;
    }).join("");
  }

  search.addEventListener("input", renderRows);
  contentFilter.addEventListener("change", renderRows);
  courseFilter.addEventListener("change", renderRows);
  statusFilter.addEventListener("change", renderRows);

  const dialog = document.querySelector("#player-dialog");
  const player = document.querySelector("#audit-player");
  tbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    const row = rows[Number(button.dataset.index)];
    document.querySelector("#dialog-title").textContent = `${row.course} · ${row.expectedTitle}`;
    document.querySelector("#dialog-meta").textContent = `Teachable ${formatDuration(row.expectedSeconds)} · Bunny ${formatDuration(row.candidateSeconds)} · ${statusLabels[row.auditStatus]}`;
    document.querySelector("#teachable-link").href = row.teachableUrl;
    player.src = `https://iframe.mediadelivery.net/embed/${libraryId}/${row.videoId}?autoplay=false&preload=true`;
    dialog.showModal();
  });
  const closeDialog = () => { player.src = "about:blank"; dialog.close(); };
  document.querySelector("#close-dialog").addEventListener("click", closeDialog);
  document.querySelector("#close-dialog-bottom").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  renderRows();
})();
