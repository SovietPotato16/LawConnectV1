import { Link } from 'react-router-dom'
import { Calendar, User, Clock, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { formatDate } from '@/lib/utils'
import type { Caso } from '@/types'

interface CaseCardProps {
  caso: Caso
  onDelete?: (casoId: string) => void
}

export function CaseCard({ caso, onDelete }: CaseCardProps) {
  const isExampleCase = caso.id === 'ejemplo-demo-caso-001'

  return (
    <Card className="hover:bg-surface1 transition-colors h-[280px] flex flex-col relative group">
      {/* Action buttons - aparecer en hover */}
      {onDelete && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Link to={`/casos/${caso.id}`}>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                title="Editar caso"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0 text-red hover:text-red"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(caso.id)
              }}
              disabled={isExampleCase}
              title="Eliminar caso"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Contenido clickeable */}
      <Link to={`/casos/${caso.id}`} className="flex-1 flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="space-y-2">
            <CardTitle className="text-lg line-clamp-2 pr-16">{caso.titulo}</CardTitle>
            <div className="flex gap-1 flex-wrap">
              <StatusBadge status={caso.estado} size="small" />
              <PriorityBadge priority={caso.prioridad} size="small" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden space-y-3">
            {caso.descripcion && (
              <p className="text-sm text-subtext0 line-clamp-4">
                {caso.descripcion}
              </p>
            )}
            
            <div className="space-y-2 overflow-hidden">
              {caso.cliente && (
                <div className="flex items-center gap-2 text-xs text-subtext0 min-w-0">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{caso.cliente.nombre}</span>
                </div>
              )}
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-subtext0">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Creado: {formatDate(caso.created_at)}</span>
                </div>
                
                {caso.fecha_vencimiento && (
                  <div className="flex items-center gap-2 text-xs text-subtext0">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">Vence: {formatDate(caso.fecha_vencimiento)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}