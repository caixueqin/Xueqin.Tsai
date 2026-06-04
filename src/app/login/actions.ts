'use server'

import { prisma } from '@/lib/prisma'
import { loginUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const name = formData.get('name') as string
  const pinOrPassword = formData.get('pin') as string

  if (!name || !pinOrPassword) {
    return { error: 'Name and PIN/Password are required.' }
  }

  // Find user
  const user = await prisma.user.findFirst({
    where: { name }
  })

  if (!user) {
    return { error: 'Miner not found.' }
  }

  // Simple check for child or adult
  if (user.role === 'child') {
    if (user.pin !== pinOrPassword) {
      return { error: 'Incorrect PIN.' }
    }
    
    // Check if they are using the default PIN
    if (user.pin === '1234') {
      const newPin = formData.get('newPin') as string
      if (!newPin) {
        return { requiresNewPin: true, message: 'Welcome! Since this is your first time, please set a new secret PIN (e.g. 4 digits).' }
      } else {
        // Update the PIN
        await prisma.user.update({
          where: { id: user.id },
          data: { pin: newPin }
        })
      }
    }
  } else {
    if (user.password !== pinOrPassword) {
      return { error: 'Incorrect Password.' }
    }
  }

  // Success, create session
  await loginUser({ id: user.id, name: user.name, role: user.role })

  if (user.role === 'child') {
    redirect('/child')
  } else {
    redirect('/parent')
  }
}
