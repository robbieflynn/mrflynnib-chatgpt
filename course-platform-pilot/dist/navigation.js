// Set curriculum-specific destinations before the libraries or account request load.
// Route context wins over any previous IB preferences held by the shared login.
(() => {
  const query = new URLSearchParams(window.location.search);
  const igcse = query.get("curriculum") === "igcse" || query.get("course") === "igcse";
  if (!igcse) return;
  const destinations = {
    brandLearningHomeLink: "/igcse/account",
    primaryLearningHomeLink: "/igcse/account",
    learningHomeLink: "/igcse/account",
    siteCoursesLink: "/learn/index.html?curriculum=igcse&course=igcse",
    siteQuestionBankLink: "/igcse/question-bank",
    siteSchoolsLink: "/igcse/schools",
    questionBankLink: "/igcse/question-bank",
    assignmentsLink: "/igcse/assignments",
    accountSettingsLink: "/igcse/account/settings",
    accessLink: "/igcse/account/access",
    manageAccessLink: "/igcse/account/access",
    plusUpgradeLink: "/igcse/account/access",
  };
  for (const [id, href] of Object.entries(destinations)) {
    const link = document.getElementById(id);
    if (link) link.href = href;
  }
})();
