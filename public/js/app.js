
import { getSelectors, getDuplicateSelectors } from "./analyzer.js";
import { calculateSpecificity } from "./specificity.js";

// Theme button
const themeButton = document.getElementById("theme-toggle");

// Load theme
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeButton.textContent = savedTheme === "dark" ? "Light mode" : "Dark mode";
}

// Change theme
themeButton.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    if (newTheme === "light") {
        document.documentElement.removeAttribute("data-theme");
    } else {
        document.documentElement.setAttribute("data-theme", newTheme);
    }

    localStorage.setItem("theme", newTheme);
    themeButton.textContent = newTheme === "dark" ? "Light mode" : "Dark mode";
});

// CSS editor
const cssInput = document.getElementById("css-input");
const characterCount = document.getElementById("character-count");
const clearButton = document.getElementById("clear-css");

// Update count
cssInput.addEventListener("input", () => {
    characterCount.textContent = `${cssInput.value.length} characters`;
});

// Clear editor
clearButton.addEventListener("click", () => {
    cssInput.value = "";
    characterCount.textContent = "0 characters";
    cssFile.value = "";
    fileName.textContent = "No file selected";
    resultsList.innerHTML = "";
    resultsPlaceholder.style.display = "block";
    resultsPlaceholder.querySelector("h3").textContent = "No results yet";
    resultsPlaceholder.querySelector("p").textContent =
        "Paste your CSS and click Analyze CSS to begin.";
    analysisSummary.hidden = true;
});

// File upload
const cssFile = document.getElementById("css-file");
const fileName = document.getElementById("file-name");

cssFile.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.name.toLowerCase().endsWith(".css")) {
        alert("Please select a CSS file");
        cssFile.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        cssInput.value = e.target.result;
        characterCount.textContent = `${cssInput.value.length} characters`;
        fileName.textContent = file.name;
    };

    reader.readAsText(file);
});

// Analysis elements
const analyzeButton = document.getElementById("analyze-css");
const resultsPlaceholder = document.getElementById("results-placeholder");
const resultsList = document.getElementById("results-list");
const analysisSummary = document.getElementById("analysis-summary");

// History elements
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");

// Load history
function loadHistory() {
    const history = JSON.parse(localStorage.getItem("analysisHistory")) || [];

    historyList.innerHTML = "";

    if (history.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "history-empty";
        emptyMessage.textContent = "No analysis history yet.";
        historyList.appendChild(emptyMessage);
        return;
    }

    history.forEach((entry) => {
        const item = document.createElement("div");
        const date = document.createElement("p");
        const details = document.createElement("p");

        item.className = "history-item";

        date.textContent = entry.date;
        details.textContent =
            `${entry.total} selectors, ${entry.duplicates} duplicates`;

        item.appendChild(date);
        item.appendChild(details);

        historyList.appendChild(item);
    });
}

// Save history
function saveHistory(total, duplicates) {
    const history = JSON.parse(localStorage.getItem("analysisHistory")) || [];

    history.unshift({
        date: new Date().toLocaleString(),
        total: total,
        duplicates: duplicates
    });

    localStorage.setItem(
        "analysisHistory",
        JSON.stringify(history.slice(0, 10))
    );

    loadHistory();
}

// Clear history
clearHistoryButton.addEventListener("click", () => {
    localStorage.removeItem("analysisHistory");
    loadHistory();
});

// Analyze CSS
analyzeButton.addEventListener("click", () => {
    const css = cssInput.value.trim();

    if (!css) {
        alert("Please enter some CSS");
        return;
    }

    const selectors = getSelectors(css);
    const duplicates = getDuplicateSelectors(css);

    resultsList.innerHTML = "";

    if (selectors.length === 0) {
        resultsPlaceholder.style.display = "block";
        resultsPlaceholder.querySelector("h3").textContent = "No selectors found";
        resultsPlaceholder.querySelector("p").textContent = "Try entering valid CSS.";
        analysisSummary.hidden = true;
        return;
    }

    resultsPlaceholder.style.display = "none";

    // Update summary
    const duplicateCount = new Set(duplicates).size;
    const uniqueCount = new Set(selectors).size - duplicateCount;

    analysisSummary.hidden = false;

    document.getElementById("total-selectors").textContent = selectors.length;
    document.getElementById("total-duplicates").textContent = duplicateCount;
    document.getElementById("total-unique").textContent = uniqueCount;

    // Save history
    saveHistory(selectors.length, duplicateCount);

    // Result heading
    const heading = document.createElement("div");
    heading.className = "result-header";

    const selectorHeading = document.createElement("span");
    const specificityHeading = document.createElement("span");
    const statusHeading = document.createElement("span");

    selectorHeading.textContent = "Selector";
    specificityHeading.textContent = "Specificity";
    statusHeading.textContent = "Status";

    heading.appendChild(selectorHeading);
    heading.appendChild(specificityHeading);
    heading.appendChild(statusHeading);

    resultsList.appendChild(heading);

    // Show results
    selectors.forEach((selector) => {
        const item = document.createElement("div");
        const name = document.createElement("span");
        const score = document.createElement("span");
        const status = document.createElement("span");

        const values = calculateSpecificity(selector)
            .split(",")
            .map(value => value.trim());

        item.className = "result-item";

        name.textContent = selector;

        score.textContent =
            `${values[0]} IDs, ${values[1]} classes, ${values[2]} elements`;

        if (duplicates.includes(selector)) {
            status.textContent = "Duplicate";
            status.className = "duplicate";
        } else {
            status.textContent = "Unique";
            status.className = "unique";
        }

        item.appendChild(name);
        item.appendChild(score);
        item.appendChild(status);

        resultsList.appendChild(item);
    });
});

// Show saved history
loadHistory();
