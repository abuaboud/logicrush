import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A bordered table whose header row is the same flat black as the card header.
export function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-header text-header-foreground">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 font-semibold text-start', className)}>{children}</th>
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('border-b border-border px-4 py-2.5', className)}>{children}</td>
}
