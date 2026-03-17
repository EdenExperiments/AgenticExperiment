import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@rpgtracker/auth/server'

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  redirect(session ? '/dashboard' : '/login')
}
