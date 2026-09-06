import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The site's signature card: a flat black header bar with white text over a white
// body -- used on almost every page of the legacy design.
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('bg-card rounded-md border border-border shadow-sm', className)}>{children}</div>
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('bg-header text-header-foreground rounded-t-md px-4 py-2.5 font-semibold text-sm', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-4', className)}>{children}</div>
}
