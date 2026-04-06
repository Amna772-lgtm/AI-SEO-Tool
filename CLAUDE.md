## WHAT THIS TOOL IS
An AI-powered SEO audit and citation readiness platform. A user submits any website URL and the system automatically:
- Crawls every page on the site
- Extracts all SEO metadata from each page
- Runs a full technical health check across the whole site
- Runs a GEO (Generative Engine Optimization) analysis to score how likely AI-powered search engines are to cite the site
- Stores results and allows users to schedule recurring re-audits

---

## HOW THE SYSTEM IS STRUCTURED (Infrastructure)

Three services run together in containers:

1. **Redis** — a fast in-memory database that temporarily holds crawl data and acts as the job queue. Data stored here expires after 2 hours.

2. **Backend API** — the main server that receives requests from the browser, manages jobs, and returns results. It runs continuously and is the single source of truth for all data operations.

3. **Celery Worker** — a separate background process that picks up crawl jobs from the queue and does all the heavy work (crawling, analysis, scoring). It also runs a built-in scheduler that checks every 60 seconds if any recurring audits are due.

Completed analyses are saved permanently to a local database on disk (SQLite), separate from the temporary Redis store.

Two external APIs are used:
- **Google PageSpeed Insights** — for performance scores and Core Web Vitals
- **Anthropic Claude API** — for AI-powered NLP analysis, multi-engine visibility probing, and suggestion generation

---

## FULL END-TO-END WORKFLOW

### STEP 1 — USER SUBMITS A URL

The user opens the web interface, types a website URL into the input bar at the top, and clicks "Start".

