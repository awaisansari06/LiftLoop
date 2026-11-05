# Page Overrides

Hierarchical retrieval: when building a page, read `../MASTER.md` first, then check for a
`<page-name>.md` here. **If the page file exists, its rules override the Master for that page
only.** If not, use the Master exclusively. Overrides state *deviations and compositions*, never a
full re-spec — anything not named inherits from Master.

Files map to routes: `landing.md` (`/`), `auth.md` (`/portal`, `/login`), `dashboard.md`
(`/student`, `/driver`, `/unified`), `ride-flow.md` (search/book/track/chat/create), `admin.md`
(`/admin`).
