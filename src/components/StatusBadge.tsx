import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
  size?: 'default' | 'small'
}

export function StatusBadge({ status, size = 'default' }: StatusBadgeProps) {
  const variants = {
    'Activo': 'success',
    'Pendiente': 'warning',
    'Cerrado': 'secondary',
    'En Revisión': 'default'
  } as const

  const sizeClasses = size === 'small' ? 'text-[10px] px-1.5 py-0.5 text-black' : 'text-black'

  return (
    <Badge variant={variants[status]} className={sizeClasses}>
      {status}
    </Badge>
  )
}