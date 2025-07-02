import { useState, useEffect } from 'react'
import { Download, Search, Edit2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'
import { NuevaFactura } from '@/components/NuevaFactura'
import { Factura, Cliente } from '@/types'

export function Facturacion() {
  const { user } = useAuth()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [clienteFilter, setClienteFilter] = useState<string>('all')
  const [estadoFilter, setEstadoFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Estado para editar facturas
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null)
  const [editEstado, setEditEstado] = useState<'pendiente' | 'pagada' | 'pagada_parcialmente'>('pendiente')
  const [editMontoPagado, setEditMontoPagado] = useState<number | ''>('')

  useEffect(() => {
    if (user) {
      fetchFacturas()
      fetchClientes()
    }
  }, [user])

  // Cargar facturas desde la base de datos
  const fetchFacturas = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          cliente:clientes(id, nombre, email)
        `)
        .eq('user_id', user.id)
        .order('fecha_emision', { ascending: false })

      if (error) throw error
      setFacturas(data || [])
    } catch (error) {
      console.error('Error fetching facturas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar clientes para el filtro
  const fetchClientes = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre')
      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  // Filtrar facturas
  const filteredFacturas = facturas.filter((factura) => {
    const matchesClient = clienteFilter === 'all' || factura.cliente_id === clienteFilter
    const matchesEstado = estadoFilter === 'all' || factura.estado === estadoFilter
    const matchesSearch = 
      factura.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.numero_factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDateFrom = !dateFrom || new Date(factura.fecha_emision) >= new Date(dateFrom)
    const matchesDateTo = !dateTo || new Date(factura.fecha_emision) <= new Date(dateTo)
    
    return matchesClient && matchesEstado && matchesSearch && matchesDateFrom && matchesDateTo
  })

  // Calcular estadísticas
  const stats = {
    total: facturas.reduce((sum, f) => sum + f.monto_total, 0),
    pagado: facturas.reduce((sum, f) => sum + f.monto_pagado, 0),
    pendiente: facturas.reduce((sum, f) => f.estado === 'pendiente' ? sum + f.monto_total : sum, 0),
    facturasPendientes: facturas.filter(f => f.estado === 'pendiente').length,
    facturasPagadas: facturas.filter(f => f.estado === 'pagada').length,
    facturasParciales: facturas.filter(f => f.estado === 'pagada_parcialmente').length
  }

  // Exportar a CSV
  const exportCSV = () => {
    const header = ['Número', 'Cliente', 'Fecha Emisión', 'Concepto', 'Monto Total', 'Monto Pagado', 'Estado']
    const rows = filteredFacturas.map((f) => [
      `"${f.numero_factura}"`,
      `"${f.cliente?.nombre || 'Sin cliente'}"`,
      formatDate(f.fecha_emision),
      `"${f.concepto}"`,
      f.monto_total.toString(),
      f.monto_pagado.toString(),
      f.estado,
    ])

    const csvContent = [header, ...rows]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `facturas_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Actualizar estado de factura
  const updateFacturaEstado = async () => {
    if (!editingFactura) return

    try {
      const montoPagado = editEstado === 'pagada' ? editingFactura.monto_total :
                          editEstado === 'pagada_parcialmente' ? Number(editMontoPagado) : 0

      const { error } = await supabase
        .from('facturas')
        .update({
          estado: editEstado,
          monto_pagado: montoPagado
        })
        .eq('id', editingFactura.id)

      if (error) throw error

      // Actualizar la lista local
      setFacturas(prev => prev.map(f => 
        f.id === editingFactura.id 
          ? { ...f, estado: editEstado, monto_pagado: montoPagado }
          : f
      ))

      setEditingFactura(null)
    } catch (error) {
      console.error('Error updating factura:', error)
      alert('Error al actualizar la factura')
    }
  }

  // Abrir dialog de edición
  const openEditDialog = (factura: Factura) => {
    setEditingFactura(factura)
    setEditEstado(factura.estado)
    setEditMontoPagado(factura.monto_pagado)
  }

  // Obtener badge de estado
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" />Pendiente</Badge>
      case 'pagada':
        return <Badge className="gap-1 bg-green-500 hover:bg-green-600 text-white"><CheckCircle className="h-3 w-3" />Pagada</Badge>
      case 'pagada_parcialmente':
        return <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white"><AlertCircle className="h-3 w-3" />Parcial</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
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
          <p className="text-subtext0">Gestiona tus facturas y controla los pagos de tus clientes</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <NuevaFactura onFacturaCreated={fetchFacturas} clientes={clientes} />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-subtext0">Total Facturado</p>
                <p className="text-2xl font-bold text-text">
                  {stats.total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-subtext0">Cobrado</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats.pagado.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-subtext0">Pendiente</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats.pendiente.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-subtext0">Facturas</p>
                <div className="text-sm">
                  <span className="text-green-500">{stats.facturasPagadas} pagadas</span>
                  <br />
                  <span className="text-red-500">{stats.facturasPendientes} pendientes</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
          <Input
            placeholder="Buscar por número, concepto o cliente..."
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

        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pagada_parcialmente">Pagada Parcialmente</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
          </SelectContent>
        </Select>

        <Input 
          type="date" 
          value={dateFrom} 
          onChange={(e) => setDateFrom(e.target.value)} 
          className="sm:w-40" 
          placeholder="Desde"
        />
        <Input 
          type="date" 
          value={dateTo} 
          onChange={(e) => setDateTo(e.target.value)} 
          className="sm:w-40"
          placeholder="Hasta"
        />
      </div>

      {/* Tabla de facturas */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas ({filteredFacturas.length})</CardTitle>
          <CardDescription>Lista de facturas emitidas</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-surface1 text-subtext0">
              <tr>
                <th className="px-4 py-2">Número</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Concepto</th>
                <th className="px-4 py-2">Monto Total</th>
                <th className="px-4 py-2">Pagado</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFacturas.map((factura) => (
                <tr key={factura.id} className="border-b border-surface1 hover:bg-surface1/50">
                  <td className="px-4 py-2 font-mono text-xs">{factura.numero_factura}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{factura.cliente?.nombre || 'Sin cliente'}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(factura.fecha_emision)}</td>
                  <td className="px-4 py-2 max-w-[200px] truncate" title={factura.concepto}>
                    {factura.concepto}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {factura.monto_total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {factura.monto_pagado.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </td>
                  <td className="px-4 py-2">{getEstadoBadge(factura.estado)}</td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(factura)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredFacturas.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-subtext0">
                    {facturas.length === 0 
                      ? "No tienes facturas aún. ¡Crea tu primera factura!" 
                      : "Sin resultados para los filtros seleccionados."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Dialog para editar estado de factura */}
      <Dialog open={!!editingFactura} onOpenChange={() => setEditingFactura(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Estado de Factura</DialogTitle>
          </DialogHeader>
          
          {editingFactura && (
            <div className="space-y-4">
              <div>
                <Label>Factura: {editingFactura.numero_factura}</Label>
                <p className="text-sm text-subtext0">
                  Monto Total: {editingFactura.monto_total.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-estado">Estado</Label>
                <Select value={editEstado} onValueChange={(value) => setEditEstado(value as 'pendiente' | 'pagada' | 'pagada_parcialmente')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="pagada_parcialmente">Pagada Parcialmente</SelectItem>
                    <SelectItem value="pagada">Pagada Completamente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editEstado === 'pagada_parcialmente' && (
                <div>
                  <Label htmlFor="edit-monto-pagado">Monto Pagado ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={editMontoPagado}
                    onChange={(e) => setEditMontoPagado(e.target.value ? Number(e.target.value) : '')}
                    max={editingFactura.monto_total}
                  />
                  {editMontoPagado && (
                    <p className="text-sm text-subtext0 mt-1">
                      Pendiente: {(editingFactura.monto_total - Number(editMontoPagado)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEditingFactura(null)}>
                  Cancelar
                </Button>
                <Button onClick={updateFacturaEstado}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 