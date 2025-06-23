import { Link } from 'react-router-dom'
import { Scale, Shield, Zap, Users, FileText, Calendar, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Landing() {
  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <header className="border-b border-surface1">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue rounded-lg">
              <Scale className="h-6 w-6 text-base" />
            </div>
            <span className="text-xl font-bold text-text">LawConnect</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link to="/register">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold text-text mb-6">
            La Plataforma Legal del Futuro
          </h1>
          <p className="text-xl text-subtext0 mb-8 max-w-3xl mx-auto">
            Gestiona casos, clientes y documentos con inteligencia artificial integrada. 
            LawConnect revoluciona la práctica legal moderna.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-3">
                Comenzar Gratis
              </Button>
            </Link>
            <Link to="/demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Ver Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-mantle">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center text-text mb-12">
            Características Principales
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Briefcase className="h-12 w-12 text-blue mb-4" />
                <CardTitle>Gestión de Casos</CardTitle>
                <CardDescription>
                  Organiza y rastrea todos tus casos legales en un solo lugar
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-green mb-4" />
                <CardTitle>Base de Clientes</CardTitle>
                <CardDescription>
                  Mantén información detallada de todos tus clientes
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-12 w-12 text-yellow mb-4" />
                <CardTitle>Vault de Documentos</CardTitle>
                <CardDescription>
                  Almacena y organiza documentos legales de forma segura
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Calendar className="h-12 w-12 text-purple mb-4" />
                <CardTitle>Calendario Integrado</CardTitle>
                <CardDescription>
                  Programa citas y gestiona tu agenda legal
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-orange mb-4" />
                <CardTitle>IA Legal Assistant</CardTitle>
                <CardDescription>
                  Asistente inteligente para análisis y consultas legales
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-red mb-4" />
                <CardTitle>Seguridad Avanzada</CardTitle>
                <CardDescription>
                  Protección de datos con estándares de seguridad legal
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold text-text mb-6">
            ¿Listo para Modernizar tu Práctica Legal?
          </h2>
          <p className="text-lg text-subtext0 mb-8">
            Únete a cientos de abogados que ya confían en LawConnect
          </p>
          <Link to="/register">
            <Button size="lg" className="text-lg px-8 py-3">
              Comenzar Ahora
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface1 py-8 px-4">
        <div className="container mx-auto text-center text-subtext0">
          <p>&copy; 2024 LawConnect. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}