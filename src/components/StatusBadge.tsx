import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    'Activo': 'success',
    'Pendiente': 'warning',
    'Cerrado': 'secondary',
    'En Revisión': 'default'
  } as const

  return (
    <Badge variant={variants[status]}>
      {status}
    </Badge>
  )
}