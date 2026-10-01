import type { Editor } from '@tiptap/core'
import type { Ref } from 'vue'
import { getAssetUrl, useAssetService } from '@/infrastructure/assets/AssetService'
import { readImageFileAsDataUrl } from '@/editor/imageFile'

export function useEditorFileActions(editor: Ref<Editor | undefined>, documentId: () => string, onError: (message: string) => void) {
  const assets = useAssetService()
  async function insertImageFile(file: File, requestedPosition?: number): Promise<void> {
    const activeEditor = editor.value
    if (!activeEditor || !activeEditor.isEditable) return
    try {
      let src = ''
      try {
        src = getAssetUrl((await assets.storeFile(file, documentId() || null)).id)
      } catch {
        src = await readImageFileAsDataUrl(file)
      }
      const position = Math.max(0, Math.min(requestedPosition ?? activeEditor.state.selection.from, activeEditor.state.doc.content.size))
      activeEditor.chain().focus().insertContentAt(position, [{ type: 'imageFigure', attrs: { src, alt: file.name, originalName: file.name } }, { type: 'paragraph' }]).run()
    } catch (error) { onError(error instanceof Error ? error.message : '无法读取图片') }
  }

  async function insertAttachmentFile(file: File, requestedPosition?: number): Promise<void> {
    const activeEditor = editor.value
    if (!activeEditor || !activeEditor.isEditable) return
    try {
      const asset = await assets.storeFile(file, documentId() || null)
      const position = Math.max(0, Math.min(requestedPosition ?? activeEditor.state.selection.from, activeEditor.state.doc.content.size))
      activeEditor.chain().focus().insertContentAt(position, [{ type: 'attachmentBlock', attrs: { assetId: asset.id, name: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes } }, { type: 'paragraph' }]).run()
    } catch (error) { onError(error instanceof Error ? error.message : '无法保存附件') }
  }
  return { insertImageFile, insertAttachmentFile }
}
