const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Centralized fetch wrapper:
 *  - always sends credentials so the HTTP-only auth cookie is included
 *  - on 401, dispatches a global "auth:expired" event so SessionExpiredModal can react
 *
 * Existing call sites can either migrate to apiFetch() OR add `credentials: "include"`
 * directly. Both are equivalent — the helper just centralizes the 401 dispatch.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    // Don't dispatch for auth routes — signin/signup show errors inline,
    // /auth/me is the AuthProvider's "am I logged in?" probe.
    if (!input.includes("/auth/")) {
      window.dispatchEvent(new Event("auth:expired"));
    }
  }
  return res;
}

export type SiteStatus = "pending" | "queued" | "processing" | "completed" | "failed";

export interface Site {
  id: string;
  url: string;
  status: SiteStatus;
  created_at: string | null;
  robots_allowed: boolean;
  ai_crawler_access: Record<string, boolean> | null;
  disallowed_paths?: string[];
  audit_status?: "pending" | "running" | "completed" | "failed";
  geo_status?: "pending" | "running" | "completed" | "failed";
  inventory_total?: number | null;
  inventory_sections?: Record<string, number> | null;
  inventory_strategy?: string | null;
  inventory_sample_size?: number | null;
}

export interface PageRow {
  id: number;
  address: string;
  type: string;
  content_type: string | null;
  status_code: number | null;
  status: string | null;
  indexability: string | null;
  indexability_status: string | null;
  title: string | null;
  title_length: number | null;
  meta_descp: string | null;
  h1: string | null;
  h2s: string[] | null;
  h3s: string[] | null;
  canonical: string | null;
  crawl_depth: number | null;
  response_time: number | null;
  language: string | null;
  last_modified: string | null;
  redirect_url: string | null;
  http_version: string | null;
  readability: string | null;
  alt_text: string | null;
}

export interface PagesResponse {
  site_id: string;
  total: number;
  pages: PageRow[];
}

export interface OverviewType {
  label: string;
  content_type: string;
  count: number;
  percent: number;
}

export interface OverviewResponse {
  site_id: string;
  total_urls: number;
  by_type: OverviewType[];
  images_total: number;
  images_missing_alt: number;
  images_optimized?: number;
  indexability_counts?: {
    indexable: number;
    non_indexable: number;
    external: number;
  };
  status_counts?: {
    ok: number;
    redirect: number;
    error_4xx: number;
    error_5xx: number;
  };
}

