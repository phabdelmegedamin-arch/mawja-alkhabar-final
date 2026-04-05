'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { DB, RELS, SECTOR_ORDER } from '@/data/market-db'

const TABS = [
  { id: 0, label: 'إحصائيات',         icon: '📊' },
  { id: 1, label: 'الأسهم',            icon: '📈' },
  { id: 2, label: 'الكلمات المفتاحية', icon: '🔤' },
  { id: 3, label: 'علاقات القطاعات',   icon: '🔗' },
  { id: 4, label: 'سجل التحليلات',     icon: '📜' },
  { id: 5, label: 'إعدادات API',       icon: '⚙️' },
  { id: 6, label: 'الأمان',            icon: '🔐' },
  { id: 7, label: 'الأدمنز',           icon: '👤' },
  { id: 8, label: 'أكواد الاشتراك',    icon: '🎫' },
  { id: 9, label: 'المشتركون',         icon: '👥' },
]

export default function AdminDashboard() {
  const router  = useRouter()
  const session = useAuthStore(s => s.session)
  const logout  = useAuthStore(s => s.logout)

  const [tab, setTab]         = useState(0)
  const [dirty, setDirty]     = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [codes, setCodes]     = useState<any[]>([])
  const [subs,  setSubs]      = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [apiKey, setApiKey]   = useState('')
  const [apiMsg, setApiMsg]   = useState('')
  const [codeForm, setCodeForm] = useState({ code: '', note: '', expiry: '' })
  const [codeMsg,  setCodeMsg]  = useState('')
  const [pwdForm, setPwdForm]   = useState({ old: '', new1: '', new2: '' })
  const [pwdMsg,  setPwdMsg]    = useState('')
  const [admins, setAdmins]     = useState<Array<{ username: string; role: string }>>([])
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', confirm: '' })
  const [adminMsg, setAdminMsg] = useState('')

  const allStocks = SECTOR_ORDER.flatMap(sec =>
    (DB[sec]?.stocks ?? []).map(s => ({ ...s, sector: sec, sectorLabel: DB[sec].label }))
  )
  const allKeywords = SECTOR_ORDER.flatMap(sec =>
    (DB[sec]?.kw ?? []).map(kw => ({ kw, sector: sec, sectorLabel: DB[sec].label, icon: DB[sec].icon }))
  )

  const stats = {
    analyses: history.length,
    keywords: allKeywords.length,
    stocks:   allStocks.length,
    sectors:  SECTOR_ORDER.length,
    codes:    codes.length,
    subs:     subs.length,
  }

  useEffect(() => {
    if (!session || session.plan !== 'admin') { router.push('/admin'); return }
    const k = localStorage.getItem('anthropic_key') || ''
    setApiKey(k)
    const h = JSON.parse(localStorage.getItem('mw_history_v2') || '[]')
    setHistory(h)
    loadCodes()
    loadSubs()
    loadAdmins()
  }, [])

  const loadCodes = async () => {
    try {
      const res = await fetch('/api/codes')
      const d   = await res.json()
      setCodes(d.data || [])
    } catch {}
  }

  const loadSubs = async () => {
    try {
      const res = await fetch('/api/subscribers')
      const d   = await res.json()
      setSubs(d.data || [])
    } catch {}
  }

  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/admins')
      const d   = await res.json()
      if (d.success) setAdmins(d.data.map((a: any) => ({
        username: a.username,
        role: a.role === 'main' ? 'رئيسي' : 'فرعي',
      })))
    } catch {}
  }

  const handleSave = () => {
    localStorage.setItem('anthropic_key', apiKey)
    setDirty(false)
    setSaveMsg('✅ تم الحفظ')
    setTimeout(() => setSaveMsg(''), 2500)
  }

  const handleExport = () => {
    const data = { exportedAt: new Date().toISOString(), stats, history: history.slice(0, 50), codes }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `mawja-export-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    if (!confirm('سيتم مسح سجل التحليلات المحلي. متابعة؟')) return
    localStorage.removeItem('mw_history_v2')
    setHistory([])
  }

  const genCode = () => {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const r = (n: number) => Array.from({length:n},()=>c[Math.floor(Math.random()*c.length)]).join('')
    setCodeForm(f => ({ ...f, code: `MW-${r(4)}-${r(4)}` }))
  }

  const addCode = async () => {
    if (!codeForm.code) return
    const res = await fetch('/api/codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', code: codeForm.code, note: codeForm.note, expiry: codeForm.expiry || undefined }),
    })
    const d = await res.json()
    if (d.success) { setCodeMsg('✅ تم الإضافة'); setCodeForm({ code: '', note: '', expiry: '' }); loadCodes() }
    else setCodeMsg('❌ ' + d.error)
    setTimeout(() => setCodeMsg(''), 3000)
  }

  const toggleCode = async (code: string) => {
    await fetch('/api/codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', code }) })
    loadCodes()
  }

  const deleteCode = async (code: string) => {
    if (!confirm('حذف الكود؟')) return
    await fetch('/api/codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', code }) })
    loadCodes()
  }

  const saveApiKey = () => {
    localStorage.setItem('anthropic_key', apiKey)
    setApiMsg('✅ تم حفظ المفتاح')
    setTimeout(() => setApiMsg(''), 3000)
  }

  const addAdmin = async () => {
    if (!newAdmin.username || !newAdmin.password) return
    if (newAdmin.password !== newAdmin.confirm) {
      setAdminMsg('❌ كلمتا المرور غير متطابقتين'); return
    }
    const msgBuffer  = new TextEncoder().encode(newAdmin.password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray  = Array.from(new Uint8Array(hashBuffer))
    const password_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const res = await fetch('/api/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', username: newAdmin.username, password_hash, role: 'sub' }),
    })
    const d = await res.json()
    if (d.success) {
      setAdminMsg('✅ تم إضافة الأدمن')
      setNewAdmin({ username: '', password: '', confirm: '' })
      loadAdmins()
    } else {
      setAdminMsg('❌ ' + d.error)
    }
    setTimeout(() => setAdminMsg(''), 3000)
  }

  const removeAdmin = async (username: string) => {
    if (!confirm('حذف الأدمن؟')) return
    const res = await fetch('/api/admins', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', username }),
    })
    const d = await res.json()
    if (d.success) loadAdmins()
    else alert('❌ ' + d.error)
  }

  // ── Styles ──
  const s: React.CSSProperties = {
    minHeight: '100vh', background: '#0D1117', color: '#E6EDF3',
    fontFamily: 'Tajawal, Cairo, sans-serif', direction: 'rtl',
  }
  const hdr: React.CSSProperties = {
    background: '#161B22', borderBottom: '1px solid #30363D',
    padding: '0 24px', height: '56px', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky', top: 0, zIndex: 50,
  }
  const tabBar: React.CSSProperties = {
    background: '#161B22', borderBottom: '1px solid #30363D',
    display: 'flex', overflowX: 'auto', padding: '0 8px',
  }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '12px 16px', border: 'none', background: 'transparent',
    color: active ? '#00E5FF' : '#8B949E',
    borderBottom: active ? '2px solid #00E5FF' : '2px solid transparent',
    cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem',
    fontWeight: active ? '700' : '400', fontFamily: 'inherit',
  })
  const card: React.CSSProperties = {
    background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '20px',
  }
  const inp: React.CSSProperties = {
    padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '8px', color: '#E6EDF3', fontSize: '0.85rem',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const,
  }
  const btn = (color = '#00E5FF', text = '#0D1117'): React.CSSProperties => ({
    padding: '8px 20px', background: color, color: text, border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
    fontWeight: '700', fontFamily: 'inherit',
  })
  const th: React.CSSProperties = {
    padding: '8px', textAlign: 'right', color: '#8B949E',
    fontWeight: '600', fontSize: '0.78rem', borderBottom: '1px solid #30363D',
  }
  const td: React.CSSProperties = {
    padding: '8px 10px', fontSize: '0.82rem', borderBottom: '1px solid #21262D',
  }

  return (
    <div style={s}>

      {/* Header */}
      <div style={hdr}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ color:'#00E5FF', fontWeight:'800', fontSize:'1rem' }}>🌊 موجة الخبر</span>
          <span style={{ color:'#8B949E', fontSize:'0.75rem', border:'1px solid #30363D', padding:'2px 8px', borderRadius:'6px' }}>Admin Panel</span>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {saveMsg && <span style={{ color:'#00D47A', fontSize:'0.75rem' }}>{saveMsg}</span>}
          {dirty && !saveMsg && <span style={{ color:'#F0C93A', fontSize:'0.75rem' }}>⚠️ تغييرات غير محفوظة</span>}
          <button style={btn('#00D47A')} onClick={handleSave}>💾 حفظ</button>
          <button style={btn('#FF3355','#fff')} onClick={() => { logout(); router.push('/') }}>✕ إغلاق</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabBar}>
        {TABS.map(t => (
          <button key={t.id} style={tabBtn(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px 16px' }}>

        {/* TAB 0: إحصائيات */}
        {tab === 0 && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px', marginBottom:'24px' }}>
              {[
                { n: stats.analyses, l: 'تحليل مسجّل',  c:'#00E5FF' },
                { n: stats.keywords, l: 'كلمة مفتاحية', c:'#00D47A' },
                { n: stats.stocks,   l: 'سهم',           c:'#FF7A1A' },
                { n: stats.sectors,  l: 'قطاع',          c:'#9B6EFF' },
                { n: stats.codes,    l: 'كود اشتراك',    c:'#F0C93A' },
                { n: stats.subs,     l: 'مشترك',         c:'#00D47A' },
              ].map((x,i) => (
                <div key={i} style={{ ...card, textAlign:'center' }}>
                  <div style={{ fontSize:'2rem', fontWeight:'900', color:x.c, fontFamily:'monospace' }}>{x.n}</div>
                  <div style={{ color:'#8B949E', fontSize:'0.75rem', marginTop:'4px' }}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <button style={btn('#00D47A')} onClick={handleSave}>💾 حفظ التغييرات</button>
              <button style={btn('#161B22','#8B949E')} onClick={handleExport}>📤 تصدير JSON</button>
              <button style={btn('#FF3355','#fff')} onClick={handleReset}>🔄 إعادة ضبط</button>
            </div>
          </div>
        )}

        {/* TAB 1: الأسهم */}
        {tab === 1 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', margin:0 }}>📈 الأسهم ({allStocks.length} سهم)</h3>
            </div>
            <div style={card}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>{['الكود','اسم السهم','القطاع','التصنيف','الوزن'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {allStocks.map((s, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontFamily:'monospace', color:'#00E5FF', fontWeight:'700' }}>{s.t}</td>
                      <td style={{ ...td, color:'#E6EDF3' }}>{s.n}</td>
                      <td style={td}>
                        <span style={{ background:'#9B6EFF22', color:'#9B6EFF', padding:'2px 8px', borderRadius:'8px', fontSize:'0.72rem' }}>
                          {DB[s.sector]?.icon} {DB[s.sector]?.label}
                        </span>
                      </td>
                      <td style={{ ...td, color:'#8B949E', fontSize:'0.75rem' }}>{s.s}</td>
                      <td style={td}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ flex:1, height:'6px', background:'#21262D', borderRadius:'3px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${s.w}%`, background: s.w >= 80 ? '#00D47A' : s.w >= 60 ? '#F0C93A' : '#FF7A1A', borderRadius:'3px' }} />
                          </div>
                          <span style={{ fontFamily:'monospace', fontSize:'0.75rem', color:'#8B949E', minWidth:'28px' }}>{s.w}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: الكلمات المفتاحية */}
        {tab === 2 && (
          <div>
            <div style={{ marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', margin:0 }}>🔤 الكلمات المفتاحية ({allKeywords.length} كلمة)</h3>
            </div>
            {SECTOR_ORDER.map(sec => (
              <div key={sec} style={{ ...card, marginBottom:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                  <span style={{ fontSize:'1.1rem' }}>{DB[sec].icon}</span>
                  <span style={{ color:'#00E5FF', fontWeight:'700', fontSize:'0.9rem' }}>{DB[sec].label}</span>
                  <span style={{ color:'#8B949E', fontSize:'0.75rem', background:'#21262D', padding:'2px 8px', borderRadius:'8px' }}>
                    {DB[sec].kw.length} كلمة
                  </span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {DB[sec].kw.map((kw, i) => (
                    <span key={i} style={{ background:'#21262D', color:'#E6EDF3', padding:'4px 10px', borderRadius:'20px', fontSize:'0.78rem', border:'1px solid #30363D' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: علاقات القطاعات */}
        {tab === 3 && (
          <div>
            <div style={{ marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', margin:0 }}>🔗 علاقات التأثير بين القطاعات</h3>
            </div>
            {SECTOR_ORDER.map(sec => {
              const rels = RELS[sec]
              if (!rels) return null
              return (
                <div key={sec} style={{ ...card, marginBottom:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                    <span style={{ fontSize:'1.1rem' }}>{DB[sec].icon}</span>
                    <span style={{ color:'#00E5FF', fontWeight:'700' }}>{DB[sec].label}</span>
                    <span style={{ color:'#8B949E', fontSize:'0.75rem' }}>يؤثر على:</span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {Object.entries(rels).sort((a,b) => b[1]-a[1]).map(([target, weight]) => {
                      const pct = Math.round(weight * 100)
                      const col = pct >= 80 ? '#00D47A' : pct >= 60 ? '#F0C93A' : '#FF7A1A'
                      return (
                        <div key={target} style={{ background:'#21262D', border:`1px solid ${col}33`, borderRadius:'8px', padding:'8px 12px', minWidth:'140px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                            <span style={{ fontSize:'0.8rem', color:'#E6EDF3' }}>{DB[target]?.icon} {DB[target]?.label}</span>
                            <span style={{ fontFamily:'monospace', fontSize:'0.8rem', fontWeight:'700', color:col }}>{pct}%</span>
                          </div>
                          <div style={{ height:'4px', background:'#30363D', borderRadius:'2px' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:'2px' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB 4: سجل التحليلات */}
        {tab === 4 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', margin:0 }}>📜 سجل التحليلات ({history.length})</h3>
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btn()} onClick={() => { const h = JSON.parse(localStorage.getItem('mw_history_v2')||'[]'); setHistory(h) }}>🔄 تحديث</button>
                <button style={btn('#FF3355','#fff')} onClick={handleReset}>🗑️ مسح الكل</button>
              </div>
            </div>
            {history.length === 0
              ? <div style={{ ...card, textAlign:'center', padding:'48px', color:'#8B949E' }}>لا توجد تحليلات مسجلة بعد</div>
              : (
                <div style={card}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{['العنوان','التوجه','الثقة','AI','التاريخ'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {history.slice(0,50).map((h:any, i:number) => {
                        const dir = h.sentiment?.dir
                        const dirColor = dir==='pos'?'#00D47A':dir==='neg'?'#FF3355':'#F0C93A'
                        const dirLabel = dir==='pos'?'↑ إيجابي':dir==='neg'?'↓ سلبي':'◎ محايد'
                        return (
                          <tr key={i}>
                            <td style={{ ...td, maxWidth:'300px' }}>
                              <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#E6EDF3' }}>
                                {h.headline || h.text?.slice(0,60) || '—'}
                              </div>
                            </td>
                            <td style={td}><span style={{ color:dirColor, fontWeight:'700', fontSize:'0.78rem' }}>{dirLabel}</span></td>
                            <td style={{ ...td, fontFamily:'monospace', color:'#8B949E' }}>{h.confidence ?? '—'}%</td>
                            <td style={td}>
                              {h.usedAI
                                ? <span style={{ color:'#9B6EFF', fontSize:'0.72rem' }}>✦ Claude</span>
                                : <span style={{ color:'#8B949E', fontSize:'0.72rem' }}>محلي</span>}
                            </td>
                            <td style={{ ...td, color:'#8B949E', fontSize:'0.75rem', fontFamily:'monospace' }}>
                              {h.ts ? new Date(h.ts).toLocaleDateString('ar-SA') : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* TAB 5: إعدادات API */}
        {tab === 5 && (
          <div style={{ maxWidth:'520px' }}>
            <div style={card}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>🔑 Anthropic API Key</h3>
              <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                <input style={{ ...inp, direction:'ltr' }} type="password" value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setDirty(true) }}
                  placeholder="sk-ant-api03-..." />
                <button style={btn()} onClick={saveApiKey}>حفظ</button>
              </div>
              {apiMsg && <p style={{ color:'#00D47A', fontSize:'0.8rem' }}>{apiMsg}</p>}
              <p style={{ color:'#8B949E', fontSize:'0.75rem', marginTop:'8px' }}>
                {apiKey ? '✅ مفتاح محفوظ: ' + apiKey.slice(0,12) + '…' : '❌ لا يوجد مفتاح'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 6: الأمان */}
        {tab === 6 && (
          <div style={{ maxWidth:'420px' }}>
            <div style={card}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>🔐 تغيير كلمة المرور</h3>
              {(['old','new1','new2'] as const).map((k,i) => (
                <div key={k} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', color:'#8B949E', fontSize:'0.75rem', marginBottom:'4px' }}>
                    {i===0?'كلمة المرور الحالية':i===1?'كلمة المرور الجديدة':'تأكيد كلمة المرور'}
                  </label>
                  <input style={inp} type="password" value={pwdForm[k]}
                    onChange={e => setPwdForm(f => ({...f,[k]:e.target.value}))} />
                </div>
              ))}
              <button style={btn()} onClick={() => {
                if (pwdForm.new1 !== pwdForm.new2) { setPwdMsg('❌ كلمتا المرور غير متطابقتين'); return }
                if (pwdForm.new1.length < 6) { setPwdMsg('⚠️ 6 أحرف على الأقل'); return }
                localStorage.setItem('mw_custom_pwd', pwdForm.new1)
                setPwdMsg('✅ تم الحفظ'); setPwdForm({old:'',new1:'',new2:''})
                setTimeout(() => setPwdMsg(''), 3000)
              }}>🔒 تغيير</button>
              {pwdMsg && <p style={{ color: pwdMsg.startsWith('✅')?'#00D47A':'#FF3355', fontSize:'0.8rem', marginTop:'8px' }}>{pwdMsg}</p>}
            </div>
          </div>
        )}

        {/* TAB 7: الأدمنز */}
        {tab === 7 && (
          <div>
            <div style={{ ...card, marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>حسابات الأدمنز ({admins.length})</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                <thead>
                  <tr>{['اسم المستخدم','الصلاحية','إجراء'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {admins.length === 0
                    ? <tr><td colSpan={3} style={{ textAlign:'center', padding:'24px', color:'#8B949E' }}>جارٍ التحميل...</td></tr>
                    : admins.map((a, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #21262D' }}>
                        <td style={{ ...td, fontFamily:'monospace', color:'#00E5FF' }}>{a.username}</td>
                        <td style={td}>
                          <span style={{ background: a.role==='رئيسي'?'#00E5FF22':'#FF7A1A22', color: a.role==='رئيسي'?'#00E5FF':'#FF7A1A', padding:'2px 10px', borderRadius:'10px', fontSize:'0.7rem' }}>
                            {a.role==='رئيسي'?'⭐ رئيسي':'👤 فرعي'}
                          </span>
                        </td>
                        <td style={td}>
                          {a.role==='رئيسي'
                            ? <span style={{ color:'#8B949E', fontSize:'0.7rem' }}>محمي</span>
                            : <button style={btn('#FF3355','#fff')} onClick={() => removeAdmin(a.username)}>حذف</button>}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <div style={card}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>➕ إضافة أدمن جديد</h3>
              {([
                { k:'username', l:'اسم المستخدم',       t:'text'     },
                { k:'password', l:'كلمة المرور',         t:'password' },
                { k:'confirm',  l:'تأكيد كلمة المرور',  t:'password' },
              ] as const).map(({k,l,t}) => (
                <div key={k} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', color:'#8B949E', fontSize:'0.75rem', marginBottom:'4px' }}>{l}</label>
                  <input style={inp} type={t} value={newAdmin[k]}
                    onChange={e => setNewAdmin(f => ({...f,[k]:e.target.value}))} />
                </div>
              ))}
              <button style={btn()} onClick={addAdmin}>✅ إضافة</button>
              {adminMsg && <p style={{ color: adminMsg.startsWith('✅')?'#00D47A':'#FF3355', fontSize:'0.8rem', marginTop:'8px' }}>{adminMsg}</p>}
            </div>
          </div>
        )}

        {/* TAB 8: أكواد الاشتراك */}
        {tab === 8 && (
          <div>
            <div style={{ ...card, marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>إضافة كود جديد</h3>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'flex-end' }}>
                <input style={{ ...inp, width:'180px', direction:'ltr', fontFamily:'monospace' }}
                  value={codeForm.code}
                  onChange={e => setCodeForm(f=>({...f,code:e.target.value.toUpperCase()}))}
                  placeholder="MW-XXXX-XXXX" />
                <button style={btn('#161B22','#8B949E')} onClick={genCode}>🎲 توليد</button>
                <input style={{ ...inp, width:'160px' }} value={codeForm.note}
                  onChange={e => setCodeForm(f=>({...f,note:e.target.value}))} placeholder="ملاحظة" />
                <input style={{ ...inp, width:'150px' }} type="date" value={codeForm.expiry}
                  onChange={e => setCodeForm(f=>({...f,expiry:e.target.value}))} />
                <button style={btn()} onClick={addCode}>+ إضافة</button>
              </div>
              {codeMsg && <p style={{ color: codeMsg.startsWith('✅')?'#00D47A':'#FF3355', fontSize:'0.8rem', marginTop:'8px' }}>{codeMsg}</p>}
            </div>
            <div style={card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                <thead>
                  <tr>{['الكود','الملاحظة','الحالة','الانتهاء','المستخدم','إجراءات'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {codes.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign:'center', padding:'24px', color:'#8B949E' }}>لا توجد أكواد</td></tr>
                    : codes.map((c:any) => (
                      <tr key={c.code} style={{ borderBottom:'1px solid #21262D' }}>
                        <td style={{ ...td, fontFamily:'monospace', color:'#00E5FF' }}>{c.code}</td>
                        <td style={{ ...td, color:'#8B949E' }}>{c.note||'—'}</td>
                        <td style={td}>
                          <span style={{ background:c.active?'#00D47A22':'#FF335522', color:c.active?'#00D47A':'#FF3355', padding:'2px 8px', borderRadius:'8px', fontSize:'0.7rem' }}>
                            {c.active?'نشط':'معطّل'}
                          </span>
                        </td>
                        <td style={{ ...td, color:'#8B949E', fontSize:'0.75rem' }}>{c.expiry||'—'}</td>
                        <td style={{ ...td, color:'#8B949E', fontSize:'0.75rem' }}>{c.used_by||'—'}</td>
                        <td style={td}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button style={{ ...btn('#161B22','#8B949E'), border:'1px solid #30363D' }} onClick={() => toggleCode(c.code)}>
                              {c.active?'تعطيل':'تفعيل'}
                            </button>
                            <button style={btn('#FF3355','#fff')} onClick={() => deleteCode(c.code)}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: المشتركون */}
        {tab === 9 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', margin:0 }}>👥 المشتركون ({subs.length})</h3>
              <button style={btn()} onClick={loadSubs}>🔄 تحديث</button>
            </div>
            <div style={card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                <thead>
                  <tr>{['المستخدم','الاسم','الباقة','الحالة','التاريخ','إجراءات'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {subs.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign:'center', padding:'24px', color:'#8B949E' }}>لا توجد بيانات</td></tr>
                    : subs.map((s:any) => (
                      <tr key={s.id} style={{ borderBottom:'1px solid #21262D' }}>
                        <td style={{ ...td, fontFamily:'monospace', color:'#00E5FF' }}>{s.username}</td>
                        <td style={td}>{s.name}</td>
                        <td style={td}>
                          <span style={{ background:'#00E5FF22', color:'#00E5FF', padding:'2px 8px', borderRadius:'8px', fontSize:'0.7rem' }}>{s.plan}</span>
                        </td>
                        <td style={td}>
                          <span style={{ background:s.status==='active'?'#00D47A22':'#F0C93A22', color:s.status==='active'?'#00D47A':'#F0C93A', padding:'2px 8px', borderRadius:'8px', fontSize:'0.7rem' }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ ...td, color:'#8B949E', fontSize:'0.75rem' }}>{s.created_at?.slice(0,10)}</td>
                        <td style={td}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button style={btn()} onClick={async () => {
                              await fetch('/api/subscribers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId:s.id, action:'activate', plan:'pro' }) })
                              loadSubs()
                            }}>تفعيل</button>
                            <button style={btn('#FF3355','#fff')} onClick={async () => {
                              if(!confirm('حذف؟')) return
                              await fetch('/api/subscribers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId:s.id, action:'delete' }) })
                              loadSubs()
                            }}>حذف</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
