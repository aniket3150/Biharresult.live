# BiharResult.Live

A lightweight, mobile-first, SEO-ready Bihar education and job portal built with plain HTML, CSS, and JavaScript.

## Folder Structure

```text
biharresult-live/
|-- index.html
|-- about.html
|-- contact.html
|-- privacy-policy.html
|-- disclaimer.html
|-- terms.html
|-- latest-result.html
|-- latest-result-page-2.html
|-- admit-card.html
|-- admit-card-page-2.html
|-- latest-jobs.html
|-- latest-jobs-page-2.html
|-- admission.html
|-- admission-page-2.html
|-- answer-key.html
|-- answer-key-page-2.html
|-- syllabus.html
|-- syllabus-page-2.html
|-- university.html
|-- university-page-2.html
|-- bihar-board.html
|-- bihar-board-page-2.html
|-- css/
|   |-- style.css
|-- js/
|   |-- main.js
|   |-- posts-data.js
|-- posts/
|   |-- results/
|   |   |-- bihar-board-12th-result-2026.html
|   |   |-- bihar-board-10th-result-2026.html
|   |   |-- bihar-stet-result-2026.html
|   |-- admit-card/
|   |   |-- bihar-police-constable-admit-card-2026.html
|   |   |-- bihar-board-matric-admit-card-2026.html
|   |-- jobs/
|   |   |-- bpsc-tre-4-vacancy-2026.html
|   |-- answer-key/
|   |   |-- bihar-deled-answer-key-2026.html
|   |-- admission/
|   |   |-- bihar-graduation-admission-2026.html
|   |-- syllabus/
|   |   |-- bpsc-67th-syllabus-2026.html
|   |-- university/
|       |-- patna-university-result-2026.html
|       |-- lalit-narayan-mithila-university-notice-2026.html
|-- assets/
|   |-- images/
|   |-- icons/
|   |-- logo/
|       |-- logo.svg
|-- sitemap.xml
|-- robots.txt
|-- README.md
```

## How to Run Locally

1. Download or clone the project.
2. Open the project folder.
3. Double-click `index.html` (or run with VS Code Live Server).
4. All pages work without build tools.

## How to Edit an Existing Post

1. Open the target post file inside `posts/<category>/`.
2. Update these sections:
   - `<title>`, meta description, canonical URL
   - Post `<h1>` and intro
   - Highlight box fields
   - Important dates table
   - Important links table
   - FAQ content and FAQ schema text
3. Save file.
4. If post title/date/category changed, update `js/posts-data.js`.

## How to Add a New Post

1. Create new file in correct category folder, for example:
   - `posts/jobs/bssc-inter-level-vacancy-2026.html`
2. Copy structure from an existing post page.
3. Replace SEO tags, heading, content, tables, FAQ, and schema.
4. Add new object in `js/posts-data.js` `postsData` array:

```js
{
  id: 11,
  title: "BSSC Inter Level Vacancy 2026",
  category: "BSSC",
  status: "Latest Update",
  date: "2026-06-01",
  lastUpdated: "2026-06-01",
  organization: "Bihar Staff Selection Commission",
  shortName: "BSSC",
  url: "posts/jobs/bssc-inter-level-vacancy-2026.html",
  officialWebsite: "https://bssc.bihar.gov.in",
  badge: "Latest Update",
  priority: true,
  keywords: ["BSSC", "Inter Level", "Vacancy", "Bihar Job"]
}
```

5. Add direct HTML link where needed:
   - `index.html` Important Links or Quick Links sections
   - Category page (like `latest-result.html`, `admit-card.html`) if relevant
6. Add URL to `sitemap.xml`.

## Upload on Hostinger

1. Login to Hostinger hPanel.
2. Open **File Manager** for your domain.
3. Open `public_html`.
4. Upload all project files/folders from this project root.
5. Ensure `index.html` is directly inside `public_html`.
6. Visit your domain and test key pages.

## Push to GitHub

Run these commands from project root:

```bash
git init
git add .
git commit -m "Initial BiharResult.Live portal"
git branch -M main
git remote add origin https://github.com/your-username/biharresult-live.git
git push -u origin main
```

## Notes

- Important homepage links are already present in raw HTML for SEO crawlability.
- JavaScript enhances the UI (search, latest lists, FAQ accordion, mobile menu).
- Replace placeholder Telegram/WhatsApp links with your real channels before launch.
