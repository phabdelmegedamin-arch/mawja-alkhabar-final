'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

const TABS = [
  { id: 0, label: 'إحصائيات',        icon: '📊' },
  { id: 1, label: 'الأسهم',           icon: '📈' },
  { id: 2, label: 'الكلمات المفتاحية', icon: '🔤' },
  { id: 3, label: 'علاقات القطاعات',  icon: '🔗' },
  { id: 4, label: 'سجل التحليلات',    icon: '📜' },
  { id: 5, label: 'إعدادات API',      icon: '⚙️' },
  { id: 6, label: 'الأمان',           icon: '🔐' },
  { id: 7, label: 'الأدمنز',          icon: '👤' },
  { id: 8, label: 'أكواد الاشتراك',   icon: '🎫' },
  { id: 9, label: 'المشتركون',        icon: '👥' },
]

export default function AdminDashboard() {
  const router    = useRouter()
  const session   = useAuthStore(s => s.session)
  const logout    = useAuthStore(s => s.logout)
  const [tab, setTab]     = useState(0)
  const [stats, setStats] = useState({ analyses: 0, keywords: 181, stocks: 97, sectors: 12 })
  const [codes, setCodes] = useState<any[]>([])
  const [subs,  setSubs]  = useState<any[]>([])
  const [admins, setAdmins] = useState([
    { name: 'Abdulmageedamin', role: 'رئيسي' },
  ])
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', confirm: '' })
  const [apiKey, setApiKey]     = useState('')
  const [apiMsg, setApiMsg]     = useState('')
  const [codeForm, setCodeForm] = useState({ code: '', note: '', expiry: '' })
  const [codeMsg,  setCodeMsg]  = useState('')
  const [pwdForm, setPwdForm]   = useState({ old: '', new1: '', new2: '' })
  const [pwdMsg,  setPwdMsg]    = useState('')
  const [dirty, setDirty]       = useState(false)

  useEffect(() => {
    if (!session || session.plan !== 'admin') { router.push('/admin'); return }
    const k = localStorage.getItem('anthropic_key') || localStorage.getItem('ak') || ''
    setApiKey(k)
    loadCodes()
    loadSubs()
    const h = JSON.parse(localStorage.getItem('mw_history_v2') || '[]')
    setStats(s => ({ ...s, analyses: h.length }))
  }, [])

  const loadCodes = async () => {
    const res = await fetch('/api/codes')
    const d   = await res.json()
    setCodes(d.data || [])
  }

  const loadSubs = async () => {
    const res = await fetch('/api/subscribers')
    const d   = await res.json()
    setSubs(d.data || [])
  }

  const genCode = () => {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const r = (n: number) => Array.from({length:n},()=>c[Math.floor(Math.random()*c.length)]).join('')
    setCodeForm(f => ({ ...f, code: `MW-${r(4)}-${r(4)}` }))
  }

  const addCode = async () => {
    if (!codeForm.code) return
    const res = await fetch('/api/codes', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'create', code: codeForm.code, note: codeForm.note, expiry: codeForm.expiry || undefined }) })
    const d = await res.json()
    if (d.success) { setCodeMsg('✅ تم الإضافة'); setCodeForm({ code:'', note:'', expiry:'' }); loadCodes() }
    else setCodeMsg('❌ ' + d.error)
    setTimeout(() => setCodeMsg(''), 3000)
  }

  const toggleCode = async (code: string) => {
    await fetch('/api/codes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'toggle', code }) })
    loadCodes()
  }

  const deleteCode = async (code: string) => {
    if (!confirm('حذف الكود؟')) return
    await fetch('/api/codes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'delete', code }) })
    loadCodes()
  }

  const saveApiKey = () => {
    localStorage.setItem('anthropic_key', apiKey)
    localStorage.setItem('ak', apiKey)
    setApiMsg('✅ تم حفظ المفتاح')
    setTimeout(() => setApiMsg(''), 3000)
  }

  const addAdmin = () => {
    if (!newAdmin.username || !newAdmin.password) return
    if (newAdmin.password !== newAdmin.confirm) { alert('كلمتا المرور غير متطابقتين'); return }
    setAdmins(a => [...a, { name: newAdmin.username, role: 'فرعي' }])
    setNewAdmin({ username:'', password:'', confirm:'' })
  }

  const removeAdmin = (name: string) => {
    setAdmins(a => a.filter(x => x.name !== name))
  }

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
    cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: active ? '700' : '400',
    fontFamily: 'inherit',
  })
  const card: React.CSSProperties = {
    background: '#161B22', border: '1px solid #30363D', borderRadius: '12px', padding: '20px',
  }
  const inp: React.CSSProperties = {
    padding: '10px 12px', background: '#0D1117', border: '1px solid #30363D',
    borderRadius: '8px', color: '#E6EDF3', fontSize: '0.85rem', fontFamily: 'inherit',
    width: '100%', boxSizing: 'border-box' as const,
  }
  const btn = (color = '#00E5FF', text = '#0D1117'): React.CSSProperties => ({
    padding: '8px 20px', background: color, color: text, border: 'none',
    borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', fontFamily: 'inherit',
  })

  return (
    <div style={s}>
      {/* Header */}
      <div style={hdr}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ color:'#00E5FF', fontWeight:'800', fontSize:'1rem' }}>🌊 موجة الخبر</span>
          <span style={{ color:'#8B949E', fontSize:'0.75rem', border:'1px solid #30363D', padding:'2px 8px', borderRadius:'6px' }}>Admin Panel</span>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {dirty && <span style={{ color:'#F0C93A', fontSize:'0.75rem' }}>⚠️ تغييرات غير محفوظة</span>}
          <button style={btn('#00D47A')} onClick={() => { setDirty(false) }}>💾 حفظ</button>
          <button style={btn('#FF3355', '#fff')} onClick={() => { logout(); router.push('/admin') }}>✕ إغلاق</button>
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:'12px', marginBottom:'24px' }}>
              {[
                { n: stats.analyses, l: 'تحليل مسجّل', c:'#00E5FF' },
                { n: stats.keywords, l: 'كلمة مفتاحية', c:'#00D47A' },
                { n: stats.stocks,   l: 'سهم',           c:'#FF7A1A' },
                { n: stats.sectors,  l: 'قطاع',          c:'#9B6EFF' },
                { n: codes.length,   l: 'كود اشتراك',   c:'#F0C93A' },
                { n: subs.length,    l: 'مشترك',         c:'#00D47A' },
              ].map((x,i) => (
                <div key={i} style={{ ...card, textAlign:'center' }}>
                  <div style={{ fontSize:'2rem', fontWeight:'900', color: x.c, fontFamily:'monospace' }}>{x.n}</div>
                  <div style={{ color:'#8B949E', fontSize:'0.75rem', marginTop:'4px' }}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <button style={btn('#00D47A')} onClick={() => setDirty(false)}>💾 حفظ التغييرات</button>
              <button style={btn('#161B22','#8B949E')} onClick={() => {}}>📤 تصدير JSON</button>
              <button style={btn('#FF3355','#fff')} onClick={() => { if(confirm('إعادة ضبط؟')) {} }}>🔄 إعادة ضبط</button>
            </div>
          </div>
        )}

        {/* TAB 5: إعدادات API */}
        {tab === 5 && (
          <div style={{ maxWidth:'520px' }}>
            <div style={card}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>🔑 Anthropic API Key</h3>
              <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                <input style={{ ...inp, direction:'ltr' }} type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." />
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
              {['old','new1','new2'].map((k,i) => (
                <div key={k} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', color:'#8B949E', fontSize:'0.75rem', marginBottom:'4px' }}>
                    {i===0?'كلمة المرور الحالية':i===1?'كلمة المرور الجديدة':'تأكيد كلمة المرور'}
                  </label>
                  <input style={inp} type="password" value={(pwdForm as any)[k]} onChange={e => setPwdForm(f => ({...f,[k]:e.target.value}))} />
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
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>// حسابات الأدمنز</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #30363D' }}>
                    <th style={{ padding:'8px', textAlign:'right', color:'#8B949E' }}>اسم المستخدم</th>
                    <th style={{ padding:'8px', textAlign:'right', color:'#8B949E' }}>الصلاحية</th>
                    <th style={{ padding:'8px', textAlign:'right', color:'#8B949E' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #21262D' }}>
                      <td style={{ padding:'10px 8px', fontFamily:'monospace', color:'#00E5FF' }}>{a.name}</td>
                      <td style={{ padding:'10px 8px' }}>
                        <span style={{ background: a.role==='رئيسي'?'#00E5FF22':'#FF7A1A22', color: a.role==='رئيسي'?'#00E5FF':'#FF7A1A', padding:'2px 10px', borderRadius:'10px', fontSize:'0.7rem' }}>
                          {a.role==='رئيسي'?'⭐ رئيسي':'👤 فرعي'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 8px' }}>
                        {a.role === 'رئيسي'
                          ? <span style={{ color:'#8B949E', fontSize:'0.7rem' }}>محمي</span>
                          : <button style={btn('#FF3355','#fff')} onClick={() => removeAdmin(a.name)}>حذف</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={card}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>➕ إضافة أدمن جديد</h3>
              {[
                { k:'username', l:'اسم المستخدم', t:'text' },
                { k:'password', l:'كلمة المرور', t:'password' },
                { k:'confirm',  l:'تأكيد كلمة المرور', t:'password' },
              ].map(({k,l,t}) => (
                <div key={k} style={{ marginBottom:'12px' }}>
                  <label style={{ display:'block', color:'#8B949E', fontSize:'0.75rem', marginBottom:'4px' }}>{l}</label>
                  <input style={inp} type={t} value={(newAdmin as any)[k]} onChange={e => setNewAdmin(f => ({...f,[k]:e.target.value}))} />
                </div>
              ))}
              <button style={btn()} onClick={addAdmin}>✅ إضافة</button>
            </div>
          </div>
        )}

        {/* TAB 8: أكواد الاشتراك */}
        {tab === 8 && (
          <div>
            <div style={{ ...card, marginBottom:'16px' }}>
              <h3 style={{ color:'#00E5FF', marginBottom:'16px' }}>إضافة كود جديد</h3>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'flex-end' }}>
                <input style={{ ...inp, width:'180px', direction:'ltr', fontFamily:'monospace' }} value={codeForm.code} onChange={e => setCodeForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="MW-XXXX-XXXX" />
                <button style={btn('#161B22','#8B949E')} onClick={genCode}>🎲 توليد</button>
                <input style={{ ...inp, width:'160px' }} value={codeForm.note} onChange={e => setCodeForm(f=>({...f,note:e.target.value}))} placeholder="ملاحظة" />
                <input style={{ ...inp, width:'150px' }} type="date" value={codeForm.expiry} onChange={e => setCodeForm(f=>({...f,expiry:e.target.value}))} />
                <button style={btn()} onClick={addCode}>+ إضافة</button>
              </div>
              {codeMsg && <p style={{ color: codeMsg.startsWith('✅')?'#00D47A':'#FF3355', fontSize:'0.8rem', marginTop:'8px' }}>{codeMsg}</p>}
            </div>
            <div style={card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #30363D' }}>
                    {['الكود','الملاحظة','الحالة','الانتهاء','المستخدم','إجراءات'].map(h => (
                      <th key={h} style={{ padding:'8px', textAlign:'right', color:'#8B949E' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codes.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign:'center', padding:'24px', color:'#8B949E' }}>لا توجد أكواد</td></tr>
                    : codes.map((c:any) => (
                      <tr key={c.code} style={{ borderBottom:'1px solid #21262D' }}>
                        <td style={{ padding:'8px', fontFamily:'monospace', color:'#00E5FF' }}>{c.code}</td>
                        <td style={{ padding:'8px', color:'#8B949E' }}>{c.note||'—'}</td>
                        <td style={{ padding:'8px' }}>
                          <span style={{ background: c.active?'#00D47A22':'#FF335522', color: c.active?'#00D47A':'#FF3355', padding:'2px 8px', borderRadius:'8px', fontSize:'0.7rem' }}>
                            {c.active?'نشط':'معطّل'}
                          </span>
                        </td>
                        <td style={{ padding:'8px', color:'#8B949E', fontSize:'0.75rem' }}>{c.expiry||'—'}</td>
                        <td style={{ padding:'8px', color:'#8B949E', fontSize:'0.75rem' }}>{c.used_by||'—'}</td>
                        <td style={{ padding:'8px' }}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button style={{ ...btn('#161B22','#8B949E'), border:'1px solid #30363D' }} onClick={() => toggleCode(c.code)}>{c.active?'تعطيل':'تفعيل'}</button>
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
              <h3 style={{ color:'#00E5FF' }}>👥 المشتركون ({subs.length})</h3>
              <button style={btn()} onClick={loadSubs}>🔄 تحديث</button>
            </div>
            <div style={card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #30363D' }}>
                    {['المستخدم','الاسم','الباقة','الحالة','التاريخ','إجراءات'].map(h => (
                      <th key={h} style={{ padding:'8px', textAlign:'right', color:'#8B949E' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.length === 0
                    ? <tr><td colSpan={6} style={{ textAlign:'center', padding:'24px', color:'#8B949E' }}>لا توجد بيانات</td></tr>
                    : subs.map((s:any) => (
                      <tr key={s.id} style={{ borderBottom:'1px solid #21262D' }}>
                        <td style={{ padding:'8px', fontFamily:'monospace', color:'#00E5FF' }}>{s.username}</td>
                        <td style={{ padding:'8px' }}>{s.name}</td>
                        <td style={{ padding:'8px' }}>
                          <span style={{ background:'#00E5FF22', color:'#00E5FF', padding:'2px 8px', borderRadius:'8px', fontSize:'0.7rem' }}>{s.plan}</span>
                        </td>
                        <td style={{ padding:'8px' }}>
                          <span style={{ background: s.status==='active'?'#00D47A22':'#F0C93A22', color: s.status==='active'?'#00D47A':'#F0C93A', padding:'2px 8px', borderRadius:'8px', fontSize:'0.7rem' }}>{s.status}</span>
                        </td>
                        <td style={{ padding:'8px', color:'#8B949E', fontSize:'0.75rem' }}>{s.created_at?.slice(0,10)}</td>
                        <td style={{ padding:'8px' }}>
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
