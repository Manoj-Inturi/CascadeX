# CascadeX — Architecture

## Overview

CascadeX is currently a client-side web application. The browser hosts the interface, editor behavior, CSS analysis, and local preferences. The current workflow does not require a backend API.

```mermaid
flowchart TD
    USER[Developer] --> HTML[HTML interface]
    HTML --> CSS[Stylesheet and themes]
    HTML --> APP[Application module]
    APP --> EDITOR[Editor features]
    APP --> ANALYZER[CSS analyzer module]
    ANALYZER --> REPORT[Structured issue results]
    REPORT --> APP
    APP --> UI[Results interface]
    APP <--> LOCAL[(Browser localStorage)]
```

## Modules

### `public/index.html`

Defines the application structure and the DOM elements used by the JavaScript application.

### `public/css/style.css`

Contains the visual system, responsive layout, theme styles, editor layout, syntax-token presentation, and results components.

### `public/js/app.js`

Coordinates browser interactions:

- Reads editor input.
- Updates character count and line numbers.
- Produces syntax-highlighted editor presentation.
- Handles CSS file selection.
- Calls the analyzer.
- Renders and filters findings.
- Manages theme preference and local history.
- Exports the analysis report.

### `public/js/analyzer.js`

Contains stylesheet parsing helpers and static analysis functions. It returns structured findings for the application to display.

## Analysis flow

```mermaid
sequenceDiagram
    actor Developer
    participant Editor as CSS Editor
    participant App as app.js
    participant Engine as analyzer.js
    participant Results as Results UI

    Developer->>Editor: Paste or upload CSS
    Editor->>App: Input changes
    Developer->>App: Select Analyze
    App->>Engine: Pass CSS source
    Engine->>Engine: Parse rules and declarations
    Engine->>Engine: Run analysis checks
    Engine-->>App: Return structured issues
    App->>Results: Render summary and issue cards
    Developer->>Results: Search, filter, sort, expand
```

## State and persistence

The application uses in-memory JavaScript state while the page is open. Browser `localStorage` is used for the theme preference and recent analysis history.

This is browser-local persistence. It is not cloud synchronization and is not shared across devices.

## Hosting

The live application is hosted on Vercel:

- Production URL: https://cascadex-tawny.vercel.app/
- Repository: https://github.com/Manoj-Inturi/CascadeX

The current app is static. Vercel serves the frontend files; no backend service is required for the documented analysis flow.

## Design constraints

- Keep the current implementation lightweight.
- Prefer browser-native APIs.
- Keep analysis separate from UI rendering.
- Return structured findings from the analyzer.
- Do not describe heuristic results as guaranteed browser cascade outcomes.
