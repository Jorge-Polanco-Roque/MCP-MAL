import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../constants.js";
import type { QueryOptions } from "../types.js";

export function buildQueryOptions(args: {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_dir?: string;
  category?: string;
  tags?: string;
  status?: string;
}): QueryOptions {
  const filters: Record<string, unknown> = {};

  if (args.category) filters.category = args.category;
  if (args.tags) filters.tags = args.tags;
  if (args.status) filters.status = args.status;

  return {
    limit: Math.min(args.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT),
    offset: args.offset ?? 0,
    order_by: args.order_by ?? "updated_at",
    order_dir: (args.order_dir as "asc" | "desc") ?? "desc",
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}
