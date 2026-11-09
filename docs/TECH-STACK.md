# CascadeX — Technology Stack

## Current stack

| Layer | Technology | Purpose |
|---|---|---|
| Markup | HTML5 | Semantic page structure |
| Styling | CSS3 | Layout, responsive behavior, themes, editor and result styling |
| Application logic | Vanilla JavaScript | Browser interactions and application state |
| Module system | JavaScript ES modules | Separates application and analyzer code |
| Browser APIs | DOM, File APIs, localStorage | Editor interaction, CSS file loading, local preferences and history |
| Fonts | Google Fonts: DM Sans, DM Mono, Manrope | Interface and code typography |
| Hosting | Vercel | Static deployment |
| Source control | Git and GitHub | Version control and collaboration workflow |

## Why this stack?

- **HTML and CSS** provide a direct, framework-free interface.
- **Vanilla JavaScript** keeps the application lightweight and makes browser behavior explicit.
- **ES modules** separate interface logic from analysis logic.
- **Browser APIs** provide file input and local persistence without requiring a server for the current feature set.
- **Vercel** provides static hosting for the deployed frontend.

## Runtime model

The current application runs in the user's browser. The CSS entered into the editor is analyzed client-side by the JavaScript analyzer.

No server-side database, authentication service, or backend API is required for the current workflow.

## External resources

The interface loads typography from Google Fonts. If the font service is unavailable, the browser uses the CSS fallback font stack.
