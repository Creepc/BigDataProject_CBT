import type { SourceFile } from '@/types'

export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
export const pdfPageUrl = (file: SourceFile, page?: number) => `${assetUrl(file.pdfUrl)}${page ? `#page=${page}&view=FitH` : ''}`
