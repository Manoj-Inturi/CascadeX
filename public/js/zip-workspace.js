import { getCSSIssues } from "./analyzer.js";

const $ = id => document.getElementById(id);
const input = $("project-zip-input"), browse = $("zip-browse"), scan = $("zip-analyze");
const status = $("zip-status"), panel = $("zip-files-panel"), list = $("zip-files-list");
const summary = $("zip-summary"), generate = $("zip-generate");
let zip = null, entries = [], selected = new Map(), groups = new Map(), baseName = "project";

browse.addEventListener("click", () => input.click());
input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) { setStatus("Please choose a .zip file.", true); input.value = ""; return; }
    baseName = file.name.replace(/\.zip$/i, "");
    setStatus(`${file.name} selected. Click Scan ZIP to analyze it.`);
    scan.disabled = false;
});
scan.addEventListener("click", scanZip);
$("zip-clear").addEventListener("click", reset);
generate.addEventListener("click", generateZip);

function setStatus(message, error = false) { status.textContent = message; status.classList.toggle("zip-status-error", error); }
function reset() {
    zip = null; entries = []; selected.clear(); groups.clear(); input.value = "";
    scan.disabled = true; generate.disabled = true; generate.textContent = "Generate fixed ZIP";
    panel.hidden = true; list.replaceChildren(); summary.textContent = "";
    setStatus("Upload a ZIP containing your website's CSS files.");
}
function badge(text, type) { const el = document.createElement("span"); el.className = `zip-badge zip-badge-${type}`; el.textContent = text; return el; }

async function scanZip() {
    const file = input.files?.[0]; if (!file) return;
    if (!window.JSZip) { setStatus("ZIP library did not load. Refresh and try again.", true); return; }
    scan.disabled = true; generate.disabled = true; selected.clear(); groups.clear(); entries = []; list.replaceChildren();
    setStatus("Extracting ZIP and scanning CSS files…");
    try {
        zip = await JSZip.loadAsync(file);
        const paths = Object.keys(zip.files).filter(path => !zip.files[path].dir && path.toLowerCase().endsWith(".css"));
        if (!paths.length) { setStatus("No standalone .css files were found in this ZIP.", true); return; }
        for (const path of paths) {
            const css = await zip.file(path).async("string");
            const entry = { path, css, issues: getCSSIssues(css) };
            entries.push(entry); list.appendChild(renderFile(entry));
        }
        const all = entries.flatMap(item => item.issues);
        summary.textContent = `${entries.length} CSS files · ${all.length} issues · ${all.filter(x => x.severity === "error").length} errors · ${all.filter(x => x.severity === "warning").length} warnings`;
        panel.hidden = false;
        setStatus(`Successfully scanned ${entries.length} CSS file(s). Original ZIP remains unchanged.`);
    } catch (error) {
        console.error(error); setStatus("Could not read this ZIP. Use a valid, unencrypted ZIP file.", true);
    } finally { scan.disabled = false; }
}

function renderFile(entry) {
    const errors = entry.issues.filter(x => x.severity === "error").length;
    const warnings = entry.issues.filter(x => x.severity === "warning").length;
    const file = document.createElement("details"); file.className = "zip-file-card";
    const head = document.createElement("summary"); head.className = "zip-file-summary";
    const name = document.createElement("span"); name.className = "zip-file-name"; name.textContent = entry.path;
    const badges = document.createElement("span"); badges.className = "zip-file-badges";
    badges.append(badge(`${errors} errors`, errors ? "error" : "ok"), badge(`${warnings} warnings`, warnings ? "warning" : "ok"), badge(`${entry.issues.length} total`, "neutral"));
    head.append(name, badges); file.appendChild(head);
    const issueList = document.createElement("div"); issueList.className = "zip-issue-list";
    if (!entry.issues.length) { const clean = document.createElement("p"); clean.className = "zip-clean-message"; clean.textContent = "No issues detected in this CSS file."; issueList.appendChild(clean); }
    entry.issues.forEach((issue, index) => issueList.appendChild(renderIssue(entry, issue, index)));
    file.appendChild(issueList); return file;
}

function renderIssue(entry, issue, index) {
    const card = document.createElement("details"); card.className = "zip-issue-card";
    const head = document.createElement("summary"), title = document.createElement("strong");
    title.textContent = issue.title || issue.type; head.append(title, badge(issue.severity.toUpperCase(), issue.severity)); card.appendChild(head);
    const body = document.createElement("div"); body.className = "zip-issue-body";
    const selector = document.createElement("code"); selector.className = "zip-issue-selector"; selector.textContent = issue.selector || "Stylesheet";
    const description = document.createElement("p"); description.textContent = issue.description || "No additional details.";
    body.append(selector, description);
    const group = getFixGroup(issue, entry.css, index);
    if (group) {
        if (!groups.has(entry.path)) groups.set(entry.path, new Map());
        groups.get(entry.path).set(group.id, group);
        body.appendChild(renderOptions(entry.path, group));
    }
    card.appendChild(body); return card;
}

function renderOptions(path, group) {
    const wrap = document.createElement("div"); wrap.className = "zip-fix-options";
    const heading = document.createElement("strong"); heading.textContent = "Choose the declaration to keep";
    const hint = document.createElement("p"); hint.textContent = "Only this selected issue will be changed. Leave it unselected to preserve the original code.";
    wrap.append(heading, hint);
    group.declarations.forEach((declaration, index) => {
        const label = document.createElement("label"); label.className = "zip-fix-option";
        const radio = document.createElement("input"); radio.type = "radio"; radio.name = `fix-${encodeURIComponent(path)}-${group.id}`;
        radio.addEventListener("change", () => {
            if (!selected.has(path)) selected.set(path, new Map());
            selected.get(path).set(group.id, index); updateGenerate();
        });
        const code = document.createElement("code");
        code.textContent = `${declaration.selector} { ${declaration.property}: ${declaration.value}${declaration.important ? " !important" : ""}; }`;
        label.append(radio, code); wrap.appendChild(label);
    });
    return wrap;
}

