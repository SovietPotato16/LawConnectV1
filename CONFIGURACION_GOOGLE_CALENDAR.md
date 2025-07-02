# 📅 Configuración de Google Calendar en LawConnect

Esta guía te explica cómo configurar la integración completa de Google Calendar en tu aplicación LawConnect.

## 🚀 Funcionalidades Implementadas

✅ **Autenticación OAuth 2.0** - Conexión segura con Google Calendar
✅ **Sincronización bidireccional** - Ver y crear eventos desde LawConnect
✅ **Gestión completa de eventos** - Crear, editar y eliminar eventos
✅ **Interfaz intuitiva** - Vista moderna con acciones rápidas
✅ **Manejo de tokens** - Almacenamiento seguro y refresh automático

## ⚙️ Configuración en Google Cloud Console

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Asegúrate de que esté habilitada la **Google Calendar API**

### Paso 2: Configurar OAuth 2.0

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth 2.0 Client IDs**
3. Selecciona **Web application**
4. Configura los URIs autorizados:

#### **JavaScript origins autorizados:**
```
http://localhost:5174
https://tu-dominio.com
```

#### **Redirect URIs autorizados:**
```
http://localhost:5174/calendar/callback
https://tu-dominio.com/calendar/callback
```

### Paso 3: Obtener Credenciales

1. Copia el **Client ID** y **Client Secret**
2. Guárdalos para el siguiente paso

## 🔧 Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=tu-client-secret-aqui

# Opcional: Para producción
VITE_GOOGLE_REDIRECT_URI=https://tu-dominio.com/calendar/callback
```

⚠️ **Importante**: El `Client Secret` debe mantenerse privado. En producción, considera usar un servidor backend para manejar el intercambio de tokens.

## 🗄️ Base de Datos

La migración ya está incluida en tu proyecto:

```sql
-- Ejecutar migración
supabase migration up
```

O aplicar manualmente el archivo:
```
supabase/migrations/20250125000002_create_google_calendar_tokens.sql
```

## 🎯 Cómo Usar la Integración

### 1. **Conectar Google Calendar**
- Ve a `/calendario`
- Haz clic en "Conectar Google Calendar"
- Autoriza la aplicación en Google
- Serás redirigido automáticamente

### 2. **Crear Eventos**
- Haz clic en "Nueva Cita"
- Llena el formulario
- El evento se crea en Google Calendar automáticamente

### 3. **Editar Eventos**
- Pasa el mouse sobre un evento
- Haz clic en el ícono de editar
- Modifica los datos
- Los cambios se sincronizan con Google

### 4. **Eliminar Eventos**
- Pasa el mouse sobre un evento
- Haz clic en el ícono de eliminar
- Confirma la eliminación

### 5. **Sincronizar**
- Haz clic en "Sincronizar eventos"
- Actualiza la lista con eventos de Google Calendar

## 🔐 Seguridad y Privacidad

### **Tokens de Acceso:**
- Se almacenan encriptados en Supabase
- Se actualizan automáticamente
- Solo el usuario puede acceder a sus propios tokens

### **Permisos de Google:**
- Solo acceso de lectura/escritura al calendario
- No acceso a otros datos de Google
- El usuario puede revocar acceso en cualquier momento

### **Políticas RLS:**
- Row Level Security habilitada
- Cada usuario solo ve sus propios tokens
- Aislamiento completo entre usuarios

## 🛠️ Archivos Modificados/Creados

### **Nuevos Archivos:**
- `src/pages/CalendarCallback.tsx` - Maneja la autorización OAuth
- `supabase/migrations/20250125000002_create_google_calendar_tokens.sql` - Tabla de tokens

### **Archivos Mejorados:**
- `src/pages/Calendario.tsx` - Interfaz mejorada con edición/eliminación
- `src/hooks/useGoogleCalendar.ts` - Hook corregido con import de Supabase
- `src/App.tsx` - Ruta de callback agregada

### **Archivos Existentes (ya implementados):**
- `src/lib/googleCalendar.ts` - Servicio de Google Calendar API
- `src/hooks/useGoogleCalendar.ts` - Hook de React para Google Calendar

## 🎨 Funcionalidades de la Interfaz

### **Vista Principal del Calendario:**
- Lista de próximos eventos (10 más recientes)
- Estadísticas del mes y próximos 7 días
- Acciones rápidas (nueva cita, sincronizar, abrir Google Calendar)

### **Gestión de Eventos:**
- Crear eventos con título, descripción, fechas y ubicación
- Editar eventos existentes
- Eliminar eventos con confirmación
- Vista detallada con iconos informativos

### **Estados de Conexión:**
- Pantalla de bienvenida para usuarios no conectados
- Instrucciones claras de configuración
- Manejo de errores en la conexión

## 🔍 Troubleshooting

### **Error: "Google Client ID not configured"**
- Verifica que `VITE_GOOGLE_CLIENT_ID` esté en tu `.env`
- Reinicia el servidor de desarrollo después de agregar variables

### **Error: "redirect_uri_mismatch"**
- Verifica que el redirect URI en Google Cloud Console sea exacto
- Formato: `http://localhost:5174/calendar/callback` (sin slash final)

### **Error: "Access blocked"**
- Verifica que la Google Calendar API esté habilitada
- Revisa que el proyecto tenga configurado OAuth consent screen

### **Eventos no se sincronizan:**
- Haz clic en "Sincronizar eventos"
- Verifica los permisos de Google Calendar
- Revisa la consola del navegador para errores

### **Tokens expirados:**
- El sistema automáticamente renueva tokens
- Si hay problemas, desconecta y vuelve a conectar

## 📱 Flujo de Usuario Completo

1. **Primera vez:**
   - Usuario ve pantalla de conexión
   - Hace clic en "Conectar Google Calendar"
   - Es redirigido a Google para autorizar
   - Vuelve a LawConnect con calendario conectado

2. **Uso diario:**
   - Ve sus eventos de Google Calendar
   - Crea nuevos eventos desde LawConnect
   - Edita eventos existentes
   - Sincroniza cuando sea necesario

3. **Gestión:**
   - Puede desconectar en cualquier momento
   - Tokens se limpian automáticamente
   - Re-conexión es simple y rápida

## 🌟 Próximas Mejoras

Posibles extensiones para el futuro:
- Múltiples calendarios de Google
- Notificaciones push
- Integración con casos y clientes
- Vista de calendario completo (mensual/semanal)
- Recordatorios automáticos
- Sincronización con otros proveedores (Outlook, etc.)

¡Tu integración de Google Calendar está lista! 🎉

## 📞 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador
2. Verifica las variables de entorno
3. Confirma la configuración de Google Cloud Console
4. Usa la página `/test-auth` para diagnósticos generales 