import type { ReactNode } from 'react'

interface PageHeaderProps {
  overline?: string
  title: string
  subtitle?: ReactNode
}

export function PageHeader({ overline, title, subtitle }: PageHeaderProps) {
  return (
    <div>
      {overline && (
        <p
          className="font-mono uppercase mb-2"
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: 'var(--zels-text-faint)',
          }}
        >
          {overline}
        </p>
      )}
      <h1 className="font-heading text-foreground leading-tight text-2xl sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-zels-text-soft">
          {subtitle}
        </p>
      )}
    </div>
  )
}
