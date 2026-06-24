interface ZelsSymbolProps {
  size?: number
  className?: string
}

export function ZelsSymbol({ size = 32, className }: ZelsSymbolProps) {
  return (
    <svg
      viewBox="0 0 182 98"
      width={size}
      height={Math.round((size * 98) / 182)}
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 91 A84 84 0 0 1 175 91"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M35 91 A56 56 0 0 1 147 91"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d="M63 91 A28 28 0 0 1 119 91"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        opacity={0.25}
      />
    </svg>
  )
}

interface ZelsLogoProps {
  size?: number
  showTagline?: boolean
  className?: string
}

export function ZelsLogo({ size = 32, showTagline, className }: ZelsLogoProps) {
  return (
    <div
      className={['flex flex-col items-center gap-1', className].filter(Boolean).join(' ')}
    >
      <div className="flex items-center gap-2">
        <ZelsSymbol size={size} className="text-zels-primary" />
        <span
          className="font-sans font-extrabold text-foreground"
          style={{ fontSize: `${Math.round(size * 0.68)}px`, lineHeight: 1 }}
        >
          zel&apos;s
        </span>
      </div>
      {showTagline && (
        <span
          className="font-sans font-bold uppercase text-zels-primary"
          style={{ fontSize: `${Math.round(size * 0.22)}px`, letterSpacing: '0.18em' }}
        >
          AMAR É TER ZELO
        </span>
      )}
    </div>
  )
}
