import type { HealthData, CatalogResponse, StatsResponse, Collection } from "./types";

const BASE = "";

export async function fetchHealth(): Promise<HealthData> {
  const res = await fetch(`${BASE}/api/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function fetchCatalog(
  collection: Collection,
  category?: string
): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/catalog/${collection}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchCatalogItem(
  collection: Collection,
  id: string
): Promise<CatalogResponse> {
  const res = await fetch(`${BASE}/api/catalog/${collection}/${id}`);
  if (!res.ok) throw new Error(`Catalog item fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}
