import { supabase } from './supabase'

/**
 * Servicio para configurar el almacenamiento de avatares y la base de datos
 */
export class AvatarSetup {
  
  /**
   * Aplica la migración para añadir el campo avatar_url a la tabla profiles
   */
  static async applyProfileMigration(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('📝 Aplicando migración de avatar_url a profiles...')
      
      // Ejecutar la migración SQL directamente
      const migrationSQL = `
        -- Añadir campo avatar_url a la tabla profiles si no existe
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS avatar_url text;

        -- Comentario explicativo
        COMMENT ON COLUMN profiles.avatar_url IS 'URL de la imagen de perfil del usuario en Supabase Storage';
      `
      
      const { error } = await supabase.rpc('exec_sql', {
        query: migrationSQL
      })
      
      if (error) {
        // Si no existe la función rpc, intentar ejecutar directamente
        console.log('⚠️ Función exec_sql no disponible, ejecutando migración alternativa...')
        
        // Verificar si la columna ya existe
        const { data: columns, error: columnError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'profiles')
          .eq('column_name', 'avatar_url')
        
        if (columnError) {
          throw new Error('Error verificando estructura de tabla: ' + columnError.message)
        }
        
        if (columns && columns.length > 0) {
          return {
            success: true,
            message: '✅ La migración ya fue aplicada anteriormente - El campo avatar_url existe'
          }
        } else {
          return {
            success: false,
            message: '❌ No se pudo aplicar la migración automáticamente. Contacta al administrador para añadir el campo avatar_url a la tabla profiles.'
          }
        }
      }
      
      return {
        success: true,
        message: '✅ Migración aplicada exitosamente - Campo avatar_url añadido a profiles'
      }
      
    } catch (error) {
      console.error('❌ Error aplicando migración:', error)
      return {
        success: false,
        message: `Error en migración: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Crea el bucket 'avatars' si no existe
   */
  static async createAvatarBucket(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🪣 Verificando bucket de avatares...')
      
      // Verificar si el bucket ya existe
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()
      
      if (listError) {
        console.error('❌ Error listando buckets:', listError)
        throw new Error('Error verificando buckets: ' + listError.message)
      }
      
      console.log('📋 Buckets disponibles:', buckets?.map(b => b.name))
      
      const avatarBucket = buckets?.find(bucket => bucket.name === 'avatars')
      
      if (avatarBucket) {
        console.log('✅ Bucket "avatars" encontrado:', avatarBucket)
        return {
          success: true,
          message: '✅ El bucket "avatars" ya existe y está configurado'
        }
      }
      
      console.log('🔧 Creando bucket "avatars"...')
      
      // Crear el bucket si no existe
      const { data: createData, error: createError } = await supabase.storage.createBucket('avatars', {
        public: true, // Los avatares son públicos
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB máximo
      })
      
      if (createError) {
        console.error('❌ Error creando bucket:', createError)
        
        // Si el error es de permisos, sugerir configuración manual
        if (createError.message.includes('permission') || createError.message.includes('policy')) {
          return {
            success: false,
            message: `❌ Sin permisos para crear bucket automáticamente.\n\n🔧 Solución manual:\n1. Ve al panel de Supabase > Storage\n2. Crea un bucket llamado "avatars"\n3. Marca como público\n4. Configura tipos MIME: image/jpeg, image/png, image/webp\n5. Límite de tamaño: 5MB`
          }
        }
        
        throw new Error('Error creando bucket: ' + createError.message)
      }
      
      console.log('✅ Bucket creado exitosamente:', createData)
      
      return {
        success: true,
        message: '✅ Bucket "avatars" creado exitosamente'
      }
      
    } catch (error) {
      console.error('❌ Error configurando bucket:', error)
      return {
        success: false,
        message: `❌ Error configurando almacenamiento: ${error instanceof Error ? error.message : 'Error desconocido'}\n\n💡 Puede ser necesario configurar el bucket manualmente desde el panel de Supabase.`
      }
    }
  }

  /**
   * Configura las políticas de seguridad para el bucket de avatares
   */
  static async setupAvatarPolicies(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔒 Configurando políticas de seguridad...')
      
      // Las políticas se deben configurar desde el panel de Supabase
      // o usando la CLI, no desde el código por seguridad
      
      return {
        success: true,
        message: `📋 Políticas requeridas para el bucket 'avatars':

1. INSERT Policy:
   - Nombre: "Users can upload avatars to their own folders" 
   - Comando: INSERT
   - Expresión: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

2. SELECT Policy:
   - Nombre: "Avatars are publicly viewable"
   - Comando: SELECT  
   - Expresión: bucket_id = 'avatars'

3. UPDATE Policy:
   - Nombre: "Users can update their own avatars"
   - Comando: UPDATE
   - Expresión: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

4. DELETE Policy:
   - Nombre: "Users can delete their own avatars"
   - Comando: DELETE
   - Expresión: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

⚠️ Estas políticas deben configurarse manualmente en el panel de Supabase > Storage > Policies.`
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Ejecuta la configuración completa del sistema de avatares
   */
  static async setupComplete(): Promise<{ success: boolean; message: string; details: string[] }> {
    const results: string[] = []
    let overallSuccess = true
    
    // 1. Aplicar migración de base de datos
    const migrationResult = await this.applyProfileMigration()
    results.push(migrationResult.message)
    if (!migrationResult.success) overallSuccess = false
    
    // 2. Crear bucket de avatares
    const bucketResult = await this.createAvatarBucket()
    results.push(bucketResult.message)
    if (!bucketResult.success) overallSuccess = false
    
    // 3. Mostrar instrucciones de políticas
    const policiesResult = await this.setupAvatarPolicies()
    results.push(policiesResult.message)
    
    return {
      success: overallSuccess,
      message: overallSuccess 
        ? '✅ Configuración de avatares completada'
        : '⚠️ Configuración de avatares completada con algunos errores',
      details: results
    }
  }

  /**
   * Prueba la funcionalidad de subida de avatares
   */
  static async testAvatarUpload(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Probando subida de avatar...')
      
      // Crear un blob de imagen de prueba (1x1 pixel PNG)
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      
      // Convertir base64 a blob
      const response = await fetch(testImageData)
      const blob = await response.blob()
      
      const testFileName = `${userId}/test-avatar.png`
      
      // Intentar subir la imagen de prueba
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(testFileName, blob, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        return {
          success: false,
          message: `Error en prueba de subida: ${error.message}\n\n💡 Verifica que el bucket 'avatars' existe y tiene las políticas correctas`
        }
      }
      
      // Limpiar archivo de prueba
      await supabase.storage.from('avatars').remove([testFileName])
      
      return {
        success: true,
        message: '✅ Prueba de subida exitosa - El sistema de avatares funciona correctamente'
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Error en prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
} 