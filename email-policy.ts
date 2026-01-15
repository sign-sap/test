export function isEmailAllowed(email: string): boolean {
  const policy = process.env.ALLOWED_EMAILS_POLICY || 'all'
  
  if (policy === 'all') {
    return true
  }
  
  if (policy.startsWith('domain:')) {
    const domain = policy.substring(7)
    return email.endsWith(`@${domain}`)
  }
  
  if (policy.startsWith('list:')) {
    const allowedEmails = policy.substring(5).split(',').map(e => e.trim())
    return allowedEmails.includes(email)
  }
  
  return false
}
