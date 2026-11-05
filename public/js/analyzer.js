// Find selectors
function getSelectors(css) {
    const selectors = [];
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const regex = /([^{}]+)\s*\{/g;

    let match;

    while ((match = regex.exec(cleanCSS)) !== null) {
        const selector = match[1].trim();

        if (selector && !selector.startsWith("@")) {
            selectors.push(...selector.split(",").map(item => item.trim()));
        }
    }

    return selectors;
}

// Find duplicates
function getDuplicateSelectors(css) {
    const selectors = getSelectors(css);

    return selectors.filter((selector, index) => {
        return selectors.indexOf(selector) !== index;
    });
}

export { getSelectors, getDuplicateSelectors };