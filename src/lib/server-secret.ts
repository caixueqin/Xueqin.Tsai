export function getServerSecret() {
  const secret = process.env.JWT_SECRET

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters in production.')
    }
    return secret
  }

  return secret || 'development-only-mathcraft-secret'
}
