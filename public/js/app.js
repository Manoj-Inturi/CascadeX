import {
    getSelectors,
    getDuplicateSelectors,
    getCSSIssues
} from "./analyzer.js";

// Get elements
const cssInput = document.getElementById("css-input");
const analyzeButton = document.getElementById("analyze-button");
const clearButton = document.getElementById("clear-button");
const themeToggle = document.getElementById("theme-toggle");
const charCount = document.getElementById("char-count");
const resultsSection = document.getElementById("results-section");
const resultsList = document.getElementById("results-list");
const resultsPlaceholder = document.getElementById("results-placeholder");
const analysisSummary = document.getElementById("analysis-summary");
const exportButton = document.getElementById("export-report");
const cssFile = document.getElementById("css-file");
const fileName = document.getElementById("file-name");
const resultsSearch = document.getElementById("results-search");
const resultsSort = document.getElementById("results-sort");
const resultsVisibleCount = document.getElementById("results-visible-count");
const resultCountAll = document.getElementById("result-count-all");
const resultCountError = document.getElementById("result-count-error");
const resultCountWarning = document.getElementById("result-count-warning");
const resultCountInfo = document.getElementById("result-count-info");
const resultFilterButtons = document.querySelectorAll(".result-count-card");

let latestReport = [];
let activeFilter = "all";

// Load theme
const savedTheme = localStorage.getItem("theme") || "light";

if (savedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
}

// Theme button
themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");

    if (currentTheme === "dark") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("theme", "light");
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("theme", "dark");
    }
});

// Reset results
function resetResults() {
    latestReport = [];
    exportButton.disabled = true;
    resultsSection.hidden = true;
    analysisSummary.hidden = true;
    resultsList.innerHTML = "";
    resultsSearch.value = "";
    activeFilter = "all";
    updateActiveFilter();
}

// Character counter
cssInput.addEventListener("input", () => {
    charCount.textContent = `${cssInput.value.length} characters`;
    resetResults();
});

// Clear editor
clearButton.addEventListener("click", () => {
    cssInput.value = "";
    charCount.textContent = "0 characters";
    fileName.textContent = "No file selected";
    cssFile.value = "";
    resetResults();
});

// Upload CSS file
cssFile.addEventListener("change", () => {
    const file = cssFile.files[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".css")) {
        alert("Please select a CSS file.");
        cssFile.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        cssInput.value = reader.result;
        charCount.textContent = `${cssInput.value.length} characters`;
        fileName.textContent = file.name;
        resetResults();
    };

    reader.onerror = () => {
        alert("Unable to read this file.");
    };

    reader.readAsText(file);
});

// Get issue category
function getIssueCategory(issue) {
    if (issue.severity === "error") return "error";
    if (issue.severity === "info") return "info";
    return "warning";
}

