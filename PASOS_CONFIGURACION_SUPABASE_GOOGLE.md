# 🚀 Guía Paso a Paso: Configuración Ultra-Segura de Google Calendar

## ✅ **Ya completado:**
- ✅ Código actualizado para usar SOLO Supabase Edge Functions
- ✅ Archivo `.env` creado con Client ID
- ✅ Edge Functions creadas en tu proyecto

## 📋 **Pasos pendientes:**

### **Paso 1: Completar archivo `.env`**

1. **Ve a tu Supabase Dashboard:** https://supabase.com/dashboard
2. **Selecciona tu proyecto:** LawConnect
3. **Ve a Settings → API**
4. **Copia la "anon public" key**
5. **Actualiza tu archivo `.env`:**

```bash
# Reemplaza "tu-anon-key-aqui" con tu key real
nano .env
```

### **Paso 2: Obtener Client Secret de Google (si no lo tienes)**

1. **Ve a Google Cloud Console:** https://console.cloud.google.com/
2. **Selecciona tu proyecto:** LawConnect
3. **Ve a APIs & Services → Credentials**
4. **Busca tus credenciales OAuth 2.0**
5. **Haz clic en el ícono de editar (lápiz)**
6. **Copia el "Client Secret"** (guárdalo, lo necesitarás en el siguiente paso)

### **Paso 3: Configurar Supabase Secrets (CRÍTICO)**

1. **Ve a tu Supabase Dashboard**
2. **Settings → Vault** (o "Secrets")
3. **Crea estos 2 secrets:**

   **Secret 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `753026916754-v7bqc8do5qhhv5hf3dg29qfcqpg1b4hl.apps.googleusercontent.com`

   **Secret 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `el-client-secret-que-copiaste-de-google`

### **Paso 4: Desplegar Edge Functions (SIN CLI)**

**Opción A: Desde Supabase Dashboard**

1. **Ve a tu Supabase Dashboard**
2. **Edge Functions** (en el menú lateral)
3. **Busca si existen funciones llamadas:**
   - `google-oauth`
   - `google-oauth-refresh`

**Si NO existen:**
4. **Haz clic en "Create Function"**
5. **Crea función 1:**
   - Name: `google-oauth`
   - Copia el código de: `supabase/functions/google-oauth/index.ts`
6. **Crea función 2:**
   - Name: `google-oauth-refresh`
   - Copia el código de: `supabase/functions/google-oauth-refresh/index.ts`

**Opción B: Usando Git Integration**

1. **Ve a Settings → Integrations**
2. **Conecta tu repositorio de GitHub**
3. **Supabase detectará automáticamente las Edge Functions**

### **Paso 5: Verificar que todo funciona**

1. **Reinicia tu servidor:**
   ```bash
   npm run dev
   ```

2. **Ve a:** http://localhost:5173/google-calendar-diagnostic

3. **Haz clic en "🧪 Probar Conexión OAuth"**

4. **Si funciona, ve a:** http://localhost:5173/calendario

5. **Haz clic en "Conectar Google Calendar"**

## 🔍 **Troubleshooting:**

### **Error: "Edge Functions no están desplegadas"**
- Verifica que las functions aparezcan en Supabase Dashboard → Edge Functions
- Si no aparecen, usa la Opción A del Paso 4

### **Error: "Missing required environment variables"**
- Verifica que los secrets estén configurados en Supabase Vault
- Los nombres deben ser EXACTAMENTE: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`

### **Error: "Google Client ID not configured"**
- Verifica que `VITE_GOOGLE_CLIENT_ID` esté en tu archivo `.env`
- Reinicia el servidor después de editar `.env`

### **Error: "Tu sesión expiró"**
- Esto es normal, simplemente inicia sesión de nuevo y prueba

## 🎯 **¿Qué necesitas hacer AHORA?**

1. **Completar el archivo `.env`** con tu ANON_KEY
2. **Obtener el Client Secret** de Google Cloud Console  
3. **Configurar los Supabase Secrets** con Client ID y Client Secret
4. **Verificar que las Edge Functions estén desplegadas**

Una vez completados estos pasos, tendrás la **arquitectura más segura posible** para OAuth con Google Calendar! 🔒✨ 