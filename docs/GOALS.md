# CascadeX — Project Goals

## Vision

Make CSS easier to understand, debug, and maintain by giving developers a focused workspace that explains common stylesheet problems.

## Problem

As stylesheets grow, developers can encounter repeated selectors, conflicting declarations, unclear specificity, excessive `!important` usage, and fragile selector structures. Finding these patterns manually can take time, especially when a stylesheet has accumulated over multiple iterations.

## Mission

CascadeX aims to turn CSS source into actionable explanations. It should help developers understand why a pattern may be problematic and where to investigate, while keeping the developer in control of any changes.

## Current objectives

1. Provide a simple browser-based CSS editing experience.
2. Make CSS easier to scan with syntax highlighting and line numbers.
3. Detect common CSS maintenance issues using static analysis.
4. Explain potential cascade conflicts and specificity.
5. Present findings in a searchable, filterable results workspace.
6. Keep the interface responsive and support light and dark themes.
7. Preserve useful local preferences and analysis history.

## Product principles

- **Clarity first:** Findings should be understandable and specific.
- **No silent edits:** The analyzer reports issues; it does not rewrite user CSS automatically.
- **Developer control:** Users decide what to change.
- **Honest analysis:** Heuristic findings must be labelled as potential issues where certainty is not possible.
- **Lightweight stack:** Prefer browser-native capabilities and avoid unnecessary dependencies.
- **Usable interface:** Keep the editor, results, and explanations easy to navigate.

## Current scope

The current release focuses on CSS text and stylesheet-level analysis in the browser. It does not yet analyze an entire website project or determine computed styles from a live DOM.

## Success criteria

- A developer can paste or upload a CSS file and run an analysis.
- Findings are grouped by severity and can be searched and sorted.
- The editor remains usable with long stylesheets.
- The interface works in light and dark themes.
- Analysis limitations are documented clearly.
- The live deployment remains accessible.

## Out of scope for the current release

- Full browser-equivalent cascade evaluation.
- Guaranteed detection of every CSS syntax error.
- Automatic code changes without user review.
- Full-project ZIP upload and HTML-to-CSS dependency mapping.
- Server-side accounts, cloud project storage, or team collaboration.
