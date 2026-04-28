Section-wise post editing guide

Each public post now lives inside its own category folder as a full HTML file.

Folder layout:

- `sections/latest-results/`
- `sections/latest-jobs/`
- `sections/admit-card/`
- `sections/admission/`
- `sections/scholarship/`
- `sections/sarkari-yojana/`
- `sections/verification/`

How to edit a post:

1. Open the post file inside its section folder.
2. Update the text directly in that same HTML file.
3. Edit the visible sections you need, such as:
   - title and summary
   - important dates
   - fees
   - eligibility
   - age limit
   - notices
   - FAQs
   - important links
4. Run `node tools/generate-seo-post-pages.js` after editing.
5. If you want to refresh the deploy output too, run `node tools/build-pages-artifact.js`.

What the generator updates for you:

- `data.json`
- `sections/*/posts.json`
- `sections/sections-index.json`
- `sections/*/index.html`
- `sitemap.xml`

Backward compatibility:

- Old `post.html?slug=...` links are kept working and resolve to the section post path.
- Existing section URLs stay active.
