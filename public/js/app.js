import {
    getSelectors,
    getDuplicateSelectors,
    getCSSIssues
} from "./analyzer.js";

// Get elements
const cssInput = document.getElementById("css-input");
const editorGutter = document.getElementById("editor-gutter");
const editorLineNumbers = document.getElementById("editor-line-numbers");
const cssHighlight = document.getElementById("css-highlight");
const cssHighlightCode = document.getElementById("css-highlight-code");
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
const generateCSSButton = document.getElementById("generate-css");
const generatedCSSPanel = document.getElementById("generated-css-panel");
const generatedCSSOutput = document.getElementById("generated-css-output");
const copyGeneratedCSSButton = document.getElementById("copy-generated-css");
const resetGeneratedCSSButton = document.getElementById("reset-generated-css");

let latestReport = [];
let originalCSS = "";
let selectedFixes = new Map();
let fixGroups = new Map();
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
    selectedFixes.clear();
    fixGroups.clear();
    generatedCSSPanel.hidden = true;
    generatedCSSOutput.value = "";
    generateCSSButton.disabled = true;
    const selectedCount = document.getElementById("selected-fix-count");
    if (selectedCount) selectedCount.textContent = "0 selected";
    resultsSearch.value = "";
    activeFilter = "all";
    updateActiveFilter();
}

// Update line numbers
function updateLineNumbers() {
    const lineCount = cssInput.value.split("\n").length;
    const fragment = document.createDocumentFragment();

    for (let line = 1; line <= lineCount; line++) {
        const number = document.createElement("span");
        number.textContent = line;
        fragment.appendChild(number);
    }

    editorLineNumbers.replaceChildren(fragment);
    editorGutter.scrollTop = cssInput.scrollTop;
}

