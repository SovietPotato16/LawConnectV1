import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Calendar, 
  FileText, 
  StickyNote, 
  Bot, 
  Settings,
  Menu,
  X,
  Scale
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/hooks/useProfile'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Casos', href: '/casos', icon: Briefcase },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Calendario', href: '/calendario', icon: Calendar },
  { name: 'Documentos', href: '/documentos', icon: FileText },
  { name: 'Notas', href: '/notas', icon: StickyNote },
  { name: 'IA Assistant', href: '/ai-assistant', icon: Bot },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { profile, getInitials, getFullName } = useProfile()

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-mantle border-r border-surface1 transform transition-transform duration-200 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-surface1">
            <div className="flex items-center justify-center w-10 h-10 bg-blue rounded-lg">
              <Scale className="h-6 w-6 text-base" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">LawConnect</h1>
              <p className="text-sm text-subtext0">Plataforma Legal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue text-base"
                      : "text-subtext0 hover:text-text hover:bg-surface1"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="px-4 py-4 border-t border-surface1">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-blue rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-base">{getInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{getFullName()}</p>
                <p className="text-xs text-subtext0 truncate">
                  {profile?.especialidad || 'Abogado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}