// Find selectors
function getSelectors(css) {
    const selectors = [];
    const regex = /([^{}]+)\s*\{/g;

    let match;

    while ((match = regex.exec(css)) !== null) {
        const selector = match[1].trim();

        if (
            selector &&
            !selector.startsWith("@") &&
            !selector.startsWith("/*")
        ) {
            selectors.push(...selector.split(",").map(item => item.trim()));
        }
    }

    return selectors;
}

export { getSelectors };