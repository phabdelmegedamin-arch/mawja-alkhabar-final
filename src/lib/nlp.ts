// ══════════════════════════════════════════════════
// موجة الخبر — محرك NLP (TypeScript) — نسخة مُصلَحة
// الإصلاحات:
//  1. إضافة كلمات مفتاحية للتصنيف (مكاسب، تعليق، تصدر...)
//  2. تمييز الحدث الفعلي عن التوقع في التصنيف
//  3. كشف السهم الرئيسي بـ NER مُحسَّن قبل كشف القطاع
//  4. إعطاء السهم المذكور أولوية في الموجة الأولى
//  5. إصلاح الموجة الثالثة (w3Keys كانت تأتي فارغة)
//  6. قيم الموجات متناسبة مع قوة الخبر (لا ثوابت 92 أو 55)
// ══════════════════════════════════════════════════
import type { SentimentResult, SectorDetectResult, SectorKey } from '@/types'
import { DB, RELS } from '@/data/market-db'
 
// ── القواميس ──────────────────────────────────────
const NEG: Record<string, number> = {
  'انخفض':2.0,'انخفضت':2.0,'تراجع':2.0,'تراجعت':2.0,'هبط':2.0,'هبطت':2.0,
  'تدهور':2.0,'تدهورت':2.0,'خسارة':2.0,'خسائر':2.0,'تقلص':1.5,
  'أزمة':2.0,'إفلاس':3.0,'انهيار':3.0,'ركود':2.0,'انكماش':2.0,
  'غرامة':2.0,'عقوبات':2.0,'تشديد':1.5,'تسريح':2.0,'فشل':2.0,
  'تضرر':1.5,'تضررت':1.5,'تضغط':1.5,
  'رفع الفائدة':2.5,'ترفع الفائدة':2.5,'رفعت الفائدة':2.5,
  'رفع سعر الفائدة':2.5,'رفعت أسعار الفائدة':2.5,
  'ترفع أسعار الفائدة':2.5,'رفع أسعار الفائدة':2.5,
  'زيادة الفائدة':2.0,'ارتفاع الفائدة':2.0,'تشديد نقدي':2.0,
  'تراجع حاد':3.0,'خسارة صافية':3.0,'تراجع الأرباح':2.0,
  'تراجع الإيرادات':2.0,'خفض الأرباح':2.0,'أزمة مالية':3.0,
  'صعوبات مالية':2.0,'خسائر فادحة':3.0,'هبوط حاد':3.0,
  'انهيار السوق':3.0,
  // ── إضافات مفقودة ──
  'تعليق':2.0,'تعلق':2.0,'تجميد':2.0,'ضغط':1.5,'ضغوط':1.5,
  'ينخفض':2.0,'يتراجع':2.0,'يهبط':2.0,
}
 
