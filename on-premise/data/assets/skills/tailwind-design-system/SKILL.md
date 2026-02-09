# Tailwind Design System

## Overview
MAL's custom Tailwind CSS design system. Built on Tailwind CSS 4 with custom color palette, responsive patterns, and component recipes.

## Color Palette (mal-*)
```css
@theme {
  --color-mal-50: #eff6ff;
  --color-mal-100: #dbeafe;
  --color-mal-200: #bfdbfe;
  --color-mal-300: #93c5fd;
  --color-mal-400: #60a5fa;
  --color-mal-500: #3b82f6;
  --color-mal-600: #2563eb;
  --color-mal-700: #1d4ed8;
  --color-mal-800: #1e40af;
  --color-mal-900: #1e3a8a;
  --color-mal-950: #172554;
}
```

## Component Recipes

### Button
```html
<button class="bg-mal-600 hover:bg-mal-700 text-white px-4 py-2 rounded-lg
               font-medium transition-colors duration-150
               focus:outline-none focus:ring-2 focus:ring-mal-500 focus:ring-offset-2
               disabled:opacity-50 disabled:cursor-not-allowed">
  Click me
</button>
```

### Card
```html
<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200
            dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Title</h3>
  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Content</p>
</div>
```

### Badge
```html
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
             font-medium bg-mal-100 text-mal-800 dark:bg-mal-900 dark:text-mal-200">
  devops
</span>
```

## Responsive Breakpoints
- `sm:` — 640px (mobile landscape)
- `md:` — 768px (tablet)
- `lg:` — 1024px (desktop)
- `xl:` — 1280px (wide desktop)

## Dark Mode
Use `dark:` variant. Toggle via class strategy:
```html
<html class="dark">
```

## Animation Utilities
```css
@keyframes slide-up { from { transform: translateY(10px); opacity: 0; } }
.animate-slide-up { animation: slide-up 0.3s ease-out; }
```

## Best Practices
- Use `cn()` utility for conditional class merging
- Prefer Tailwind utilities over custom CSS
- Extract repeated patterns into component variants, not CSS classes
- Use CSS variables for dynamic theming
