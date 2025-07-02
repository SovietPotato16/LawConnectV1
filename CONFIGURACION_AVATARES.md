# Configuración del Sistema de Avatares

Esta guía explica cómo configurar y usar el sistema de avatares en LawConnect.

## ✨ Características

- 🖼️ **Recorte y centrado automático**: Herramienta integrada para recortar fotos de perfil
- 📱 **Interfaz intuitiva**: Arrastra las esquinas para ajustar el área de recorte
- 🔄 **Actualización en tiempo real**: Las fotos se actualizan automáticamente en toda la aplicación
- ⚡ **Optimización automática**: Las imágenes se convierten a JPEG de alta calidad
- 🛡️ **Validación de archivos**: Solo acepta imágenes (PNG, JPG, JPEG, WebP) hasta 5MB

## 🚀 Uso Básico

1. Ve a **Configuración > Perfil**
2. Haz clic en **"Cambiar foto"** en la sección de foto de perfil
3. Selecciona una imagen desde tu dispositivo
4. Usa la herramienta de recorte para ajustar la imagen:
   - Arrastra las esquinas para redimensionar
   - Mueve el área de recorte
   - Usa el botón **"Centrar"** para resetear
5. Haz clic en **"Aplicar recorte"**
6. ¡Tu foto de perfil se actualizará automáticamente!

## ⚙️ Configuración Inicial

### Opción 1: Configuración Automática (Recomendada)

1. Ve a **Configuración > Perfil**
2. Haz clic en **"Configurar Sistema"**
3. El sistema verificará y configurará automáticamente:
   - Bucket de almacenamiento
   - Estructura de base de datos
   - Permisos básicos

### Opción 2: Configuración Manual

Si la configuración automática falla, puedes configurar manualmente desde el panel de Supabase:

#### 1. Crear Bucket de Almacenamiento

1. Ve al panel de Supabase > **Storage**
2. Crea un nuevo bucket llamado **"avatars"**
3. Configura como **público**
4. Establece tipos MIME permitidos:
   - `image/jpeg`
   - `image/jpg` 
   - `image/png`
   - `image/webp`
5. Límite de tamaño: **5MB**

#### 2. Configurar Políticas de Seguridad

En Supabase > Storage > Policies, añade estas políticas para el bucket "avatars":

```sql
-- Política de INSERT: Los usuarios pueden subir avatares a sus propias carpetas
CREATE POLICY "Users can upload avatars to their own folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política de SELECT: Los avatares son públicamente visibles
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Política de UPDATE: Los usuarios pueden actualizar sus propios avatares
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política de DELETE: Los usuarios pueden eliminar sus propios avatares
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### 3. Actualizar Base de Datos

Ejecuta esta migración SQL en Supabase > SQL Editor:

```sql
-- Añadir campo avatar_url a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comentario explicativo
COMMENT ON COLUMN profiles.avatar_url IS 'URL de la imagen de perfil del usuario en Supabase Storage';
```

## 🔧 Solución de Problemas

### Error: "El bucket de avatars no está configurado"
- **Solución**: Usa el botón "Configurar Sistema" o configura manualmente el bucket

### Error: "Sin permisos para subir archivos"
- **Causa**: Políticas de seguridad no configuradas
- **Solución**: Configura las políticas manualmente (ver sección arriba)

### Error: "El archivo es demasiado grande"
- **Causa**: Archivo mayor a 5MB
- **Solución**: Usa una imagen más pequeña o comprímela antes de subirla

### La imagen no se actualiza después de cambiarla
- **Causa**: Cache del navegador
- **Solución**: La página se recarga automáticamente después de 2 segundos

### Error de red al subir imagen
- **Causa**: Conexión a internet inestable o servidor sobrecargado
- **Solución**: Verifica tu conexión e intenta nuevamente

## 📁 Estructura de Archivos

Los avatares se almacenan con esta estructura:

```
avatars/
└── [user-id]/
    └── avatar.jpg
```

- Cada usuario tiene su propia carpeta identificada por su ID
- El archivo siempre se llama `avatar.jpg` (se sobrescribe al actualizar)
- Formato: JPEG optimizado con calidad 90%

## 🛡️ Seguridad

- ✅ Solo usuarios autenticados pueden subir avatares
- ✅ Los usuarios solo pueden gestionar sus propios avatares
- ✅ Validación de tipos de archivo en el cliente y servidor
- ✅ Límites de tamaño de archivo
- ✅ URLs públicas para visualización pero escritura protegida

## 📱 Compatibilidad

- ✅ **Navegadores**: Chrome, Firefox, Safari, Edge (versiones recientes)
- ✅ **Dispositivos**: Desktop y móvil
- ✅ **Formatos**: PNG, JPG, JPEG, WebP
- ✅ **Tamaño máximo**: 5MB por archivo

## 🚨 Notas Importantes

1. **Las imágenes se convierten automáticamente a JPEG** para optimizar el rendimiento
2. **El archivo anterior se sobrescribe** al subir un nuevo avatar
3. **La página se recarga automáticamente** después de actualizar para mostrar los cambios
4. **El recorte es obligatorio** - no se pueden subir imágenes sin recortar

---

¿Necesitas ayuda adicional? Revisa los logs de la consola del navegador para errores detallados o contacta al administrador del sistema. 