const POS: Record<string, number> = {
  'ارتفع':2.0,'ارتفعت':2.0,'ارتفاع':1.5,'نما':2.0,'نمو':2.0,'نمت':2.0,
  'زيادة':1.0,'قفز':2.0,'قفزت':2.0,'تحسن':1.5,'تحسنت':1.5,
  'صعد':1.5,'صعدت':1.5,'تجاوز':2.0,'تجاوزت':2.0,
  'توسعة':2.0,'خطط توسع':2.0,'مشروع جديد':1.5,
  'صفقة':1.5,'اتفاقية':1.5,'شراكة':1.5,
  'إطلاق':1.5,'افتتاح':2.0,'تدشين':1.5,
  'خفض الفائدة':2.0,'تحفيز':1.5,'دعم حكومي':1.5,
  'انتعاش':2.0,'ازدهار':2.0,'طفرة':2.0,'نمو اقتصادي':2.0,
  'نجح':1.5,'نجحت':1.5,'استثمارات':1.5,'أرباح':1.0,'ربح':1.0,
  'توزيع أرباح':2.5,'أرباح قياسية':3.0,'نمو الأرباح':2.0,
  'زيادة الأرباح':2.0,'ارتفاع الأرباح':2.0,
  'أعلى مستوى':2.0,'مستوى قياسي':2.0,'رقم قياسي':2.0,
  'نمو قياسي':2.5,'أرباح مرتفعة':2.0,
  // ── إضافات مفقودة ──
  'مكاسب':2.0,'يضيف':1.5,'أضاف':1.5,'يرتفع':2.0,'يصعد':1.5,'يقفز':2.0,
  'تصدر':1.5,'يتصدر':1.5,'الأكثر تداولاً':1.5,
  'يفتتح':1.5,'معرض جديد':1.5,'استثمار':1.5,'توسع':2.0,
  'توقعات إيجابية':2.0,'توقعات نمو':2.0,
  'تحقق ارتفاع':1.5,'يضيف مكاسب':2.0,
  // ── كلمات مالية صريحة (إصلاح شامل) ──────────────────
  // توزيعات — كل الصيغ
  'توزيع':2.5,'توزيعات':2.5,'توزيعات نقدية':3.0,'توزيع نقدي':3.0,
  'توزيع أرباح نقدية':3.0,'أرباح موزعة':2.5,'توزيع ربح':2.5,
  'ريال للسهم':3.0,'ريالاً للسهم':3.0,'هللة للسهم':2.0,
  'أعلن عن توزيع':3.0,'يوزع':2.5,'وزّع':2.5,'تُوزَّع':2.5,
  // أرباح — كل الصيغ
  'حقق':2.0,'حققت':2.0,'تحقق':2.0,'تحققت':2.0,'تحقيق':2.0,
  'بلغت أرباح':2.5,'سجلت أرباح':2.5,'سجل أرباح':2.5,
  'أرباح صافية':2.5,'ربح صافي':2.5,'صافي أرباح':2.5,
  'الأرباح الصافية':2.5,'صافي الأرباح':2.5,'إجمالي الأرباح':2.0,
  'ربح للسهم':2.5,'EPS':2.0,'ربحية السهم':2.5,
  'تجاوزت الأرباح':2.5,'فاقت الأرباح':3.0,
  'مليار ريال':1.5,'مليون ريال':1.0,'مليار دولار':1.5,
  // زيادة رأس المال
  'زيادة رأس المال':3.0,'رفع رأس المال':3.0,'زيادة رأسمال':3.0,
  'زيادة رأسمالها':3.0,'زيادة رأسمالهم':3.0,
  'أسهم مجانية':2.5,'توزيع أسهم':2.5,'منح أسهم':2.5,
  'إصدار أسهم':2.5,'طرح أسهم':2.5,
  // استحواذ وصفقات
  'استحواذ':2.5,'يستحوذ':2.5,'استحوذ':2.5,
  'شراء حصة':2.5,'تملّك':2.0,'تملك':2.0,'الاستحواذ على':2.5,
  'استثمار في':1.5,'ضخ استثمارات':2.0,
  // عقود وترسية
  'ترسية':2.5,'ترست':2.5,'ترسو':2.5,
  'عقد بقيمة':2.5,'عقد بمبلغ':2.5,'منح عقد':2.5,
  // ارتفاعات بنسبة مئوية
  'يرتفع بنسبة':2.0,'ارتفع بنسبة':2.0,'بنسبة':1.0,
  'نمو بنسبة':2.0,'زيادة بنسبة':2.0,
  // تصدر القوائم
  'الأكثر ارتفاعاً':2.0,'الأعلى تداولاً':1.5,'يقود المكاسب':2.5,
  'يتصدر الرابحين':2.5,'يتصدر المكاسب':2.5,
}
 
// ── مُعدِّلات التوقع ───────────────────────────────
const FORECAST_MARKERS = [
  'توقع','توقعات','متوقع','يُتوقع','يُرجَّح',
  'قد يرتفع','قد ينخفض','من المحتمل','تقديرات','هدف سعري',
]
 
