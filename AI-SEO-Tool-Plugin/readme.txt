=== AI SEO Tool ===
Contributors: aiseo
Tags: seo, ai, geo, citation-readiness, generative-engine-optimization
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 8.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Connect your WordPress site to AI SEO Tool for full GEO (Generative Engine Optimization) citation readiness audits, directly inside your admin dashboard.

== Description ==

**AI SEO Tool** is the official WordPress plugin for [AI SEO Tool](https://ai-seo-tool.com). It connects your site to the AI SEO Tool backend so you can run comprehensive GEO Citation Readiness Audits without leaving the WordPress admin.

The plugin acts as a thin client — all analysis is performed by the AI SEO Tool backend. Your site's data is fetched and displayed inside four admin tabs.

= What is GEO (Generative Engine Optimization)? =

GEO measures how likely AI-powered search engines — ChatGPT, Perplexity, Gemini, Claude, and Grok — are to find, understand, and cite your site in their responses. The plugin gives you a single **AI Citation Readiness Score** (0–100, graded A–F) plus per-engine breakdowns so you know exactly where to focus.

= Features =

**Dashboard Tab**
* One-click "Analyze This Site" button to start a full audit
* Live progress indicator while the crawl runs
* Semi-circle GEO citation score gauge with letter grade
* HTTP status summary (security headers, Core Web Vitals)
* Crawled pages table showing URLs, status codes, and per-page scores

**GEO Analysis Tab** *(Pro / Agency)*
* Overall AI Citation Readiness Score with score breakdown
* Per-engine scores and focus areas: ChatGPT, Perplexity, Gemini, Claude, Grok
* Prioritised improvement suggestions (Critical / Important / Optional)
* E-E-A-T (Expertise, Experience, Authoritativeness, Trustworthiness) breakdown
* Schema / structured data coverage and missing type alerts
* Content quality metrics: word count, reading level, thin content, FAQ detection
* NLP snippet readiness: intent detection, answer quality, question density
* AI visibility probe: simulated mention rates across 5 AI engines
* Entity authority analysis: Wikipedia presence, sameAs profiles, organisation schema

**History Tab** *(Pro / Agency)*
* List of all past audits for your site with date, score, grade, and page count
* Domain filtering to find audits quickly
* Delete individual audit records
* Score trend visible across entries

**Schedules Tab** *(Pro / Agency)*
* Schedule fully automated recurring audits (Daily / Weekly / Monthly)
* Native time picker — choose the exact hour and minute
* Full timezone selector (all IANA timezone names with UTC offset labels)
* Enable / disable individual schedules without deleting them
* Run Now button to trigger any schedule immediately
* Next run countdown and last run date shown on each card

= Requirements =

* An active **AI SEO Tool** account (free tier available)
* The **AI SEO Tool backend** accessible at the configured URL (self-hosted or provided)
* A valid **API key** generated from your account's Settings > API Keys Section

== Installation ==

= From the WordPress Admin =

1. Go to **Plugins > Add New** in your WordPress admin
2. Search for **AI SEO Tool**
3. Click **Install Now**, then **Activate**
4. Navigate to **AI SEO Tool** in the left-hand admin menu
5. Enter your API key and click **Connect Account**

= Manual Installation =

1. Download the plugin zip file
2. Upload the `ai-seo-tool` folder to `/wp-content/plugins/`
3. Activate the plugin through **Plugins** in the WordPress admin
4. Navigate to **AI SEO Tool > Settings** and enter your API key
5. Click **Connect Account** to link your account

= Configuration =

After activation, the plugin connects to the AI SEO Tool backend at the URL defined in the plugin configuration. If you are self-hosting the backend, edit the `AI_SEO_TOOL_BACKEND_URL` constant in `ai-seo-tool.php` to point to your backend server before activating.

== Frequently Asked Questions ==

= Where do I get an API key? =

Log in to your AI SEO Tool account, go to **Settings > API Keys**, and generate a new key. Copy and paste it into the plugin's connection screen.

= Does the plugin store any analysis data in the WordPress database? =

No. The plugin stores only your API key (in `wp_options`). All audit data — pages, scores, history, schedules — lives in the AI SEO Tool backend and is fetched on demand. WordPress is a thin client.

= Can I run audits on sites other than the current WordPress site? =

The plugin is designed to audit the WordPress site it is installed on. The site URL is automatically detected and used as the audit target. To audit other domains, use the main AI SEO Tool web application directly.

= How often can I run audits? =

This depends on your plan. Free accounts have a monthly quota. Pro accounts have a higher limit. Agency accounts have unlimited audits. The Dashboard header shows your current usage and limit.

= What are scheduled audits and how do they work? =

Scheduled audits let you automate recurring re-audits on a Daily, Weekly, or Monthly basis. You pick a time and timezone in the Schedules tab — the AI SEO Tool backend scheduler checks every 60 seconds and triggers a new crawl when the schedule is due. Results appear in the History tab automatically.

= Why do I see "Upgrade to Pro" on some tabs? =

The GEO Analysis, History, and Schedules tabs require a Pro or Agency plan. If you are on the Free plan, these tabs display an upgrade prompt. Visit your account settings to upgrade.

= The plugin shows a connection error. What should I check? =

1. Confirm the AI SEO Tool backend is running and reachable from your WordPress server
2. Verify the backend URL configured in `ai-seo-tool.php` is correct
3. Check that your API key is valid and has not been revoked
4. Ensure your server can make outbound HTTP requests (some hosts block this)

= How do I disconnect the plugin? =

Go to **AI SEO Tool > Settings** and click **Disconnect**. This clears your stored API key. The plugin will return to the connection screen on next load.

= Does activation make any external API calls? =

No. The plugin makes no external requests on activation. The first network call only happens when you submit an API key on the connection screen.

== Screenshots ==

1. **Connection screen** — Enter your API key to link your AI SEO Tool account.
2. **Dashboard tab** — GEO citation score gauge, HTTP status summary, and crawled pages table.
3. **GEO Analysis tab** — Per-engine scores, E-E-A-T breakdown, and prioritised suggestions.
4. **History tab** — Past audit records with scores, grades, and delete controls.
5. **Schedules tab** — Create and manage recurring audits with time picker and timezone selector.
6. **Settings page** — View your connection status and disconnect your account.

== Changelog ==

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.0.0 =
Initial release. No upgrade steps required.
