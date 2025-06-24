import { supabase } from './supabase'
import { TextExtractionService } from './textExtraction'

export class StorageService {
  static async uploadDocument(file: File, userId: string, folder?: string): Promise<{
    url: string
    path: string
    contenido?: string
    error?: string
  }> {
    try {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('El archivo es demasiado grande. Máximo 50MB.')
      }

      // Extract text from the file before uploading
      console.log('🔍 Starting text extraction for:', file.name, file.type)
      let extractedText = ''
      try {
        if (TextExtractionService.isTextExtractable(file)) {
          console.log('📄 File is extractable, extracting text...')
          extractedText = await TextExtractionService.extractTextFromFile(file)
          console.log('✅ Text extracted successfully. Length:', extractedText.length, 'characters')
          console.log('📋 First 200 chars:', extractedText.substring(0, 200))
        } else {
          console.log('❌ File type not supported for text extraction:', file.type)
          extractedText = `Archivo: ${file.name}\nTipo: ${file.type}\nTamaño: ${this.formatFileSize(file.size)}\n\nEste tipo de archivo no soporta extracción automática de texto.`
        }
      } catch (textError) {
        console.error('❌ Error extracting text:', textError)
        extractedText = `Error al extraer texto del archivo: ${file.name}\nTipo: ${file.type}\nTamaño: ${this.formatFileSize(file.size)}\nError: ${textError instanceof Error ? textError.message : 'Error desconocido'}`
      }

      // Create a unique file path
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${userId}/${folder ? folder + '/' : ''}${timestamp}-${sanitizedName}`

      // Upload file to Supabase Storage
      console.log('☁️ Uploading file to storage...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName)

      console.log('✅ File uploaded successfully:', publicUrl)
      console.log('📝 Extracted content length:', extractedText.length)

      return {
        url: publicUrl,
        path: fileName,
        contenido: extractedText
      }
    } catch (error) {
      console.error('❌ Error in uploadDocument:', error)
      return {
        url: '',
        path: '',
        error: error instanceof Error ? error.message : 'Error desconocido al subir documento'
      }
    }
  }

  static async uploadImage(file: File, userId: string, folder?: string): Promise<{
    url: string
    path: string
    error?: string
  }> {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Solo se permiten archivos de imagen.')
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('El archivo es demasiado grande. Máximo 10MB.')
      }

      // Create a unique file path
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${userId}/${folder ? folder + '/' : ''}${timestamp}-${sanitizedName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(fileName)

      return {
        url: publicUrl,
        path: fileName
      }
    } catch (error) {
      console.error('Error in uploadImage:', error)
      return {
        url: '',
        path: '',
        error: error instanceof Error ? error.message : 'Error desconocido al subir imagen'
      }
    }
  }

  static async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  }

  static getPublicUrl(bucket: string, path: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return publicUrl
  }

  static async downloadFile(bucket: string, path: string): Promise<Blob | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)

      if (error) {
        console.error('Download error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error downloading file:', error)
      return null
    }
  }

  // Helper method to check if a URL is accessible
  static async checkUrlAccessibility(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (error) {
      console.error('URL not accessible:', error)
      return false
    }
  }

  // Method to get a signed URL for private files (if needed in the future)
  static async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)

      if (error) {
        console.error('Error creating signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error getting signed URL:', error)
      return null
    }
  }

  // Method to get file info
  static async getFileInfo(bucket: string, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        })

      if (error) {
        console.error('Error getting file info:', error)
        return null
      }

      return data?.[0] || null
    } catch (error) {
      console.error('Error getting file info:', error)
      return null
    }
  }

  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
}