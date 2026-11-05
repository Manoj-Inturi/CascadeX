
import { getSelectors, getDuplicateSelectors } from "./analyzer.js";
import { calculateSpecificity } from "./specificity.js";

// Get elements
const cssInput = document.getElementById("css-input");
const analyzeButton = document.getElementById("analyze-button");
const clearButton = document.getElementById("clear-button");
const themeToggle = document.getElementById("theme-toggle");
const charCount = document.getElementById("char-count");
const resultsSection = document.getElementById("results-section");
const resultsList = document.getElementById("results-list");
const analysisSummary = document.getElementById("analysis-summary");
const exportButton = document.getElementById("export-report");
const cssFile = document.getElementById("css-file");
const fileName = document.getElementById("file-name");

let latestReport = [];

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

// Character counter
cssInput.addEventListener("input", () => {
    charCount.textContent = `${cssInput.value.length} characters`;
});

// Clear editor
clearButton.addEventListener("click", () => {
    cssInput.value = "";
    charCount.textContent = "0 characters";
});

// Analyze CSS
analyzeButton.addEventListener("click", () => {
    const css = cssInput.value.trim();

    if (!css) {
        alert("Please enter some CSS code.");
        return;
    }

    const selectors = getSelectors(css);
    const duplicateSelectors = getDuplicateSelectors(css);

    resultsList.innerHTML = "";
    latestReport = [];

    if (selectors.length === 0) {
        alert("No CSS selectors found.");
        resultsSection.hidden = true;
        analysisSummary.hidden = true;
        exportButton.disabled = true;
        return;
    }

    const duplicateSet = new Set(duplicateSelectors);

    // Update summary
    document.getElementById("total-selectors").textContent = selectors.length;
    document.getElementById("total-duplicates").textContent = duplicateSet.size;
    document.getElementById("total-unique").textContent =
        new Set(selectors).size - duplicateSet.size;

    analysisSummary.hidden = false;
    resultsSection.hidden = false;

    // Create results
    selectors.forEach((selector) => {
        const isDuplicate = duplicateSet.has(selector);
        const specificity = calculateSpecificity(selector);
        const status = isDuplicate ? "Duplicate" : "Unique";

        latestReport.push({
            selector,
            specificity,
            status
        });

        const resultItem = document.createElement("div");
        resultItem.className = "result-item";

        const selectorText = document.createElement("span");
        selectorText.textContent = selector;

        const specificityText = document.createElement("span");
        specificityText.textContent = specificity;

        const statusText = document.createElement("span");
        statusText.textContent = status;
        statusText.className = isDuplicate ? "duplicate" : "unique";

        resultItem.append(
            selectorText,
            specificityText,
            statusText
        );

        resultsList.appendChild(resultItem);
    });

    exportButton.disabled = latestReport.length === 0;

    // Save history
    saveHistory(css, selectors.length, duplicateSet.size);
});

// Export analysis report
exportButton.addEventListener("click", () => {
    if (latestReport.length === 0) return;

    const report = latestReport.map((item, index) => {
        return `${index + 1}. ${item.selector}
Specificity: ${item.specificity}
Status: ${item.status}`;
    }).join("\n\n");

    const blob = new Blob([report], {
        type: "text/plain"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cascadex-report.txt";
    link.click();

    URL.revokeObjectURL(url);
});

// Save history
function saveHistory(css, total, duplicates) {
    const history = JSON.parse(localStorage.getItem("analysisHistory")) || [];

    history.unshift({
        date: new Date().toLocaleString(),
        total,
        duplicates,
        css
    });

    localStorage.setItem(
        "analysisHistory",
        JSON.stringify(history.slice(0, 10))
    );

    loadHistory();
}

// Load history
function loadHistory() {
    const historyList = document.getElementById("history-list");
    const history = JSON.parse(localStorage.getItem("analysisHistory")) || [];

    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML =
            '<p class="history-empty">No analysis history yet.</p>';
        return;
    }

    history.forEach((item) => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";

        const date = document.createElement("p");
        date.textContent = item.date;

        const details = document.createElement("p");
        details.textContent =
            `Selectors: ${item.total} | Duplicates: ${item.duplicates}`;

        const viewButton = document.createElement("button");
        viewButton.className = "secondary-button";
        viewButton.textContent = "View";

        viewButton.addEventListener("click", () => {
            cssInput.value = item.css;
            charCount.textContent = `${item.css.length} characters`;
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

// Load history on startup
loadHistory();

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
    };

    reader.onerror = () => {
        alert("Unable to read this file.");
    };

    reader.readAsText(file);
});