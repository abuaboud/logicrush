import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AppError, ErrorCode } from '@logicrush/shared'
import { ids } from './ids.js'

// Local-disk uploads (no S3 configured). Validates by MAGIC BYTES, not the
// client's content-type, caps size, and names files non-guessably so one user
// can't enumerate another's. Served read-only via @fastify/static at /uploads.
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
const MAX_BYTES = 2 * 1024 * 1024

const SIGNATURES: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: 'png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  { ext: 'webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
]

export const uploads = {
  async save(buffer: Buffer): Promise<string> {
    if (buffer.length > MAX_BYTES) throw new AppError({ code: ErrorCode.VALIDATION, params: { reason: 'too_large', max: MAX_BYTES } })
    const match = SIGNATURES.find((s) => s.test(buffer))
    if (match === undefined) throw new AppError({ code: ErrorCode.VALIDATION, params: { reason: 'not_an_image' } })
    await mkdir(UPLOAD_DIR, { recursive: true })
    const name = `${ids.new()}.${match.ext}`
    await writeFile(path.join(UPLOAD_DIR, name), buffer)
    return `/uploads/${name}`
  },
}
