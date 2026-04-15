// ══════════════════════════════════════════════════
// موجة الخبر — TypeScript Types
// ══════════════════════════════════════════════════
 
// ── Sentiment & NLP ───────────────────────────────
export type SentimentDirection = 'pos' | 'neg' | 'neu'
 
export interface SentimentResult {
  score:     number               // -92 → +92
  dir:       SentimentDirection
  pos_words: string[]
  neg_words: string[]
  intensity: 'low' | 'medium' | 'high'
  top_cat:   'growth' | 'risk' | 'neutral' | 'general'
  raw_score: number
}
 
// ── Sectors & Stocks ─────────────────────────────
export type SectorKey =
  | 'energy'           | 'materials'        | 'banking'
  | 'realestate'       | 'reits'            | 'insurance'
  | 'food'             | 'healthcare'       | 'telecom'
  | 'tech'             | 'transport'        | 'utilities'
  | 'capital_goods'    | 'finservices'      | 'consumer_retail'
  | 'luxury_retail'    | 'consumer_services'| 'business_services'
  | 'media'            | 'pharma'           | 'durables'
  | 'household'
 
export interface StockEntry {
  t: string   // ticker
  n: string   // name
  s: string   // sub-sector
  w: number   // weight 0-100
}
 
export interface SectorData {
  label:   string
  icon:    string
  kw:      string[]
  stocks:  StockEntry[]
  ripple:  { w2: SectorKey[]; w3: SectorKey[] }
}
 
export interface RippleNode {
  label?:      string
  wave:        1 | 2 | 3
  isHead?:     boolean
  t?:          string
  n?:          string
  s?:          string
  w?:          number
  pct?:        string
  pctVal?:     number
  desc?:       string
  icon?:       string
  icoClass?:   'b' | 'o' | 'g'
  sectorKey?:  SectorKey
  primaryKey?: SectorKey
}
 
export interface SectorDetectResult {
  primary:    SectorKey
  allSectors: SectorKey[]
  scores:     Record<string, number>
}
 
// ── Network Impact ────────────────────────────────
// عنصر واحد من قائمة نتائج شبكة الملكية
export interface NetworkImpactItem {
  rank:           number
  stockCode:      string
  stockName:      string
  sector:         string
  market:         string
  impactPct:      number
  direction:      'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  relationType:   string
  layer:          number
  ownershipPct:   number | null
  effectiveOwn:   number
  timeframeLabel: string
  path:           string[]
  formula:        string
  strength:        number
  // اتجاه الانتشار في شبكة الملكية
  propagationDir?: 'UPWARD' | 'DOWNWARD' | 'ORIGIN'
}
 
// بيانات الميتا لتحليل الشبكة
export interface NetworkImpactMeta {
  requestId:     string
  timestamp:     string
  originStock:   { code: string; name: string; sector: string }
  baseImpact:    number
  parameters:    { S: number; M: number; T: number; marketState: string }
  totalAffected: number
  processingMs:  number
}
 
// النتيجة الكاملة لمحرك الشبكة
export interface NetworkAnalysisResult {
  meta:     NetworkImpactMeta
  impacts:  NetworkImpactItem[]
  warnings: string[]
}
 
// ── Analysis Result ───────────────────────────────
export interface AnalysisResult {
  text:           string
  sentiment:      SentimentResult
  primary:        SectorKey
  allSectors:     SectorKey[]
  ripples:        RippleNode[]
  stocks:         RippleNode[]
  timeline:       TimelinePoint[]
  insight?:       string
  confidence:     number
  usedAI:         boolean
  market:         'SA' | 'GLOBAL'
  ts:             string
  // نتائج محرك الشبكة (اختيارية — تظهر عند وجود سهم محدد)
  networkResult?: NetworkAnalysisResult
  originCode?:    string
}
 
export interface TimelinePoint {
  l:      string
  v:      number
  active?: boolean
}
 
// ── Portfolio ────────────────────────────────────
export interface Holding {
  id?:       string
  ticker:    string
  name:      string
  qty:       number
  avgPrice:  number
  sector:    string
  added:     number
  userId?:   string
}
 
export interface HoldingWithLive extends Holding {
  livePrice?:  number
  change?:     number
  spark?:      number[]
  val:         number
  pnl:         number
  pnlPct:      number
  dayPnl:      number
}
 
// ── Watchlist ────────────────────────────────────
export interface WatchlistEntry {
  id?:       string
  ticker:    string
  name:      string
  addedAt:   string
  userId?:   string
}
 
// ── History ──────────────────────────────────────
export interface HistoryEntry {
  id:           number
  ts:           string
  text:         string
  headline:     string
  primary:      SectorKey
  primaryLabel: string
  sentiment:    { score: number; dir: SentimentDirection }
  stocks:       Array<{ ticker: string; name: string; impact: string }>
  keywords:     string[]
  confidence:   number
  usedAI?:      boolean
  market?:      string
}
 
// ── Auth & Subscriptions ─────────────────────────
export type PlanType   = 'free' | 'pro' | 'admin'
export type PlanPeriod = 'monthly' | 'yearly'
 
export interface UserSession {
  id?:        string
  name:       string
  email?:     string
  plan:       PlanType
  token:      string
  ts:         number
  lifetime?:  boolean
  expiresAt?: string
}
 
export interface Subscriber {
  id:           string
  username:     string
  name:         string
  email:        string
  phone?:       string
  plan:         PlanType
  period?:      PlanPeriod
  status:       'active' | 'pending' | 'expired' | 'cancelled'
  source:       string
  amount?:      number
  createdAt:    string
  expiresAt?:   string
  lastLoginAt?: string
}
 
export interface SubscriptionCode {
  code:      string
  plan:      PlanType
  note?:     string
  expiry?:   string
  active:    boolean
  created:   string
  lastUsed?: string
  usedBy?:   string
}
 
// ── News ─────────────────────────────────────────
export interface NewsItem {
  id:          string
  title:       string
  desc:        string
  link:        string
  pubDate:     string
  source:      string
  sourceId:    string
  sourceIcon:  string
  text:        string
  lang:        'ar' | 'en'
  sentiment?:  SentimentResult
  sectorData?: SectorDetectResult
  isNew?:      boolean
  fetchedAt:   number
}
 
// ── Admin ────────────────────────────────────────
export interface AdminUser {
  name:  string
  uh:    string
  uh2:   string
  ph:    string
  ph2:   string
  role:  'super' | 'sub'
}
 
// ── API Responses ─────────────────────────────────
export interface ApiResponse<T = unknown> {
  success:  boolean
  data?:    T
  error?:   string
  message?: string
}
 
export interface AnalyzeRequest {
  text:    string
  market?: 'SA' | 'GLOBAL'
  waves?:  '3' | '5'
  useAI?:  boolean
}
 
// ── Live Prices ──────────────────────────────────
export interface LivePrice {
  ticker:  string
  price:   number
  change:  number
  spark?:  number[]
  ts:      number
}
 

