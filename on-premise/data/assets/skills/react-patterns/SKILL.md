# Modern React Patterns

## Overview
Production-ready React patterns used in the MAL frontend. All patterns use functional components with hooks — no class components.

## 1. Custom Hooks (Composition)
Extract reusable logic into custom hooks:
```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

## 2. React Query (Server State)
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['catalog', 'skills', { category }],
  queryFn: () => fetchSkills({ category }),
  staleTime: 30_000,
  refetchOnWindowFocus: false,
});
```

## 3. Compound Components
```tsx
function Tabs({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
}
Tabs.List = TabsList;
Tabs.Panel = TabsPanel;
```

## 4. Error Boundaries
```tsx
<ErrorBoundary fallback={<ErrorCard />}>
  <Suspense fallback={<Skeleton />}>
    <LazyComponent />
  </Suspense>
</ErrorBoundary>
```

## 5. Context Pattern
```tsx
const ThemeContext = createContext<Theme | null>(null);

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
```

## 6. Render Props (Rare, for Max Flexibility)
```tsx
<DataFetcher url="/api/items">
  {({ data, loading }) => loading ? <Spinner /> : <ItemList items={data} />}
</DataFetcher>
```

## MAL Conventions
- Prefer hooks over HOCs or render props
- Use React Query for all server state
- Use useState/useRef for local UI state
- Components: one file per component, co-locate styles
- Name files PascalCase for components, camelCase for hooks
