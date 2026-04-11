// ══════════════════════════════════════════════════════════════════
// موجة الخبر — قاعدة بيانات شبكة التملك ونظام تأثير الأخبار
// المسار: src/data/network-db.ts
// الحالة: ملف جديد — لا يوجد في البرنامج الأصلي
// المصدر: شبكة_الاسهم_الكاملة_394.xlsx + شبكة_الاسهم_السعودية.xlsx
// ══════════════════════════════════════════════════════════════════
 
// ── أنواع البيانات ────────────────────────────────────────────────
export type RelationType  = 'DIRECT' | 'INDIRECT' | 'OPERATIONAL' | 'SENTIMENT'
export type MarketState   = 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF'
export type NewsDirection = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
 
export interface OwnershipRelation {
  id:            number
  owner_code:    string
  owner_name:    string
  owned_code:    string
  owned_name:    string
  ownership_pct: number
  relation_type: RelationType
  layer:         1 | 2 | 3 | 4
  strength:      number
  decay_factor:  number
  owner_sector:  string
  owned_sector:  string
  source:        string
  verified:      boolean
}
 
export interface NewsType {
  type_id:        string
  name_ar:        string
  direction:      NewsDirection
  lambda:         number
  half_life_hrs:  number
  default_s:      number
  sector_impacts: Record<string, number>
}
 
export interface StockNetwork {
  code:             string
  name_ar:          string
  sector:           string
  market:           'TASI' | 'NOMU'
  network_score:    number
  is_owner:         boolean
  is_owned:         boolean
  liquidity_factor: number
}
 
