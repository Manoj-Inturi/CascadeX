# CascadeX

**Understand your CSS. Detect conflicts. Prevent fragile styles.**

CascadeX is a developer tool designed to help developers understand CSS cascade behavior, identify competing declarations, and detect potentially fragile styling patterns.

## The Problem

As CSS projects grow, stylesheets can become difficult to maintain. Conflicting declarations, excessive specificity, stylesheet ordering, and unnecessary `!important` rules can make it difficult to understand why a particular style is applied.

## Our Goal

CascadeX aims to make CSS behavior easier to understand by providing:

* **CSS Conflict Detection:** Identify competing declarations.
* **Specificity Analysis:** Calculate and explain selector specificity.
* **Cascade Explanations:** Explain why a declaration wins.
* **Fragility Detection:** Identify potentially difficult-to-maintain styling patterns.
* **Fix Suggestions:** Recommend improvements to CSS maintainability.
* **Project Analysis:** Gradually expand support for multi-file CSS projects.

## Technology Stack

* HTML5
* CSS3
* Vanilla JavaScript
* Node.js
* Express.js
* PostCSS

## Development Status

🚧 CascadeX is currently under development.

The initial release will focus on CSS parsing, selector specificity, and conflict analysis.

## Roadmap

1. Establish the project structure.
2. Build the initial dashboard.
3. Implement CSS parsing.
4. Develop selector specificity analysis.
5. Detect competing declarations.
6. Explain cascade outcomes.
7. Add fragility detection.
8. Integrate the analyzer with the dashboard.
9. Add automated tests.
10. Prepare the initial release.

## Project Philosophy

CascadeX aims to provide meaningful explanations rather than simply flagging every repeated selector as a problem.

CSS analysis must account for factors such as specificity, importance, cascade layers, source order, and conditional rules.

## License

A project license will be selected before the first public release.
