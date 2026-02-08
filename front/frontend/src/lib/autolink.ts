/**
 * Auto-linking utility: converts @user, #sprint-id, and WI-xxx patterns
 * into clickable links within message text.
 */

interface LinkMatch {
  type: "user" | "sprint" | "work-item";
  raw: string;
  id: string;
  href: string;
}

const PATTERNS: { regex: RegExp; type: LinkMatch["type"]; hrefFn: (id: string) => string }[] = [
  {
    regex: /@([a-zA-Z][\w-]{0,30})/g,
    type: "user",
    hrefFn: (id) => `/profile/${id.toLowerCase()}`,
  },
  {
    regex: /#(sprint-[\w-]+)/gi,
    type: "sprint",
    hrefFn: () => `/sprints`,
  },
  {
    regex: /\b(WI-[\w-]+)/gi,
    type: "work-item",
    hrefFn: () => `/backlog`,
  },
];

/**
 * Find all auto-link matches in text.
 */
export function findLinks(text: string): LinkMatch[] {
  const matches: LinkMatch[] = [];
  for (const { regex, type, hrefFn } of PATTERNS) {
    // Reset regex state
    const re = new RegExp(regex.source, regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const id = m[1];
      matches.push({
        type,
        raw: m[0],
        id,
        href: hrefFn(id),
      });
    }
  }
  return matches;
}

/**
 * Convert text with @user, #sprint-id, WI-xxx into HTML with <a> links.
 */
export function autolinkHtml(text: string): string {
  let result = text;
  for (const { regex, type, hrefFn } of PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    result = result.replace(re, (_match, id) => {
      const href = hrefFn(id);
      const cls =
        type === "user"
          ? "text-purple-600 hover:underline"
          : type === "sprint"
            ? "text-blue-600 hover:underline"
            : "text-green-600 hover:underline";
      return `<a href="${href}" class="${cls} font-medium">${_match}</a>`;
    });
  }
  return result;
}

/**
 * Check if text contains any auto-linkable patterns.
 */
export function hasLinks(text: string): boolean {
  return PATTERNS.some(({ regex }) => {
    const re = new RegExp(regex.source, regex.flags);
    return re.test(text);
  });
}