// Highlight CSS
function highlightCSS(css) {
    const tokenPattern = /(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|!\s*important\b|@[a-zA-Z-][\w-]*|--[\w-]+|#[\w-]+|\.[\w-]+|::?[\w-]+|[a-zA-Z_-][\w-]*(?=\s*:)|[-+]?(?:\d*\.)?\d+(?:%|[a-zA-Z]+)?|[a-zA-Z_-][\w-]*(?=\s*\()|[{}()[\];:,])/gi;

    let match;
    let lastIndex = 0;
    let html = "";

    while ((match = tokenPattern.exec(css)) !== null) {
        html += escapeHTML(css.slice(lastIndex, match.index));

        const token = match[0];
        let tokenClass = "";

        if (token.startsWith("/*")) {
            tokenClass = "token-comment";
        } else if (token.startsWith("\"") || token.startsWith("'")) {
            tokenClass = "token-string";
        } else if (/^!\s*important$/i.test(token)) {
            tokenClass = "token-important";
        } else if (token.startsWith("@")) {
            tokenClass = "token-at-rule";
        } else if (token.startsWith("--")) {
            tokenClass = "token-variable";
        } else if (token.startsWith("#")) {
            tokenClass = "token-hash";
        } else if (token.startsWith(".")) {
            tokenClass = "token-class";
        } else if (token.startsWith(":") && token.length > 1) {
            tokenClass = "token-pseudo";
        } else if (/^[-+]?(?:\d*\.)?\d+(?:%|[a-zA-Z]+)?$/.test(token)) {
            tokenClass = "token-number";
        } else if (/^[{}()[\];:,]$/.test(token)) {
            tokenClass = "token-punctuation";
        } else if (/^[a-zA-Z_-][\w-]*$/.test(token)) {
            tokenClass = tokenPattern.lastIndex < css.length && /^\s*\(/.test(css.slice(tokenPattern.lastIndex))
                ? "token-function"
                : "token-property";
        }

        if (tokenClass) {
            html += `<span class="${tokenClass}">${escapeHTML(token)}</span>`;
        } else {
            html += escapeHTML(token);
        }

        lastIndex = tokenPattern.lastIndex;
    }

    html += escapeHTML(css.slice(lastIndex));
    return html;
}

// Escape editor text
function escapeHTML(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

// Update highlighted CSS
function updateCSSHighlight() {
    cssHighlightCode.innerHTML = highlightCSS(cssInput.value);
    syncEditorScroll();
}

// Sync editor scroll
function syncEditorScroll() {
    editorGutter.scrollTop = cssInput.scrollTop;
    cssHighlight.style.transform = `translate(${-cssInput.scrollLeft}px, ${-cssInput.scrollTop}px)`;
}

// Character counter
cssInput.addEventListener("input", () => {
    charCount.textContent = `${cssInput.value.length} characters`;
    updateLineNumbers();
    updateCSSHighlight();
    resetResults();
});

// Sync editor scroll
cssInput.addEventListener("scroll", syncEditorScroll);

// Clear editor
clearButton.addEventListener("click", () => {
    cssInput.value = "";
    charCount.textContent = "0 characters";
    updateLineNumbers();
    updateCSSHighlight();
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
        updateLineNumbers();
        updateCSSHighlight();
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

// Read CSS rule and declaration source ranges
function readCSSDeclarations(css) {
    const rules = [];
    let i = 0;
    let order = 0;

    while (i < css.length) {
        while (i < css.length && /\s/.test(css[i])) i++;
        if (i >= css.length) break;

        if (css.startsWith("/*", i)) {
            const end = css.indexOf("*/", i + 2);
            i = end === -1 ? css.length : end + 2;
            continue;
        }

        const preludeStart = i;
        let quote = "";
        let round = 0;
        let square = 0;

        while (i < css.length) {
            const ch = css[i];
            if (quote) {
                if (ch === quote && css[i - 1] !== "\\\\") quote = "";
            } else if (ch === "'" || ch === '"') {
                quote = ch;
            } else if (ch === "(") round++;
            else if (ch === ")") round--;
            else if (ch === "[") square++;
            else if (ch === "]") square--;
            else if (ch === "{" && round === 0 && square === 0) break;
            else if (ch === ";" && round === 0 && square === 0) break;
            i++;
        }

        if (css[i] !== "{") {
            i++;
            continue;
        }

        const selector = css.slice(preludeStart, i).trim();
        const bodyStart = i + 1;
        let depth = 1;
        quote = "";
        i++;

        while (i < css.length && depth > 0) {
            const ch = css[i];
            if (quote) {
                if (ch === quote && css[i - 1] !== "\\\\") quote = "";
            } else if (ch === "'" || ch === '"') {
                quote = ch;
            } else if (css.startsWith("/*", i)) {
                const end = css.indexOf("*/", i + 2);
                i = end === -1 ? css.length : end + 1;
            } else if (ch === "{") depth++;
            else if (ch === "}") depth--;
            i++;
        }

        const bodyEnd = depth === 0 ? i - 1 : css.length;
        const body = css.slice(bodyStart, bodyEnd);

        if (!selector.startsWith("@")) {
            let start = bodyStart;
            let local = 0;
            let parens = 0;
            let brackets = 0;
            let declarationQuote = "";

            while (local <= body.length) {
                const ch = body[local];

                if (declarationQuote) {
                    if (ch === declarationQuote && body[local - 1] !== "\\\\") declarationQuote = "";
                } else if (ch === "'" || ch === '"') {
                    declarationQuote = ch;
                } else if (ch === "(") parens++;
                else if (ch === ")") parens--;
                else if (ch === "[") brackets++;
                else if (ch === "]") brackets--;
                else if ((ch === ";" || local === body.length) && parens === 0 && brackets === 0) {
                    const rawStart = start;
                    const rawEnd = bodyStart + local;
                    const raw = css.slice(rawStart, rawEnd);
                    const colon = raw.indexOf(":");

                    if (colon !== -1) {
                        const property = raw.slice(0, colon).trim();
                        const valueRaw = raw.slice(colon + 1).trim();
                        const value = valueRaw.replace(/!\s*important\s*$/i, "").trim();

                        if (property && value && /^--[\w-]+$|^-?[a-zA-Z_][\w-]*$/.test(property)) {
                            rules.push({
                                selector,
                                property,
                                value,
                                important: /!\s*important\s*$/i.test(valueRaw),
                                start: rawStart,
                                end: rawEnd,
                                order: order++
                            });
                        }
                    }

                    start = bodyStart + local + 1;
                }

                local++;
            }
        }
    }

    return rules;
}

// Build selectable choices for supported warnings
function getFixGroup(issue, css) {
    if (issue.severity !== "warning") return null;

    const declarations = readCSSDeclarations(css);
    const selectorText = issue.selector || "";
    let candidates = [];

    if (issue.type === "duplicate-declaration") {
        const property = issue.description.match(/^\s*([-\w]+)\s*:/)?.[1];
        if (!property) return null;

        candidates = declarations.filter(item =>
            item.selector === selectorText && item.property === property
        );
    } else if (issue.type === "repeated-selector") {
        const properties = [...issue.description.matchAll(/([-\w]+):\s*([^|.]+?)(?=\s*\||$)/g)]
            .map(match => ({ property: match[1], values: match[2].split("→").map(value => value.trim()) }));

        properties.forEach(({ property, values }) => {
            const matches = declarations.filter(item =>
                item.selector === selectorText &&
                item.property === property &&
                values.includes(item.value)
            );
            if (matches.length > 1) {
                candidates.push(...matches);
            }
        });

        if (candidates.length === 0) {
            const matchingRules = declarations.filter(item => item.selector === selectorText);
            const propertyMap = new Map();
            matchingRules.forEach(item => {
                if (!propertyMap.has(item.property)) propertyMap.set(item.property, []);
                propertyMap.get(item.property).push(item);
            });
            propertyMap.forEach(items => {
                if (new Set(items.map(item => item.value)).size > 1) candidates.push(...items);
            });
        }
    } else if (issue.type === "cascade-conflict") {
        const property = issue.description.match(/Property:\s*([-\w]+)/i)?.[1];
        const values = issue.description.match(/Values:\s*(.*?)\./i)?.[1]
            ?.split("/")
            .map(value => value.trim()) || [];
        const selectors = selectorText.split(" / ").map(value => value.trim());

        candidates = declarations.filter(item =>
            selectors.includes(item.selector) &&
            item.property === property &&
            values.includes(item.value)
        );
    }

    const unique = [...new Map(candidates.map(item => [`${item.start}:${item.end}`, item])).values()];
    if (unique.length < 2) return null;

    return {
        id: `${issue.type}:${issue.selector}:${issue.description}`,
        title: issue.title,
        declarations: unique
    };
}

// Render choices inside an issue
function renderFixChoices(issue, details) {
    const group = getFixGroup(issue, originalCSS);
    if (!group) return;

    fixGroups.set(group.id, group);

    const wrapper = document.createElement("div");
    wrapper.className = "fix-choice-panel";

    const heading = document.createElement("strong");
    heading.className = "fix-choice-heading";
    heading.textContent = "Choose the declaration to keep";

    const hint = document.createElement("p");
    hint.className = "fix-choice-hint";
    hint.textContent = "No selection means the original CSS stays unchanged.";

    const options = document.createElement("div");
    options.className = "fix-choice-options";

    group.declarations.forEach((declaration, optionIndex) => {
        const label = document.createElement("label");
        label.className = "fix-choice-option";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `fix-${group.id}`;
        radio.value = String(optionIndex);
        radio.checked = selectedFixes.get(group.id) === optionIndex;

        const code = document.createElement("code");
        code.textContent = `${declaration.selector} { ${declaration.property}: ${declaration.value}${declaration.important ? " !important" : ""}; }`;

        radio.addEventListener("change", () => {
            selectedFixes.set(group.id, optionIndex);
            updateFixSelectionCount();
        });

        label.append(radio, code);
        options.appendChild(label);
    });

    wrapper.append(heading, hint, options);
    details.appendChild(wrapper);
}

// Count selected fixes
function updateFixSelectionCount() {
    const count = document.getElementById("selected-fix-count");
    if (count) count.textContent = `${selectedFixes.size} selected`;
    if (generateCSSButton) generateCSSButton.disabled = selectedFixes.size === 0;
}

// Generate complete CSS with selected declarations retained
function generateUpdatedCSS() {
    if (selectedFixes.size === 0) return;

    const removals = [];

    selectedFixes.forEach((selectedIndex, groupId) => {
        const group = fixGroups.get(groupId);
        if (!group) return;

        group.declarations.forEach((declaration, index) => {
            if (index !== selectedIndex) {
                removals.push({ start: declaration.start, end: declaration.end });
            }
        });
    });

    const uniqueRemovals = [...new Map(
        removals.map(item => [`${item.start}:${item.end}`, item])
    ).values()].sort((a, b) => b.start - a.start);

    let output = originalCSS;
    uniqueRemovals.forEach(range => {
        output = output.slice(0, range.start) + output.slice(range.end);
    });

    generatedCSSOutput.value = output;
    generatedCSSPanel.hidden = false;
    generatedCSSPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Copy generated CSS
copyGeneratedCSSButton.addEventListener("click", async () => {
    if (!generatedCSSOutput.value) return;

    try {
        await navigator.clipboard.writeText(generatedCSSOutput.value);
        copyGeneratedCSSButton.textContent = "Copied!";
        setTimeout(() => {
            copyGeneratedCSSButton.textContent = "Copy complete CSS";
        }, 1600);
    } catch {
        generatedCSSOutput.focus();
        generatedCSSOutput.select();
        document.execCommand("copy");
        copyGeneratedCSSButton.textContent = "Copied!";
    }
});

// Reset generated output
resetGeneratedCSSButton.addEventListener("click", () => {
    generatedCSSPanel.hidden = true;
    generatedCSSOutput.value = "";
});

generateCSSButton.addEventListener("click", generateUpdatedCSS);

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
    renderFixChoices(issue, details);

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

    originalCSS = cssInput.value;
    selectedFixes.clear();
    fixGroups.clear();
    generatedCSSPanel.hidden = true;
    generatedCSSOutput.value = "";

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
    updateFixSelectionCount();
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
            updateLineNumbers();
            updateCSSHighlight();
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

// Load editor
updateLineNumbers();
updateCSSHighlight();
loadHistory();
