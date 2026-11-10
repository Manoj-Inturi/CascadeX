// Remove comments
function removeComments(css) {
    let result = "";
    let quote = "";

    for (let i = 0; i < css.length; i++) {
        const character = css[i];

        if (quote) {
            result += character;
            if (character === quote && css[i - 1] !== "\\") quote = "";
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            result += character;
            continue;
        }

        if (character === "/" && css[i + 1] === "*") {
            i += 2;

            while (
                i < css.length &&
                !(css[i] === "*" && css[i + 1] === "/")
            ) {
                result += css[i] === "\n" ? "\n" : " ";
                i++;
            }

            i++;
            continue;
        }

        result += character;
    }

    return result;
}

// Split selectors
function splitSelectors(selector) {
    const selectors = [];
    let current = "";
    let roundDepth = 0;
    let squareDepth = 0;
    let quote = "";

    for (let i = 0; i < selector.length; i++) {
        const character = selector[i];

        if (quote) {
            current += character;

            if (character === quote && selector[i - 1] !== "\\") {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            current += character;
            continue;
        }

        if (character === "(") roundDepth++;
        if (character === ")") roundDepth--;
        if (character === "[") squareDepth++;
        if (character === "]") squareDepth--;

        if (character === "," && roundDepth === 0 && squareDepth === 0) {
            if (current.trim()) selectors.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) selectors.push(current.trim());

    return selectors;
}

// Split values
function splitTopLevel(text, delimiter) {
    const parts = [];
    let current = "";
    let roundDepth = 0;
    let squareDepth = 0;
    let curlyDepth = 0;
    let quote = "";

    for (let i = 0; i < text.length; i++) {
        const character = text[i];

        if (quote) {
            current += character;

            if (character === quote && text[i - 1] !== "\\") {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            current += character;
            continue;
        }

        if (character === "(") roundDepth++;
        if (character === ")") roundDepth--;
        if (character === "[") squareDepth++;
        if (character === "]") squareDepth--;
        if (character === "{") curlyDepth++;
        if (character === "}") curlyDepth--;

        if (
            character === delimiter &&
            roundDepth === 0 &&
            squareDepth === 0 &&
            curlyDepth === 0
        ) {
            parts.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) parts.push(current.trim());

    return parts;
}

// Find closing brace
function findClosingBrace(css, openingIndex) {
    let depth = 1;
    let quote = "";

    for (let i = openingIndex + 1; i < css.length; i++) {
        const character = css[i];

        if (quote) {
            if (character === quote && css[i - 1] !== "\\") {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "{") depth++;
        if (character === "}") depth--;

        if (depth === 0) return i;
    }

    return -1;
}

// Read declarations
function parseDeclarations(content, warnings, selector) {
    const declarationList = [];
    const propertyMap = new Map();
    const declarations = {};
    const items = splitTopLevel(content, ";");

    items.forEach((item, index) => {
        const declarationText = item.trim();

        if (!declarationText) return;

        if (
            declarationText.includes("{") ||
            declarationText.includes("}")
        ) {
            return;
        }

        const colonIndex = declarationText.indexOf(":");

        if (colonIndex === -1) {
            warnings.push(
                `Possible invalid declaration in "${selector}": "${declarationText}".`
            );
            return;
        }

        const property = declarationText.slice(0, colonIndex).trim();
        let value = declarationText.slice(colonIndex + 1).trim();

        if (!property || !value) {
            warnings.push(
                `Incomplete declaration in "${selector}": "${declarationText}".`
            );
            return;
        }

        if (!/^--[\w-]+$|^-?[a-zA-Z_][\w-]*$/.test(property)) {
            warnings.push(
                `Possible invalid CSS property in "${selector}": "${property}".`
            );
            return;
        }

        const important = /!\s*important\s*$/i.test(value);

        value = value.replace(/!\s*important\s*$/i, "").trim();

        if (!value) {
            warnings.push(
                `Missing value for "${property}" in "${selector}".`
            );
            return;
        }

        const declaration = {
            property,
            value,
            important,
            order: index
        };

        declarationList.push(declaration);

        if (!propertyMap.has(property)) {
            propertyMap.set(property, []);
        }

        propertyMap.get(property).push(declaration);

        const previous = declarations[property];

        if (
            !previous ||
            (important && !previous.important) ||
            important === previous.important
        ) {
            declarations[property] = {
                value,
                important
            };
        }
    });

    const duplicateDeclarations = [];

    propertyMap.forEach((items, property) => {
        const values = [
            ...new Set(items.map(item => item.value))
        ];

        if (items.length > 1 && values.length > 1) {
            duplicateDeclarations.push({
                property,
                declarations: items
            });
        }
    });

    return {
        declarations,
        declarationList,
        duplicateDeclarations
    };
}

// Parse stylesheet
function parseStylesheet(css) {
    const cleanCSS = removeComments(String(css ?? ""));
    const rules = [];
    const warnings = [];

    const groupingRules = new Set([
        "media",
        "supports",
        "container",
        "layer",
        "scope",
        "starting-style",
        "document"
    ]);

    function parseBlocks(text, context = []) {
        let position = 0;

        while (position < text.length) {
            while (
                position < text.length &&
                (/[\s;]/.test(text[position]))
            ) {
                position++;
            }

            if (position >= text.length) break;

            if (text[position] === "}") {
                warnings.push("Unexpected closing brace '}'.");
                position++;
                continue;
            }

            const start = position;

            let roundDepth = 0;
            let squareDepth = 0;
            let quote = "";
            let delimiter = "";

            while (position < text.length) {
                const character = text[position];

                if (quote) {
                    if (
                        character === quote &&
                        text[position - 1] !== "\\"
                    ) {
                        quote = "";
                    }

                    position++;
                    continue;
                }

                if (character === "'" || character === '"') {
                    quote = character;
                    position++;
                    continue;
                }

                if (character === "(") roundDepth++;
                if (character === ")") roundDepth--;
                if (character === "[") squareDepth++;
                if (character === "]") squareDepth--;

                if (roundDepth === 0 && squareDepth === 0) {
                    if (character === "{") {
                        delimiter = "{";
                        break;
                    }

                    if (character === ";" || character === "}") {
                        delimiter = character;
                        break;
                    }
                }

                position++;
            }

            const prelude = text.slice(start, position).trim();

            if (delimiter === ";") {
                position++;
                continue;
            }

            if (delimiter === "}") {
                if (prelude) {
                    warnings.push(
                        `Unexpected content before closing brace: "${prelude}".`
                    );
                }

                warnings.push("Unexpected closing brace '}'.");
                position++;
                continue;
            }

            if (delimiter !== "{") {
                if (prelude) {
                    warnings.push(
                        `Missing block for CSS rule: "${prelude}".`
                    );
                }

                break;
            }

            const openingIndex = position;
            const closingIndex = findClosingBrace(text, openingIndex);

            if (closingIndex === -1) {
                warnings.push("Missing closing brace '}'.");
                break;
            }

            const body = text.slice(openingIndex + 1, closingIndex);

            position = closingIndex + 1;

            if (!prelude) continue;

            if (prelude.startsWith("@")) {
                const atRuleMatch = prelude.match(/^@([\w-]+)/);

                const atRuleName = atRuleMatch
                    ? atRuleMatch[1].toLowerCase()
                    : "";

                if (groupingRules.has(atRuleName)) {
                    parseBlocks(body, [...context, prelude]);
                }

                continue;
            }

            const parsed = parseDeclarations(
                body,
                warnings,
                prelude
            );

            rules.push({
                selector: prelude,
                declarations: parsed.declarations,
                declarationList: parsed.declarationList,
                duplicateDeclarations: parsed.duplicateDeclarations,
                order: rules.length,
                context: [...context]
            });
        }
    }

    parseBlocks(cleanCSS);

    return {
        rules,
        warnings: [...new Set(warnings)]
    };
}

// Find CSS rules
function getCSSRules(css) {
    return parseStylesheet(css).rules;
}

// Find selectors
function getSelectors(css) {
    const selectors = [];

    getCSSRules(css).forEach(rule => {
        selectors.push(...splitSelectors(rule.selector));
    });

    return selectors;
}

// Find duplicates
function getDuplicateSelectors(css) {
    const selectors = getSelectors(css);

    return [
        ...new Set(
            selectors.filter(
                (selector, index) => selectors.indexOf(selector) !== index
            )
        )
    ];
}

// Find CSS warnings
function getCSSWarnings(css) {
    return parseStylesheet(css).warnings;
}

// Compare specificity
function compareSpecificity(first, second) {
    for (let i = 0; i < 3; i++) {
        if (first[i] > second[i]) return 1;
        if (first[i] < second[i]) return -1;
    }

    return 0;
}

// Split function arguments
function findMatchingParenthesis(text, openingIndex) {
    let depth = 1;
    let quote = "";

    for (let i = openingIndex + 1; i < text.length; i++) {
        const character = text[i];

        if (quote) {
            if (character === quote && text[i - 1] !== "\\") {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "(") depth++;
        if (character === ")") depth--;

        if (depth === 0) return i;
    }

    return -1;
}

// Read specificity
function calculateSelectorSpecificity(selector) {
    let ids = 0;
    let classes = 0;
    let elements = 0;
    let i = 0;

    while (i < selector.length) {
        const character = selector[i];

        if (character === "#") {
            ids++;
            i++;

            while (i < selector.length && /[\w-]/.test(selector[i])) {
                i++;
            }

            continue;
        }

        if (character === ".") {
            classes++;
            i++;

            while (i < selector.length && /[\w-]/.test(selector[i])) {
                i++;
            }

            continue;
        }

        if (character === "[") {
            classes++;

            let depth = 1;
            i++;

            while (i < selector.length && depth > 0) {
                if (selector[i] === "[") depth++;
                if (selector[i] === "]") depth--;
                i++;
            }

            continue;
        }

        if (character === ":") {
            const isPseudoElement = selector[i + 1] === ":";

            if (isPseudoElement) {
                elements++;
                i += 2;
            } else {
                i++;
            }

            const nameStart = i;

            while (i < selector.length && /[\w-]/.test(selector[i])) {
                i++;
            }

            const name = selector.slice(nameStart, i).toLowerCase();

            if (selector[i] === "(") {
                const closingIndex = findMatchingParenthesis(
                    selector,
                    i
                );

                if (closingIndex === -1) break;

                const content = selector.slice(i + 1, closingIndex);

                if (name === "where") {
                    // No specificity
                } else if (
                    name === "is" ||
                    name === "not" ||
                    name === "has"
                ) {
                    const best = getMaxSpecificity(
                        splitSelectors(content)
                    );

                    ids += best[0];
                    classes += best[1];
                    elements += best[2];
                } else if (
                    name === "nth-child" ||
                    name === "nth-last-child"
                ) {
                    classes++;

                    const ofMatch = content.match(
                        /\s+of\s+(.+)$/i
                    );

                    if (ofMatch) {
                        const best = getMaxSpecificity(
                            splitSelectors(ofMatch[1])
                        );

                        ids += best[0];
                        classes += best[1];
                        elements += best[2];
                    }
                } else if (!isPseudoElement) {
                    classes++;
                }

                i = closingIndex + 1;
            } else if (
                isPseudoElement ||
                [
                    "before",
                    "after",
                    "first-line",
                    "first-letter"
                ].includes(name)
            ) {
                if (!isPseudoElement) elements++;
            } else if (name) {
                classes++;
            }

            continue;
        }

        if (/[a-zA-Z_]/.test(character) || character === "-") {
            const previous = selector[i - 1] || " ";

            if (/\s|[>+~,|]/.test(previous)) {
                let end = i;

                while (
                    end < selector.length &&
                    /[\w-]/.test(selector[end])
                ) {
                    end++;
                }

                if (selector[end] === "|") {
                    i = end + 1;

                    while (
                        i < selector.length &&
                        /[\w-]/.test(selector[i])
                    ) {
                        i++;
                    }

                    elements++;
                } else {
                    elements++;
                    i = end;
                }
            } else {
                i++;
            }

            continue;
        }

        i++;
    }

    return [ids, classes, elements];
}

// Get maximum specificity
function getMaxSpecificity(selectors) {
    return selectors.reduce((best, selector) => {
        const current = calculateSelectorSpecificity(selector);

        return compareSpecificity(current, best) > 0
            ? current
            : best;
    }, [0, 0, 0]);
}

// Format specificity
function formatSpecificity(specificity) {
    return specificity.join("-");
}

// Get element type
function getElementType(selector) {
    const cleanSelector = selector.trim();

    let start = 0;
    let roundDepth = 0;
    let squareDepth = 0;
    let quote = "";

    for (let i = 0; i < cleanSelector.length; i++) {
        const character = cleanSelector[i];

        if (quote) {
            if (
                character === quote &&
                cleanSelector[i - 1] !== "\\"
            ) {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "(") roundDepth++;
        if (character === ")") roundDepth--;
        if (character === "[") squareDepth++;
        if (character === "]") squareDepth--;

        if (
            roundDepth === 0 &&
            squareDepth === 0 &&
            /[\s>+~]/.test(character)
        ) {
            start = i + 1;
        }
    }

    const lastPart = cleanSelector.slice(start).trim();
    const match = lastPart.match(/^([a-zA-Z][\w-]*|\*)/);

    if (!match || match[1] === "*") return null;

    return match[1].toLowerCase();
}

// Check selector match
function selectorsCanMatchSameElement(first, second) {
    const firstType = getElementType(first);
    const secondType = getElementType(second);

    return !(
        firstType &&
        secondType &&
        firstType !== secondType
    );
}

// Compare priority
function comparePriority(first, second) {
    if (first.important !== second.important) {
        return first.important ? 1 : -1;
    }

    const specificity = compareSpecificity(
        first.specificity,
        second.specificity
    );

    if (specificity !== 0) return specificity;

    if (first.order > second.order) return 1;
    if (first.order < second.order) return -1;

    return 0;
}

// Find declaration conflicts
function getDeclarationConflicts(css) {
    const selectorMap = new Map();

    getCSSRules(css).forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            const key = `${rule.context.join(" > ")}::${selector}`;

            if (!selectorMap.has(key)) {
                selectorMap.set(key, new Map());
            }

            const properties = selectorMap.get(key);

            Object.entries(rule.declarations).forEach(([property, data]) => {
                if (!properties.has(property)) {
                    properties.set(property, new Set());
                }

                properties.get(property).add(data.value);
            });
        });
    });

    const conflicts = [];

    selectorMap.forEach((properties, key) => {
        const separator = key.lastIndexOf("::");
        const selector = key.slice(separator + 2);

        properties.forEach((values, property) => {
            if (values.size > 1) {
                conflicts.push({
                    selector,
                    property,
                    values: [...values]
                });
            }
        });
    });

    return conflicts;
}

// Find cascade conflicts
function getCascadeConflicts(css) {
    const selectorRules = [];

    getCSSRules(css).forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            selectorRules.push({
                selector,
                declarations: rule.declarations,
                specificity: calculateSelectorSpecificity(selector),
                order: rule.order,
                context: rule.context.join(" > ")
            });
        });
    });

    const conflicts = [];

    for (let i = 0; i < selectorRules.length; i++) {
        for (let j = i + 1; j < selectorRules.length; j++) {
            const first = selectorRules[i];
            const second = selectorRules[j];

            if (first.selector === second.selector) continue;
            if (first.context !== second.context) continue;

            if (
                !selectorsCanMatchSameElement(
                    first.selector,
                    second.selector
                )
            ) {
                continue;
            }

            Object.keys(first.declarations).forEach(property => {
                if (
                    !Object.prototype.hasOwnProperty.call(
                        second.declarations,
                        property
                    )
                ) {
                    return;
                }

                const firstDeclaration = {
                    ...first,
                    ...first.declarations[property]
                };

                const secondDeclaration = {
                    ...second,
                    ...second.declarations[property]
                };

                if (
                    firstDeclaration.value === secondDeclaration.value
                ) {
                    return;
                }

                const comparison = comparePriority(
                    firstDeclaration,
                    secondDeclaration
                );

                const winner = comparison >= 0
                    ? firstDeclaration
                    : secondDeclaration;

                const loser = comparison >= 0
                    ? secondDeclaration
                    : firstDeclaration;

                let reason;

                if (winner.important && !loser.important) {
                    reason = "!important has higher priority than a normal declaration.";
                } else if (
                    compareSpecificity(
                        winner.specificity,
                        loser.specificity
                    ) !== 0
                ) {
                    reason = `${winner.selector} wins because it has higher specificity.`;
                } else {
                    reason = `${winner.selector} wins because it appears later in the source order.`;
                }

                conflicts.push({
                    type: "cascade-conflict",
                    severity: "warning",
                    selector: `${first.selector} / ${second.selector}`,
                    title: "Potential cascade conflict",
                    description: [
                        `Property: ${property}.`,
                        `Values: ${firstDeclaration.value} / ${secondDeclaration.value}.`,
                        `Likely winner: ${winner.selector}.`,
                        `Specificity: ${first.selector} (${formatSpecificity(first.specificity)}) / ${second.selector} (${formatSpecificity(second.specificity)}).`,
                        `Reason: ${reason}`
                    ].join(" ")
                });
            });
        }
    }

    return conflicts;
}

