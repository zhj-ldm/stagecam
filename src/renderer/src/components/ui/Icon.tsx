import type { SVGProps } from 'react'

export type IconName =
  | 'browse'
  | 'pen'
  | 'lock'
  | 'unlock'
  | 'eraser'
  | 'camera'
  | 'live'
  | 'gallery'
  | 'more'
  | 'close'
  | 'minimize'
  | 'expand'
  | 'settings'
  | 'check'
  | 'trash'
  | 'folder'
  | 'chevronLeft'
  | 'chevronRight'

const PATHS: Record<IconName, JSX.Element> = {
  browse: (
    <path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9M20 15v2.5A2.5 2.5 0 0 1 17.5 20H15M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15M9 9h6v6H9z" />
  ),
  pen: (
    <>
      <path d="M4 20l4.2-1 10-10a2.1 2.1 0 0 0 0-3l-.9-.9a2.1 2.1 0 0 0-3 0l-10 10-1 4.2z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.3-1.4" />
    </>
  ),
  eraser: (
    <>
      <path d="M9 20H6l-2-2a1.6 1.6 0 0 1 0-2.3l8-8a1.6 1.6 0 0 1 2.3 0l3.7 3.7a1.6 1.6 0 0 1 0 2.3L13 20z" />
      <path d="M8.5 11.5l5 5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.6A2.6 2.6 0 0 1 6.6 6h1.8l1.2-2h6.8l1.2 2H18a2.4 2.4 0 0 1 2.4 2.4v8A2.4 2.4 0 0 1 18 18.8H6.4A2.4 2.4 0 0 1 4 16.4z" />
      <circle cx="12" cy="12.4" r="3.4" />
    </>
  ),
  live: (
    <>
      <path d="M4 12h3l2.5-6 3.5 12 2.6-6H20" />
    </>
  ),
  gallery: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2.4" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 16.5l4.8-4.2a1.4 1.4 0 0 1 1.9 0L20 19" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  minimize: <path d="M6 12h12" />,
  expand: <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5V9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5A1.5 1.5 0 0 1 18.5 20H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6" />
    </>
  ),
  check: <path d="M5.5 12.6l4.2 4.1L18.5 7.5" />,
  trash: (
    <>
      <path d="M5 7h14M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6A1.2 1.2 0 0 1 14.5 5.2V7" />
      <path d="M7 7l.9 11.2A1.8 1.8 0 0 0 9.7 20h4.6a1.8 1.8 0 0 0 1.8-1.8L17 7" />
    </>
  ),
  folder: (
    <path d="M4 7.5A2.2 2.2 0 0 1 6.2 5.3h3.2l1.6 2h6.8A2.2 2.2 0 0 1 20 9.5v6.8a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16.3z" />
  ),
  chevronLeft: <path d="M14.5 6.5L9 12l5.5 5.5" />,
  chevronRight: <path d="M9.5 6.5L15 12l-5.5 5.5" />
}

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