// Source-aware declaration ranges for ordinary style rules; nested at-rules are intentionally not edited.
function declarationsIn(css) {
    const out = []; let pos = 0;
    while (pos < css.length) {
        let open = nextOpen(css, pos); if (open < 0) break;
        const selector = css.slice(pos, open).trim(), close = matchingClose(css, open); if (close < 0) break;
        if (selector && !selector.startsWith("@")) {
            let start = open + 1, quote = "", depth = 0;
            for (let i = start; i <= close; i++) {
                const ch = css[i];
                if (quote) { if (ch === quote && css[i - 1] !== "\\") quote = ""; continue; }
                if (ch === "'" || ch === '"') { quote = ch; continue; }
                if (ch === "(" || ch === "[") depth++;
                else if (ch === ")" || ch === "]") depth--;
                if ((ch === ";" && depth === 0) || i === close) {
                    const raw = css.slice(start, i), colon = raw.indexOf(":");
                    if (colon > 0) {
                        const property = raw.slice(0, colon).trim(), rawValue = raw.slice(colon + 1).trim();
                        const value = rawValue.replace(/!\s*important\s*$/i, "").trim();
                        if (/^--[\w-]+$|^-?[a-zA-Z_][\w-]*$/.test(property) && value) out.push({ selector, property, value, important: /!\s*important\s*$/i.test(rawValue), start, end: i });
                    }
                    start = i + 1;
                }
            }
        }
        pos = close + 1;
    }
    return out;
}
function nextOpen(css, from) {
    let quote = "", parens = 0;
    for (let i = from; i < css.length; i++) {
        const ch = css[i];
        if (css.startsWith("/*", i)) { const end = css.indexOf("*/", i + 2); i = end < 0 ? css.length : end + 1; continue; }
        if (quote) { if (ch === quote && css[i - 1] !== "\\") quote = ""; continue; }
        if (ch === "'" || ch === '"') quote = ch;
        else if (ch === "(") parens++;
        else if (ch === ")") parens--;
        else if (ch === "{" && parens === 0) return i;
    }
    return -1;
}
function matchingClose(css, open) {
    let depth = 1, quote = "";
    for (let i = open + 1; i < css.length; i++) {
        const ch = css[i];
        if (css.startsWith("/*", i)) { const end = css.indexOf("*/", i + 2); i = end < 0 ? css.length : end + 1; continue; }
        if (quote) { if (ch === quote && css[i - 1] !== "\\") quote = ""; continue; }
        if (ch === "'" || ch === '"') quote = ch;
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) return i;
    }
    return -1;
}
function getFixGroup(issue, css, index) {
    if (issue.severity !== "warning") return null;
    const all = declarationsIn(css); let candidates = [];
    if (issue.type === "duplicate-declaration") {
        const property = issue.description.match(/^\s*([\w-]+)\s*:/)?.[1];
        candidates = property ? all.filter(x => x.selector === issue.selector && x.property === property) : [];
    } else if (issue.type === "repeated-selector") {
        const map = new Map();
        all.filter(x => x.selector === issue.selector).forEach(x => { if (!map.has(x.property)) map.set(x.property, []); map.get(x.property).push(x); });
        map.forEach(items => { if (new Set(items.map(x => x.value)).size > 1) candidates.push(...items); });
    } else if (issue.type === "cascade-conflict") {
        const property = issue.description.match(/Property:\s*([\w-]+)/i)?.[1];
        const values = issue.description.match(/Values:\s*(.*?)\./i)?.[1]?.split("/").map(x => x.trim()) || [];
        const selectors = (issue.selector || "").split(" / ").map(x => x.trim());
        candidates = all.filter(x => selectors.includes(x.selector) && x.property === property && values.includes(x.value));
    }
    const unique = [...new Map(candidates.map(x => [`${x.start}:${x.end}`, x])).values()];
    return unique.length > 1 ? { id: `${issue.type}-${index}`, declarations: unique } : null;
}
function updateGenerate() {
    let count = 0; selected.forEach(map => count += map.size);
    generate.disabled = count === 0; generate.textContent = count ? `Generate fixed ZIP (${count} selected)` : "Generate fixed ZIP";
}
async function generateZip() {
    if (!zip || !selected.size) return;
    generate.disabled = true; setStatus("Applying selected fixes and creating the replacement ZIP…");
    try {
        for (const entry of entries) {
            const choices = selected.get(entry.path), fileGroups = groups.get(entry.path); if (!choices || !fileGroups) continue;
            const removals = [];
            choices.forEach((keep, id) => fileGroups.get(id)?.declarations.forEach((decl, i) => { if (i !== keep) removals.push({ start: decl.start, end: decl.end }); }));
            const ranges = [...new Map(removals.map(x => [`${x.start}:${x.end}`, x])).values()].sort((a, b) => b.start - a.start);
            let output = entry.css; ranges.forEach(r => { output = output.slice(0, r.start) + output.slice(r.end); });
            zip.file(entry.path, output);
        }
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        const url = URL.createObjectURL(blob), anchor = document.createElement("a");
        anchor.href = url; anchor.download = `${baseName}-fixed.zip`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
        setStatus("Fixed ZIP generated. Your uploaded original ZIP was not modified.");
    } catch (error) { console.error(error); setStatus("ZIP generation failed. Please retry with the original ZIP.", true); }
    finally { updateGenerate(); }
}
reset();