// ══════════════════════════════════════════════════════════════════
// ١. العلاقات الـ 61 الموثقة
// ══════════════════════════════════════════════════════════════════
export const OWNERSHIP_RELATIONS: OwnershipRelation[] = [
  // ── أرامكو السعودية (2222) → مباشر ─────────────────────────────
  { id:1,  owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2010', owned_name:'سابك',                  ownership_pct:70,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'Aramco AR 2024',      verified:true  },
  { id:2,  owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2223', owned_name:'لوبريف',                ownership_pct:70,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'Aramco AR 2024',      verified:true  },
  { id:3,  owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2380', owned_name:'بترو رابغ',             ownership_pct:60,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'الطاقة',               owned_sector:'الطاقة',                source:'Aramco AR 2024',      verified:true  },
  // ── سابك (2010) → مباشر ─────────────────────────────────────────
  { id:4,  owner_code:'2010', owner_name:'سابك',                 owned_code:'2290', owned_name:'ينساب',                 ownership_pct:51,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SABIC AR 2024',       verified:true  },
  { id:5,  owner_code:'2010', owner_name:'سابك',                 owned_code:'2020', owned_name:'سابك للمغذيات',         ownership_pct:50.1,  relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SABIC AR 2024',       verified:true  },
  { id:6,  owner_code:'2010', owner_name:'سابك',                 owned_code:'2350', owned_name:'كيان السعودية',         ownership_pct:35,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SABIC AR 2024',       verified:true  },
  { id:7,  owner_code:'2010', owner_name:'سابك',                 owned_code:'2310', owned_name:'سبكيم العالمية',        ownership_pct:35,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SABIC AR 2024',       verified:true  },
  { id:8,  owner_code:'2010', owner_name:'سابك',                 owned_code:'2330', owned_name:'المتقدمة',              ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SABIC AR 2024',       verified:true  },
  { id:9,  owner_code:'2010', owner_name:'سابك',                 owned_code:'2060', owned_name:'التصنيع',               ownership_pct:29,    relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'TASNEE AR 2024',      verified:true  },
  { id:10, owner_code:'2010', owner_name:'سابك',                 owned_code:'2250', owned_name:'المجموعة السعودية',     ownership_pct:20,    relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SIIG AR 2024',        verified:true  },
  // ── أرامكو → غير مباشر (عبر سابك) ─────────────────────────────
  { id:11, owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2290', owned_name:'ينساب',                 ownership_pct:35.7,  relation_type:'INDIRECT',    layer:2, strength:7,  decay_factor:0.7,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'محسوب 70%×51%',       verified:true  },
  { id:12, owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2020', owned_name:'سابك للمغذيات',         ownership_pct:35.07, relation_type:'INDIRECT',    layer:2, strength:7,  decay_factor:0.7,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'محسوب 70%×50.1%',     verified:true  },
  { id:13, owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2350', owned_name:'كيان السعودية',         ownership_pct:24.5,  relation_type:'INDIRECT',    layer:2, strength:5,  decay_factor:0.7,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'محسوب 70%×35%',       verified:true  },
  { id:14, owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2310', owned_name:'سبكيم العالمية',        ownership_pct:24.5,  relation_type:'INDIRECT',    layer:2, strength:5,  decay_factor:0.7,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'محسوب 70%×35%',       verified:true  },
  { id:15, owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2330', owned_name:'المتقدمة',              ownership_pct:21,    relation_type:'INDIRECT',    layer:2, strength:5,  decay_factor:0.7,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'محسوب 70%×30%',       verified:true  },
  { id:16, owner_code:'2222', owner_name:'أرامكو السعودية',      owned_code:'2060', owned_name:'التصنيع',               ownership_pct:20.3,  relation_type:'INDIRECT',    layer:2, strength:5,  decay_factor:0.7,  owner_sector:'الطاقة',               owned_sector:'المواد الأساسية',       source:'محسوب 70%×29%',       verified:true  },
  // ── صافولا (2050) ───────────────────────────────────────────────
  { id:17, owner_code:'2050', owner_name:'صافولا',               owned_code:'2280', owned_name:'المراعي',               ownership_pct:34.5,  relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'إنتاج الأغذية',        owned_sector:'إنتاج الأغذية',         source:'Savola AR 2023',      verified:true  },
  { id:18, owner_code:'2050', owner_name:'صافولا',               owned_code:'6002', owned_name:'هرفي للأغذية',          ownership_pct:49,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'إنتاج الأغذية',        owned_sector:'الخدمات الاستهلاكية',   source:'Savola AR 2024',      verified:true  },
  // ── المراعي (2280) ──────────────────────────────────────────────
  { id:19, owner_code:'2280', owner_name:'المراعي',              owned_code:'2281', owned_name:'تنمية',                 ownership_pct:64,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'إنتاج الأغذية',        owned_sector:'إنتاج الأغذية',         source:'Almarai AR 2024',     verified:true  },
  // ── البنك الأهلي (1180) ─────────────────────────────────────────
  { id:20, owner_code:'1180', owner_name:'البنك الأهلي',         owned_code:'1182', owned_name:'أملاك',                 ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'البنوك',               owned_sector:'الخدمات المالية',       source:'SNB AR 2024',         verified:true  },
  { id:21, owner_code:'1180', owner_name:'البنك الأهلي',         owned_code:'1060', owned_name:'الأول SAB',             ownership_pct:37.5,  relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'البنوك',               owned_sector:'البنوك',                source:'SNB AR 2024',         verified:true  },
  // ── اس تي سي (7010) ─────────────────────────────────────────────
  { id:22, owner_code:'7010', owner_name:'اس تي سي',            owned_code:'7020', owned_name:'اتحاد اتصالات موبايلي', ownership_pct:25.8,  relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'الاتصالات',            owned_sector:'الاتصالات',             source:'STC AR 2024',         verified:true  },
  // ── معادن (1211) ────────────────────────────────────────────────
  { id:23, owner_code:'1211', owner_name:'معادن',                owned_code:'1322', owned_name:'أماك',                  ownership_pct:50,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'Maaden AR 2024',      verified:true  },
  // ── سليمان الحبيب (4013) ────────────────────────────────────────
  { id:24, owner_code:'4013', owner_name:'سليمان الحبيب',        owned_code:'4021', owned_name:'المركز الكندي الطبي',   ownership_pct:40,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'الرعاية الصحية',       owned_sector:'الرعاية الصحية',        source:'HMG AR 2024',         verified:true  },
  // ── صندوق الاستثمارات PIF ───────────────────────────────────────
  { id:25, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2222', owned_name:'أرامكو السعودية',       ownership_pct:81.5,  relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'الطاقة',                source:'PIF AR 2024',         verified:true  },
  { id:26, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'7010', owned_name:'اس تي سي',             ownership_pct:62,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'الاتصالات',             source:'PIF AR 2024',         verified:true  },
  { id:27, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'1211', owned_name:'معادن',                 ownership_pct:63.8,  relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'المواد الأساسية',       source:'PIF AR 2024',         verified:true  },
  { id:28, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2082', owned_name:'أكوا باور',             ownership_pct:44,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'المرافق العامة',        source:'PIF AR 2024',         verified:true  },
  { id:29, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'1111', owned_name:'تداول',                 ownership_pct:92,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'الخدمات المالية',       source:'PIF AR 2024',         verified:true  },
  { id:30, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'1180', owned_name:'البنك الأهلي',          ownership_pct:37,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'البنوك',                source:'PIF AR 2024',         verified:true  },
  { id:31, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2280', owned_name:'المراعي',               ownership_pct:16,    relation_type:'DIRECT',      layer:1, strength:5,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'إنتاج الأغذية',         source:'PIF/SALIC 2024',      verified:true  },
  { id:32, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2050', owned_name:'صافولا',                ownership_pct:17.9,  relation_type:'DIRECT',      layer:1, strength:5,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'إنتاج الأغذية',         source:'PIF AR 2024',         verified:true  },
  // ── التعاونية (8010) ────────────────────────────────────────────
  { id:33, owner_code:'8010', owner_name:'التعاونية',             owned_code:'8200', owned_name:'الإعادة السعودية',      ownership_pct:12,    relation_type:'DIRECT',      layer:1, strength:5,  decay_factor:1.0,  owner_sector:'التأمين',              owned_sector:'التأمين',               source:'TAWUNIYA 2024',       verified:true  },
  // ── الشرقية للتنمية (6060) ──────────────────────────────────────
  { id:34, owner_code:'6060', owner_name:'الشرقية للتنمية',       owned_code:'6070', owned_name:'الجوف الزراعية',        ownership_pct:22,    relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'إنتاج الأغذية',        owned_sector:'إنتاج الأغذية',         source:'Annual Report',       verified:true  },
  // ── سينومي سنترز (4321) ─────────────────────────────────────────
  { id:35, owner_code:'4321', owner_name:'سينومي سنترز',          owned_code:'4240', owned_name:'سينومي ريتيل',          ownership_pct:51,    relation_type:'DIRECT',      layer:1, strength:10, decay_factor:1.0,  owner_sector:'العقارات',             owned_sector:'التجزئة الكمالية',      source:'Cenomi AR 2024',      verified:true  },
  // ── الراجحي (1120) ──────────────────────────────────────────────
  { id:36, owner_code:'1120', owner_name:'الراجحي',               owned_code:'8230', owned_name:'تكافل الراجحي',         ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'البنوك',               owned_sector:'التأمين',               source:'Rajhi AR 2024',       verified:true  },
  { id:37, owner_code:'1120', owner_name:'الراجحي',               owned_code:'4340', owned_name:'الراجحي ريت',           ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  decay_factor:0.5,  owner_sector:'البنوك',               owned_sector:'الصناديق العقارية',     source:'Rajhi Capital',       verified:true  },
  // ── الإنماء (1150) ──────────────────────────────────────────────
  { id:38, owner_code:'1150', owner_name:'الإنماء',               owned_code:'4345', owned_name:'إنماء ريت للتجزئة',     ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  decay_factor:0.5,  owner_sector:'البنوك',               owned_sector:'الصناديق العقارية',     source:'Alinma Capital',      verified:true  },
  { id:39, owner_code:'1150', owner_name:'الإنماء',               owned_code:'4349', owned_name:'إنماء ريت الفندقي',      ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  decay_factor:0.5,  owner_sector:'البنوك',               owned_sector:'الصناديق العقارية',     source:'Alinma Capital',      verified:true  },
  // ── الجزيرة (1020) ──────────────────────────────────────────────
  { id:40, owner_code:'1020', owner_name:'الجزيرة',               owned_code:'8012', owned_name:'جزيرة تكافل',           ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'البنوك',               owned_sector:'التأمين',               source:'AlJazira AR 2024',    verified:true  },
  { id:41, owner_code:'1020', owner_name:'الجزيرة',               owned_code:'4331', owned_name:'الجزيرة ريت',           ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  decay_factor:0.5,  owner_sector:'البنوك',               owned_sector:'الصناديق العقارية',     source:'AlJazira Capital',    verified:true  },
  // ── مؤسسة التأمينات GOSI ────────────────────────────────────────
  { id:42, owner_code:'GOSI', owner_name:'مؤسسة التأمينات',       owned_code:'8010', owned_name:'التعاونية',             ownership_pct:22.8,  relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'التأمين',               source:'GOSI AR 2024',        verified:true  },
  { id:43, owner_code:'GOSI', owner_name:'مؤسسة التأمينات',       owned_code:'8210', owned_name:'بوبا العربية',          ownership_pct:10,    relation_type:'DIRECT',      layer:1, strength:5,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'التأمين',               source:'GOSI AR 2024',        verified:true  },
  // ── مؤسسة التقاعد GPFF ──────────────────────────────────────────
  { id:44, owner_code:'GPFF', owner_name:'مؤسسة التقاعد',         owned_code:'8010', owned_name:'التعاونية',             ownership_pct:23.7,  relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'حكومي',               owned_sector:'التأمين',               source:'GPFF AR 2024',        verified:true  },
  // ── الأندية للرياضة (6018) ──────────────────────────────────────
  { id:45, owner_code:'6018', owner_name:'الأندية للرياضة',        owned_code:'1830', owned_name:'لجام للرياضة',          ownership_pct:15,    relation_type:'DIRECT',      layer:1, strength:5,  decay_factor:1.0,  owner_sector:'الخدمات الاستهلاكية',  owned_sector:'الخدمات الاستهلاكية',   source:'Annual Report',       verified:true  },
  // ── المجموعة السعودية SIIG (2250) ───────────────────────────────
  { id:46, owner_code:'2250', owner_name:'المجموعة السعودية',      owned_code:'2210', owned_name:'نماء للكيماويات',       ownership_pct:20,    relation_type:'DIRECT',      layer:1, strength:6,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SIIG AR 2024',        verified:true  },
  { id:47, owner_code:'2250', owner_name:'المجموعة السعودية',      owned_code:'2220', owned_name:'معدنية',                ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  decay_factor:1.0,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SIIG AR 2024',        verified:true  },
  // ── علاقات تشغيلية ──────────────────────────────────────────────
  { id:48, owner_code:'2082', owner_name:'أكوا باور',              owned_code:'2080', owned_name:'الغاز',                 ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:3,  decay_factor:0.5,  owner_sector:'المرافق العامة',       owned_sector:'المرافق العامة',        source:'ACWA contracts',      verified:true  },
  { id:49, owner_code:'2222', owner_name:'أرامكو السعودية',        owned_code:'2030', owned_name:'المصافي',               ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  decay_factor:0.5,  owner_sector:'الطاقة',               owned_sector:'الطاقة',                source:'Aramco supplier',     verified:true  },
  { id:50, owner_code:'2222', owner_name:'أرامكو السعودية',        owned_code:'2381', owned_name:'الحفر العربية',         ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  decay_factor:0.5,  owner_sector:'الطاقة',               owned_sector:'الطاقة',                source:'Aramco drilling',     verified:true  },
  { id:51, owner_code:'2222', owner_name:'أرامكو السعودية',        owned_code:'2190', owned_name:'سيسكو القابضة',         ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  decay_factor:0.5,  owner_sector:'الطاقة',               owned_sector:'النقل',                 source:'Aramco services',     verified:true  },
  { id:52, owner_code:'2222', owner_name:'أرامكو السعودية',        owned_code:'2382', owned_name:'أديس',                  ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  decay_factor:0.5,  owner_sector:'الطاقة',               owned_sector:'الطاقة',                source:'Aramco drilling',     verified:true  },
  { id:53, owner_code:'2010', owner_name:'سابك',                   owned_code:'2210', owned_name:'نماء للكيماويات',       ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  decay_factor:0.5,  owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'SABIC supplier',      verified:true  },
  // ── علاقات معنوية / قطاعية ──────────────────────────────────────
  { id:54, owner_code:'2280', owner_name:'المراعي',                owned_code:'4061', owned_name:'أنعام القابضة',         ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'إنتاج الأغذية',        owned_sector:'التجزئة الاستهلاكية',   source:'Beta مشترك',          verified:false },
  { id:55, owner_code:'7010', owner_name:'اس تي سي',              owned_code:'7203', owned_name:'علم',                   ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  decay_factor:0.5,  owner_sector:'الاتصالات',            owned_sector:'التقنية',               source:'STC contracts',       verified:true  },
  { id:56, owner_code:'4013', owner_name:'سليمان الحبيب',          owned_code:'4004', owned_name:'دله الصحية',            ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'الرعاية الصحية',       owned_sector:'الرعاية الصحية',        source:'Beta مشترك',          verified:false },
  { id:57, owner_code:'4004', owner_name:'دله الصحية',             owned_code:'4017', owned_name:'فقيه الطبية',           ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'الرعاية الصحية',       owned_sector:'الرعاية الصحية',        source:'Beta مشترك',          verified:false },
  { id:58, owner_code:'3030', owner_name:'أسمنت السعودية',         owned_code:'3020', owned_name:'أسمنت اليمامة',         ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'Beta مشترك',          verified:false },
  { id:59, owner_code:'3020', owner_name:'أسمنت اليمامة',          owned_code:'3010', owned_name:'أسمنت العربية',         ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'المواد الأساسية',      owned_sector:'المواد الأساسية',       source:'Beta مشترك',          verified:false },
  { id:60, owner_code:'7010', owner_name:'اس تي سي',              owned_code:'7030', owned_name:'زين السعودية',          ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'الاتصالات',            owned_sector:'الاتصالات',             source:'Beta مشترك',          verified:false },
  { id:61, owner_code:'7010', owner_name:'اس تي سي',              owned_code:'7020', owned_name:'اتحاد اتصالات موبايلي', ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  decay_factor:0.25, owner_sector:'الاتصالات',            owned_sector:'الاتصالات',             source:'Beta مشترك',          verified:false },
]
 
// ══════════════════════════════════════════════════════════════════
// ٢. قاموس الأخبار — 13 نوع + λ
// المعادلة: T(t) = e^(-λt)
// ══════════════════════════════════════════════════════════════════
export const NEWS_TYPES: Record<string, NewsType> = {
  EARNINGS_BEAT:    { type_id:'EARNINGS_BEAT',    name_ar:'أرباح أفضل من التوقعات',         direction:'POSITIVE', lambda:2.0, half_life_hrs:8,   default_s:1.8, sector_impacts:{ 'الطاقة':0.07, 'المواد الأساسية':0.04, 'البنوك':0.01 } },
  EARNINGS_MISS:    { type_id:'EARNINGS_MISS',    name_ar:'أرباح دون التوقعات',             direction:'NEGATIVE', lambda:2.0, half_life_hrs:8,   default_s:1.8, sector_impacts:{ 'الطاقة':-0.07, 'المواد الأساسية':-0.04 } },
  RATE_HIKE:        { type_id:'RATE_HIKE',        name_ar:'رفع سعر الفائدة',                direction:'POSITIVE', lambda:0.4, half_life_hrs:41,  default_s:1.3, sector_impacts:{ 'البنوك':0.03, 'العقارات':-0.05, 'المقاولات':-0.02 } },
  RATE_CUT:         { type_id:'RATE_CUT',         name_ar:'خفض سعر الفائدة',                direction:'POSITIVE', lambda:0.4, half_life_hrs:41,  default_s:1.3, sector_impacts:{ 'العقارات':0.06, 'المقاولات':0.025, 'البنوك':-0.015 } },
  OIL_UP:           { type_id:'OIL_UP',           name_ar:'ارتفاع أسعار النفط +10%',        direction:'POSITIVE', lambda:1.0, half_life_hrs:17,  default_s:1.5, sector_impacts:{ 'الطاقة':0.05, 'المقاولات':0.02, 'البنوك':0.01 } },
  OIL_DOWN:         { type_id:'OIL_DOWN',         name_ar:'انخفاض أسعار النفط -10%',        direction:'NEGATIVE', lambda:1.0, half_life_hrs:17,  default_s:1.5, sector_impacts:{ 'الطاقة':-0.06, 'المقاولات':-0.02 } },
  MAJOR_CONTRACT:   { type_id:'MAJOR_CONTRACT',   name_ar:'عقد حكومي كبير رؤية 2030',       direction:'POSITIVE', lambda:0.5, half_life_hrs:33,  default_s:2.0, sector_impacts:{ 'المقاولات':0.08, 'المواد الأساسية':0.03, 'البنوك':0.015 } },
  OPEC_CUT:         { type_id:'OPEC_CUT',         name_ar:'قرار أوبك+ تخفيض الإنتاج',       direction:'POSITIVE', lambda:1.0, half_life_hrs:17,  default_s:1.3, sector_impacts:{ 'الطاقة':0.035, 'البنوك':0.01 } },
  OWNERSHIP_CHANGE: { type_id:'OWNERSHIP_CHANGE', name_ar:'تغيير هيكل ملكية / استحواذ',     direction:'POSITIVE', lambda:0.1, half_life_hrs:168, default_s:2.5, sector_impacts:{} },
  DIVIDEND:         { type_id:'DIVIDEND',         name_ar:'إعلان توزيعات أرباح استثنائية',  direction:'POSITIVE', lambda:2.0, half_life_hrs:8,   default_s:1.2, sector_impacts:{ 'البنوك':0.005 } },
  GUIDANCE_UP:      { type_id:'GUIDANCE_UP',      name_ar:'رفع التوقعات المستقبلية',         direction:'POSITIVE', lambda:0.3, half_life_hrs:55,  default_s:1.6, sector_impacts:{} },
  REGULATORY:       { type_id:'REGULATORY',       name_ar:'قرار تنظيمي / رخصة تشغيل',       direction:'POSITIVE', lambda:0.2, half_life_hrs:84,  default_s:1.4, sector_impacts:{} },
  GENERAL:          { type_id:'GENERAL',          name_ar:'خبر عام',                         direction:'NEUTRAL',  lambda:1.0, half_life_hrs:17,  default_s:1.0, sector_impacts:{} },
}
 
// ══════════════════════════════════════════════════════════════════
// ٣. مصفوفة القطاعات 10×10
// ══════════════════════════════════════════════════════════════════
export const SECTOR_MATRIX: Record<string, Record<string, number>> = {
  'الطاقة':          { 'المواد الأساسية':7, 'البنوك':8, 'العقارات':5, 'المقاولات':9, 'الأغذية':3, 'الاتصالات':2, 'الرعاية الصحية':2, 'التأمين':3 },
  'المواد الأساسية': { 'الطاقة':6, 'البنوك':5, 'العقارات':3, 'المقاولات':7, 'الأغذية':4, 'الاتصالات':1 },
  'البنوك':          { 'الطاقة':3, 'العقارات':8, 'المقاولات':7, 'الأغذية':2, 'الاتصالات':2, 'الرعاية الصحية':3, 'التأمين':6 },
  'العقارات':        { 'الطاقة':2, 'البنوك':5, 'المقاولات':8, 'الاتصالات':1 },
  'المقاولات':       { 'الطاقة':3, 'البنوك':4, 'العقارات':6, 'المواد الأساسية':3 },
  'الأغذية':         { 'الطاقة':2, 'البنوك':2, 'التجزئة':5, 'الرعاية الصحية':2 },
  'الاتصالات':       { 'الطاقة':1, 'البنوك':2, 'التقنية':4 },
  'الرعاية الصحية':  { 'البنوك':2, 'التأمين':4 },
  'التأمين':         { 'البنوك':5, 'العقارات':3, 'الرعاية الصحية':4 },
}
 
// ══════════════════════════════════════════════════════════════════
// ٤. معلومات الأسهم المختصرة للحسابات
// ══════════════════════════════════════════════════════════════════
export const STOCK_INFO: Record<string, { name: string; sector: string; market: string; liquidity: number }> = {
  '2222': { name:'أرامكو السعودية',        sector:'الطاقة',                    market:'TASI', liquidity:1.0 },
  '2010': { name:'سابك',                   sector:'المواد الأساسية',            market:'TASI', liquidity:1.0 },
  '2290': { name:'ينساب',                  sector:'المواد الأساسية',            market:'TASI', liquidity:0.9 },
  '2223': { name:'لوبريف',                 sector:'المواد الأساسية',            market:'TASI', liquidity:0.9 },
  '2380': { name:'بترو رابغ',              sector:'الطاقة',                    market:'TASI', liquidity:0.9 },
  '2020': { name:'سابك للمغذيات',          sector:'المواد الأساسية',            market:'TASI', liquidity:1.0 },
  '2350': { name:'كيان السعودية',          sector:'المواد الأساسية',            market:'TASI', liquidity:0.9 },
  '2310': { name:'سبكيم العالمية',         sector:'المواد الأساسية',            market:'TASI', liquidity:0.9 },
  '2330': { name:'المتقدمة',               sector:'المواد الأساسية',            market:'TASI', liquidity:0.9 },
  '2060': { name:'التصنيع',                sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '2250': { name:'المجموعة السعودية',      sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '2280': { name:'المراعي',                sector:'إنتاج الأغذية',             market:'TASI', liquidity:1.0 },
  '2050': { name:'صافولا',                 sector:'إنتاج الأغذية',             market:'TASI', liquidity:0.9 },
  '2281': { name:'تنمية',                  sector:'إنتاج الأغذية',             market:'TASI', liquidity:0.8 },
  '6002': { name:'هرفي للأغذية',           sector:'الخدمات الاستهلاكية',       market:'TASI', liquidity:0.8 },
  '1180': { name:'البنك الأهلي',           sector:'البنوك',                    market:'TASI', liquidity:1.0 },
  '1060': { name:'الأول SAB',              sector:'البنوك',                    market:'TASI', liquidity:0.9 },
  '1182': { name:'أملاك',                  sector:'الخدمات المالية',           market:'TASI', liquidity:0.8 },
  '1120': { name:'الراجحي',                sector:'البنوك',                    market:'TASI', liquidity:1.0 },
  '8230': { name:'تكافل الراجحي',          sector:'التأمين',                   market:'TASI', liquidity:0.8 },
  '4340': { name:'الراجحي ريت',            sector:'الصناديق العقارية',         market:'TASI', liquidity:0.8 },
  '7010': { name:'اس تي سي',              sector:'الاتصالات',                 market:'TASI', liquidity:1.0 },
  '7020': { name:'اتحاد اتصالات موبايلي',  sector:'الاتصالات',                 market:'TASI', liquidity:0.9 },
  '7030': { name:'زين السعودية',           sector:'الاتصالات',                 market:'TASI', liquidity:0.9 },
  '7203': { name:'علم',                    sector:'التقنية',                   market:'TASI', liquidity:0.8 },
  '1211': { name:'معادن',                  sector:'المواد الأساسية',            market:'TASI', liquidity:1.0 },
  '1322': { name:'أماك',                   sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '4013': { name:'سليمان الحبيب',          sector:'الرعاية الصحية',            market:'TASI', liquidity:0.9 },
  '4021': { name:'المركز الكندي الطبي',    sector:'الرعاية الصحية',            market:'TASI', liquidity:0.8 },
  '4321': { name:'سينومي سنترز',           sector:'العقارات',                  market:'TASI', liquidity:0.9 },
  '4240': { name:'سينومي ريتيل',           sector:'التجزئة الكمالية',          market:'TASI', liquidity:0.8 },
  '8010': { name:'التعاونية',              sector:'التأمين',                   market:'TASI', liquidity:0.9 },
  '8012': { name:'جزيرة تكافل',            sector:'التأمين',                   market:'TASI', liquidity:0.8 },
  '8200': { name:'الإعادة السعودية',       sector:'التأمين',                   market:'TASI', liquidity:0.8 },
  '8210': { name:'بوبا العربية',           sector:'التأمين',                   market:'TASI', liquidity:0.8 },
  '1020': { name:'الجزيرة',               sector:'البنوك',                    market:'TASI', liquidity:0.8 },
  '4331': { name:'الجزيرة ريت',            sector:'الصناديق العقارية',         market:'TASI', liquidity:0.8 },
  '1150': { name:'الإنماء',               sector:'البنوك',                    market:'TASI', liquidity:0.9 },
  '4345': { name:'إنماء ريت للتجزئة',     sector:'الصناديق العقارية',         market:'TASI', liquidity:0.8 },
  '4349': { name:'إنماء ريت الفندقي',      sector:'الصناديق العقارية',         market:'TASI', liquidity:0.8 },
  '2082': { name:'أكوا باور',              sector:'المرافق العامة',            market:'TASI', liquidity:1.0 },
  '2080': { name:'الغاز',                  sector:'المرافق العامة',            market:'TASI', liquidity:0.8 },
  '1111': { name:'تداول',                  sector:'الخدمات المالية',           market:'TASI', liquidity:1.0 },
  '2030': { name:'المصافي',                sector:'الطاقة',                    market:'TASI', liquidity:0.8 },
  '2381': { name:'الحفر العربية',          sector:'الطاقة',                    market:'TASI', liquidity:0.8 },
  '2382': { name:'أديس',                   sector:'الطاقة',                    market:'TASI', liquidity:0.8 },
  '2190': { name:'سيسكو القابضة',          sector:'النقل',                     market:'TASI', liquidity:0.8 },
  '2210': { name:'نماء للكيماويات',        sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '2220': { name:'معدنية',                 sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '4061': { name:'أنعام القابضة',          sector:'التجزئة الاستهلاكية',       market:'TASI', liquidity:0.8 },
  '4004': { name:'دله الصحية',             sector:'الرعاية الصحية',            market:'TASI', liquidity:0.8 },
  '4017': { name:'فقيه الطبية',            sector:'الرعاية الصحية',            market:'TASI', liquidity:0.8 },
  '3030': { name:'أسمنت السعودية',         sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '3020': { name:'أسمنت اليمامة',          sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '3010': { name:'أسمنت العربية',          sector:'المواد الأساسية',            market:'TASI', liquidity:0.8 },
  '1830': { name:'لجام للرياضة',           sector:'الخدمات الاستهلاكية',       market:'TASI', liquidity:0.8 },
  '6018': { name:'الأندية للرياضة',        sector:'الخدمات الاستهلاكية',       market:'TASI', liquidity:0.8 },
  '6060': { name:'الشرقية للتنمية',        sector:'إنتاج الأغذية',             market:'TASI', liquidity:0.8 },
  '6070': { name:'الجوف الزراعية',         sector:'إنتاج الأغذية',             market:'TASI', liquidity:0.8 },
}
 
// ══════════════════════════════════════════════════════════════════
// ٥. دوال المساعدة
// ══════════════════════════════════════════════════════════════════
 
/** جلب كل العلاقات الصادرة من سهم معين */
export function getRelationsByOwner(ownerCode: string): OwnershipRelation[] {
  return OWNERSHIP_RELATIONS.filter(r => r.owner_code === ownerCode)
}
 
/** جلب معلومات نوع الخبر */
export function getNewsType(typeId: string): NewsType {
  return NEWS_TYPES[typeId] ?? NEWS_TYPES['GENERAL']
}
 
/** جلب درجة التأثير بين قطاعين (0-1) */
export function getSectorImpact(fromSector: string, toSector: string): number {
  return (SECTOR_MATRIX[fromSector]?.[toSector] ?? 0) / 10
}