export async function startAnalysis(url: string): Promise<{ site_id: string; status: string; message: string; robots_allowed: boolean }> {
  const res = await apiFetch(`${API_BASE}/analyze/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail?.message ?? err.detail ?? "Analysis failed");
  }
  return res.json();
}

export async function getSite(taskId: string): Promise<Site> {
  const res = await apiFetch(`${API_BASE}/sites/${taskId}`);
  if (!res.ok) throw new Error("Crawl not found");
  return res.json();
}

export async function getPages(
  taskId: string,
  opts?: { type?: string; search?: string; skip?: number; limit?: number }
): Promise<PagesResponse> {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.skip != null) params.set("skip", String(opts.skip));
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  const q = params.toString();
  const url = `${API_BASE}/sites/${taskId}/pages${q ? `?${q}` : ""}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to load pages");
  return res.json();
}

export async function getOverview(taskId: string): Promise<OverviewResponse> {
  const res = await apiFetch(`${API_BASE}/sites/${taskId}/overview`);
  if (!res.ok) throw new Error("Failed to load overview");
  return res.json();
}

export interface PageSpeedResult {
  strategy: string;
  performance?: number;
  accessibility?: number;
  best_practices?: number;
  seo?: number;
  fcp?: string;
  lcp?: string;
  tbt?: string;
  cls?: string;
  speed_index?: string;
  tti?: string;
  error?: string;
}

export interface SecurityHeaderCheck {
  present: boolean;
  value: string | null;
  label: string;
}

export interface SecurityHeadersResult {
  headers: Record<string, SecurityHeaderCheck>;
  passed_count: number;
  total_count: number;
  error?: string;
}

export interface AuditResult {
  https: { passed: boolean; detail: string };
  sitemap: { found: boolean; url: string; status_code?: number; error?: string };
  broken_links: { count: number; urls: string[] };
  missing_canonicals: { total_html_pages: number; missing_count: number; urls: string[] };
  pagespeed: { desktop: PageSpeedResult; mobile: PageSpeedResult };
  security_headers?: SecurityHeadersResult | null;
}

export interface AuditResponse {
  site_id: string;
  audit_status: "pending" | "running" | "completed" | "failed";
  audit: AuditResult | null;
}

export async function getAudit(taskId: string): Promise<AuditResponse> {
  const res = await apiFetch(`${API_BASE}/sites/${taskId}/audit`);
  if (!res.ok) throw new Error("Failed to load audit");
  return res.json();
}

// ── GEO Analysis Types ──────────────────────────────────────────────────────

export type GeoStatus = "pending" | "running" | "completed" | "failed";

export interface SiteTypeResult {
  site_type: string;
  confidence: number;
  signals: string[];
}

export interface SchemaCompletenessIssue {
  url: string;
  type: string;
  missing_fields: string[];
}

export interface SchemaSemanticIssue {
  url: string;
  type: string;
  field: string;
  schema_value: string;
  issue: string;
}

export interface SchemaResult {
  has_json_ld: boolean;
  has_microdata: boolean;
  has_rdfa: boolean;
  schema_types: string[];
  coverage_percent: number;
  pages_with_schema: number;
  pages_without_schema: number;
  pages_analyzed: number;
  missing_recommended: string[];
  completeness_issues: SchemaCompletenessIssue[];
  semantic_issues?: SchemaSemanticIssue[];
}

export interface HeadingStructure {
  pages_with_h2: number;
  pages_with_h3: number;
  avg_headings_per_page: number;
}

export interface FaqPair {
  question: string;
  answer: string;
}

export interface FactualDensity {
  score: number;
  per_1000_words: number;
  stats_count: number;
  citations_count: number;
  expert_mentions: number;
  year_references: number;
  quotes_count: number;
}

export interface ContentResult {
  avg_word_count: number;
  median_word_count: number;
  reading_level: string;
  flesch_kincaid_grade: number;
  pages_with_faq: number;
  faq_questions: string[];
  faq_pairs?: FaqPair[];
  heading_structure: HeadingStructure;
  conversational_tone_score: number;
  thin_content_pages: number;
  pages_analyzed: number;
  avg_lists_per_page: number;
  factual_density?: FactualDensity;
}

export interface QueryPatterns {
  how_to: boolean;
  what_is: boolean;
  why: boolean;
  best: boolean;
  comparison: boolean;
}

export interface AnswerQuality {
  score: number;               // 0-100
  bluf_ratio: number;          // 0-1, answers that begin with the direct answer
  avg_answer_length: number;   // words; ideal 40-120
  self_contained_ratio: number; // 0-1, answers understandable without context
  confident_ratio: number;     // 0-1, declarative vs hedged language
  quality_label: "Excellent" | "Good" | "Fair" | "Poor";
}

export interface NlpResult {
  primary_intent: string;
  secondary_intents: string[];
  question_density: number;
  answer_blocks_detected: number;
  key_topics: string[];
  entity_types: string[];
  ai_snippet_readiness: "High" | "Medium" | "Low" | "Unknown";
  synonym_richness?: "High" | "Medium" | "Low";
  query_patterns?: QueryPatterns;
  reasoning: string;
  answer_quality?: AnswerQuality;
  source?: string;
  error?: string;
}

export interface ContentFreshness {
  freshness_score: number;
  pages_total: number;
  pages_with_dates: number;
  pages_30d: number;
  pages_90d: number;
  pages_180d: number;
  pages_older: number;
  has_blog_section: boolean;
  blog_post_count: number;
  blog_cadence: "none" | "irregular" | "quarterly" | "monthly" | "weekly" | "daily";
  last_update_label: string;
}

export interface EeatResult {
  eeat_score: number;
  has_about_page: boolean;
  has_contact_page: boolean;
  has_privacy_policy: boolean;
  has_author_pages: boolean;
  has_case_studies: boolean;
  has_faq_page: boolean;
  author_credentials_found: boolean;
  citations_found: boolean;
  content_freshness: boolean;
  expertise_signals: string[];
  trust_signals: string[];
  missing_signals: string[];
  freshness?: ContentFreshness;
}

export interface ScoreBreakdownItem {
  weight: number;
  raw: number;
  weighted: number;
}

export interface EngineScore {
  label: string;
  focus: string;
  score: number;
  grade: string;
}

export interface ScoreResult {
  overall_score: number;
  grade: string;
  site_type_modifier?: string;
  breakdown: {
    structured_data: ScoreBreakdownItem;
    eeat: ScoreBreakdownItem;
    conversational: ScoreBreakdownItem;
    technical: ScoreBreakdownItem;
    nlp: ScoreBreakdownItem;
    speed: ScoreBreakdownItem;
    probe?: ScoreBreakdownItem;
  };
  engine_scores?: Record<string, EngineScore>;
}

export interface Suggestion {
  title: string;
  description: string;
  fix: string;
  impact: "High" | "Medium" | "Low";
  category: string;
}

export interface SuggestionsResult {
  critical: Suggestion[];
  important: Suggestion[];
  optional: Suggestion[];
  source?: string;
}

// ── AI Visibility Probe Types ────────────────────────────────────────────────

export interface ProbeItem {
  query: string;
  response_excerpt: string | null;
  domain_mentioned: boolean;
  engine: string;
  error?: string;
}

export interface EngineProbeDetail {
  available: true;
  mention_count: number;
  mention_rate: number;
  probes: ProbeItem[];
}

export interface ProbeResult {
  questions: string[];
  domain_checked: string;
  engines: Record<string, EngineProbeDetail>;
  overall_mention_rate: number;
  visibility_label: "High" | "Medium" | "Low" | "Not Visible";
  engines_tested: number;
  source: string;
  note: string;
}

// ── Per-Page GEO Score Types ─────────────────────────────────────────────────

export interface PageScoreIssue {
  priority: "critical" | "important" | "optional";
  message: string;
}

export interface PageScoreResult {
  url: string;
  score: number;
  grade: string;
  word_count: number;
  has_schema: boolean;
  has_h1: boolean;
  has_meta_descp: boolean;
  has_canonical: boolean;
  has_author: boolean;
  has_date: boolean;
  has_citations: boolean;
  reading_grade: number;
  question_density: number;
  breakdown: {
    structured_data: number;
    eeat: number;
    content: number;
    meta: number;
    nlp: number;
  };
  issues: PageScoreIssue[];
  engine_scores?: {
    claude: number;
    chatgpt: number;
    gemini: number;
    grok: number;
    perplexity: number;
  };
}

export interface EntityScoreBreakdownItem {
  pts: number;
  max: number;
}

export interface EntityResult {
  entity_score: number;
  establishment_label: "Established" | "Emerging" | "Unknown";
  brand_name: string;
  wikipedia_found: boolean;
  wikipedia_url: string | null;
  wikipedia_pts: number;
  same_as_links: string[];
  same_as_platforms: Record<string, number>;
  same_as_pts: number;
  org_schema_present: boolean;
  org_fields_present: string[];
  org_fields_missing: string[];
  org_pts: number;
  authority_links: string[];
  authority_pts: number;
  score_breakdown: Record<string, EntityScoreBreakdownItem>;
}

export interface GeoResponse {
  site_id: string;
  geo_status: GeoStatus;
  site_type: SiteTypeResult | null;
  schema: SchemaResult | null;
  content: ContentResult | null;
  eeat: EeatResult | null;
  nlp: NlpResult | null;
  score: ScoreResult | null;
  suggestions: SuggestionsResult | null;
  probe: ProbeResult | null;
  entity: EntityResult | null;
  page_scores: PageScoreResult[] | null;
}

export async function getGeo(taskId: string): Promise<GeoResponse> {
  const res = await apiFetch(`${API_BASE}/sites/${taskId}/geo`);
  if (!res.ok) throw new Error("Failed to load GEO analysis");
  return res.json();
}

export function getGeoExportUrl(taskId: string, format: "csv" | "pdf"): string {
  return `${API_BASE}/sites/${taskId}/geo/export?format=${format}`;
}

// ── History Types ─────────────────────────────────────────────────────────────

export interface AuditSummary {
  https_passed: boolean | null;
  sitemap_found: boolean | null;
  broken_links_count: number | null;
  missing_canonicals_count: number | null;
  psi_desktop_performance: number | null;
  psi_mobile_performance: number | null;
}

/** List item — no geo_data blob (kept small for the list view and trend chart) */
export interface HistoryItem {
  id: string;
  url: string;
  domain: string;
  analyzed_at: string;
  overall_score: number | null;
  grade: string | null;
  site_type: string | null;
  pages_count: number | null;
  score_breakdown: ScoreResult["breakdown"] | null;
  audit_summary: AuditSummary | null;
}

/** Single record — includes full GeoResponse blob for comparison view */
export interface HistoryRecord extends HistoryItem {
  geo_data: GeoResponse | null;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

// ── History API Functions ─────────────────────────────────────────────────────

export async function getHistory(opts?: {
  domain?: string;
  limit?: number;
  offset?: number;
}): Promise<HistoryResponse> {
  const params = new URLSearchParams();
  if (opts?.domain) params.set("domain", opts.domain);
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  const q = params.toString();
  const res = await apiFetch(`${API_BASE}/history/${q ? `?${q}` : ""}`);
  if (!res.ok) throw new Error("Failed to load history");
  return res.json();
}

export async function getHistoryRecord(id: string): Promise<HistoryRecord> {
  const res = await apiFetch(`${API_BASE}/history/${id}`);
  if (!res.ok) throw new Error("History record not found");
  return res.json();
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete history record");
}

// ── Schedule Types ─────────────────────────────────────────────────────────

export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  url: string;
  domain: string;
  frequency: ScheduleFrequency;
  hour: number;
  day_of_week: number | null;
  day_of_month: number | null;
  enabled: boolean;
  created_at: string;
  last_run_at: string | null;
  next_run_at: string;
}

export interface SchedulesResponse {
  schedules: Schedule[];
}

export interface CreateSchedulePayload {
  url: string;
  frequency: ScheduleFrequency;
  hour: number;
  day_of_week?: number;
  day_of_month?: number;
}

export interface UpdateSchedulePayload {
  frequency?: ScheduleFrequency;
  hour?: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  enabled?: boolean;
}

export interface TriggerResponse {
  status: "queued" | "skipped";
  site_id: string | null;
  reason?: string;
}

// ── Schedule API Functions ─────────────────────────────────────────────────

export async function listSchedules(domain?: string): Promise<SchedulesResponse> {
  const params = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  const res = await apiFetch(`${API_BASE}/schedules/${params}`);
  if (!res.ok) throw new Error("Failed to load schedules");
  return res.json();
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
  const res = await apiFetch(`${API_BASE}/schedules/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Failed to create schedule");
  }
  return res.json();
}

export async function updateSchedule(id: string, payload: UpdateSchedulePayload): Promise<Schedule> {
  const res = await apiFetch(`${API_BASE}/schedules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update schedule");
  return res.json();
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE}/schedules/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete schedule");
}

export async function triggerSchedule(id: string): Promise<TriggerResponse> {
  const res = await apiFetch(`${API_BASE}/schedules/${id}/trigger`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to trigger schedule");
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let message = "Incorrect email or password. Please try again.";
    if (typeof err.detail === "string") {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((e: any) => e.msg ?? String(e)).join(". ");
    }
    const error = new Error(message);
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
}

export async function signUp(email: string, name: string, password: string): Promise<AuthUser> {
  const res = await apiFetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let message = "Something went wrong. Please try again.";
    if (typeof err.detail === "string") {
      message = err.detail;
    } else if (Array.isArray(err.detail)) {
      message = err.detail.map((e: any) => e.msg ?? String(e)).join(". ");
    }
    throw new Error(message);
  }
  return res.json();
}

export async function signOut(): Promise<void> {
  await apiFetch(`${API_BASE}/auth/logout`, { method: "POST" });
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  if (res.status === 401) return null;
  if (!res.ok) return null;
  return res.json();
}
