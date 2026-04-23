// ══════════════════════════════════════════════════
// موجة الخبر — محرك NLP (TypeScript) — نسخة مُصلَحة v2
// الإصلاحات الجوهرية:
//  1. منع مطابقة رقم 2030 كسهم عند ذكر "رؤية 2030"
//  2. إضافة "يواصل" وعبارات الاستمرار الإيجابي للقاموس
//  3. كشف السياق السلبي للكلمات الإيجابية (لجني الأرباح، تباطؤ النمو...)
//  4. إضافة الجمل السلبية المفقودة (مخاوف السوق، ضغوط بيعية...)
//  5. معايرة متوازنة لأوزان الإيجابي والسلبي
//  6. نسب تأثير = صفر عند التصنيف المحايد
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
  'تعليق':2.0,'تعلق':2.0,'تجميد':2.0,'ضغط':1.5,'ضغوط':1.5,
  'ينخفض':2.0,'يتراجع':2.0,'يهبط':2.0,
  // ── جمل سلبية مفقودة (إصلاح #4) ──────────────────────────────
  'مخاوف السوق':2.0,
  'مخاوف من نتائج':2.0,
  'أقل من التوقعات':2.0,
  'دون التوقعات':2.0,
  'ضغوط بعد ارتفاع':2.0,
  'ارتفاع تكاليف الطاقة':2.0,
  'ارتفاع تكاليف المواد':1.5,
  'انخفاضًا في ظل مخاوف':2.5,
  'انخفاضا في ظل مخاوف':2.5,
  'ضغوط بيعية':2.0,
  'وسط ضغوط بيعية':2.5,
  'يتراجع وسط ضغوط':2.5,
  'يواجه ضغوطًا':2.0,
  'يواجه ضغوطا':2.0,
  'هوامش الربحية تتراجع':2.5,
  'هوامش تتراجع':2.0,
  'تراجع العائد':2.0,
  'توقف التداول':2.5,
  'إيقاف التداول':2.5,
  'تعليق التداول':2.5,
  // ── أفعال الخسارة المباشرة ──────────────────────────────────
  'تخسر':2.5,'يخسر':2.5,'خسر':2.0,
  'تكبد':2.5,'تكبدت':2.5,'يتكبد':2.5,
  'انخفاض':1.5,
  // ── جمل خسارة مركبة ─────────────────────────────────────────
  'تحقق خسارة':3.0,'حقق خسارة':3.0,'يحقق خسارة':3.0,
  'سجل خسارة':3.0,'سجلت خسارة':3.0,'تسجل خسارة':3.0,
  'انخفاض الأرباح':2.5,'انخفضت الأرباح':2.5,
  'خفض التوزيعات':2.5,'تراجع التوزيعات':2.5,
  'تراجع في توزيعات':3.0,'تراجع توزيعات':3.0,
  'تراجع حاد في':3.0,
  // ── ارتفاع التكاليف / ضغط الهوامش ──────────────────────────
  'ارتفاع التكاليف':2.0,'ارتفاع تكاليف':2.0,'ارتفاع أعباء':2.0,
  'يضغط على هوامش':2.5,'ضغط على هوامش':2.5,'تآكل الهوامش':2.5,
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
  'نجح':1.5,'نجحت':1.5,'استثمارات':1.5,'أرباح':0.3,'ربح':0.3,
  'توزيع أرباح':2.5,'أرباح قياسية':3.0,'نمو الأرباح':2.0,
  'زيادة الأرباح':2.0,'ارتفاع الأرباح':2.0,
  'أعلى مستوى':2.0,'مستوى قياسي':2.0,'رقم قياسي':2.0,
  'نمو قياسي':2.5,'أرباح مرتفعة':2.0,
  'مكاسب':2.0,'يضيف':1.5,'أضاف':1.5,'يرتفع':2.0,'يصعد':1.5,'يقفز':2.0,
  'تصدر':1.5,'يتصدر':1.5,'الأكثر تداولاً':1.5,
  'يفتتح':1.5,'معرض جديد':1.5,'استثمار':1.5,'توسع':2.0,
  'توقعات إيجابية':2.0,'توقعات نمو':2.0,
  'تحقق ارتفاع':1.5,'يضيف مكاسب':2.0,
  // توزيعات
  'توزيع':2.5,'توزيعات':2.5,'توزيعات نقدية':3.0,'توزيع نقدي':3.0,
  'توزيع أرباح نقدية':3.0,'أرباح موزعة':2.5,'توزيع ربح':2.5,
  'ريال للسهم':3.0,'ريالاً للسهم':3.0,'هللة للسهم':2.0,
  'أعلن عن توزيع':3.0,'يوزع':2.5,'وزّع':2.5,'تُوزَّع':2.5,
  // أرباح
  'حقق':2.0,'حققت':2.0,'تحقق':2.0,'تحققت':2.0,'تحقيق':2.0,
  'بلغت أرباح':2.5,'سجلت أرباح':2.5,'سجل أرباح':2.5,
  'أرباح صافية':2.5,'ربح صافي':2.5,'صافي أرباح':2.5,
  'الأرباح الصافية':2.5,'صافي الأرباح':2.5,'إجمالي الأرباح':2.0,
  'ربح للسهم':2.5,'EPS':2.0,'ربحية السهم':2.5,
  'تجاوزت الأرباح':2.5,'فاقت الأرباح':3.0,
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
  // ارتفاعات
  'يرتفع بنسبة':2.0,'ارتفع بنسبة':2.0,'بنسبة':1.0,
  'نمو بنسبة':2.0,'زيادة بنسبة':2.0,
  // تصدر القوائم
  'الأكثر ارتفاعاً':2.0,'الأعلى تداولاً':1.5,'يقود المكاسب':2.5,
  'يتصدر الرابحين':2.5,'يتصدر المكاسب':2.5,
  // ── إصلاح #2: عبارات الاستمرار الإيجابي ("يواصل") ──────────────
  'يواصل':1.5,
  'يواصل مساره الصاعد':2.5,
  'مساره الصاعد':2.0,
  'زخم إيجابي':2.0,
  'أساسيات قوية':1.5,
  'يحافظ على مكاسبه':1.5,
  'يحتفظ بمكاسبه':1.5,
  'مستمر في الارتفاع':2.0,
  'يواصل ارتفاعه':2.0,
  'يواصل صعوده':2.0,
  'يحافظ على ارتفاعه':1.5,
  'تدفق نقدي مستدام':1.5,
  'عقود طويلة الأجل':1.5,
  'يكسب':1.5,'يكسب مكاسب':2.0,
  'يواصل تقدمه':1.5,
}
 
