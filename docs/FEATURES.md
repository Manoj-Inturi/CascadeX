# CascadeX — Feature Reference

This document describes the features in the current browser-based application. It distinguishes implemented behavior from future ideas.

## 1. CSS editor

| Feature | Description | Status |
|---|---|---|
| CSS text input | Paste or type stylesheet source | Implemented |
| Line numbers | Displays line numbers beside the editor | Implemented |
| Syntax highlighting | Highlights common CSS tokens while editing | Implemented |
| Fixed editor area | Keeps long input inside a bounded editor | Implemented |
| Vertical scrolling | Scrolls through long stylesheets | Implemented |
| Horizontal scrolling | Supports long lines without wrapping the source | Implemented |
| Character count | Displays the current input length | Implemented |
| CSS file upload | Loads a `.css` file into the editor | Implemented |
| Clear action | Clears editor content | Implemented |

## 2. Static analysis

| Check | Description | Status |
|---|---|---|
| Repeated selectors | Finds selectors that occur in multiple rules | Implemented |
| Conflicting repeated declarations | Reports differing values across repeated selector rules | Implemented |
| Repeated declarations | Detects repeated properties with different values in a rule | Implemented |
| Potential cascade conflicts | Compares declarations across selectors | Implemented |
| Specificity calculation | Estimates selector specificity | Implemented |
| `!important` overuse | Flags rules with multiple important declarations | Implemented |
| Undefined custom properties | Finds `var()` references without a visible declaration and without a fallback | Implemented |
| Unused custom properties | Finds declared custom properties with no detected `var()` reference | Implemented |
| Empty rules | Finds rules with no declarations | Implemented |
| Basic syntax warnings | Checks selected structural and declaration problems | Implemented |
| Fragile selectors | Flags multiple ID selectors and deeply nested selectors | Implemented |

### Interpretation notes

- Cascade conflicts are potential conflicts, not proof of a computed-style collision.
- Specificity is calculated by a lightweight implementation and may not cover every selector edge case.
- Variable checks only see the CSS source supplied to the analyzer.
- Static checks do not replace browser developer tools.

## 3. Results workspace

| Feature | Description | Status |
|---|---|---|
| Severity summary | Displays error, warning, and information counts | Implemented |
| Severity filters | Filters findings by category | Implemented |
| Search | Searches issue title, selector, and explanation | Implemented |
| Sorting | Sorts findings by supported fields | Implemented |
| Expandable details | Reveals additional issue explanation | Implemented |
| Empty state | Explains when no results match the current filter | Implemented |
| Report export | Exports the analysis report | Implemented |

The information category is available in the interface; the analyzer may return zero information-level findings for a given stylesheet.

## 4. Workspace and preferences

| Feature | Description | Status |
|---|---|---|
| Light theme | Default light appearance | Implemented |
| Dark theme | Alternative dark appearance | Implemented |
| Theme persistence | Saves the selected theme in browser local storage | Implemented |
| Analysis history | Stores recent analyses in browser local storage | Implemented |
| Clear history | Removes locally stored analysis history | Implemented |
| Responsive layout | Adapts the workspace to smaller screens | Implemented |

## 5. Planned capabilities

These are not represented as completed features:

- Inline editor diagnostics and navigation to the source line.
- More complete CSS parsing and broader syntax coverage.
- HTML and stylesheet relationship mapping.
- ZIP upload for complete website projects.
- Reviewable fix suggestions with before-and-after comparison.
- Corrected project export.
- Analysis comparison across runs.
