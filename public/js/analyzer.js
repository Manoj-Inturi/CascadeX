// Split selectors
function splitSelectors(selector) {
    const selectors = [];
    let current = "";
    let depth = 0;
    let quote = "";

    for (let i = 0; i < selector.length; i++) {
        const character = selector[i];

        if (quote) {
            current += character;
            if (character === quote && selector[i - 1] !== "\\") quote = "";
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            current += character;
            continue;
        }

        if (character === "(" || character === "[") depth++;
        if (character === ")" || character === "]") depth--;

        if (character === "," && depth === 0) {
            if (current.trim()) selectors.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) selectors.push(current.trim());
    return selectors;
}

// Split declarations
function splitTopLevel(text, delimiter) {
    const parts = [];
    let current = "";
    let depth = 0;
    let quote = "";

    for (let i = 0; i < text.length; i++) {
        const character = text[i];

        if (quote) {
            current += character;
            if (character === quote && text[i - 1] !== "\\") quote = "";
            continue;
        }

        if (character === "'" || character === '"') {
            quote = character;
            current += character;
            continue;
        }

        if (character === "(" || character === "[") depth++;
        if (character === ")" || character === "]") depth--;

        if (character === delimiter && depth === 0) {
            parts.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

// Find CSS rules
function getCSSRules(css) {
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
    const rules = [];
    let match;

    while ((match = ruleRegex.exec(cleanCSS)) !== null) {
        const selector = match[1].trim();
        const content = match[2].trim();

        if (!selector || selector.startsWith("@")) continue;

        const declarationList = [];
        const declarations = {};
        const propertyMap = new Map();

        splitTopLevel(content, ";").forEach((item, index) => {
            const colon = item.indexOf(":");
            if (colon === -1) return;

            const property = item.substring(0, colon).trim();
            let value = item.substring(colon + 1).trim();
            if (!property || !value) return;

            const important = /!\s*important\s*$/i.test(value);
            value = value.replace(/!\s*important\s*$/i, "").trim();

            const declaration = { property, value, important, order: index };
            declarationList.push(declaration);
            declarations[property] = { value, important };

            if (!propertyMap.has(property)) propertyMap.set(property, []);
            propertyMap.get(property).push(declaration);
        });

        const duplicateDeclarations = [];

        propertyMap.forEach((items, property) => {
            const values = [...new Set(items.map(item => item.value))];

            if (items.length > 1 && values.length > 1) {
                duplicateDeclarations.push({ property, declarations: items });
            }
        });

        rules.push({
            selector,
            declarations,
            declarationList,
            duplicateDeclarations,
            order: rules.length
        });
    }

    return rules;
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

    getCSSRules(cleanCSS).forEach(rule => {
        if (!rule.declarationList.length && rule.selector) {
            warnings.push(`Empty CSS rule found: "${rule.selector}".`);
        }
    });

    return [...new Set(warnings)];
}

// Compare specificity
function compareSpecificity(first, second) {
    for (let i = 0; i < 3; i++) {
        if (first[i] > second[i]) return 1;
        if (first[i] < second[i]) return -1;
    }

    return 0;
}

// Get maximum specificity
function getMaxSpecificity(selectors) {
    const values = selectors.map(calculateSelectorSpecificity);

    return values.reduce((best, current) => {
        return compareSpecificity(current, best) > 0 ? current : best;
    }, [0, 0, 0]);
}

// Calculate specificity
function calculateSelectorSpecificity(selector) {
    let ids = 0;
    let classes = 0;
    let elements = 0;

    const functionalPseudo = /:(is|not|has)\(([^()]*)\)/g;

    selector = selector.replace(functionalPseudo, (match, name, content) => {
        const specificity = getMaxSpecificity(splitSelectors(content));

        ids += specificity[0];
        classes += specificity[1];
        elements += specificity[2];

        return "";
    });

    selector = selector.replace(/:where\([^()]*\)/g, "");

    ids += (selector.match(/#[\w-]+/g) || []).length;

    classes += (
        selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []
    ).length;

    elements += (
        selector.match(/(^|[\s>+~,(])([a-zA-Z][\w-]*|::[\w-]+)/g) || []
    ).length;

    return [ids, classes, elements];
}

// Format specificity
function formatSpecificity(specificity) {
    return specificity.join("-");
}

// Get element type
function getElementType(selector) {
    const parts = selector.trim().split(/\s+|>|\+|~/);
    const lastPart = parts[parts.length - 1];

    const match = lastPart.match(/^([a-zA-Z][\w-]*|\*)/);

    if (!match || match[1] === "*") return null;

    return match[1].toLowerCase();
}

// Check selector compatibility
function selectorsCanMatchSameElement(first, second) {
    const firstType = getElementType(first);
    const secondType = getElementType(second);

    return !(firstType && secondType && firstType !== secondType);
}

// Compare cascade priority
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
    const rules = getCSSRules(css);
    const selectorMap = new Map();

    rules.forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            if (!selectorMap.has(selector)) {
                selectorMap.set(selector, new Map());
            }

            const properties = selectorMap.get(selector);

            Object.entries(rule.declarations).forEach(([property, data]) => {
                if (!properties.has(property)) {
                    properties.set(property, new Set());
                }

                properties.get(property).add(data.value);
            });
        });
    });

    const conflicts = [];

    selectorMap.forEach((properties, selector) => {
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
    const rules = getCSSRules(css);
    const selectorRules = [];

    rules.forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            selectorRules.push({
                selector,
                declarations: rule.declarations,
                specificity: calculateSelectorSpecificity(selector),
                order: rule.order
            });
        });
    });

    const conflicts = [];
    const seen = new Set();

    for (let i = 0; i < selectorRules.length; i++) {
        for (let j = i + 1; j < selectorRules.length; j++) {
            const first = selectorRules[i];
            const second = selectorRules[j];

            if (first.selector === second.selector) continue;

            if (!selectorsCanMatchSameElement(first.selector, second.selector)) {
                continue;
            }

            Object.keys(first.declarations).forEach(property => {
                if (!Object.prototype.hasOwnProperty.call(
                    second.declarations,
                    property
                )) return;

                const firstDeclaration = {
                    ...first,
                    ...first.declarations[property]
                };

                const secondDeclaration = {
                    ...second,
                    ...second.declarations[property]
                };

                if (firstDeclaration.value === secondDeclaration.value) return;

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

                const key = [
                    property,
                    first.selector,
                    second.selector,
                    first.order,
                    second.order
                ].join("|");

                if (seen.has(key)) return;
                seen.add(key);

                let reason;

                if (winner.important && !loser.important) {
                    reason = "!important has higher priority than a normal declaration.";
                } else if (
                    winner.important === loser.important &&
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

// Find CSS variables
function getCSSVariableIssues(css) {
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const declaredVariables = new Set();
    const usedVariables = new Map();

    getCSSRules(cleanCSS).forEach(rule => {
        rule.declarationList.forEach(declaration => {
            if (declaration.property.startsWith("--")) {
                declaredVariables.add(declaration.property);
            }
        });
    });

    for (let i = 0; i < cleanCSS.length; i++) {
        if (cleanCSS.slice(i, i + 4).toLowerCase() !== "var(") {
            continue;
        }

        let depth = 1;
        let end = i + 4;
        let quote = "";

        while (end < cleanCSS.length && depth > 0) {
            const character = cleanCSS[end];

            if (quote) {
                if (character === quote && cleanCSS[end - 1] !== "\\") {
                    quote = "";
                }
            } else if (character === "'" || character === '"') {
                quote = character;
            } else if (character === "(") {
                depth++;
            } else if (character === ")") {
                depth--;
            }

            end++;
        }

        if (depth !== 0) continue;

        const content = cleanCSS.substring(i + 4, end - 1);
        const parts = splitTopLevel(content, ",");

        const variable = parts[0]?.trim();

        const hasFallback = parts.length > 1 &&
            parts.slice(1).join(",").trim().length > 0;

        if (!variable || !variable.startsWith("--")) continue;

        if (!usedVariables.has(variable)) {
            usedVariables.set(variable, false);
        }

        if (!hasFallback) {
            usedVariables.set(variable, true);
        }
    }

    const issues = [];

    usedVariables.forEach((needsDeclaration, variable) => {
        if (needsDeclaration && !declaredVariables.has(variable)) {
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

// Find important overuse
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

// Find CSS issues
function getCSSIssues(css) {
    const issues = [];
    const rules = getCSSRules(css);
    const selectorGroups = new Map();

    rules.forEach(rule => {
        splitSelectors(rule.selector).forEach(selector => {
            if (!selectorGroups.has(selector)) {
                selectorGroups.set(selector, []);
            }

            selectorGroups.get(selector).push(rule);
        });

        rule.duplicateDeclarations.forEach(duplicate => {
            const declarations = duplicate.declarations;

            const winner = declarations.reduce((best, current) => {
                if (current.important !== best.important) {
                    return current.important ? current : best;
                }

                return current.order > best.order ? current : best;
            });

            const values = declarations.map(item => item.value).join(" → ");

            issues.push({
                type: "duplicate-declaration",
                severity: "warning",
                selector: rule.selector,
                title: "Repeated CSS property",
                description: `${duplicate.property}: ${values}. Effective value: ${winner.value}.`
            });
        });
    });

    selectorGroups.forEach((group, selector) => {
        if (group.length < 2) return;

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
                conflicts.push(`${property}: ${[...values].join(" → ")}`);
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
        if (!rule.declarationList.length) {
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
    getCSSImportantIssues
};