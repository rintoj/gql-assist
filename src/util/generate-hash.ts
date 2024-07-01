import crypto from 'crypto'

export function generateHash(
  data: string,
  algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512' = 'md5',
) {
  return crypto.createHash(algorithm).update(data).digest('hex')
}
