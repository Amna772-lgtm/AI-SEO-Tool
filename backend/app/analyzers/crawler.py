import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse


def normalize_url(url: str) -> str:
    if not url.startswith("http"):
        return "https://" + url
    return url


def crawl_homepage(url: str):

    url = normalize_url(url)

    with httpx.Client(
        timeout=15,
        follow_redirects=True,
        headers={
            "User-Agent": "AI-SEO-Bot/1.0"
        }
    ) as client:
        response = client.get(url)

    soup = BeautifulSoup(response.text, "lxml")

    # Extract title
    title = soup.title.string.strip() if soup.title and soup.title.string else None

    # Extract meta description
    meta_description = None
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag:
        meta_description = meta_tag.get("content")

    # Extract H1
    h1 = None
    h1_tag = soup.find("h1")
    if h1_tag:
        h1 = h1_tag.get_text(strip=True)

    # Extract canonical
    canonical = None
    canonical_tag = soup.find("link", rel="canonical")
    if canonical_tag:
        canonical = canonical_tag.get("href")

    # Extract all JSON-LD structured data
    json_ld_blocks = []
    for script in soup.find_all("script", type="application/ld+json"):
        if script.string:
            json_ld_blocks.append(script.string.strip())

    # Count links
    links = soup.find_all("a", href=True)
    internal_links = 0
    external_links = 0

    base_host = response.url.host

    for link in links:
        href = link["href"]

        if href.startswith("http"):
            parsed_link = urlparse(href)
            if parsed_link.netloc == base_host:
                internal_links += 1
            else:
                external_links += 1
        else:
            internal_links += 1

    if response.status_code == 200:
        return {
            "url": str(response.url),
            "status_code": response.status_code,
            "title": title,
            "meta_description": meta_description,
            "h1": h1,
            "canonical": canonical,
            "internal_links": internal_links,
            "external_links": external_links,
            "json_ld": json_ld_blocks,
            "html": response.text
        }
    else:
        return {
            "url": str(response.url),
            "status_code": response.status_code,
            "title": None,
            "meta_description": None,
            "h1": None,
            "canonical": None,
            "internal_links": 0,
            "external_links": 0,
            "json_ld": [],
            "html": None
        }