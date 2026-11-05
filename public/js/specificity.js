// Calculate specificity
function calculateSpecificity(selector) {
    let ids = 0;
    let classes = 0;
    let elements = 0;

    const cleanSelector = selector.replace(/::[\w-]+/g, " ");

    const idMatches = cleanSelector.match(/#[\w-]+/g);
    const classMatches = cleanSelector.match(/\.[\w-]+/g);
    const attributeMatches = cleanSelector.match(/\[[^\]]+\]/g);
    const pseudoMatches = cleanSelector.match(/:(?!:)[\w-]+(?:\([^)]*\))?/g);

    ids = idMatches ? idMatches.length : 0;

    classes += classMatches ? classMatches.length : 0;
    classes += attributeMatches ? attributeMatches.length : 0;
    classes += pseudoMatches ? pseudoMatches.length : 0;

    const elementMatches = cleanSelector
        .replace(/#[\w-]+/g, " ")
        .replace(/\.[\w-]+/g, " ")
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/:(?!:)[\w-]+(?:\([^)]*\))?/g, " ")
        .match(/(?:^|[\s>+~])([a-zA-Z][\w-]*)/g);

    elements = elementMatches ? elementMatches.length : 0;

    return `${ids}, ${classes}, ${elements}`;
}

export { calculateSpecificity };