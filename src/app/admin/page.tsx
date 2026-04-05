'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { sha256 } from '@/lib/utils'

const MAIN_HASHES = {
  AU:  '9057f652e4dadfb37f55190933bfdd604114c9e287affcf78c6e60c9c5e4a207',
  AE:  'ca2063aba4ae4f5de66f7d7c31bee2d5e6042ded0ca6b592b2133257c7ded2cc',
  AP:  'c9703d888f4e747ffff62688991200b03b0c0f43ba85ce9822027254ed6dc71a',
  AP2: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
}

export default function AdminLoginPage() {
  const router     = useRouter()
  const setSession = useAuthStore(s => s.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!username || !password) { setError('أدخل اسم المستخدم وكلمة المرور'); return }
    setLoading(true); setError('')

    const uh = await sha256(username)
    const ph = await sha256(password)

    // ✅ التحقق من الأدمن الرئيسي (hash ثابت في الكود)
    const isMainAdmin =
      (uh === MAIN_HASHES.AU || uh === MAIN_HASHES.AE) &&
      (ph === MAIN_HASHES.AP || ph === MAIN_HASHES.AP2)

    if (isMainAdmin) {
      setSession({ plan: 'admin', name: username, token: 'admin-' + Date.now(), ts: Date.now(), lifetime: true })
      router.push('/admin/dashboard')
      return
    }

    // ✅ التحقق من الأدمنز الفرعيين في Supabase
    try {
      const res = await fetch('/api/admins/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password_hash: ph }),
      })
      const d = await res.json()
      if (d.success) {
        setSession({ plan: 'admin', name: username, token: 'admin-' + Date.now(), ts: Date.now(), lifetime: true })
        router.push('/admin/dashboard')
        return
      }
    } catch {}

    setError('❌ بيانات الدخول غير صحيحة')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0D1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'400px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'8px' }}>🛡️</div>
          <h1 style={{ color:'#00E5FF', fontWeight:'800', fontSize:'1.4rem', marginBottom:'4px' }}>لوحة الأدمن</h1>
          <p style={{ color:'#8B949E', fontSize:'0.8rem' }}>موجة الخبر — Admin Panel</p>
        </div>
        <div style={{ marginBottom:'16px' }}>
          <label style={{ display:'block', color:'#8B949E', fontSize:'0.8rem', marginBottom:'6px', textAlign:'right' }}>اسم المستخدم</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="username"
            dir="ltr"
            style={{ width:'100%', padding:'12px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'0.9rem', boxSizing:'border-box' as const }}
          />
        </div>
        <div style={{ marginBottom:'24px' }}>
          <label style={{ display:'block', color:'#8B949E', fontSize:'0.8rem', marginBottom:'6px', textAlign:'right' }}>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width:'100%', padding:'12px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'0.9rem', boxSizing:'border-box' as const }}
          />
        </div>
        {error && <p style={{ color:'#FF3355', fontSize:'0.8rem', textAlign:'center', marginBottom:'16px' }}>{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width:'100%', padding:'14px', background:'#00E5FF', color:'#0D1117', border:'none', borderRadius:'8px', fontSize:'1rem', fontWeight:'800', cursor:'pointer' }}>
          {loading ? '⏳ جارٍ التحقق...' : 'دخول ◀'}
        </button>
      </div>
    </div>
  )
}