const NEGATORS = [' لا ', ' لم ', ' لن ', ' ليس ', ' ليست ', ' غير ']
 
function isNegated(text: string, word: string): boolean {
  const idx = text.indexOf(word)
  if (idx < 0) return false
  const before = text.slice(Math.max(0, idx - 22), idx)
  return NEGATORS.some(n => before.includes(n))
}
 
function isForecast(text: string): boolean {
  return FORECAST_MARKERS.some(m => text.includes(m))
}
 
// ── تحليل المشاعر ─────────────────────────────────
export function analyzeSentiment(text: string): SentimentResult {
  const t = ' ' + text + ' '
  let ns = 0, ps = 0
  const nw: string[] = [], pw: string[] = []
 
  for (const [word, weight] of Object.entries(NEG)) {
    if (t.includes(word)) {
      if (isNegated(t, word)) ps += weight * 0.4
      else { ns += weight; nw.push(word) }
    }
  }
  for (const [word, weight] of Object.entries(POS)) {
    if (t.includes(word)) {
      if (isNegated(t, word)) ns += weight * 0.4
      else { ps += weight; pw.push(word) }
    }
  }
 
  const diff = ps - ns
  const tot  = ps + ns
 
  if (tot < 0.3) {
    return { score:0, dir:'neu', pos_words:[], neg_words:[],
             intensity:'low', top_cat:'general', raw_score:0 }
  }
 
  // خبر توقع → اخفض الثقة 40%
  const forecastFactor = isForecast(text) ? 0.6 : 1.0
 
  let dir: 'pos' | 'neg' | 'neu'
  let score: number
 
  if (diff > 0.15) {
    dir   = 'pos'
    score = Math.min(85, Math.round((25 + (ps / tot) * 60) * forecastFactor))
  } else if (diff < -0.15) {
    dir   = 'neg'
    score = -Math.min(85, Math.round((25 + (ns / tot) * 60) * forecastFactor))
  } else {
    dir   = 'neu'
    score = Math.round(diff * 10 * forecastFactor)
  }
 
  return {
    score, dir,
    pos_words: pw.slice(0, 5),
    neg_words: nw.slice(0, 5),
    intensity: Math.abs(score) > 55 ? 'high' : Math.abs(score) > 25 ? 'medium' : 'low',
    top_cat:   dir === 'pos' ? 'growth' : dir === 'neg' ? 'risk' : 'neutral',
    raw_score: diff,
  }
}
 
// ══════════════════════════════════════════════════
// NER: كشف السهم الرئيسي من النص
// ══════════════════════════════════════════════════
 
