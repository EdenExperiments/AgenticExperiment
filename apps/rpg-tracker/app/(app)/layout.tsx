import { createSupabaseServerClient } from '@rpgtracker/auth/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div>
      {/* Nav placeholder — implemented in Plan B (LifeQuest React Port) */}
      <main>{children}</main>
    </div>
  )
}
