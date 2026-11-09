# CascadeX — Roadmap

This roadmap separates the completed baseline from future development. Items marked planned are not available in the current live application unless subsequently implemented.

## Completed — UI and editor foundation

- [x] Browser-based CSS workspace.
- [x] Light and dark themes.
- [x] CSS input and file upload.
- [x] Line numbers.
- [x] Fixed-height editor with vertical and horizontal scrolling.
- [x] CSS syntax highlighting.
- [x] Analysis results summary and severity filters.
- [x] Search and sorting for results.
- [x] Expandable issue details.
- [x] Local analysis history.
- [x] Report export.
- [x] Static CSS analysis checks.

## Next — Editor diagnostics

- [ ] Identify syntax problems more precisely.
- [ ] Highlight the affected line and token.
- [ ] Navigate from an issue to its source location.
- [ ] Improve keyboard navigation and editor accessibility.
- [ ] Add test fixtures for valid and invalid CSS examples.

## Next — Analyzer reliability

- [ ] Expand parsing coverage for modern CSS syntax.
- [ ] Improve nested at-rule handling.
- [ ] Add regression tests for selectors, declarations, variables, and cascade cases.
- [ ] Reduce duplicate or misleading findings.
- [ ] Clearly distinguish definite source patterns from heuristic warnings.
- [ ] Benchmark analysis with larger stylesheets.

## Future — Full project analysis

- [ ] Accept a website project ZIP.
- [ ] Validate archive contents and safely extract supported files.
- [ ] Identify HTML and CSS files.
- [ ] Map linked stylesheets to HTML documents.
- [ ] Analyze stylesheets across the project.
- [ ] Show findings grouped by file and source location.

## Future — CSS fix assistant

- [ ] Explain why a finding matters.
- [ ] Suggest a possible correction.
- [ ] Show before-and-after code.
- [ ] Let users accept or reject each proposed change.
- [ ] Preserve original project files.
- [ ] Generate a downloadable corrected project ZIP.

## Future — Project workflow

- [ ] Save named projects.
- [ ] Compare analysis runs.
- [ ] Export detailed reports.
- [ ] Improve accessibility and keyboard support.
- [ ] Add automated quality checks to the repository.

## Release principle

A roadmap item should only be marked complete after implementation, browser testing, and documentation updates. Static analysis findings should be validated against representative CSS examples before being presented as reliable checks.
