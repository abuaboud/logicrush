export function TagChip({ name }: { name: string }) {
  return (
    <span className="bg-primary text-primary-foreground me-1 inline-block rounded px-2 py-0.5 text-xs font-medium">
      {name}
    </span>
  )
}
