import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Briefcase, 
  Users, 
  FileText, 
  Calendar,
  Plus,
  TrendingUp,
  Clock,
  AlertCircle,
  Star
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function Dashboard() {
  const { getFullName } = useProfile()
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalCasos: 0,
    casosActivos: 0,
    clientesTotal: 0,
    documentosTotal: 0,
  })
  const [recentCases, setRecentCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchStats()
      fetchRecentCases()
    }
  }, [user])

  const fetchStats = async () => {
    if (!user) return

    try {
      // Fetch casos count
      const { count: casosCount } = await supabase
        .from('casos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch casos activos count
      const { count: casosActivosCount } = await supabase
        .from('casos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('estado', 'Activo')

      // Fetch clientes count
      const { count: clientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Fetch documentos count
      const { count: documentosCount } = await supabase
        .from('documentos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setStats({
        totalCasos: casosCount || 0,
        casosActivos: casosActivosCount || 0,
        clientesTotal: clientesCount || 0,
        documentosTotal: documentosCount || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchRecentCases = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('casos')
        .select(`
          id,
          titulo,
          estado,
          created_at,
          cliente:clientes(nombre)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentCases(data || [])
    } catch (error) {
      console.error('Error fetching recent cases:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-subtext0">Bienvenido de vuelta, {getFullName()}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/casos/nuevo">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Caso
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Casos</CardTitle>
            <Briefcase className="h-4 w-4 text-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCasos}</div>
            <p className="text-xs text-subtext0">
              {stats.totalCasos === 0 ? 'Comienza creando tu primer caso' : 'Casos en tu sistema'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.casosActivos}</div>
            <p className="text-xs text-subtext0">
              Casos en progreso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientesTotal}</div>
            <p className="text-xs text-subtext0">
              Base de clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentosTotal}</div>
            <p className="text-xs text-subtext0">
              Vault de documentos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card>
          <CardHeader>
            <CardTitle>Casos Recientes</CardTitle>
            <CardDescription>
              Últimos casos creados o modificados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <div className="text-subtext0">Cargando...</div>
              </div>
            ) : recentCases.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                <p className="text-subtext0 mb-4">No tienes casos aún</p>
                <Link to="/casos/nuevo">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Caso
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCases.map((caso) => (
                  <Link key={caso.id} to={`/casos/${caso.id}`}>
                    <div className="flex items-center justify-between p-3 bg-surface1 rounded-lg hover:bg-surface2 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-text">{caso.titulo}</h4>
                        <p className="text-sm text-subtext0">{caso.cliente?.nombre || 'Sin cliente'}</p>
                        <p className="text-xs text-subtext0">{formatDate(caso.created_at)}</p>
                      </div>
                      <Badge variant={
                        caso.estado === 'Activo' ? 'success' :
                        caso.estado === 'Pendiente' ? 'warning' :
                        'default'
                      }>
                        {caso.estado}
                      </Badge>
                    </div>
                  </Link>
                ))}
                <div className="mt-4">
                  <Link to="/casos">
                    <Button variant="outline" className="w-full">
                      Ver Todos los Casos
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Accesos directos a las funciones más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/casos/nuevo">
                <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                  <Plus className="h-6 w-6" />
                  <span>Nuevo Caso</span>
                </Button>
              </Link>
              
              <Link to="/clientes">
                <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                  <Users className="h-6 w-6" />
                  <span>Gestionar Clientes</span>
                </Button>
              </Link>
              
              <Link to="/documentos">
                <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                  <FileText className="h-6 w-6" />
                  <span>Subir Documento</span>
                </Button>
              </Link>
              
              <Link to="/calendario">
                <Button variant="outline" className="h-20 flex flex-col gap-2 w-full">
                  <Calendar className="h-6 w-6" />
                  <span>Agendar Cita</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message for New Users */}
      {stats.totalCasos === 0 && (
        <Card className="border-blue/20 bg-blue/5">
          <CardContent className="text-center py-8">
            <div className="max-w-2xl mx-auto">
              <Star className="h-16 w-16 text-blue mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text mb-2">¡Bienvenido a LawConnect!</h3>
              <p className="text-subtext0 mb-6">
                Tu plataforma legal está lista. Comienza creando tu primer caso o cliente para aprovechar todas las funcionalidades.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/casos/nuevo">
                  <Button>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Crear primer caso
                  </Button>
                </Link>
                <Link to="/clientes">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Agregar cliente
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}