// ══════════════════════════════════════════════════════
// NER Map — مُرتَّب من الأطول للأقصر (أولوية الكشف)
// ══════════════════════════════════════════════════════
const STOCK_NER_MAP: Record<string, string> = {
  // ── سوق المال ──
  'مجموعة تداول':'1111','شركة تداول':'1111',
  'السوق المالية السعودية':'1111','السوق المالية':'1111','تاسي':'1111',
  // ── بنوك (المذكورة في التقرير) ──
  'مصرف الراجحي':'1120','بنك الراجحي':'1120','الراجحي':'1120',
  'البنك الأهلي التجاري':'1180','البنك الأهلي':'1180','الأهلي':'1180',
  'بنك الإنماء':'1150','الإنماء':'1150',
  'بنك البلاد':'1140','البلاد':'1140',
  'بنك الجزيرة':'1020','الجزيرة':'1020',
  'بنك الاستثمار السعودي':'1030','بنك الاستثمار':'1030','الاستثمار':'1030',
  'بنك الرياض':'1010',
  'البنك العربي الوطني':'1080','البنك العربي':'1080','العربي':'1080',
  'البنك السعودي الأول':'1060','البنك الأول':'1060','الأول':'1060',
  'البنك السعودي الفرنسي':'1050','ساب':'1050','بي اس اف':'1050',
  // بنساب = البنك السعودي للاستثمار (1030) — تهجئات مختلفة
  'بنساب':'1030','BSFR':'1050',
  // ── طاقة ──
  'أرامكو السعودية':'2222','شركة أرامكو':'2222','أرامكو':'2222','ارامكو':'2222',
  'المصافي':'2030','بترو رابغ':'2380','بترورابغ':'2380',
  'الحفر العربية':'2381',
  // ── مواد أساسية ──
  'سابك للمغذيات الزراعية':'2020','سابك للمغذيات':'2020',
  'سابك':'2010','ينساب':'2290','معادن':'1211',
  'كيان السعودية':'2350','كيان':'2350',
  'سبكيم العالمية':'2310','سبكيم':'2310',
  'الكيميائية السعودية':'2230','الكيميائية':'2230',
  'الكابلات السعودية':'2110','الكابلات':'2110',
  // ── اتصالات ──
  'الاتصالات السعودية':'7010','اس تي سي':'7010','STC':'7010','stc':'7010',
  'موبايلي':'7020','زين السعودية':'7030','زين':'7030',
  // ── تجزئة (المذكورة في التقرير) ──
  'مكتبة جرير':'4190','جرير للتسويق':'4190','جرير':'4190',
  'نايس ون':'4193',
  'إكسترا':'4003',
  'السيف غاليري':'4192','السيف':'4192',
  'النهدي':'4164',
  // ── مواد منزلية وعطور (المذكورة في التقرير) ──
  'الماجد للعود':'4165','ماجد للعود':'4165','الماجد':'4165',
  // ── خدمات مالية (المذكورة في التقرير) ──
  'المملكة القابضة':'4280','المملكة':'4280',
  'سناد القابضة':'4080','سناد':'4080',
  'أملاك للتمويل':'1182','أملاك':'1182',
  // ── غذاء ──
  'مجموعة صافولا':'2050','صافولا':'2050',
  'المراعي':'2280','أمريكانا':'6015',
  // ── صحة ──
  'سليمان الحبيب':'4013','دله الصحية':'4004',
  // ── مرافق ──
  'أكوا باور':'2082','أكوا':'2082','مياهنا':'2084',
  // ── نقل ──
  'طيران ناس':'4264','سابتكو':'4040',
  // ── عقارات ──
  'دار الأركان':'4300','جبل عمر':'4250','رتال':'4322',
  // ── تأمين ──
  'التعاونية للتأمين':'8010','التعاونية':'8010',
  'بوبا العربية':'8210','بوبا':'8210',
}
 
export function detectPrimaryStockFromText(text: string): string | null {
  // ١. رمز رقمي صريح (4 أرقام) — الأعلى دقة
  const codeMatch = text.match(/\b(\d{4})\b/)
  if (codeMatch) return codeMatch[1]
 
  // ٢. بحث في الـ NER Map اليدوي (من الأطول للأقصر)
  //    يغطي الأسماء المختصرة والشائعة والأخطاء الإملائية
  const nerEntries = Object.entries(STOCK_NER_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [name, code] of nerEntries) {
    if (text.includes(name)) return code
  }
 
  // ٣. بحث ديناميكي في كل أسهم DB — يغطي كل 393 سهم تلقائياً
  //    مُرتَّب من الأطول اسماً للأقصر لتجنب التطابق الجزئي
  const allStocks = Object.values(DB)
    .flatMap(sector => sector.stocks)
    .sort((a, b) => b.n.length - a.n.length)
 
  for (const stock of allStocks) {
    if (stock.n.length >= 3 && text.includes(stock.n)) {
      return stock.t
    }
  }
 
  return null
}
 