// ── مُعدِّلات التوقع ───────────────────────────────
const FORECAST_MARKERS = [
  'توقع','توقعات','متوقع','يُتوقع','يُرجَّح',
  'قد يرتفع','قد ينخفض','من المحتمل','تقديرات','هدف سعري',
]
 
const NEGATORS = [' لا ', ' لم ', ' لن ', ' ليس ', ' ليست ', ' غير ']
 
// ── إصلاح #3: كلمات تشير إلى سياق سلبي للكلمات الإيجابية ──────
const NEG_CONTEXT_PATTERNS = [
  'لجني ','جني ','لجني الأرباح','جني الأرباح',
  'تباطؤ ','تباطؤ النمو',
  'هوامش الربحية تتراجع','هوامش تتراجع',
  'تراجع المبيعات','انخفاض المبيعات',
  'ضغط على الأرباح','ضغوط على الأرباح',
  'تآكل الأرباح','تقلص الأرباح',
  'خفض توقعات','تخفيض توقعات',
  'تخسر ','يخسر ','خسر ','تكبد ','تكبدت ',
  'تحقق خسارة','حقق خسارة','سجل خسارة','تسجل خسارة',
  'انخفاض الأرباح','انخفضت الأرباح',
  'ارتفاع تكاليف','يضغط على هوامش',
]
 
function isNegated(text: string, word: string): boolean {
  const idx = text.indexOf(word)
  if (idx < 0) return false
  const before = text.slice(Math.max(0, idx - 22), idx)
  return NEGATORS.some(n => before.includes(n))
}
 
