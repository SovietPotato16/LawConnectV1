import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/layout/Layout'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { ConfirmEmail } from '@/pages/ConfirmEmail'
import { TestAuth } from '@/pages/TestAuth'
import { TestEmail } from '@/pages/TestEmail'
import { CalendarCallback } from '@/pages/CalendarCallback'
import { GoogleCalendarDiagnostic } from '@/pages/GoogleCalendarDiagnostic'
import { Dashboard } from '@/pages/Dashboard'
import { Casos } from '@/pages/Casos'
import { CasoDetalle } from '@/pages/CasoDetalle'
import { NuevoCaso } from '@/pages/NuevoCaso'
import { Clientes } from '@/pages/Clientes'
import { Calendario } from '@/pages/Calendario'
import { Notas } from '@/pages/Notas'
import { Documentos } from '@/pages/Documentos'
import { Configuracion } from '@/pages/Configuracion'
import { AIAssistant } from '@/pages/AIAssistant'
import { Facturacion } from '@/pages/Facturacion'
import { Boveda } from '@/pages/Boveda'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue mx-auto mb-4"></div>
          <div className="text-text">Cargando...</div>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue mx-auto mb-4"></div>
          <div className="text-text">Cargando...</div>
        </div>
      </div>
    )
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-base text-text">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            } />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/test-auth" element={<TestAuth />} />
            <Route path="/test-email" element={<TestEmail />} />
            <Route path="/calendar/callback" element={<CalendarCallback />} />
            <Route path="/google-calendar-diagnostic" element={<GoogleCalendarDiagnostic />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
            </Route>
            
            <Route path="/casos" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Casos />} />
              <Route path="nuevo" element={<NuevoCaso />} />
              <Route path=":id" element={<CasoDetalle />} />
            </Route>
            
            <Route path="/clientes" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Clientes />} />
            </Route>
            
            <Route path="/calendario" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Calendario />} />
            </Route>
            
            <Route path="/documentos" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Documentos />} />
            </Route>
            
            <Route path="/notas" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Notas />} />
            </Route>
            
            <Route path="/ai-assistant" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<AIAssistant />} />
            </Route>
            
            <Route path="/configuracion" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Configuracion />} />
            </Route>
            
            <Route path="/facturacion" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Facturacion />} />
            </Route>

            <Route path="/boveda" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Boveda />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App