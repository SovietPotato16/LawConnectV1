import { useState, useEffect } from 'react'
import { Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

interface BillingEntry {
  id: string
  cliente_id: string | null
  horas: number
  tarifa: number // tarifa por hora
  monto: number // calculado = horas * tarifa
  fecha: string // ISO
  estado: 'Pagado' | 'Pendiente'
  cliente?: { id: string; nombre: string }
}

// Ejemplo de entrada de facturación
const billingExample: BillingEntry = {
  id: 'ex-billing-001',
  cliente_id: 'cliente-ejemplo-001',
  horas: 2,
  tarifa: 1500, // pesos/hora
  monto: 3000,
  fecha: '2024-06-24T10:00:00Z',
  estado: 'Pendiente',
  cliente: { id: 'cliente-ejemplo-001', nombre: 'Cliente de Ejemplo' }
}

export function Facturacion() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<BillingEntry[]>([])
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [clienteFilter, setClienteFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('') // yyyy-mm-dd
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchBillingEntries()
    fetchClientes()
  }, [user])

  const fetchBillingEntries = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('facturacion')
        .select(`*, cliente:clientes(id, nombre)`) // Ajusta según la estructura real
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })

      if (error) throw error

      const lista = data as BillingEntry[]
      // Agregar ejemplo al inicio
      const combined = [billingExample, ...(lista || [])]
      setEntries(combined)
    } catch (error) {
      console.error('Error fetching billing entries:', error)
      setEntries([billingExample])
    } finally {
      setLoading(false)
    }
  }

  const fetchClientes = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .eq('user_id', user.id)
        .order('nombre')
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const matchesClient = clienteFilter === 'all' || entry.cliente_id === clienteFilter
    const matchesSearch = entry.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDateFrom = !dateFrom || new Date(entry.fecha) >= new Date(dateFrom)
    const matchesDateTo = !dateTo || new Date(entry.fecha) <= new Date(dateTo)
    return matchesClient && matchesSearch && matchesDateFrom && matchesDateTo
  })

  const exportCSV = () => {
    const header = ['Cliente', 'Fecha', 'Horas', 'Tarifa', 'Monto', 'Estado']
    const rows = filteredEntries.map((e) => [
      `"${e.cliente?.nombre || 'Desconocido'}"`,
      formatDate(e.fecha),
      e.horas.toString(),
      e.tarifa.toString(),
      e.monto.toString(),
      e.estado,
    ])

    const csvContent = [header, ...rows]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `facturacion_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando facturación...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Facturación</h1>
          <p className="text-subtext0">Controla las horas cobrables y pagos de tus clientes</p>
        </div>
        <Button onClick={exportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="sm:w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="sm:w-40" />
      </div>

      {/* Tabla de facturación */}
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
          <CardDescription>Historial de horas y cobros</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-surface1 text-subtext0">
              <tr>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Horas</th>
                <th className="px-4 py-2">Tarifa</th>
                <th className="px-4 py-2">Monto</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => (
                <tr key={e.id} className="border-b border-surface1 hover:bg-surface1/50">
                  <td className="px-4 py-2 whitespace-nowrap">{e.cliente?.nombre || 'Desconocido'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(e.fecha)}</td>
                  <td className="px-4 py-2 text-center">{e.horas}</td>
                  <td className="px-4 py-2 text-right">{e.tarifa.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                  <td className="px-4 py-2 text-right font-medium">{e.monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                  <td className="px-4 py-2">{e.estado}</td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-subtext0">Sin registros para los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
} 