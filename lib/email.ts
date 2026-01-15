export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('=================================')
    console.log(`OTP for ${email}: ${otp}`)
    console.log('=================================')
    return
  }
  
  console.log(`OTP sent to ${email}`)
}
