'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

export default function LoginPage() {
  const router     = useRouter()
  const setSession = useAuthStore(s => s.setSession)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!username || !password) { setError('أدخل اسم المستخدم وكلمة المرور'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const d = await res.json()
      if (d.success) {
        setSession({
          plan:      d.data.plan,
          name:      d.data.name,
          token:     d.data.token,
          ts:        d.data.ts,
          expiresAt: d.data.expiresAt,
        })
        router.push('/')
      } else {
        setError(d.error ?? 'بيانات الدخول غير صحيحة')
      }
    } catch {
      setError('خطأ في الاتصال بالخادم')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0D1117', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
      <div style={{ background:'#161B22', border:'1px solid #30363D', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'400px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'8px' }}>〜</div>
          <h1 style={{ color:'#00E5FF', fontWeight:'800', fontSize:'1.4rem', marginBottom:'4px' }}>تسجيل الدخول</h1>
          <p style={{ color:'#8B949E', fontSize:'0.8rem' }}>موجة الخبر — دخول المشتركين</p>
        </div>
        <div style={{ marginBottom:'16px' }}>
          <label style={{ display:'block', color:'#8B949E', fontSize:'0.8rem', marginBottom:'6px', textAlign:'right' }}>
            البريد الإلكتروني أو اسم المستخدم
          </label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="email@example.com"
            dir="ltr"
            style={{ width:'100%', padding:'12px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'0.9rem', boxSizing:'border-box' as const }}
          />
        </div>
        <div style={{ marginBottom:'24px' }}>
          <label style={{ display:'block', color:'#8B949E', fontSize:'0.8rem', marginBottom:'6px', textAlign:'right' }}>
            كلمة المرور
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{ width:'100%', padding:'12px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'0.9rem', boxSizing:'border-box' as const }}
          />
        </div>
        {error && (
          <p style={{ color:'#FF3355', fontSize:'0.8rem', textAlign:'center', marginBottom:'16px' }}>{error}</p>
        )}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width:'100%', padding:'14px', background:'#00E5FF', color:'#0D1117', border:'none', borderRadius:'8px', fontSize:'1rem', fontWeight:'800', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '⏳ جارٍ التحقق...' : 'دخول ◀'}
        </button>
        <p style={{ textAlign:'center', marginTop:'20px', color:'#8B949E', fontSize:'0.8rem' }}>
          ليس لديك حساب؟{' '}
          <a href="/subscribe" style={{ color:'#00E5FF', textDecoration:'none' }}>اشترك الآن</a>
        </p>
      </div>
    </div>
  )
}