Before anything else, the system:
- Validates the URL (adds https:// if missing, checks format, rejects private network addresses, enforces max length)
- Checks the site's robots.txt file to see whether crawling is allowed
- Also checks whether 7 specific AI crawl bots are allowed or blocked (GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, Anthropic-AI, Claude-Web, and the tool's own bot)

If the site blocks crawling, the request is rejected with an error. If allowed, a unique job ID is created and the job is added to the background queue. The browser immediately receives the job ID so it can track progress.

---

### STEP 2 — URL INVENTORY (for large sites)

Before the crawl starts, the worker checks if the site has a sitemap.

If the site has a sitemap:
- The worker fetches it (handles compressed sitemaps too)
- Parses all URLs listed, up to ~4,000
- Records each page's section (e.g., "blog", "products", "docs" from the first path segment)
- Records last-modified dates and sitemap priority values
- Stores a count of total URLs and a breakdown by section

This inventory is used to decide how to crawl the site:
- **Large site (100+ URLs in sitemap):** Uses "smart sampling" — selects a representative 50–100 URLs spread across all sections, weighted by recency and priority. This avoids crawling thousands of pages while still getting a fair cross-section.
- **Small site or no sitemap:** Uses traditional exploration — follows every internal link found, starting from the homepage.

---

### STEP 3 — CRAWLING THE SITE

The worker begins visiting pages. Regardless of strategy, 50 pages can be fetched simultaneously for speed, and each page has a 15-second timeout.

For every page visited, the tool records over 20 data points:

**Identity & Status**
- Full URL address
- Type of resource (HTML page, image, PDF, etc.)
- Content type (what the server said it is)
- HTTP status code (200, 301, 404, etc.)
- Whether the page redirects, and where it redirects to
- Redirect type (permanent or temporary)

**SEO Metadata**
- Page title and its character length
- Meta description
- First H1 heading
- All H2 and H3 headings found
- Canonical URL (the declared "official" version of the page)
- Page language

**Crawl Context**
- Crawl depth (how many clicks from the homepage)
- Response time in milliseconds
- HTTP version used
- Timestamp of when the page was crawled
- Whether the page is indexable by search engines

**Content Quality**
- Readability score (Flesch-Kincaid grade level)

**Images**
- All images found with their alt text (or lack of it)

Pages are saved as they are discovered — the user sees results appearing in real time without waiting for the full crawl to finish.

---

### STEP 4 — TECHNICAL CHECKS (run in parallel with the crawl)

While pages are being crawled, a separate process simultaneously runs site-wide technical checks:

1. **HTTPS** — Is the entire site served over a secure connection?

2. **Sitemap** — Does the site have a sitemap? (Checks robots.txt first, then common paths)

3. **Google PageSpeed Insights** — Requests desktop and mobile performance scores. Returns:
   - Overall performance score (0-100)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)
   - Speed Index (SI)

4. **Security Headers** — Checks whether the site includes these HTTP security headers:
   - HSTS (forces HTTPS)
   - Content Security Policy
   - X-Frame-Options (clickjacking protection)
   - X-Content-Type-Options
   - Referrer-Policy

After the crawl finishes, two more page-level checks run:

5. **Broken Links** — Any internal or external link that returned a 4xx or 5xx error

6. **Missing Canonicals** — Any HTML page that lacks a canonical URL tag

---

### STEP 5 — GEO ANALYSIS PIPELINE (runs after crawl)

Once all pages are collected, the GEO (Generative Engine Optimization) pipeline runs. This evaluates how well the site is positioned to be cited by AI-powered search engines like ChatGPT, Perplexity, Gemini, Grok, and Claude.

The pipeline intelligently selects 15–40 of the most valuable pages to analyze in depth (homepage, about page, blog posts, product pages, etc.) rather than analyzing every page.

The analysis happens in two waves of parallel tasks:

---

**Wave 0 — Site Type Detection**

Runs first because all other analyses depend on knowing what kind of site this is.

Classifies the site as one of: e-commerce, blog, news, SaaS/software, service business, portfolio, community, or informational.

Uses three signals:
- URL path patterns (e.g., /cart, /pricing, /blog)
- Structured data type found on the site (e.g., Product schema, BlogPosting schema)
- Keywords in the homepage content (e.g., "add to cart", "free trial", "subscribe")

---

**Wave 1 — Four Parallel Heuristic Analyses**

All four run at the same time:

**A. Structured Data (Schema) Analysis**
Finds and evaluates machine-readable markup embedded in page HTML.
Looks for three formats: JSON-LD (script blocks), Microdata (HTML attributes), RDFa (semantic tags).

Reports:
- Which formats are present
- What schema types are used (Article, Product, Organization, FAQ, BreadcrumbList, etc.)
- What percentage of pages have schema markup
- Which recommended schema types are missing (based on site type)
- Completeness issues — required fields that are empty or missing
- Semantic mismatches — where schema values don't match actual page content

**B. Content Quality Analysis**
Measures the depth and structure of the site's written content.

Reports:
- Average word count per page
- Reading level (Flesch-Kincaid grade: Elementary / High School / College)
- How many pages have FAQ sections (identified by question patterns)
- How many pages are "thin" (under 300 words)
- Conversational tone score (use of second-person language like "you" and "your")
- Heading structure (how many pages use H2s, H3s, average headings per page)
- Average use of lists (bullet points, numbered lists)
- Factual density — counts statistics (%), currency values, citations, expert credentials, year references, and quoted material

**C. E-E-A-T Analysis (Expertise, Experience, Authoritativeness, Trustworthiness)**
Evaluates how trustworthy and credible the site appears.

Scores up to 100 points across:
- Presence of trust pages: About, Contact, Privacy Policy, Terms, FAQ, Author bio pages, Case Studies (20 pts each)
- Expertise signals: Professional credentials (MD, PhD), years of experience, awards (15 pts)
- Authority indicators: Founder/CEO/researcher titles, author bylines (10 pts each)
- Citations found in content (10 pts)
- Content freshness: Blog posts published within 90 days (10 pts)
- Additional trust: SSL mentions, phone numbers, physical addresses, money-back guarantees (5 pts each)

Also measures:
- Content freshness distribution (how many posts were published <30 days, <90 days, <180 days, older)
- Blog publication cadence (Daily / Weekly / Monthly / Irregular)

**D. Per-Page GEO Scoring**
Scores each individual page on 5 categories (with weights):
- Structured Data (25%)
- E-E-A-T signals (25%)
- Content Quality (20%)
- Meta Completeness — title, H1, meta description, canonical (15%)
- NLP/Semantic quality (15%)

Each page gets a 0-100 score and an A–F grade.

---

**Wave 2 — Three Parallel AI-Powered Analyses**

All three run at the same time, after Wave 1 completes:

**A. NLP & Snippet Readiness Analysis**
Evaluates how well the site's content is structured to be picked up and quoted by AI engines.

Reports:
- AI Snippet Readiness rating (Excellent / Good / Fair / Poor)
- Primary user intent (Informational / Commercial / Transactional / Navigational)
- Secondary intents found
- Question density (questions per 100 words)
- Number of answer blocks detected
- Synonym richness (High / Medium / Low)
- Answer quality score: measures how many answers follow BLUF format (bottom-line-upfront), are an optimal length (40-120 words), are self-contained (no context dependency), and use confident language (low hedging like "might", "could", "possibly")
- Key topic patterns detected (How-to, What-is, Comparison, Best, FAQ)
- If Claude API is configured: semantic reasoning analysis is run via AI

**B. Multi-Engine AI Visibility Probe**
Simulates how often the site would actually get mentioned by 5 AI engines.

Process:
1. Claude generates 5 brand-relevant questions about the site's topic
2. For each question, Claude simulates how each of the 5 engines (Claude, ChatGPT, Gemini, Grok, Perplexity) would respond
3. Scores whether the site is mentioned in each response
4. Calculates a mention rate per engine (0-100%)
5. Returns an overall mention rate and visibility label: Excellent (70%+) / Good (50-70%) / Fair (30-50%) / Poor (<30%)

**C. Entity Authority Analysis**
Measures how well-established the brand is as a recognized entity — a key factor for AI citation.

Scores up to 100 points:
- Wikipedia article exists for the brand: 35 points (strongest possible signal)
- sameAs profile links (LinkedIn, Crunchbase, Wikidata, etc.): up to 30 points
- Organization schema completeness (name, URL, logo, description, address, phone, founding date): up to 20 points
- Authority outbound links found on the site (links to Wikipedia, .gov, .edu, major news): up to 15 points

Returns an establishment label: Established / Emerging / Unknown.

---

**After Both Waves — Preliminary Score**
A preliminary citation score is computed from all Wave 1 and NLP results, available before the probe and entity checks finish.

**Suggestions Generation (runs in parallel with probe + entity)**
Claude generates a prioritized list of recommendations based on all analysis data so far. Recommendations are grouped into:
- Critical (impact >10 points on the score)
- Important (impact 5-10 points)
- Optional (impact <5 points)

Each recommendation includes: what to fix, why it matters, and which category it belongs to (Schema / E-E-A-T / Content / NLP / Technical / Speed).

If the Claude API is not configured, a rule-based fallback generates suggestions instead.

---

**Final Score Computation**
After all waves complete, the final AI Citation Readiness Score is calculated.

Unified weights (sum to 100):
- NLP intent clarity: 20%
- Structured data: 20%
- E-E-A-T trust signals: 15%
- Conversational content depth: 15%
- Entity establishment: 12%
- AI engine probe results: 8%
- Technical health: 5%
- Page speed: 5%

The score is returned as 0-100 with an A–F grade.

Additionally, the score is calculated separately for each AI engine (ChatGPT, Perplexity, Gemini, Claude, Grok) using engine-specific weights, since each engine prioritizes different signals.

---

### STEP 6 — PERSISTENCE

When the full analysis is complete, a permanent record is saved to the on-disk database. This stores:
- The URL and domain
- Date and time of analysis
- Overall score and grade
- Site type
- Total pages crawled
- All score breakdowns
- Full GEO analysis data blob
- Audit summary

This record persists indefinitely (no expiry) and powers the History and Schedules features.

---

### STEP 7 — FRONTEND DISPLAYS RESULTS

The browser polls for status updates throughout the process. Results appear across 7 sections of the UI:

---

**Dashboard**
The overview screen. Shows:
- Total URLs crawled with a progress bar
- Image SEO status (total images, how many are missing alt text, how many are optimized)
- GEO score with grade badge
- Donut chart of HTTP status code distribution (200s, 3xx, 4xx, 5xx, blocked)
- Donut chart of indexability (indexable %, non-indexable %, external %)
- Full searchable/filterable table of all pages with columns: Address, Type, Content-Type, Status Code, Status, Indexability, Title
- CSV export (current page or all pages)

---

**Spider (Crawl Tab)**
Detailed view of every crawled URL. Shows:
- Filter tabs (All / Internal / External)
- Search bar
- Inventory banner (if smart sampling was used, shows total sitemap URLs and sample size)
- Full table with columns: #, Address, Type, Status, Indexability, Title, Meta Description, H1, Canonical, Depth, Response Time, Redirect URL, Readability
- Clicking any row opens a detail panel at the bottom showing all data fields for that specific page
- Pagination

---

**Technical Audit**
Shows four summary cards:
- HTTPS: Secure or Not Secure
- Sitemap: Found or Not Found
- Broken Links: count (or "None Found")
- Canonicals: OK or X pages missing

If issues exist, scrollable lists show the specific broken links and pages missing canonicals.

Two side-by-side panels below:
- **Security Headers**: Checklist of 5 headers with pass/fail indicators
- **PageSpeed**: Semi-circular gauge charts for desktop and mobile scores, plus a grid of 5 Core Web Vitals metrics (FCP, LCP, TBT, CLS, Speed Index) for both

---

**GEO Analysis**
The main AI citation readiness dashboard. Shows:
- Large AI Citation Score ring (animated, color-coded: green=80+, orange=65-79, red-orange=50-64, red=<50)
- Score breakdown bar chart (6 categories with weights and scores)
- Per-engine score cards (ChatGPT, Perplexity, Gemini, Claude, Grok — each with score and focus description)
- Prioritized suggestions panel (Critical / Important / Optional tabs, expandable cards with fix instructions)

Then 7 sub-tabs:
1. **Schema** — structured data formats present, coverage %, detected types, missing recommended types, completeness issues, semantic mismatches
2. **Content** — word count, reading level, FAQ pages, thin content pages, tone score, heading structure, factual density breakdown, FAQ questions list
3. **E-E-A-T** — score circle, trust page checklist, content signals checklist, expertise signals, freshness distribution, missing signals list
4. **NLP** — snippet readiness rating, primary/secondary intent, question density, answer blocks, synonym richness, answer quality metrics, key topics, AI reasoning text
5. **Visibility** — overall mention rate, 5 engine cards with mention rates, test question list with per-engine pass/fail dots, expandable response excerpts
6. **Entity** — entity score, establishment label, brand name, 4-category score breakdown, Wikipedia status, sameAs profiles, organization schema checklist, authority links
7. **Pages** — per-page scores sorted worst-first, issue badges, expandable breakdown bars for each of the 5 scoring categories, engine-specific scores per page

---

**Insights**
Two panels:

**SEO Checklist** — an interactive task list derived from the analysis. Items are:
- Auto-checked if the issue was detected as already passing
- Manually checkable by the user to track their own progress
- Filterable by status (All / Todo / Done) and category (Schema / E-E-A-T / Content / NLP)
- Progress bar shows % resolved
- State is saved in the browser per site

**Site Structure** — a visual tree of the site's URL hierarchy:
- Color-coded dots: green (200), orange (3xx), red (4xx/5xx), gray (unknown)
- Expandable directory nodes with page counts
- Sample pages shown inline
- Query pattern badges (How-to / What is / Why / Best / Comparison) shown if NLP detected them

---

**History**
Tracks all past analyses. Shows:
- Domain filter
- Compare button (select any 2 for side-by-side comparison)
- Score trend line chart over time (7 series: overall + 6 categories, toggle each on/off)
- Cards for each past analysis with score ring, domain, date, score bar, delete button

Comparison view shows a full table of all metrics side by side with delta badges (improvement / decline).

---

**Schedules**
Manage recurring automated audits. Shows:
- Grid of schedule cards with: domain, enabled/disabled toggle, frequency, timing (day/hour UTC), next run countdown, last run date, Run Now button, Edit and Delete buttons
- Add Schedule button opens a form: URL, frequency (Daily / Weekly / Monthly), hour (UTC), day of week or month (if applicable)
- The scheduler checks every 60 seconds which schedules are due and automatically dispatches them as new crawl jobs

---

## SCORING SYSTEM SUMMARY

The final score is a 0-100 number called the **AI Citation Readiness Score**, graded A-F.

It answers: "How likely are AI-powered search engines to find, understand, and cite this website?"

The score has two views:
1. **Unified score** — one number for overall citation readiness
2. **Per-engine scores** — separate scores optimized for each AI engine's known priorities (ChatGPT, Perplexity, Gemini, Claude, Grok)

Score ranges: below 50 = Poor | 50–64 = Fair | 65–79 = Good | 80+ = Excellent

---

## DATA LIFECYCLE

| Data | Where Stored | How Long |
|------|-------------|----------|
| Live crawl pages & metadata | Redis (in-memory) | 2 hours then auto-deleted |
| GEO analysis results | Redis (in-memory) | 2 hours then auto-deleted |
| Completed analysis record | SQLite on disk | Permanent |
| Schedule records | SQLite on disk | Permanent |
| Checklist progress | Browser local storage | Until cleared |
