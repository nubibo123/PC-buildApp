import os
import random
import sys
import time
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

def _build_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Referer": "https://www.amazon.com/",
        "Connection": "keep-alive",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
    }

def _get_proxies():
    proxy = os.getenv("AMAZON_PROXY") or os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY")
    if proxy:
        return {"http": proxy, "https": proxy}
    return None

def get_amazon_image_link(query):
    search_url = f"https://www.amazon.com/s?k={requests.utils.quote(query)}"
    proxies = _get_proxies()
    max_retries = 3
    backoff_base = 4
    for attempt in range(1, max_retries + 1):
        try:
            headers = _build_headers()
            response = requests.get(search_url, headers=headers, proxies=proxies, timeout=20)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                # Try multiple selectors for robustness
                img_tag = soup.select_one('div.s-main-slot img.s-image')
                if not img_tag:
                    img_tag = soup.find('img', {'class': 's-image'})
                if not img_tag:
                    print(f"No image found for {query}. HTML snippet:")
                    print(response.text[:1200])
                    return ""
                return img_tag.get('src') or ""
            elif response.status_code in (429, 503):
                wait = backoff_base * attempt + random.uniform(1, 3)
                print(f"Got {response.status_code} for {query}. Retry {attempt}/{max_retries} after {wait:.1f}s...")
                time.sleep(wait)
                continue
            else:
                print(f"Failed to fetch Amazon page for {query}, status code: {response.status_code}")
                return ""
        except requests.RequestException as e:
            wait = backoff_base * attempt + random.uniform(1, 3)
            print(f"Error fetching {query}: {e}. Retry {attempt}/{max_retries} after {wait:.1f}s...")
            time.sleep(wait)
    return ""

def update_csv_with_images(csv_path, limit: int | None = None):
    df = pd.read_csv(csv_path)
    if 'image_link' not in df.columns:
        df['image_link'] = ""
    found = 0
    for idx, row in df.iterrows():
        # Skip if image_link already exists and is not empty
        if isinstance(row.get('image_link', None), str) and row['image_link'].strip():
            continue
        print(f"Searching for: {row['name']}")
        img_link = get_amazon_image_link(row['name'])
        df.at[idx, 'image_link'] = img_link
        print(f"Found: {img_link}")
        if img_link:
            found += 1
        if found > 0 and found % 5 == 0:
            df.to_csv(csv_path, index=False)
            print(f"CSV updated with {found} image links so far.")
        time.sleep(random.uniform(8, 15))  # Randomized delay to reduce blocking
        # Stop early if batch limit reached
        if limit is not None and found >= limit:
            break
    df.to_csv(csv_path, index=False)
    print("CSV updated with image links.")

def main():
    # Prevent running multiple Amazon scraping scripts concurrently
    root_dir = Path(__file__).resolve().parents[1]
    lock_file = root_dir / "amazon_scrape.lock"
    if lock_file.exists():
        print("Another Amazon scraping script appears to be running. Please run scripts one at a time.")
        return
    try:
        lock_file.write_text("locked")
        # Determine batch limit from env var or first CLI arg
        batch_limit = None
        env_limit = os.getenv("BATCH_LIMIT")
        if env_limit and env_limit.isdigit():
            batch_limit = int(env_limit)
        elif len(sys.argv) > 1:
            try:
                batch_limit = int(sys.argv[1])
            except ValueError:
                batch_limit = None
        update_csv_with_images("csv/internal-hard-drive.csv", limit=batch_limit)
    finally:
        try:
            lock_file.unlink()
        except FileNotFoundError:
            pass

if __name__ == "__main__":
    main()