import { useState, useEffect } from 'react'
import { Calendar, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Cliente, Factura } from '@/types'

interface NuevaFacturaProps {
  onFacturaCreated: () => void
  clientes: Cliente[]
}

export function NuevaFactura({ onFacturaCreated, clientes }: NuevaFacturaProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estados del formulario - Datos básicos de la factura
  const [clienteId, setClienteId] = useState('no-client')
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0])
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [concepto, setConcepto] = useState('')
  
  // Estados para cálculo de monto - Tarifa y horas
  const [tarifaPorHora, setTarifaPorHora] = useState<number | ''>('')
  const [horasTrabajadas, setHorasTrabajadas] = useState<number | ''>('')
  const [montoTotal, setMontoTotal] = useState<number | ''>('')
  const [usarCalculoAutomatico, setUsarCalculoAutomatico] = useState(true)
  
  // Estados para pago
  const [estado, setEstado] = useState<'pendiente' | 'pagada' | 'pagada_parcialmente'>('pendiente')
  const [montoPagado, setMontoPagado] = useState<number | ''>('')
  const [notas, setNotas] = useState('')

  // Calcular monto total automáticamente cuando se usan tarifa y horas
  useEffect(() => {
    if (usarCalculoAutomatico && tarifaPorHora && horasTrabajadas) {
      const total = Number(tarifaPorHora) * Number(horasTrabajadas)
      setMontoTotal(total)
    }
  }, [tarifaPorHora, horasTrabajadas, usarCalculoAutomatico])

  // Resetear formulario
  const resetForm = () => {
    setClienteId('no-client')
    setFechaEmision(new Date().toISOString().split('T')[0])
    setFechaVencimiento('')
    setConcepto('')
    setTarifaPorHora('')
    setHorasTrabajadas('')
    setMontoTotal('')
    setUsarCalculoAutomatico(true)
    setEstado('pendiente')
    setMontoPagado('')
    setNotas('')
  }

  // Validar formulario
  const isFormValid = () => {
    if (!concepto.trim()) return false
    if (!montoTotal || Number(montoTotal) <= 0) return false
    if (estado === 'pagada_parcialmente' && (!montoPagado || Number(montoPagado) <= 0)) return false
    if (estado === 'pagada_parcialmente' && Number(montoPagado) >= Number(montoTotal)) return false
    return true
  }

  // Crear nueva factura
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isFormValid()) return

    setLoading(true)
    try {
      // Generar número de factura
      const { data: numeroFactura, error: numeroError } = await supabase.rpc(
        'generate_invoice_number', 
        { user_uuid: user.id }
      )
      
      if (numeroError) throw numeroError

      // Preparar datos de la factura
      const facturaData = {
        user_id: user.id,
        cliente_id: clienteId === 'no-client' ? null : clienteId || null,
        numero_factura: numeroFactura,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento || null,
        concepto: concepto.trim(),
        tarifa_por_hora: usarCalculoAutomatico ? Number(tarifaPorHora) || null : null,
        horas_trabajadas: usarCalculoAutomatico ? Number(horasTrabajadas) || null : null,
        monto_total: Number(montoTotal),
        monto_pagado: estado === 'pagada' ? Number(montoTotal) : 
                      estado === 'pagada_parcialmente' ? Number(montoPagado) : 0,
        estado,
        notas: notas.trim() || null
      }

      // Insertar en la base de datos
      const { error } = await supabase
        .from('facturas')
        .insert([facturaData])

      if (error) throw error

      // Limpiar formulario y cerrar modal
      resetForm()
      setOpen(false)
      onFacturaCreated()
      
    } catch (error) {
      console.error('Error creating factura:', error)
      alert('Error al crear la factura. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Factura</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cliente">Cliente (Opcional)</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-client">Sin cliente específico</SelectItem>
                    {clientes
                      .filter((cliente) => 
                        cliente && // Cliente existe
                        cliente.id && // Tiene ID
                        typeof cliente.id === 'string' && // ID es string
                        cliente.id.trim() !== '' && // ID no es vacío
                        cliente.nombre && // Tiene nombre
                        cliente.nombre.trim() !== '' // Nombre no es vacío
                      )
                      .map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id!}>
                          {cliente.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Información de la Factura */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles de la Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha-emision">Fecha de Emisión</Label>
                  <Input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fecha-vencimiento">Fecha de Vencimiento (Opcional)</Label>
                  <Input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="concepto">Concepto / Descripción *</Label>
                <Textarea
                  placeholder="Describe los servicios facturados..."
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  required
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cálculo de Monto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cálculo del Monto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={usarCalculoAutomatico}
                  onChange={(e) => setUsarCalculoAutomatico(e.target.checked)}
                  className="rounded"
                />
                <Label>Calcular automáticamente con tarifa por hora</Label>
              </div>

              {usarCalculoAutomatico ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tarifa">Tarifa por Hora ($)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={tarifaPorHora}
                      onChange={(e) => setTarifaPorHora(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="horas">Horas Trabajadas</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.25"
                      value={horasTrabajadas}
                      onChange={(e) => setHorasTrabajadas(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <Label htmlFor="monto-total">Monto Total * ($)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={montoTotal}
                  onChange={(e) => setMontoTotal(e.target.value ? Number(e.target.value) : '')}
                  disabled={usarCalculoAutomatico}
                  required
                />
                {usarCalculoAutomatico && tarifaPorHora && horasTrabajadas && (
                  <p className="text-sm text-subtext0 mt-1">
                    Calculado: {Number(tarifaPorHora).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} × {horasTrabajadas} horas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estado de Pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="estado">Estado de la Factura</Label>
                <Select value={estado} onValueChange={(value) => setEstado(value as 'pendiente' | 'pagada' | 'pagada_parcialmente')}>
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

              {estado === 'pagada_parcialmente' && (
                <div>
                  <Label htmlFor="monto-pagado">Monto Pagado ($)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(e.target.value ? Number(e.target.value) : '')}
                    max={montoTotal}
                    required
                  />
                  {montoPagado && montoTotal && (
                    <p className="text-sm text-subtext0 mt-1">
                      Pendiente: {(Number(montoTotal) - Number(montoPagado)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="notas">Notas (Opcional)</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isFormValid()}>
              {loading ? 'Creando...' : 'Crear Factura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 