// Update filter state
function updateActiveFilter() {
    resultFilterButtons.forEach(button => {
        const isActive = button.dataset.filter === activeFilter;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

// Create issue card
function createIssueCard(issue, index) {
    const category = getIssueCategory(issue);
    const card = document.createElement("article");
    card.className = `result-card severity-${category}`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "result-card-toggle";
    toggle.setAttribute("aria-expanded", "false");

    const copy = document.createElement("span");
    copy.className = "result-card-copy";

    const title = document.createElement("strong");
    title.className = "result-card-title";
    title.textContent = issue.title || "CSS issue";

    const selector = document.createElement("span");
    selector.className = "result-card-selector";
    selector.textContent = issue.selector || "Stylesheet-wide issue";

    copy.append(title, selector);

    const meta = document.createElement("span");
    meta.className = "result-card-meta";

    const badge = document.createElement("span");
    badge.className = `severity-badge badge-${category}`;
    badge.textContent = category;

    const arrow = document.createElement("span");
    arrow.className = "result-card-arrow";
    arrow.textContent = "⌄";
    arrow.setAttribute("aria-hidden", "true");

    meta.append(badge, arrow);
    toggle.append(copy, meta);

    const details = document.createElement("div");
    details.className = "result-card-details";
    details.hidden = true;

    const description = document.createElement("p");
    description.textContent = issue.description || "No additional explanation available.";

    const type = document.createElement("span");
    type.className = "result-card-type";
    type.textContent = (issue.type || "css-issue").replaceAll("-", " ");

    details.append(description, type);

    toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        details.hidden = expanded;
        card.classList.toggle("expanded", !expanded);
    });

    card.append(toggle, details);
    card.dataset.index = String(index);

    return card;
}

// Render results
function renderResults() {
    const query = resultsSearch.value.trim().toLowerCase();
    const severityOrder = { error: 0, warning: 1, info: 2 };

    let filteredIssues = latestReport.filter(issue => {
        const category = getIssueCategory(issue);
        const matchesFilter = activeFilter === "all" || category === activeFilter;
        const searchableText = [
            issue.title,
            issue.selector,
            issue.description,
            issue.type
        ].join(" ").toLowerCase();

        return matchesFilter && searchableText.includes(query);
    });

    if (resultsSort.value === "selector") {
        filteredIssues.sort((a, b) =>
            (a.selector || "").localeCompare(b.selector || "")
        );
    } else if (resultsSort.value === "title") {
        filteredIssues.sort((a, b) =>
            (a.title || "").localeCompare(b.title || "")
        );
    } else {
        filteredIssues.sort((a, b) =>
            severityOrder[getIssueCategory(a)] - severityOrder[getIssueCategory(b)]
        );
    }

    resultsList.innerHTML = "";
    resultsVisibleCount.textContent = `${filteredIssues.length} ${filteredIssues.length === 1 ? "issue" : "issues"}`;

    resultsPlaceholder.hidden = filteredIssues.length !== 0;
    resultsList.hidden = filteredIssues.length === 0;

    if (filteredIssues.length === 0) return;

    const groups = [
        { key: "error", title: "Errors" },
        { key: "warning", title: "Warnings" },
        { key: "info", title: "Information" }
    ];

    groups.forEach(group => {
        const groupIssues = filteredIssues.filter(
            issue => getIssueCategory(issue) === group.key
        );

        if (groupIssues.length === 0) return;

        const section = document.createElement("section");
        section.className = `result-group group-${group.key}`;

        const heading = document.createElement("div");
        heading.className = "result-group-heading";

        const headingTitle = document.createElement("h3");
        headingTitle.textContent = group.title;

        const count = document.createElement("span");
        count.textContent = String(groupIssues.length);

        heading.append(headingTitle, count);
        section.appendChild(heading);

        groupIssues.forEach(issue => {
            section.appendChild(createIssueCard(issue, latestReport.indexOf(issue)));
        });

        resultsList.appendChild(section);
    });
}

// Analyze CSS
analyzeButton.addEventListener("click", () => {
    const css = cssInput.value.trim();

    if (!css) {
        alert("Please enter some CSS code.");
        return;
    }

    const selectors = getSelectors(css);
    const duplicates = getDuplicateSelectors(css);
    const issues = getCSSIssues(css);

    if (selectors.length === 0 && issues.length === 0) {
        alert("No CSS selectors found.");
        resetResults();
        return;
    }

    latestReport = issues;
    activeFilter = "all";
    resultsSearch.value = "";
    resultsSort.value = "severity";

    const duplicateSet = new Set(duplicates);
    const uniqueCount = new Set(selectors).size;

    document.getElementById("total-selectors").textContent = selectors.length;
    document.getElementById("total-duplicates").textContent = duplicateSet.size;
    document.getElementById("total-unique").textContent = uniqueCount;

    const errorCount = issues.filter(issue => getIssueCategory(issue) === "error").length;
    const warningCount = issues.filter(issue => getIssueCategory(issue) === "warning").length;
    const infoCount = issues.filter(issue => getIssueCategory(issue) === "info").length;

    resultCountAll.textContent = issues.length;
    resultCountError.textContent = errorCount;
    resultCountWarning.textContent = warningCount;
    resultCountInfo.textContent = infoCount;

    analysisSummary.hidden = false;
    resultsSection.hidden = false;
    exportButton.disabled = issues.length === 0;

    updateActiveFilter();
    renderResults();
    saveHistory(css, selectors.length, duplicateSet.size);
});

// Change result filter
resultFilterButtons.forEach(button => {
    button.addEventListener("click", () => {
        activeFilter = button.dataset.filter;
        updateActiveFilter();
        renderResults();
    });
});

// Search results
resultsSearch.addEventListener("input", renderResults);

// Sort results
resultsSort.addEventListener("change", renderResults);

// Export report
exportButton.addEventListener("click", () => {
    if (latestReport.length === 0) return;

    const report = latestReport.map((item, index) => {
        return `${index + 1}. ${item.title}
Selector: ${item.selector || "Not available"}
Severity: ${item.severity}
Explanation: ${item.description}`;
    }).join("\n\n");

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cascadex-report.txt";
    link.click();

    URL.revokeObjectURL(url);
});

// Save history
function saveHistory(css, total, duplicates) {
    const history = JSON.parse(localStorage.getItem("analysisHistory") || "[]");

    history.unshift({
        date: new Date().toLocaleString(),
        total,
        duplicates,
        css
    });

    localStorage.setItem("analysisHistory", JSON.stringify(history.slice(0, 10)));
    loadHistory();
}

// Load history
function loadHistory() {
    const historyList = document.getElementById("history-list");
    const history = JSON.parse(localStorage.getItem("analysisHistory") || "[]");

    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">No analysis history yet.</p>';
        return;
    }

    history.forEach(item => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";

        const date = document.createElement("p");
        date.textContent = item.date;

        const details = document.createElement("p");
        details.textContent = `Selectors: ${item.total} | Duplicates: ${item.duplicates}`;

        const viewButton = document.createElement("button");
        viewButton.className = "secondary-button";
        viewButton.textContent = "View";

        viewButton.addEventListener("click", () => {
            cssInput.value = item.css;
            charCount.textContent = `${item.css.length} characters`;
            fileName.textContent = "History CSS loaded";
            resetResults();
        });

        historyItem.append(date, details, viewButton);
        historyList.appendChild(historyItem);
    });
}

// Clear history
document.getElementById("clear-history").addEventListener("click", () => {
    localStorage.removeItem("analysisHistory");
    loadHistory();
});

// Load history
loadHistory();
