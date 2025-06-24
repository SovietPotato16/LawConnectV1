import { supabase } from './supabase'

export class ImageStorageSetup {
  
  /**
   * Verifica si el bucket de imágenes y la tabla existen
   */
  static async ensureImagesBucketExists(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔍 Verificando sistema de imágenes...')
      
      // 1. Verificar si la tabla de imágenes existe
      const tableCheck = await this.checkImagesTable()
      if (!tableCheck.exists) {
        return {
          success: false,
          message: `❌ La tabla 'imagenes' no existe en la base de datos.\n\n🔧 SOLUCIÓN:\n1. Ejecuta: npx supabase db reset\n2. O aplica la migración manualmente desde el panel de Supabase\n\nArchivo de migración: supabase/migrations/20250624020010_create_images_table.sql`
        }
      }
      
      // 2. Verificar si el bucket existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.error('❌ Error listando buckets:', bucketsError)
        return {
          success: false,
          message: `Error verificando buckets: ${bucketsError.message}`
        }
      }
      
      // Verificar si el bucket 'imagenes' existe
      const hasImagesBucket = buckets?.some(bucket => bucket.name === 'imagenes')
      
      if (!hasImagesBucket) {
        return {
          success: false,
          message: `❌ El bucket 'imagenes' no existe\n\n🔧 CONFIGURACIÓN REQUERIDA:\n\n1. Ve al panel de Supabase → Storage\n2. Crea un bucket llamado "imagenes"\n3. Márcalo como "Public bucket"\n4. Configura las políticas de acceso\n\n💡 Una vez creado, la funcionalidad de imágenes funcionará correctamente.`
        }
      }
      
      console.log('✅ Bucket "imagenes" encontrado')
      
      // 3. Mostrar estado de las políticas
      this.logPolicyInstructions()
      
      return {
        success: true,
        message: '✅ Sistema de imágenes configurado correctamente!\n\n📋 Asegúrate de que las políticas de acceso estén configuradas (revisa la consola para detalles)'
      }
      
    } catch (error) {
      console.error('💥 Error verificando almacenamiento:', error)
      return {
        success: false,
        message: `Error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }

  /**
   * Verifica si la tabla de imágenes existe
   */
  private static async checkImagesTable(): Promise<{ exists: boolean; message?: string }> {
    try {
      // Intentar hacer una consulta simple a la tabla
      const { data, error } = await supabase
        .from('imagenes')
        .select('id')
        .limit(1)
      
      if (error) {
        // Si el error es que la tabla no existe
        if (error.code === '42P01') {
          return { exists: false, message: 'Tabla imagenes no existe' }
        }
        // Otro tipo de error, pero la tabla existe
        return { exists: true }
      }
      
      return { exists: true }
    } catch (error) {
      return { exists: false, message: 'Error verificando tabla' }
    }
  }
  
  /**
   * Muestra las instrucciones para configurar políticas
   */
  private static logPolicyInstructions(): void {
    console.log(`
📋 POLÍTICAS REQUERIDAS PARA EL BUCKET 'imagenes' (Panel de Supabase → Storage → Policies):

1. INSERT Policy:
   - Nombre: "Users can upload images to their own folders"
   - Comando: INSERT
   - Expresión: bucket_id = 'imagenes' AND auth.uid()::text = (storage.foldername(name))[1]

2. SELECT Policy:
   - Nombre: "Images are publicly viewable"
   - Comando: SELECT
   - Expresión: bucket_id = 'imagenes'

3. UPDATE Policy:
   - Nombre: "Users can update their own images"
   - Comando: UPDATE
   - Expresión: bucket_id = 'imagenes' AND auth.uid()::text = (storage.foldername(name))[1]

4. DELETE Policy:
   - Nombre: "Users can delete their own images"
   - Comando: DELETE
   - Expresión: bucket_id = 'imagenes' AND auth.uid()::text = (storage.foldername(name))[1]

⚠️ Sin estas políticas, las imágenes no se podrán subir o acceder correctamente.
    `)
  }
  
  /**
   * Prueba la funcionalidad de subida de imágenes
   */
  static async testImageUpload(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Probando subida de imagen...')
      
      // Crear un blob de imagen de prueba (1x1 pixel PNG)
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      
      // Convertir base64 a blob
      const response = await fetch(testImageData)
      const blob = await response.blob()
      
      const testFileName = `${userId}/test/${Date.now()}-test.png`
      
      // Intentar subir la imagen de prueba
      const { data, error } = await supabase.storage
        .from('imagenes')
        .upload(testFileName, blob, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        return {
          success: false,
          message: `Error en prueba de subida: ${error.message}\n\n💡 Verifica que el bucket 'imagenes' existe y tiene las políticas correctas`
        }
      }
      
      // Limpiar archivo de prueba
      await supabase.storage.from('imagenes').remove([testFileName])
      
      return {
        success: true,
        message: '✅ Prueba de subida exitosa - El almacenamiento funciona correctamente'
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Error en prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }
    }
  }
} 