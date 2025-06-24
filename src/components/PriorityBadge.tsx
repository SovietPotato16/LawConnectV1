import { Badge } from '@/components/ui/badge'

interface PriorityBadgeProps {
  priority: 'Alta' | 'Media' | 'Baja'
  size?: 'default' | 'small'
}

export function PriorityBadge({ priority, size = 'default' }: PriorityBadgeProps) {
  const variants = {
    'Alta': 'destructive',
    'Media': 'warning',
    'Baja': 'secondary'
  } as const

  const sizeClasses = size === 'small' ? 'text-[10px] px-1.5 py-0.5 text-black' : 'text-black'

  return (
    <Badge variant={variants[priority]} className={sizeClasses}>
      {priority}
    </Badge>
  )
}