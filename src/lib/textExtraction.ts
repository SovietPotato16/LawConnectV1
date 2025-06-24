// Servicio para extraer texto de diferentes tipos de documentos
// Importar las librerías necesarias para extracción de texto
const pdfParse = (window as any).pdfjsLib || null; // PDF.js para el navegador
const mammoth = (window as any).mammoth || null; // Mammoth para documentos Word

export class TextExtractionService {
  
  /**
   * Extrae texto de un archivo según su tipo
   */
  static async extractTextFromFile(file: File): Promise<string> {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    try {
      console.log(`🔍 Extracting text from file: ${file.name} (${fileType})`)
      
      // Archivos de texto plano
      if (fileType.includes('text') || fileName.endsWith('.txt')) {
        console.log('📄 Processing as text file')
        return await this.extractFromTextFile(file)
      }
      
      // Archivos CSV
      if (fileType.includes('csv') || fileName.endsWith('.csv')) {
        console.log('📊 Processing as CSV file')
        return await this.extractFromCSV(file)
      }
      
      // PDFs - usar PDF.js
      if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
        console.log('📋 Processing as PDF file')
        return await this.extractFromPDF(file)
      }
      
      // Documentos de Word - usar Mammoth
      if (fileType.includes('word') || fileType.includes('document') || 
          fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        console.log('📝 Processing as Word document')
        return await this.extractFromWord(file)
      }
      
      // Para otros tipos, intentar como texto
      console.log(`❓ Unknown file type ${fileType}, attempting text extraction`)
      return await this.extractFromTextFile(file)
      
    } catch (error) {
      console.error('❌ Error extracting text:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return `Error al extraer texto del archivo: ${file.name}\nTipo: ${fileType}\nTamaño: ${this.formatFileSize(file.size)}\nError: ${errorMessage}`
    }
  }
  
