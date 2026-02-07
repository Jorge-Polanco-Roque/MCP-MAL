import type { PaginatedResult } from "../types.js";

export function formatAsMarkdown<T extends Record<string, unknown>>(
  result: PaginatedResult<T>,
  title: string
): string {
  if (result.items.length === 0) {
    return `## ${title}\n\nNo results found.`;
  }

  const lines: string[] = [`## ${title}`, ""];
  lines.push(`*Showing ${result.items.length} of ${result.total} results*`);
  lines.push("");

  for (const item of result.items) {
    const id = String(item.id ?? "unknown");
    const name = String(item.name ?? id);
    const description = String(item.description ?? "");
    lines.push(`### ${name} (\`${id}\`)`);
    lines.push(description);
    lines.push("");
  }

  if (result.has_more) {
    lines.push(`---`);
    lines.push(`*More results available. Use offset=${result.next_offset} to see next page.*`);
  }

  return lines.join("\n");
}

export function formatDetailAsMarkdown<T extends Record<string, unknown>>(
  item: T,
  title: string
): string {
  const lines: string[] = [`## ${title}`, ""];

  for (const [key, value] of Object.entries(item)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(`**${key}**: ${value.length > 0 ? value.join(", ") : "(none)"}`);
    } else if (typeof value === "object") {
      lines.push(`**${key}**: \`${JSON.stringify(value)}\``);
    } else {
      lines.push(`**${key}**: ${value}`);
    }
  }

  return lines.join("\n");
}

export function formatPaginationInfo<T>(result: PaginatedResult<T>): string {
  return JSON.stringify({
    total: result.total,
    count: result.items.length,
    has_more: result.has_more,
    next_offset: result.next_offset,
  });
}