// Find variable uses
function findVariableUses(value) {
    const uses = [];
    let quote = "";

    for (let i = 0; i < value.length; i++) {
        const character = value[i];

        if (quote) {
            if (
                character === quote &&
                value[i - 1] !== "\\"
            ) {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (value.slice(i, i + 4).toLowerCase() !== "var(") {
            continue;
        }

        const openingIndex = i + 3;

        const closingIndex = findMatchingParenthesis(
            value,
            openingIndex
        );

        if (closingIndex === -1) continue;

        const content = value.slice(
            openingIndex + 1,
            closingIndex
        );

        const parts = splitTopLevel(content, ",");
        const variable = parts[0]?.trim();

        if (variable && variable.startsWith("--")) {
            uses.push({
                variable,
                hasFallback: parts.length > 1
            });
        }
    }

    return uses;
}

// Find CSS variables
function getCSSVariableIssues(css) {
    const declaredVariables = new Set();
    const usedVariables = new Map();

    getCSSRules(css).forEach(rule => {
        rule.declarationList.forEach(declaration => {
            if (declaration.property.startsWith("--")) {
                declaredVariables.add(declaration.property);
            }

            findVariableUses(declaration.value).forEach(use => {
                const current = usedVariables.get(use.variable) || false;

                usedVariables.set(
                    use.variable,
                    current || !use.hasFallback
                );
            });
        });
    });

    const issues = [];

    usedVariables.forEach((needsDeclaration, variable) => {
        if (
            needsDeclaration &&
            !declaredVariables.has(variable)
        ) {
            issues.push({
                type: "undefined-variable",
                severity: "warning",
                selector: "",
                title: "Undefined CSS variable",
                description: `The variable "${variable}" is used but no declaration was found.`
            });
        }
    });

    declaredVariables.forEach(variable => {
        if (!usedVariables.has(variable)) {
            issues.push({
                type: "unused-variable",
                severity: "warning",
                selector: "",
                title: "Unused CSS variable",
                description: `The variable "${variable}" is declared but is not used with var().`
            });
        }
    });

    return issues;
}

// Find important usage
function getCSSImportantIssues(css) {
    const issues = [];

    getCSSRules(css).forEach(rule => {
        const importantDeclarations = rule.declarationList.filter(
            declaration => declaration.important
        );

        if (importantDeclarations.length < 2) return;

        const properties = importantDeclarations.map(
            declaration => declaration.property
        );

        issues.push({
            type: "important-overuse",
            severity: "warning",
            selector: rule.selector,
            title: "Excessive !important usage",
            description: `This rule uses !important ${importantDeclarations.length} times (${properties.join(", ")}). Consider reviewing the cascade and selector specificity.`
        });
    });

    return issues;
}

// Count combinators
function countSelectorCombinators(selector) {
    let count = 0;
    let roundDepth = 0;
    let squareDepth = 0;
    let quote = "";
    let pendingSpace = false;
    let hasToken = false;

    for (let i = 0; i < selector.length; i++) {
        const character = selector[i];

        if (quote) {
            if (
                character === quote &&
                selector[i - 1] !== "\\"
            ) {
                quote = "";
            }

            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            continue;
        }

        if (character === "(") roundDepth++;
        if (character === ")") roundDepth--;
        if (character === "[") squareDepth++;
        if (character === "]") squareDepth--;

        if (roundDepth > 0 || squareDepth > 0) continue;

        if (/\s/.test(character)) {
            pendingSpace = true;
            continue;
        }

        if (
            character === ">" ||
            character === "+" ||
            character === "~"
        ) {
            if (hasToken) count++;

            pendingSpace = false;
            hasToken = false;
            continue;
        }

        if (character === ",") {
            pendingSpace = false;
            hasToken = false;
            continue;
        }

        if (pendingSpace && hasToken) count++;

        pendingSpace = false;
        hasToken = true;
    }

    return count;
}

// Find fragile patterns
function getFragileCSSIssues(css) {
    const issues = [];
    const seen = new Set();

    getCSSRules(css).forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            const specificity = calculateSelectorSpecificity(selector);
            const combinators = countSelectorCombinators(selector);

            if (specificity[0] >= 2) {
                const key = `multiple-ids:${selector}`;

                if (!seen.has(key)) {
                    seen.add(key);

                    issues.push({
                        type: "fragile-selector",
                        severity: "warning",
                        selector,
                        title: "Multiple ID selectors",
                        description: `This selector has ${specificity[0]} ID-level specificity. Consider using classes to make styles easier to override.`
                    });
                }
            }

            if (combinators >= 4) {
                const key = `deep-selector:${selector}`;

                if (!seen.has(key)) {
                    seen.add(key);

                    issues.push({
                        type: "fragile-selector",
                        severity: "warning",
                        selector,
                        title: "Deeply nested selector",
                        description: `This selector uses ${combinators} combinators. Consider simplifying it to reduce styling dependencies.`
                    });
                }
            }
        });
    });

    return issues;
}

