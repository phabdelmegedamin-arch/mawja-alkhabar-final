import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ success: true })
  // Supabase session cleared client-side via supabase.auth.signOut()
}