// ── كشف القطاعات ──────────────────────────────────
export function detectSectors(text: string): SectorDetectResult {
  const scores: Record<string, number> = {}
 
  const detectedCode = detectPrimaryStockFromText(text)
 
  for (const [key, sector] of Object.entries(DB)) {
    let score = 0
 
    for (const kw of sector.kw) {
      if (text.includes(kw)) score += kw.length > 3 ? 2 : 1
    }
 
    for (const stock of sector.stocks) {
      if (text.includes(stock.n)) score += stock.w * 0.5
      // إذا كان الكود المكتشف في هذا القطاع → أولوية قصوى
      if (detectedCode && stock.t === detectedCode) score += 20
    }
 
    if (score > 0) scores[key] = score
  }
 
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([k]) => k as SectorKey)
 
  const primary  = sorted[0] ?? 'banking'
  const relKeys  = DB[primary]?.ripple.w2.concat(DB[primary]?.ripple.w3 ?? []) ?? []
  const allSectors = Array.from(new Set([primary, ...sorted.slice(1), ...relKeys])) as SectorKey[]
 
  return { primary, allSectors, scores }
}
 
// ══════════════════════════════════════════════════════
// بناء موجات التأثير
// الإصلاح الجوهري:
// — الموجات تنطلق من قطاع السهم المذكور صراحةً (detectedCode)
// — إذا كان السهم المذكور في قطاع مختلف عن primary، نبني
//   الموجة الأولى من قطاعه الحقيقي
// — تداول (1111) يُضاف في الموجة الأولى لأخبار رأس المال
// ══════════════════════════════════════════════════════
export function buildRipples(
  primary: SectorKey,
  allSectors: SectorKey[],
  sentiment: SentimentResult,
  wavesCount: '3' | '5' = '3',
  detectedCode?: string | null,
  newsText?: string,
) {
  const { dir, score } = sentiment
  const abs  = Math.abs(score)
  const sign = dir === 'pos' ? 1 : dir === 'neg' ? -1 : 1
  const nodes: import('@/types').RippleNode[] = []
 
  const powerFactor = Math.max(0.3, abs / 85)
 
  const pct = (base: number, mult = 1, flip = false): string => {
    const raw = base * powerFactor * mult
    const val = raw.toFixed(1)
    return (flip ? -sign : sign) > 0 ? `+${val}%` : `-${val}%`
  }
 
  // ── تحديد القطاع الفعلي للسهم المذكور ──────────────────
  // إذا كان السهم المكتشف في قطاع مختلف عن primary، استخدم قطاعه
  let effectivePrimary: SectorKey = primary
  if (detectedCode) {
    for (const [key, sector] of Object.entries(DB)) {
      if (sector.stocks.some(s => s.t === detectedCode)) {
        effectivePrimary = key as SectorKey
        break
      }
    }
  }
 
  const pData = DB[effectivePrimary]
  if (!pData) return nodes
 
  const wCount = parseInt(wavesCount)
  const w2Keys = pData.ripple.w2.slice(0, wCount > 3 ? 3 : 2)
  const w3Keys = (pData.ripple.w3 ?? []).slice(0, wCount > 3 ? 3 : 2)
 
  // ── هل الخبر عن زيادة رأس مال / إصدار أسهم؟ ──────────
  // → إضافة تداول (1111) في الموجة الأولى
  const isCapitalEvent = newsText
    ? /زيادة رأس المال|رفع رأس المال|زيادة رأسمال|أسهم مجانية|إصدار أسهم|طرح أسهم/.test(newsText)
    : false
 
  // ── الموجة الأولى ───────────────────────────────────────
  nodes.push({ label: `الموجة الأولى — ${pData.label}`, wave: 1, isHead: true })
 
  let w1Stocks = [...pData.stocks]
 
  // السهم المذكور يظهر أولاً
  if (detectedCode) {
    const idx = w1Stocks.findIndex(s => s.t === detectedCode)
    if (idx > 0) {
      const [found] = w1Stocks.splice(idx, 1)
      w1Stocks.unshift(found)
    } else if (idx < 0) {
      // السهم موجود في قطاع آخر — أضفه يدوياً كأول عنصر
      for (const [, sec] of Object.entries(DB)) {
        const found = sec.stocks.find(s => s.t === detectedCode)
        if (found) { w1Stocks.unshift(found); break }
      }
    }
  }
 
  // إضافة تداول أولاً في أخبار رأس المال
  if (isCapitalEvent) {
    const tadawul = { t:'1111', n:'مجموعة تداول', s:'تاسي', w:100 }
    w1Stocks = w1Stocks.filter(s => s.t !== '1111')
    w1Stocks.unshift(tadawul)
  }
 
  w1Stocks.slice(0, 3).forEach((s, i) => {
    nodes.push({
      ...s, pct: pct(3.5 - i * 0.4), wave: 1,
      desc: `تأثير مباشر — ${pData.label}`,
      icon: pData.icon, icoClass: 'b', sectorKey: effectivePrimary, primaryKey: effectivePrimary,
      pctVal: parseFloat(pct(3.5 - i * 0.4)),
    })
  })
 
  // ── الموجة الثانية ──────────────────────────────────────
  nodes.push({ label: `الموجة الثانية — قطاعات مرتبطة`, wave: 2, isHead: true })
  w2Keys.forEach((sk, i) => {
    const sd   = DB[sk]; if (!sd) return
    const mult = (RELS[effectivePrimary] as Record<string, number>)?.[sk] ?? 0.6
    sd.stocks.slice(0, 2).forEach((s, j) => {
      const p = pct(2.8 - i * 0.3 - j * 0.2, mult)
      nodes.push({
        ...s, pct: p, wave: 2,
        desc: `${sd.label} — ارتباط قطاعي`,
        icon: sd.icon, icoClass: 'o', sectorKey: sk, primaryKey: effectivePrimary,
        pctVal: parseFloat(p),
      })
    })
  })
 
  // ── الموجة الثالثة ──────────────────────────────────────
  if (wCount >= 3 && w3Keys.length > 0) {
    nodes.push({ label: `الموجة الثالثة — تأثير غير مباشر`, wave: 3, isHead: true })
    w3Keys.forEach((sk, i) => {
      const sd   = DB[sk]; if (!sd) return
      const mult = (RELS[effectivePrimary] as Record<string, number>)?.[sk] ?? 0.4
      sd.stocks.slice(0, 2).forEach((s, j) => {
        const p = pct(1.8 - i * 0.3 - j * 0.2, mult)
        nodes.push({
          ...s, pct: p, wave: 3,
          desc: `${sd.label} — تأثير بعيد`,
          icon: sd.icon, icoClass: 'g', sectorKey: sk, primaryKey: effectivePrimary,
          pctVal: parseFloat(p),
        })
      })
    })
  }
 
  return nodes
}
 
// ── خط الزمن ──────────────────────────────────────
export function buildTimeline(sentiment: SentimentResult) {
  const sign = sentiment.dir === 'pos' ? 1 : sentiment.dir === 'neg' ? -1 : 0
  const abs  = Math.abs(sentiment.score)
  return [
    { l: 'T+0',  v: +(sign * abs * 0.15).toFixed(1), active: true },
    { l: 'T+2h', v: +(sign * abs * 0.30).toFixed(1) },
    { l: 'T+1d', v: +(sign * abs * 0.45).toFixed(1) },
    { l: 'T+3d', v: +(sign * abs * 0.38).toFixed(1) },
    { l: 'T+1w', v: +(sign * abs * 0.25).toFixed(1) },
    { l: 'T+2w', v: +(sign * abs * 0.12).toFixed(1) },
    { l: 'T+1m', v: +(-sign * abs * 0.05).toFixed(1) },
  ]
}
