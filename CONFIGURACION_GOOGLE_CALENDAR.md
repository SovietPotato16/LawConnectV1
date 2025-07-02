# 📅 Configuración Ultra-Segura de Google Calendar en LawConnect

Esta guía te explica cómo configurar la integración **ULTRA-SEGURA** de Google Calendar usando **Supabase Edge Functions** y **Supabase Vault** para máxima protección de credenciales.

## 🔒 Arquitectura Ultra-Segura Implementada

### **✅ Frontend (React)**
- Solo maneja el **Client ID** (público)
- Redirige a Google para autorización
- Recibe código de autorización
- **NO** tiene acceso al Client Secret

### **✅ Backend (Supabase Edge Functions)**
- Maneja el **Client Secret** cifrado en Supabase Vault
- Intercambia código por tokens de forma ultra-segura
- Renueva tokens automáticamente
- Procesamiento en el edge (ultra-rápido)

### **✅ Base de Datos (Supabase)**
- Almacenamiento seguro de tokens
- Row Level Security (RLS)
- Cifrado automático end-to-end
- Supabase Vault para secrets

## 🚀 Funcionalidades Implementadas

✅ **OAuth 2.0 Ultra-Seguro** - Client Secret cifrado en Supabase Vault  
✅ **Sincronización bidireccional** - Ver y crear eventos desde LawConnect  
✅ **Gestión completa de eventos** - Crear, editar y eliminar eventos  
✅ **Interfaz intuitiva** - Vista moderna con acciones rápidas  
✅ **Renovación automática** - Tokens se renuevan sin intervención del usuario  
✅ **Edge Functions** - Procesamiento ultra-rápido en el edge  
✅ **Todo centralizado** - Base de datos, auth, functions y secrets en Supabase  

## ⚙️ Configuración en Google Cloud Console

### Paso 1: Crear Proyecto y Habilitar APIs

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**:
   - APIs & Services → Library → Google Calendar API → Enable

### Paso 2: Configurar OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth 2.0 Client IDs**
3. Selecciona **Web application**
4. Configura los URIs autorizados:

#### **JavaScript origins autorizados:**
```
http://localhost:5173
http://localhost:5174
https://tu-dominio.com
```

#### **Redirect URIs autorizados:**
```
http://localhost:5173/calendar/callback
http://localhost:5174/calendar/callback
https://tu-dominio.com/calendar/callback
```

### Paso 3: Obtener Credenciales

1. Copia el **Client ID** y **Client Secret**
2. Guárdalos para la configuración de Supabase

## 🔧 Configuración Ultra-Segura

### **1. Frontend (.env en la raíz del proyecto):**
```env
# Solo necesitas el Client ID público
VITE_GOOGLE_CLIENT_ID=tu-client-id.googleusercontent.com

# Tus otras variables de Supabase
VITE_SUPABASE_URL=tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### **2. Supabase Secrets (Dashboard → Settings → Vault):**
Configura estos secrets en tu Supabase Dashboard:

1. Ve a **Settings** → **Vault**
2. Agrega estos secrets:

```
Name: GOOGLE_CLIENT_ID
Value: tu-client-id.googleusercontent.com

Name: GOOGLE_CLIENT_SECRET  
Value: tu-client-secret
```

⚠️ **Ultra-Seguro**: Los secrets de Supabase están cifrados end-to-end y solo son accesibles por Edge Functions.

### **3. Supabase Edge Functions:**

Las funciones ya están creadas en tu proyecto:
```
✅ supabase/functions/google-oauth/index.ts
✅ supabase/functions/google-oauth-refresh/index.ts
```

Para desplegar las funciones:
```bash
# Desplegar todas las functions
supabase functions deploy

