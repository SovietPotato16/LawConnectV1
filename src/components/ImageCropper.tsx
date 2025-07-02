import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Crop as CropIcon, RotateCcw } from 'lucide-react'
import 'react-image-crop/dist/ReactCrop.css'

interface ImageCropperProps {
  src: string
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImageBlob: Blob) => void
  aspectRatio?: number
}

// Función para convertir crop y canvas a blob
function getCroppedImg(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const pixelRatio = window.devicePixelRatio

  canvas.width = crop.width * pixelRatio * scaleX
  canvas.height = crop.height * pixelRatio * scaleY

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('No se pudo crear el blob de la imagen'))
        }
      },
      'image/jpeg',
      0.9
    )
  })
}

export function ImageCropper({ 
  src, 
  isOpen, 
  onClose, 
  onCropComplete, 
  aspectRatio = 1 
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)

  // Inicializar crop centrado cuando se carga la imagen
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget
    
    // Crear un crop centrado con la relación de aspecto especificada
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80, // Comenzar con 80% del ancho
        },
        aspectRatio,
        width,
        height,
      ),
      width,
      height,
    )
    setCrop(crop)
    setCompletedCrop(crop)
  }

  // Manejar el recorte final
  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current) return

    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop)
      onCropComplete(croppedImageBlob)
      onClose()
    } catch (error) {
      console.error('Error al recortar la imagen:', error)
    }
  }

  // Resetear el crop al centro
  const resetCrop = () => {
    if (!imgRef.current) return
    
    const { width, height } = imgRef.current
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 80,
        },
        aspectRatio,
        width,
        height,
      ),
      width,
      height,
    )
    setCrop(newCrop)
    setCompletedCrop(newCrop)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Recortar foto de perfil
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-subtext0">
            Arrastra las esquinas para ajustar el área de recorte. La imagen será redimensionada automáticamente.
          </p>
          
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              minWidth={100}
              minHeight={100}
              keepSelection
            >
              <img
                ref={imgRef}
                alt="Recorte"
                src={src}
                style={{ maxHeight: '400px', maxWidth: '100%' }}
                onLoad={onImageLoad}
                className="max-w-full h-auto"
              />
            </ReactCrop>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={resetCrop}
            className="mr-2"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Centrar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCropComplete}>
            Aplicar recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 