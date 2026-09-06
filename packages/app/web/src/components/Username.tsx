import { Link } from 'react-router-dom'

// A username rendered in its rating-band colour, the way the legacy site colours
// names everywhere. The colour comes with the payload (server reads the shared
// band table). Clicking it opens that user's profile, as on the legacy site.
export function Username({ name, color }: { name: string; color: string }) {
  return (
    <Link to={`/profile/${name}`} className="font-semibold hover:underline" style={{ color }}>
      {name}
    </Link>
  )
}
