# DnD Kit Kanban Board

## Overview

Build a production Kanban board using `@dnd-kit/core` for drag-and-drop and `@dnd-kit/sortable` for sortable items within columns. Includes optimistic updates with React Query rollback on failure.

## Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture

```
DndContext (sensors, collision detection)
├── BoardColumn (useDroppable) — "todo"
│   ├── SortableContext
│   │   ├── WorkItemCard (useSortable) — draggable card
│   │   ├── WorkItemCard
│   │   └── ...
├── BoardColumn — "in_progress"
│   └── ...
├── BoardColumn — "review"
│   └── ...
└── BoardColumn — "done"
    └── ...
```

## Droppable Column

```tsx
import { useDroppable } from "@dnd-kit/core";

function BoardColumn({ id, title, items, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-gray-50 p-2",
        isOver && "ring-2 ring-blue-400 bg-blue-50/30"
      )}
    >
      <h3 className="mb-2 text-sm font-semibold">{title} ({items.length})</h3>
      <SortableContext items={items.map(i => i.id)}>
        {children}
      </SortableContext>
    </div>
  );
}
```

## Draggable Card

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function WorkItemCard({ item }: { item: WorkItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { status: item.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="rounded-md border bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <span className="text-xs font-mono text-gray-400">{item.id}</span>
      <p className="font-medium text-sm">{item.title}</p>
    </div>
  );
}
```

## DndContext with Optimistic Updates

```tsx
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

function SprintBoard() {
  const queryClient = useQueryClient();
  const { data: board } = useBoard(sprintId);
  const updateMutation = useUpdateWorkItem();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const newStatus = over.id as string;
    const oldStatus = active.data.current?.status;

    if (oldStatus === newStatus) return;

    // Optimistic update
    const prevBoard = queryClient.getQueryData(["board", sprintId]);
    queryClient.setQueryData(["board", sprintId], (old: BoardResponse) => {
      // Move item between columns
      const item = old.columns[oldStatus]?.find(i => i.id === itemId);
      if (!item) return old;
      return {
        ...old,
        columns: {
          ...old.columns,
          [oldStatus]: old.columns[oldStatus].filter(i => i.id !== itemId),
          [newStatus]: [...(old.columns[newStatus] || []), { ...item, status: newStatus }],
        },
      };
    });

    // API call
    updateMutation.mutate(
      { id: itemId, data: { status: newStatus } },
      {
        onError: () => {
          // Rollback on failure
          queryClient.setQueryData(["board", sprintId], prevBoard);
          toast.error("Failed to move item");
        },
      }
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {["todo", "in_progress", "review", "done"].map(status => (
          <BoardColumn key={status} id={status} items={board?.columns[status] || []}>
            {(board?.columns[status] || []).map(item => (
              <WorkItemCard key={item.id} item={item} />
            ))}
          </BoardColumn>
        ))}
      </div>
    </DndContext>
  );
}
```

## Key Patterns

1. **Sensors**: Use `PointerSensor` with `distance: 5` to prevent accidental drags on click
2. **Collision detection**: `closestCenter` works well for column-based layouts
3. **Optimistic updates**: Save previous state before mutation, rollback `onError`
4. **Status columns**: Map to real DB statuses (`todo`, `in_progress`, `review`, `done`)
5. **Data attribute**: Pass `data: { status }` in `useSortable` to know the source column

## Gotchas

- **"blocked" is not a valid status** — SQLite CHECK constraint only allows: `backlog`, `todo`, `in_progress`, `review`, `done`, `cancelled`
- **Touch devices**: Add `TouchSensor` to sensors array for mobile support
- **Accessibility**: @dnd-kit provides ARIA attributes automatically via `useSortable`
- **React Query invalidation**: After successful mutation, invalidate both `["board"]` and `["work-items"]` queries