// Find CSS issues
function getCSSIssues(css) {
    const issues = [];
    const rules = getCSSRules(css);
    const selectorGroups = new Map();

    rules.forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            const key = `${rule.context.join(" > ")}::${selector}`;

            if (!selectorGroups.has(key)) {
                selectorGroups.set(key, []);
            }

            selectorGroups.get(key).push(rule);
        });

        rule.duplicateDeclarations.forEach(duplicate => {
            const declarations = duplicate.declarations;

            const winner = declarations.reduce((best, current) => {
                if (current.important !== best.important) {
                    return current.important ? current : best;
                }

                return current.order > best.order ? current : best;
            });

            const values = declarations
                .map(item => item.value)
                .join(" → ");

            issues.push({
                type: "duplicate-declaration",
                severity: "warning",
                selector: rule.selector,
                title: "Repeated CSS property",
                description: `${duplicate.property}: ${values}. Effective value: ${winner.value}.`
            });
        });
    });

    selectorGroups.forEach((group, key) => {
        if (group.length < 2) return;

        const separator = key.lastIndexOf("::");
        const selector = key.slice(separator + 2);
        const properties = new Map();

        group.forEach(rule => {
            Object.entries(rule.declarations).forEach(([property, data]) => {
                if (!properties.has(property)) {
                    properties.set(property, new Set());
                }

                properties.get(property).add(data.value);
            });
        });

        const conflicts = [];

        properties.forEach((values, property) => {
            if (values.size > 1) {
                conflicts.push(
                    `${property}: ${[...values].join(" → ")}`
                );
            }
        });

        issues.push({
            type: "repeated-selector",
            severity: "warning",
            selector,
            title: conflicts.length > 0
                ? "Repeated selector with conflicting declarations"
                : "Duplicate selector",
            description: conflicts.length > 0
                ? conflicts.join(" | ")
                : `The selector "${selector}" appears multiple times.`
        });
    });

    rules.forEach(rule => {
        if (rule.declarationList.length === 0) {
            issues.push({
                type: "empty-rule",
                severity: "warning",
                selector: rule.selector,
                title: "Empty CSS rule",
                description: `The selector "${rule.selector}" has no declarations.`
            });
        }
    });

    getCascadeConflicts(css).forEach(issue => issues.push(issue));
    getCSSVariableIssues(css).forEach(issue => issues.push(issue));
    getCSSImportantIssues(css).forEach(issue => issues.push(issue));
    getFragileCSSIssues(css).forEach(issue => issues.push(issue));

    if (/:where\s*\(/i.test(css)) {
        issues.push({
            type: "specificity-information",
            severity: "info",
            selector: ":where()",
            title: ":where() contributes zero specificity",
            description: "Selectors inside :where() do not add specificity. This can make styles easier to override, even when the selector contains IDs or classes."
        });
    }

    getCSSWarnings(css).forEach(warning => {
        issues.push({
            type: "syntax-warning",
            severity: "error",
            selector: "",
            title: "CSS syntax problem",
            description: warning
        });
    });

    return issues;
}

// Exports
export {
    getSelectors,
    getDuplicateSelectors,
    getCSSWarnings,
    getCSSRules,
    getDeclarationConflicts,
    getCascadeConflicts,
    getCSSIssues,
    calculateSelectorSpecificity,
    compareSpecificity,
    selectorsCanMatchSameElement,
    getCSSVariableIssues,
    getCSSImportantIssues,
    getFragileCSSIssues
};