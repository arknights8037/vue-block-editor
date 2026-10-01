export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return '请选择图片文件'
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return '图片不能超过 15 MB'
  }

  return null
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  const validationError = validateImageFile(file)
  if (validationError) {
    return Promise.reject(new Error(validationError))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('无法读取图片'))
    })
    reader.addEventListener('error', () => reject(new Error('无法读取图片')))
    reader.readAsDataURL(file)
  })
}
