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