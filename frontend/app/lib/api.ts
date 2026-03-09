const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type SiteStatus = "pending" | "queued" | "processing" | "completed" | "failed";

export interface Site {
  id: string;
  url: string;
  status: SiteStatus;
  created_at: string | null;
  robots_allowed: boolean;
  ai_crawler_access: Record<string, boolean> | null;
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
