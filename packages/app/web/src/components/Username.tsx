// A username rendered in its rating-band colour, the way the legacy site colours
// names everywhere. The colour comes with the payload (server reads the shared
// band table), so this component only paints it.
export function Username({ name, color }: { name: string; color: string }) {
  return (
    <span className="font-semibold" style={{ color }}>
      {name}
    </span>
  )
}
