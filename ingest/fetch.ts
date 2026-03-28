async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchHtml(url: string): Promise<string> {
  const retryableStatuses = new Set([502, 503, 504]);
  let lastError: Error | null = null;
  const timeoutMs = 60000;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) {
        if (retryableStatuses.has(response.status) && attempt < 2) {
          console.warn(`Retrying ${url} after ${response.status} (attempt ${attempt + 1}/3)`);
          await delay(1000 * (attempt + 1));
          continue;
        }
        throw new Error(`Request failed for ${url}: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) {
        console.warn(`Retrying ${url} after fetch error (attempt ${attempt + 1}/3): ${lastError.message}`);
        await delay(1000 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error(`Request failed for ${url}`);
}

export async function fetchProxyMarkdown(url: string): Promise<string> {
  const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
  return await fetchHtml(proxyUrl);
}