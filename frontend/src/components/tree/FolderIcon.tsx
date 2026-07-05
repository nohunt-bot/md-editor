// Pixel-ish folder icon that still reads clean against the minimal UI: blocky
// geometry, crisp edges, currentColor so it inherits the row's colour (and
// theme). `open` gives the selected/expanded look.
export function FolderIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      className="folder-svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {open ? (
        // Open folder: back flap + angled front, pixel steps.
        <>
          <path fill="currentColor" opacity="0.35" d="M1 3h4l1 1h6v2H1z" />
          <path fill="currentColor" d="M1 6h12l-2 5H1z" />
        </>
      ) : (
        // Closed folder: tab + body.
        <>
          <path fill="currentColor" opacity="0.35" d="M1 3h4l1 1H1z" />
          <path fill="currentColor" d="M1 4h12v7H1z" />
          <rect fill="var(--bg)" x="2" y="6" width="10" height="1" opacity="0.5" />
        </>
      )}
    </svg>
  )
}
