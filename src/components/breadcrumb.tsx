import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-cs2-light/40" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-cs2-light/60 hover:text-cs2-blue transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-cs2-light">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
