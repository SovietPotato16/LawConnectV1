import { Badge } from '@/components/ui/badge'

interface PriorityBadgeProps {
  priority: 'Alta' | 'Media' | 'Baja'
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const variants = {
    'Alta': 'destructive',
    'Media': 'warning',
    'Baja': 'secondary'
  } as const

  return (
    <Badge variant={variants[priority]}>
      {priority}
    </Badge>
  )
}