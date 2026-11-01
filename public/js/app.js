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
});
// File upload
const cssFile = document.getElementById("css-file");
const fileName = document.getElementById("file-name");

cssFile.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    if (!file.name.endsWith(".css")) {
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