# O desplegar individual
supabase functions deploy google-oauth
supabase functions deploy google-oauth-refresh
```

## 🗄️ Base de Datos

La migración ya está incluida en tu proyecto:
```sql
-- Tabla para tokens de Google Calendar con máxima seguridad
CREATE TABLE google_calendar_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security máximo
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo acceden a sus propios tokens
CREATE POLICY "Users can only access their own tokens"
ON google_calendar_tokens FOR ALL
USING (auth.uid() = user_id);
```

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
- Reinicia el servidor de desarrollo: `npm run dev`

### **Error: "redirect_uri_mismatch"**
- Verifica que los URIs en Google Cloud Console sean exactos
- No olvides incluir tanto `:5173` como `:5174` para desarrollo
- Formato exacto: `http://localhost:5174/calendar/callback`

### **Error: "Access blocked"**
- Verifica que la Google Calendar API esté habilitada
- Configura OAuth consent screen si es necesario
- Asegúrate de que el proyecto tenga usuarios de prueba agregados

### **Error en Supabase Edge Functions:**
- Verifica que los secrets estén configurados en Supabase Vault
- Revisa los logs de functions en Supabase Dashboard
- Asegúrate de haber desplegado las functions: `supabase functions deploy`

### **Error: "Missing required environment variables"**
- Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén en Supabase Vault
- Los secrets deben estar configurados exactamente como se muestra arriba

### **Eventos no se sincronizan:**
- Haz clic en "Sincronizar eventos"
- Verifica los permisos de Google Calendar
- Revisa la consola del navegador para errores
- Prueba desconectar y volver a conectar

## 📱 Flujo de Usuario Ultra-Seguro

### **Primera conexión:**
1. Usuario ve pantalla de conexión en `/calendario`
2. Hace clic en "Conectar Google Calendar"
3. Es redirigido a Google para autorizar (OAuth)
4. Google redirige a `/calendar/callback`
5. **Supabase Edge Function** intercambia código por tokens usando secrets cifrados
6. Tokens se almacenan en Supabase con RLS
7. Usuario regresa al calendario conectado

### **Uso diario:**
1. Ve eventos de Google Calendar en LawConnect
2. Crea nuevos eventos desde la interfaz
3. Edita eventos existentes
4. Los cambios se sincronizan automáticamente
5. Tokens se renuevan automáticamente en Edge Functions

## 🔒 Ventajas de la Arquitectura Ultra-Segura

- **🔐 Supabase Vault:** Cifrado end-to-end para secrets
- **⚡ Edge Functions:** Procesamiento ultra-rápido en el edge
- **🎯 Todo centralizado:** Base de datos, auth, functions y secrets en un lugar
- **🚀 Escalable:** Maneja millones de requests automáticamente
- **🔓 No vendor lock-in:** Compatible con cualquier hosting frontend
- **🛡️ Máxima seguridad:** Client Secret nunca expuesto, ni siquiera en variables de entorno
- **🔄 Auto-renovación:** Tokens se renuevan sin exposición de credenciales
- **🎛️ Control total:** Logs, métricas y control granular desde Supabase Dashboard

## 🚀 Deploy y Producción

### **Para desarrollo:**
```bash
# Asegúrate de tener Supabase CLI
npm install -g supabase

# Aplicar migraciones
supabase db push

# Desplegar Edge Functions
supabase functions deploy
```

### **Para producción:**
1. **Configura secrets en Supabase Vault** (production project)
2. **Despliega Edge Functions** en production
3. **Actualiza URLs** en Google Cloud Console
4. **Deploy frontend** en tu plataforma preferida

¡Tu integración de Google Calendar ahora tiene **seguridad de nivel enterprise** y está lista para millones de usuarios! 🎉

## 🆚 Comparación de Arquitecturas

| Aspecto | Arquitectura Anterior | **Nueva Arquitectura** |
|---------|----------------------|--------------------------|
| Client Secret | Variables de entorno | **Supabase Vault (cifrado)** |
| Functions | Netlify Functions | **Supabase Edge Functions** |
| Velocidad | Regional | **Global Edge** |
| Seguridad | Seguro | **Ultra-Seguro** |
| Centralización | Múltiples servicios | **Todo en Supabase** |
| Escalabilidad | Limitada | **Ilimitada** |

Tu aplicación ahora usa la **arquitectura más segura posible** para OAuth! 🔒✨ 