// ── إصلاح #3: هل الكلمة الإيجابية وردت في سياق سلبي؟ ──────────
function isInNegativeContext(text: string, word: string): boolean {
  const idx = text.indexOf(word)
  if (idx < 0) return false
  const before = text.slice(Math.max(0, idx - 35), idx)
  return NEG_CONTEXT_PATTERNS.some(ctx => before.includes(ctx))
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
      if (isNegated(t, word)) {
        ns += weight * 0.4
      } else if (isInNegativeContext(t, word)) {
        // إصلاح #3: كلمة إيجابية في سياق سلبي تُعامَل سلبياً
        ns += weight * 0.6
      } else {
        ps += weight; pw.push(word)
      }
    }
  }
 
  const diff = ps - ns
  const tot  = ps + ns
 
  if (tot < 0.3) {
    return { score:0, dir:'neu', pos_words:[], neg_words:[],
             intensity:'low', top_cat:'general', raw_score:0 }
  }
 
  const forecastFactor = isForecast(text) ? 0.6 : 1.0
 
  let dir: 'pos' | 'neg' | 'neu'
  let score: number
 
  if (diff > 0.15) {
    dir   = 'pos'
    // إصلاح #5: معادلة إيجابية متوازنة
    score = Math.min(85, Math.round((20 + (ps / tot) * 65) * forecastFactor))
  } else if (diff < -0.15) {
    dir   = 'neg'
    // إصلاح #5: رفع الحد الأدنى السلبي وتحسين المعامل لمعايرة متوازنة
    score = -Math.min(85, Math.round((28 + (ns / tot) * 65) * forecastFactor))
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
 
// ── إصلاح #1: أرقام السياق العام التي لا تمثل رموز أسهم ─────────
const CONTEXT_NUMBERS = new Set(['2030','2025','2060','2050','1445','2040','2035','1446','1447'])
const VISION_PATTERNS = /(?:رؤية|vision|خطة|استراتيجية|أجندة)\s*\d{4}/gi
 
// ══════════════════════════════════════════════════════
// NER Map — مُرتَّب من الأطول للأقصر
// ══════════════════════════════════════════════════════
const STOCK_NER_MAP: Record<string, string> = {
  'مجموعة تداول':'1111','شركة تداول':'1111',
  'السوق المالية السعودية':'1111','السوق المالية':'1111','تاسي':'1111',
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
  'بنساب':'1030','BSFR':'1050',
  'أرامكو السعودية':'2222','شركة أرامكو':'2222','أرامكو':'2222','ارامكو':'2222',
  'المصافي':'2030','بترو رابغ':'2380','بترورابغ':'2380',
  'الحفر العربية':'2381',
  'سابك للمغذيات الزراعية':'2020','سابك للمغذيات':'2020',
  'سابك':'2010','ينساب':'2290','معادن':'1211',
  'كيان السعودية':'2350','كيان':'2350',
  'سبكيم العالمية':'2310','سبكيم':'2310',
  'الكيميائية السعودية':'2230','الكيميائية':'2230',
  'الكابلات السعودية':'2110','الكابلات':'2110',
  'الاتصالات السعودية':'7010','اس تي سي':'7010','STC':'7010','stc':'7010',
  'موبايلي':'7020','زين السعودية':'7030','زين':'7030',
  'مكتبة جرير':'4190','جرير للتسويق':'4190','جرير':'4190',
  'نايس ون':'4193','إكسترا':'4003',
  'السيف غاليري':'4192','السيف':'4192',
  'النهدي':'4164',
  'الماجد للعود':'4165','ماجد للعود':'4165','الماجد':'4165',
  'المملكة القابضة':'4280','المملكة':'4280',
  'سناد القابضة':'4080','سناد':'4080',
  'أملاك للتمويل':'1182','أملاك':'1182',
  'مجموعة صافولا':'2050','صافولا':'2050',
  'المراعي':'2280','أمريكانا':'6015',
  'سليمان الحبيب':'4013','دله الصحية':'4004',
  'أكوا باور':'2082','أكوا':'2082','مياهنا':'2084',
  'طيران ناس':'4264','سابتكو':'4040',
  'دار الأركان':'4300','جبل عمر':'4250','رتال':'4322',
  'التعاونية للتأمين':'8010','التعاونية':'8010',
  'بوبا العربية':'8210','بوبا':'8210',
}
 
export function detectPrimaryStockFromText(text: string): string | null {
  // ── إصلاح #1: حذف أنماط "رؤية 2030" قبل البحث الرقمي ──────────
  const cleanedText = text.replace(VISION_PATTERNS, '')
 
  // ١. رمز رقمي صريح مع تجاهل أرقام السياق
  const codeMatch = cleanedText.match(/\b(\d{4})\b/)
  if (codeMatch && !CONTEXT_NUMBERS.has(codeMatch[1])) {
    return codeMatch[1]
  }
 
  // ٢. NER Map اليدوي (من الأطول للأقصر)
  const nerEntries = Object.entries(STOCK_NER_MAP).sort((a, b) => b[0].length - a[0].length)
  for (const [name, code] of nerEntries) {
    if (text.includes(name)) return code
  }
 
  // ٣. بحث ديناميكي في كل أسهم DB
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
 
  // الخبر المحايد له موجات — التصنيف وصف للخبر فقط
  // الإصلاح الصحيح: sign = 0 عند المحايد فتظهر النسب ±0.0% لا قيم إيجابية وهمية
  const sign = dir === 'pos' ? 1 : dir === 'neg' ? -1 : 0
  const nodes: import('@/types').RippleNode[] = []
  const powerFactor = Math.max(0.3, abs / 85)
 
  const pct = (base: number, mult = 1, flip = false): string => {
    const raw = base * powerFactor * mult
    const val = raw.toFixed(1)
    return (flip ? -sign : sign) > 0 ? `+${val}%` : `-${val}%`
  }
 
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
 
  const isCapitalEvent = newsText
    ? /زيادة رأس المال|رفع رأس المال|زيادة رأسمال|أسهم مجانية|إصدار أسهم|طرح أسهم/.test(newsText)
    : false
 
  // ── الموجة الأولى ───────────────────────────────────────
  nodes.push({ label: `الموجة الأولى — ${pData.label}`, wave: 1, isHead: true })
  let w1Stocks = [...pData.stocks]
 
  if (detectedCode) {
    const idx = w1Stocks.findIndex(s => s.t === detectedCode)
    if (idx > 0) {
      const [found] = w1Stocks.splice(idx, 1)
      w1Stocks.unshift(found)
    } else if (idx < 0) {
      for (const [, sec] of Object.entries(DB)) {
        const found = sec.stocks.find(s => s.t === detectedCode)
        if (found) { w1Stocks.unshift(found); break }
      }
    }
  }
 
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