  /**
   * Extrae texto de archivos de texto plano
   */
  private static async extractFromTextFile(file: File): Promise<string> {
    console.log('📖 Reading text file with FileReader')
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        console.log('✅ Text file read successfully, length:', text?.length || 0)
        resolve(text || '')
      }
      reader.onerror = (e) => {
        console.error('❌ Error reading text file:', e)
        reject(e)
      }
      reader.readAsText(file, 'UTF-8')
    })
  }
  
  /**
   * Extrae texto de archivos CSV
   */
  private static async extractFromCSV(file: File): Promise<string> {
    console.log('📊 Processing CSV file')
    const csvText = await this.extractFromTextFile(file)
    const lines = csvText.split('\n').filter(line => line.trim())
    
    let extractedText = `Archivo CSV: ${file.name}\n`
    extractedText += `Número de filas: ${lines.length}\n\n`
    
    // Procesar las primeras filas para obtener estructura
    if (lines.length > 0) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      extractedText += `Columnas: ${headers.join(', ')}\n\n`
      
      // Tomar las primeras 10 filas como muestra
      const sampleRows = lines.slice(0, Math.min(10, lines.length))
      extractedText += 'Contenido (primeras 10 filas):\n'
      extractedText += sampleRows.join('\n')
      
      if (lines.length > 10) {
        extractedText += `\n\n... (${lines.length - 10} filas adicionales)`
      }
    }
    
    console.log('✅ CSV processed successfully, final length:', extractedText.length)
    return extractedText
  }
  
  /**
   * Extracción de PDFs usando PDF.js
   */
  private static async extractFromPDF(file: File): Promise<string> {
    console.log('📋 Starting PDF text extraction')
    
    // Verificar si PDF.js está disponible
    if (!pdfParse && !(window as any).pdfjsLib) {
      console.log('📚 PDF.js not loaded, attempting to load...')
      // Intentar cargar PDF.js dinámicamente
      try {
        await this.loadPDFjs()
        console.log('✅ PDF.js loaded successfully')
      } catch (error) {
        console.error('❌ Error loading PDF.js:', error)
        return this.getFallbackPDFText(file)
      }
    } else {
      console.log('✅ PDF.js already available')
    }

    try {
      // Convertir archivo a ArrayBuffer
      console.log('🔄 Converting PDF to ArrayBuffer')
      const arrayBuffer = await this.fileToArrayBuffer(file)
      console.log('✅ ArrayBuffer created, size:', arrayBuffer.byteLength)
      
      // Usar PDF.js para extraer texto
      console.log('🔄 Loading PDF with PDF.js')
      const pdf = await (window as any).pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: 'https://mozilla.github.io/pdf.js/build/cmaps/',
        cMapPacked: true
      }).promise

      console.log('✅ PDF loaded successfully, pages:', pdf.numPages)

      let fullText = `PDF: ${file.name}\n`
      fullText += `Páginas: ${pdf.numPages}\n`
      fullText += `Tamaño: ${this.formatFileSize(file.size)}\n\n`
      fullText += 'CONTENIDO EXTRAÍDO:\n\n'

      // Extraer texto de cada página
      const maxPages = Math.min(pdf.numPages, 50)
      console.log(`📖 Extracting text from ${maxPages} pages`)
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`📄 Processing page ${pageNum}/${maxPages}`)
          const page = await pdf.getPage(pageNum)
          const textContent = await page.getTextContent()
          
          let pageText = textContent.items.map((item: any) => item.str).join(' ')
          pageText = pageText.replace(/\s+/g, ' ').trim()
          
          if (pageText) {
            fullText += `--- PÁGINA ${pageNum} ---\n${pageText}\n\n`
            console.log(`✅ Page ${pageNum} processed, text length:`, pageText.length)
          } else {
            console.log(`⚠️ Page ${pageNum} has no text content`)
          }
        } catch (pageError) {
          console.error(`❌ Error extracting page ${pageNum}:`, pageError)
          fullText += `--- PÁGINA ${pageNum} ---\nError al extraer texto de esta página\n\n`
        }
      }

      if (pdf.numPages > 50) {
        fullText += `\n[DOCUMENTO TRUNCADO - Mostrando solo las primeras 50 páginas de ${pdf.numPages}]`
      }

      console.log('✅ PDF text extraction completed, final length:', fullText.length)
      return fullText
    } catch (error) {
      console.error('❌ Error with PDF.js extraction:', error)
      return this.getFallbackPDFText(file)
    }
  }
  
  /**
   * Carga PDF.js dinámicamente
   */
  private static async loadPDFjs(): Promise<void> {
    console.log('📚 Loading PDF.js dynamically...')
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        console.log('✅ PDF.js already loaded')
        resolve()
        return
      }

      // Intentar cargar desde CDN alternativo (más estable que ES modules)
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload = () => {
        console.log('📚 PDF.js script loaded')
        
        // Configurar worker usando la misma CDN
        if ((window as any).pdfjsLib) {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          console.log('✅ PDF.js worker configured')
          resolve()
        } else {
          console.error('❌ PDF.js failed to load properly')
          reject(new Error('PDF.js failed to load'))
        }
      }
      script.onerror = () => {
        console.error('❌ Failed to load PDF.js script')
        reject(new Error('Failed to load PDF.js'))
      }
      document.head.appendChild(script)
      console.log('📚 PDF.js script tag added to head')
    })
  }

  /**
   * Texto de respaldo para PDFs cuando no se puede extraer
   */
  private static getFallbackPDFText(file: File): string {
    console.log('⚠️ Using fallback PDF text')
    return `PDF: ${file.name}
Tipo: Documento PDF
Tamaño: ${this.formatFileSize(file.size)}
Creado: ${new Date(file.lastModified).toLocaleString()}

NOTA: No se pudo extraer el texto del PDF automáticamente.
Esto puede deberse a que:
- El PDF contiene imágenes escaneadas en lugar de texto seleccionable
- El PDF está protegido o encriptado
- Hay un problema técnico con la extracción

RECOMENDACIÓN: Para análisis detallado, considera:
1. Convertir el PDF a texto usando otra herramienta
2. Proporcionar un resumen manual del contenido
3. Verificar que el PDF contenga texto seleccionable`
  }
  
  /**
   * Extracción de documentos Word usando Mammoth
   */
  private static async extractFromWord(file: File): Promise<string> {
    console.log('📝 Starting Word document extraction')
    
    // Verificar si Mammoth está disponible
    if (!mammoth && !(window as any).mammoth) {
      console.log('📚 Mammoth not loaded, attempting to load...')
      try {
        await this.loadMammoth()
        console.log('✅ Mammoth loaded successfully')
      } catch (error) {
        console.error('❌ Error loading Mammoth:', error)
        return this.getFallbackWordText(file)
      }
    } else {
      console.log('✅ Mammoth already available')
    }

    try {
      // Solo soporta .docx
      if (!file.name.toLowerCase().endsWith('.docx')) {
        console.log('⚠️ File is not .docx format')
        return this.getFallbackWordText(file)
      }

      // Convertir archivo a ArrayBuffer
      console.log('🔄 Converting Word document to ArrayBuffer')
      const arrayBuffer = await this.fileToArrayBuffer(file)
      console.log('✅ ArrayBuffer created, size:', arrayBuffer.byteLength)
      
      // Usar Mammoth para extraer texto
      console.log('🔄 Extracting text with Mammoth')
      const result = await (window as any).mammoth.extractRawText({
        arrayBuffer: arrayBuffer
      })

      console.log('✅ Mammoth extraction completed')

      let extractedText = `Documento Word: ${file.name}\n`
      extractedText += `Tamaño: ${this.formatFileSize(file.size)}\n`
      extractedText += `Creado: ${new Date(file.lastModified).toLocaleString()}\n\n`
      extractedText += 'CONTENIDO EXTRAÍDO:\n\n'
      extractedText += result.value || 'No se encontró texto en el documento'

      // Agregar mensajes de advertencia si los hay
      if (result.messages && result.messages.length > 0) {
        extractedText += '\n\nADVERTENCIAS DE EXTRACCIÓN:\n'
        result.messages.forEach((msg: any, index: number) => {
          extractedText += `${index + 1}. ${msg.message}\n`
        })
      }

      console.log('✅ Word extraction completed, final length:', extractedText.length)
      return extractedText
    } catch (error) {
      console.error('❌ Error with Mammoth extraction:', error)
      return this.getFallbackWordText(file)
    }
  }

  /**
   * Carga Mammoth dinámicamente
   */
  private static async loadMammoth(): Promise<void> {
    console.log('📚 Loading Mammoth dynamically...')
    return new Promise((resolve, reject) => {
      if ((window as any).mammoth) {
        console.log('✅ Mammoth already loaded')
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'
      script.onload = () => {
        console.log('📚 Mammoth script loaded')
        if ((window as any).mammoth) {
          console.log('✅ Mammoth available')
          resolve()
        } else {
          console.error('❌ Mammoth failed to load properly')
          reject(new Error('Mammoth failed to load'))
        }
      }
      script.onerror = () => {
        console.error('❌ Failed to load Mammoth script')
        reject(new Error('Failed to load Mammoth'))
      }
      document.head.appendChild(script)
      console.log('📚 Mammoth script tag added to head')
    })
  }

  /**
   * Texto de respaldo para documentos Word
   */
  private static getFallbackWordText(file: File): string {
    console.log('⚠️ Using fallback Word text')
    return `Documento Word: ${file.name}
Tipo: ${file.type}
Tamaño: ${this.formatFileSize(file.size)}
Creado: ${new Date(file.lastModified).toLocaleString()}

NOTA: No se pudo extraer el texto del documento automáticamente.
Esto puede deberse a que:
- El documento es formato .doc (solo se soporta .docx)
- El documento está protegido o corrupto
- Hay un problema técnico con la extracción

RECOMENDACIÓN: Para análisis detallado:
1. Guarda el documento como .docx si es .doc
2. Copia y pega el contenido como archivo .txt
3. Verifica que el documento no esté protegido`
  }

  /**
   * Convierte File a ArrayBuffer
   */
  private static fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    console.log('🔄 Converting file to ArrayBuffer')
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as ArrayBuffer
        console.log('✅ File converted to ArrayBuffer, size:', result.byteLength)
        resolve(result)
      }
      reader.onerror = (e) => {
        console.error('❌ Error converting file to ArrayBuffer:', e)
        reject(e)
      }
      reader.readAsArrayBuffer(file)
    })
  }
  
  /**
   * Formatea el tamaño del archivo
   */
  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  /**
   * Valida si un archivo es procesable para extracción de texto
   */
  static isTextExtractable(file: File): boolean {
    const fileType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    const supportedTypes = [
      'text/',
      'csv',
      'pdf',
      'word',
      'document',
      '.txt',
      '.csv',
      '.pdf',
      '.doc',
      '.docx'
    ]
    
    const isSupported = supportedTypes.some(type => 
      fileType.includes(type) || fileName.endsWith(type)
    )
    
    console.log(`📋 File extractability check for ${file.name}:`, isSupported)
    return isSupported
  }

  /**
   * Obtiene un resumen del contenido extraído
   */
  static getContentSummary(extractedText: string): string {
    const lines = extractedText.split('\n').filter(line => line.trim())
    const wordCount = extractedText.split(/\s+/).length
    const charCount = extractedText.length

    return `Resumen del contenido:
- Líneas: ${lines.length}
- Palabras: ${wordCount}
- Caracteres: ${charCount}
- Tamaño: ${this.formatFileSize(charCount)}`
  }
} 