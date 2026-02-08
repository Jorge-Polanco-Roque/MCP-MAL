import { useQuery } from "@tanstack/react-query";
import { fetchHealth, fetchCatalog, fetchStats } from "../lib/api";
import type { Collection } from "../lib/types";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30000,
    retry: 2,
  });
}

export function useCatalog(collection: Collection, category?: string) {
  return useQuery({
    queryKey: ["catalog", collection, category],
    queryFn: () => fetchCatalog(collection, category),
    retry: 2,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60000,
    retry: 2,
  });
}
