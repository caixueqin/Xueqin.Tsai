import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session || (session.user.role !== 'parent' && session.user.role !== 'admin')) {
    redirect('/login')
  }

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <div className="container">
        {children}
      </div>
    </div>
  )
}
