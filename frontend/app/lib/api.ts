const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type SiteStatus = "pending" | "queued" | "processing" | "completed" | "failed";

export interface Site {
  id: string;
  url: string;
  status: SiteStatus;
  created_at: string | null;
  robots_allowed: boolean;
  ai_crawler_access: Record<string, boolean> | null;
  audit_status?: "pending" | "running" | "completed" | "failed";
  geo_status?: "pending" | "running" | "completed" | "failed";
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
  canonical: string | null;
  crawl_depth: number | null;
  response_time: number | null;
  language: string | null;
  last_modified: string | null;
  redirect_url: string | null;
  redirect_type: string | null;
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
  images_total: number;
  images_missing_alt: number;
  by_type: OverviewType[];
}

export async function startAnalysis(url: string): Promise<{ site_id: string; status: string; message: string; robots_allowed: boolean }> {
  const res = await fetch(`${API_BASE}/analyze/`, {
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
  const res = await fetch(`${API_BASE}/sites/${taskId}`);
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
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load pages");
  return res.json();
}

export async function getOverview(taskId: string): Promise<OverviewResponse> {
  const res = await fetch(`${API_BASE}/sites/${taskId}/overview`);
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

export interface AuditResult {
  https: { passed: boolean; detail: string };
  sitemap: { found: boolean; url: string; status_code?: number; error?: string };
  broken_links: { count: number; urls: string[] };
  missing_canonicals: { total_html_pages: number; missing_count: number; urls: string[] };
  pagespeed: { desktop: PageSpeedResult; mobile: PageSpeedResult };
}

export interface AuditResponse {
  site_id: string;
  audit_status: "pending" | "running" | "completed" | "failed";
  audit: AuditResult | null;
}

export async function getAudit(taskId: string): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/sites/${taskId}/audit`);
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
}

export interface HeadingStructure {
  pages_with_h2: number;
  pages_with_h3: number;
  avg_headings_per_page: number;
}

export interface ContentResult {
  avg_word_count: number;
  median_word_count: number;
  reading_level: string;
  flesch_kincaid_grade: number;
  pages_with_faq: number;
  faq_questions: string[];
  heading_structure: HeadingStructure;
  conversational_tone_score: number;
  thin_content_pages: number;
  pages_analyzed: number;
  avg_lists_per_page: number;
}

export interface NlpResult {
  primary_intent: string;
  secondary_intents: string[];
  question_density: number;
  answer_blocks_detected: number;
  key_topics: string[];
  entity_types: string[];
  ai_snippet_readiness: "High" | "Medium" | "Low" | "Unknown";
  reasoning: string;
  source?: string;
  error?: string;
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
}

export interface ScoreBreakdownItem {
  weight: number;
  raw: number;
  weighted: number;
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
  };
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
}

export async function getGeo(taskId: string): Promise<GeoResponse> {
  const res = await fetch(`${API_BASE}/sites/${taskId}/geo`);
  if (!res.ok) throw new Error("Failed to load GEO analysis");
  return res.json();
}

export function getGeoExportUrl(taskId: string, format: "csv" | "pdf"): string {
  return `${API_BASE}/sites/${taskId}/geo/export?format=${format}`;
}
