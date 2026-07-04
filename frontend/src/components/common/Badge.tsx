import './Badge.css'

// Status pill (§6.1 light-minimal): published → green soft, else draft → grey.
// Anything that is not 'published' renders as a draft badge.
export function Badge({ status }: { status?: string }) {
  const published = status === 'published'
  const label = published ? 'published' : 'draft'
  return <span className={`badge badge-${published ? 'published' : 'draft'}`}>{label}</span>
}
