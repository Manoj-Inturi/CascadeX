
// Find selectors
function getSelectors(css) {
    const selectors = [];
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const regex = /([^{}]+)\s*\{/g;

    let match;

    while ((match = regex.exec(cleanCSS)) !== null) {
        const selector = match[1].trim();

        if (selector && !selector.startsWith("@")) {
            selectors.push(
                ...selector.split(",").map(item => item.trim())
            );
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

// Find CSS syntax warnings
function getCSSWarnings(css) {
    const warnings = [];
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");

    let openBraces = 0;

    for (const character of cleanCSS) {
        if (character === "{") openBraces++;
        if (character === "}") openBraces--;

        if (openBraces < 0) {
            warnings.push("Unexpected closing brace '}'.");
            openBraces = 0;
        }
    }

    if (openBraces > 0) {
        warnings.push("Missing closing brace '}'.");
    }

    const rules = cleanCSS.match(/[^{}]+\{[^{}]*\}/g) || [];

    rules.forEach((rule) => {
        const content = rule.substring(
            rule.indexOf("{") + 1,
            rule.lastIndexOf("}")
        ).trim();

        if (!content) {
            warnings.push("Empty CSS rule found.");
            return;
        }

        const declarations = content.split(";");

        declarations.forEach((declaration) => {
            const item = declaration.trim();

            if (item && !item.includes(":")) {
                warnings.push(
                    `Possible invalid declaration: "${item}".`
                );
            }
        });
    });

    return [...new Set(warnings)];
}

export {
    getSelectors,
    getDuplicateSelectors,
    getCSSWarnings
};
