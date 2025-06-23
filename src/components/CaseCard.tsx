import { Link } from 'react-router-dom'
import { Calendar, User, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { formatDate } from '@/lib/utils'
import type { Caso } from '@/types'

interface CaseCardProps {
  caso: Caso
}

export function CaseCard({ caso }: CaseCardProps) {
  return (
    <Link to={`/casos/${caso.id}`}>
      <Card className="hover:bg-surface1 transition-colors cursor-pointer h-[280px] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 flex-1 min-w-0 pr-2">{caso.titulo}</CardTitle>
            <div className="flex gap-2 flex-shrink-0">
              <StatusBadge status={caso.estado} />
              <PriorityBadge priority={caso.prioridad} />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="space-y-3 flex-1 min-h-0">
            {caso.descripcion && (
              <p className="text-sm text-subtext0 line-clamp-4">
                {caso.descripcion}
              </p>
            )}
          </div>
          
          <div className="space-y-3 pt-3 border-t border-surface2 mt-4 flex-shrink-0">
            {caso.cliente && (
              <div className="flex items-center gap-2 text-xs text-subtext0 min-w-0">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{caso.cliente.nombre}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-subtext0">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="whitespace-nowrap">Creado: {formatDate(caso.created_at)}</span>
              </div>
              
              {caso.fecha_vencimiento && (
                <div className="flex items-center gap-2 text-xs text-subtext0">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">Vence: {formatDate(caso.fecha_vencimiento)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}