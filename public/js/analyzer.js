// Split selectors
function splitSelectors(selector) {
    const selectors = [];
    let current = "";
    let depth = 0;

    for (const character of selector) {
        if (character === "(" || character === "[") depth++;
        if (character === ")" || character === "]") depth--;

        if (character === "," && depth === 0) {
            selectors.push(current.trim());
            current = "";
        } else {
            current += character;
        }
    }

    if (current.trim()) selectors.push(current.trim());

    return selectors;
}

// Find selectors
function getSelectors(css) {
    const selectors = [];
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const regex = /([^{}]+)\s*\{/g;
    let match;

    while ((match = regex.exec(cleanCSS)) !== null) {
        const selector = match[1].trim();

        if (selector && !selector.startsWith("@")) {
            selectors.push(...splitSelectors(selector));
        }
    }

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

    const rules = cleanCSS.match(/[^{}]+\{[^{}]*\}/g) || [];

    rules.forEach((rule) => {
        const content = rule
            .substring(rule.indexOf("{") + 1, rule.lastIndexOf("}"))
            .trim();

        if (!content) {
            warnings.push("Empty CSS rule found.");
            return;
        }

        content.split(";").forEach((declaration) => {
            const item = declaration.trim();

            if (item && !item.includes(":")) {
                warnings.push(`Possible invalid declaration: "${item}".`);
            }
        });
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
        return compareSpecificity(current, best) > 0
            ? current
            : best;
    }, [0, 0, 0]);
}

// Calculate specificity
function calculateSelectorSpecificity(selector) {
    let ids = 0;
    let classes = 0;
    let elements = 0;

    const functionalPseudo = /:(is|not|has)\(([^()]*)\)/g;

    selector = selector.replace(
        functionalPseudo,
        (match, name, content) => {
            const specificity = getMaxSpecificity(
                splitSelectors(content)
            );

            ids += specificity[0];
            classes += specificity[1];
            elements += specificity[2];

            return "";
        }
    );

    selector = selector.replace(/:where\([^()]*\)/g, "");

    ids += (selector.match(/#[\w-]+/g) || []).length;

    classes += (
        selector.match(
            /\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g
        ) || []
    ).length;

    elements += (
        selector.match(
            /(^|[\s>+~,(])([a-zA-Z][\w-]*|::[\w-]+)/g
        ) || []
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

    if (
        firstType &&
        secondType &&
        firstType !== secondType
    ) {
        return false;
    }

    return true;
}

// Find CSS rules
function getCSSRules(css) {
    const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = cleanCSS.match(/[^{}]+\{[^{}]*\}/g) || [];

    return rules.map((rule, index) => {
        const selector = rule
            .substring(0, rule.indexOf("{"))
            .trim();

        const content = rule
            .substring(rule.indexOf("{") + 1, rule.lastIndexOf("}"))
            .trim();

        const declarations = {};
        const declarationList = [];

        content.split(";").forEach((declaration, declarationIndex) => {
            const colon = declaration.indexOf(":");

            if (colon === -1) return;

            const property = declaration.substring(0, colon).trim();
            let value = declaration.substring(colon + 1).trim();

            if (!property || !value) return;

            const important = /!\s*important\s*$/i.test(value);

            value = value
                .replace(/!\s*important\s*$/i, "")
                .trim();

            const item = {
                property,
                value,
                important,
                order: declarationIndex
            };

            declarationList.push(item);

            declarations[property] = {
                value,
                important
            };
        });

        const duplicateDeclarations = [];
        const propertyMap = new Map();

        declarationList.forEach((declaration) => {
            if (!propertyMap.has(declaration.property)) {
                propertyMap.set(declaration.property, []);
            }

            propertyMap.get(declaration.property).push(declaration);
        });

        propertyMap.forEach((items, property) => {
            if (items.length < 2) return;

            const values = [...new Set(items.map(item => item.value))];

            if (values.length < 2) return;

            duplicateDeclarations.push({
                property,
                declarations: items
            });
        });

        return {
            selector,
            declarations,
            declarationList,
            duplicateDeclarations,
            order: index
        };
    });
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

    rules.forEach((rule) => {
        const selectors = splitSelectors(rule.selector);

        selectors.forEach((selector) => {
            if (!selectorMap.has(selector)) {
                selectorMap.set(selector, new Map());
            }

            const properties = selectorMap.get(selector);

            Object.entries(rule.declarations).forEach(
                ([property, data]) => {
                    if (!properties.has(property)) {
                        properties.set(property, new Set());
                    }

                    properties.get(property).add(data.value);
                }
            );
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

    rules.forEach((rule) => {
        splitSelectors(rule.selector).forEach((selector) => {
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

            if (
                !selectorsCanMatchSameElement(
                    first.selector,
                    second.selector
                )
            ) {
                continue;
            }

            Object.keys(first.declarations).forEach((property) => {
                if (!Object.hasOwn(second.declarations, property)) return;

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

                const description = [
                    `Property: ${property}.`,
                    `Values: ${firstDeclaration.value} / ${secondDeclaration.value}.`,
                    `Likely winner: ${winner.selector}.`,
                    `Specificity: ${first.selector} (${formatSpecificity(first.specificity)}) / ${second.selector} (${formatSpecificity(second.specificity)}).`,
                    `Reason: ${reason}`
                ].join(" ");

                conflicts.push({
                    type: "cascade-conflict",
                    severity: "warning",
                    selector: `${first.selector} / ${second.selector}`,
                    title: "Potential cascade conflict",
                    description
                });
            });
        }
    }

    return conflicts;
}

// Find CSS issues
function getCSSIssues(css) {
    const issues = [];
    const rules = getCSSRules(css);
    const selectorGroups = new Map();

    rules.forEach((rule) => {
        splitSelectors(rule.selector).forEach((selector) => {
            if (!selectorGroups.has(selector)) {
                selectorGroups.set(selector, []);
            }

            selectorGroups.get(selector).push(rule);
        });

        rule.duplicateDeclarations.forEach((duplicate) => {
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

    selectorGroups.forEach((group, selector) => {
        if (group.length < 2) return;

        const properties = new Map();

        group.forEach((rule) => {
            Object.entries(rule.declarations).forEach(
                ([property, data]) => {
                    if (!properties.has(property)) {
                        properties.set(property, new Set());
                    }

                    properties.get(property).add(data.value);
                }
            );
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

    rules.forEach((rule) => {
        if (!Object.keys(rule.declarations).length) {
            issues.push({
                type: "empty-rule",
                severity: "warning",
                selector: rule.selector,
                title: "Empty CSS rule",
                description: `The selector "${rule.selector}" has no declarations.`
            });
        }
    });

    getCascadeConflicts(css).forEach((conflict) => {
        issues.push(conflict);
    });

    getCSSWarnings(css).forEach((warning) => {
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
    selectorsCanMatchSameElement
};