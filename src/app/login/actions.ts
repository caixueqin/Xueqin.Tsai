'use server'

import { prisma } from '@/lib/prisma'
import { loginUser } from '@/lib/auth'
import { hashPin, verifyPin } from '@/lib/pin'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'

export async function loginAction(formData: FormData) {
  const name = ((formData.get('name') as string) || '').trim()
  const pinOrPassword = formData.get('pin') as string

  if (!name || !pinOrPassword) {
    return { error: 'Name and PIN/Password are required.' }
  }

  // Find user
  let user = await prisma.user.findUnique({
    where: { name }
  })

  if (!user) {
    return { error: 'Miner not found.' }
  }

  // Simple check for child or adult
  if (user.role === 'child') {
    if (!verifyPin(pinOrPassword, user.pin)) {
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
          data: { pin: hashPin(newPin) }
        })
      }
    }
  } else {
    if (!verifyPin(pinOrPassword, user.password)) {
      return { error: 'Incorrect Password.' }
    }

    if (user.role === 'parent' && (user.mustChangePin || user.password === '1234')) {
      const newPin = formData.get('newPin') as string
      const newName = ((formData.get('newName') as string) || '').trim()

      if (!newPin) {
        return {
          requiresNewPin: true,
          requiresNewName: true,
          message: 'Welcome! Please set your login name and a new PIN.',
        }
      }

      if (newName && newName !== user.name) {
        const existing = await prisma.user.findUnique({ where: { name: newName } })
        if (existing) {
          return { error: 'That login name is already taken.' }
        }
      }

      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: newName || user.name,
            password: hashPin(newPin),
            mustChangePin: false,
          }
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return { error: 'That login name is already taken.' }
        }
        throw error
      }
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
