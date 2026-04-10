'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { DB, RELS, SECTOR_ORDER } from '@/data/market-db'

// ══════════════════════════════════════════════════════════════════
// التابات — الأصلية (0-9) + الجديدة (10-16)
// ══════════════════════════════════════════════════════════════════
const TABS = [
  { id: 0,  label: 'إحصائيات',           icon: '📊' },
  { id: 1,  label: 'الأسهم',              icon: '📈' },
  { id: 2,  label: 'الكلمات المفتاحية',   icon: '🔤' },
  { id: 3,  label: 'علاقات القطاعات',     icon: '🔗' },
  { id: 4,  label: 'سجل التحليلات',       icon: '📜' },
  { id: 5,  label: 'إعدادات API',         icon: '⚙️' },
  { id: 6,  label: 'الأمان',              icon: '🔐' },
  { id: 7,  label: 'الأدمنز',             icon: '👤' },
  { id: 8,  label: 'أكواد الاشتراك',      icon: '🎫' },
  { id: 9,  label: 'المشتركون',           icon: '👥' },
  { id: 10, label: 'رصد فوري',            icon: '📡', isNew: true },
  { id: 11, label: 'إدخال خبر',           icon: '📝', isNew: true },
  { id: 12, label: 'شبكة الملكيات',       icon: '🕸️', isNew: true },
  { id: 13, label: 'قاموس الأخبار',       icon: '📖', isNew: true },
  { id: 14, label: 'إدارة الأسهم 394',    icon: '🗂️', isNew: true },
  { id: 15, label: 'سجل التأثير',         icon: '📋', isNew: true },
  { id: 16, label: 'مقارن السيناريوهات',  icon: '⚖️', isNew: true },
]

// ══════════════════════════════════════════════════════════════════
// دوال مساعدة
// ══════════════════════════════════════════════════════════════════
function readHistory(): any[] {
  try {
    const stored = localStorage.getItem('mw-analysis')
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return parsed?.state?.history ?? []
  } catch { return [] }
}

function clearHistory() {
  try {
    const stored = localStorage.getItem('mw-analysis')
    if (!stored) return
    const parsed = JSON.parse(stored)
    if (parsed?.state) {
      parsed.state.history = []
      localStorage.setItem('mw-analysis', JSON.stringify(parsed))
    }
  } catch {}
}

// ══════════════════════════════════════════════════════════════════
// بيانات شبكة الملكيات — 61 علاقة
// المصدر: شبكة_الاسهم_الكاملة_394.xlsx
// ══════════════════════════════════════════════════════════════════
const NETWORK_RELATIONS = [
  { id:1,  owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2010', owned_name:'سابك',                  ownership_pct:70,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'Aramco AR 2024',  verified:true  },
  { id:2,  owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2223', owned_name:'لوبريف',                 ownership_pct:70,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'Aramco AR 2024',  verified:true  },
  { id:3,  owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2380', owned_name:'بترو رابغ',              ownership_pct:60,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'الطاقة',          owned_sector:'الطاقة',           source:'Aramco AR 2024',  verified:true  },
  { id:4,  owner_code:'2010', owner_name:'سابك',                  owned_code:'2290', owned_name:'ينساب',                  ownership_pct:51,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SABIC AR 2024',   verified:true  },
  { id:5,  owner_code:'2010', owner_name:'سابك',                  owned_code:'2020', owned_name:'سابك للمغذيات الزراعية', ownership_pct:50.1,  relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SABIC AR 2024',   verified:true  },
  { id:6,  owner_code:'2010', owner_name:'سابك',                  owned_code:'2350', owned_name:'كيان السعودية',          ownership_pct:35,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SABIC AR 2024',   verified:true  },
  { id:7,  owner_code:'2010', owner_name:'سابك',                  owned_code:'2310', owned_name:'سبكيم العالمية',         ownership_pct:35,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SABIC AR 2024',   verified:true  },
  { id:8,  owner_code:'2010', owner_name:'سابك',                  owned_code:'2330', owned_name:'المتقدمة',               ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SABIC AR 2024',   verified:true  },
  { id:9,  owner_code:'2010', owner_name:'سابك',                  owned_code:'2060', owned_name:'التصنيع',                ownership_pct:29,    relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'TASNEE AR 2024',  verified:true  },
  { id:10, owner_code:'2010', owner_name:'سابك',                  owned_code:'2250', owned_name:'المجموعة السعودية',      ownership_pct:20,    relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SIIG AR 2024',    verified:true  },
  { id:11, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2290', owned_name:'ينساب',                  ownership_pct:35.7,  relation_type:'INDIRECT',    layer:2, strength:7,  owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'محسوب 70%×51%',  verified:true  },
  { id:12, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2020', owned_name:'سابك للمغذيات الزراعية', ownership_pct:35.07, relation_type:'INDIRECT',    layer:2, strength:7,  owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'محسوب 70%×50.1%',verified:true  },
  { id:13, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2350', owned_name:'كيان السعودية',          ownership_pct:24.5,  relation_type:'INDIRECT',    layer:2, strength:5,  owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'محسوب 70%×35%',  verified:true  },
  { id:14, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2310', owned_name:'سبكيم العالمية',         ownership_pct:24.5,  relation_type:'INDIRECT',    layer:2, strength:5,  owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'محسوب 70%×35%',  verified:true  },
  { id:15, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2330', owned_name:'المتقدمة',               ownership_pct:21,    relation_type:'INDIRECT',    layer:2, strength:5,  owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'محسوب 70%×30%',  verified:true  },
  { id:16, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2060', owned_name:'التصنيع',                ownership_pct:20.3,  relation_type:'INDIRECT',    layer:2, strength:5,  owner_sector:'الطاقة',          owned_sector:'المواد الأساسية',  source:'محسوب 70%×29%',  verified:true  },
  { id:17, owner_code:'2050', owner_name:'صافولا',                owned_code:'2280', owned_name:'المراعي',                ownership_pct:34.5,  relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'إنتاج الأغذية',   owned_sector:'إنتاج الأغذية',   source:'Savola AR 2023',  verified:true  },
  { id:18, owner_code:'2050', owner_name:'صافولا',                owned_code:'6002', owned_name:'هرفي للأغذية',           ownership_pct:49,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'إنتاج الأغذية',   owned_sector:'الخدمات الاستهلاكية', source:'Savola AR 2024', verified:true },
  { id:19, owner_code:'2280', owner_name:'المراعي',               owned_code:'2281', owned_name:'تنمية',                  ownership_pct:64,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'إنتاج الأغذية',   owned_sector:'إنتاج الأغذية',   source:'Almarai AR 2024', verified:true  },
  { id:20, owner_code:'1180', owner_name:'البنك الأهلي',          owned_code:'1182', owned_name:'أملاك',                  ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'البنوك',           owned_sector:'الخدمات المالية', source:'SNB AR 2024',     verified:true  },
  { id:21, owner_code:'1180', owner_name:'البنك الأهلي',          owned_code:'1060', owned_name:'الأول SAB',              ownership_pct:37.5,  relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'البنوك',           owned_sector:'البنوك',           source:'SNB AR 2024',     verified:true  },
  { id:22, owner_code:'7010', owner_name:'اس تي سي',             owned_code:'7020', owned_name:'اتحاد اتصالات موبايلي',  ownership_pct:25.8,  relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'الاتصالات',        owned_sector:'الاتصالات',        source:'STC AR 2024',     verified:true  },
  { id:23, owner_code:'1211', owner_name:'معادن',                 owned_code:'1322', owned_name:'أماك',                   ownership_pct:50,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'Maaden AR 2024',  verified:true  },
  { id:24, owner_code:'4013', owner_name:'سليمان الحبيب',         owned_code:'4021', owned_name:'المركز الكندي الطبي',    ownership_pct:40,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'الرعاية الصحية',  owned_sector:'الرعاية الصحية',  source:'HMG AR 2024',     verified:true  },
  { id:25, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2222', owned_name:'أرامكو السعودية',        ownership_pct:81.5,  relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'حكومي',           owned_sector:'الطاقة',           source:'PIF AR 2024',     verified:true  },
  { id:26, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'7010', owned_name:'اس تي سي',              ownership_pct:62,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'حكومي',           owned_sector:'الاتصالات',        source:'PIF AR 2024',     verified:true  },
  { id:27, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'1211', owned_name:'معادن',                  ownership_pct:63.8,  relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'حكومي',           owned_sector:'المواد الأساسية',  source:'PIF AR 2024',     verified:true  },
  { id:28, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2082', owned_name:'أكوا باور',              ownership_pct:44,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'حكومي',           owned_sector:'المرافق العامة',   source:'PIF AR 2024',     verified:true  },
  { id:29, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'1111', owned_name:'تداول',                  ownership_pct:92,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'حكومي',           owned_sector:'الخدمات المالية', source:'PIF AR 2024',     verified:true  },
  { id:30, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'1180', owned_name:'البنك الأهلي',           ownership_pct:37,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'حكومي',           owned_sector:'البنوك',           source:'PIF AR 2024',     verified:true  },
  { id:31, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2280', owned_name:'المراعي',                ownership_pct:16,    relation_type:'DIRECT',      layer:1, strength:5,  owner_sector:'حكومي',           owned_sector:'إنتاج الأغذية',   source:'PIF/SALIC 2024',  verified:true  },
  { id:32, owner_code:'PIF',  owner_name:'صندوق الاستثمارات',    owned_code:'2050', owned_name:'صافولا',                 ownership_pct:17.9,  relation_type:'DIRECT',      layer:1, strength:5,  owner_sector:'حكومي',           owned_sector:'إنتاج الأغذية',   source:'PIF AR 2024',     verified:true  },
  { id:33, owner_code:'8010', owner_name:'التعاونية',             owned_code:'8200', owned_name:'الإعادة السعودية',       ownership_pct:12,    relation_type:'DIRECT',      layer:1, strength:5,  owner_sector:'التأمين',          owned_sector:'التأمين',          source:'TAWUNIYA 2024',   verified:true  },
  { id:34, owner_code:'6060', owner_name:'الشرقية للتنمية',       owned_code:'6070', owned_name:'الجوف الزراعية',         ownership_pct:22,    relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'إنتاج الأغذية',   owned_sector:'إنتاج الأغذية',   source:'Annual Report',   verified:true  },
  { id:35, owner_code:'4321', owner_name:'سينومي سنترز',          owned_code:'4240', owned_name:'سينومي ريتيل',           ownership_pct:51,    relation_type:'DIRECT',      layer:1, strength:10, owner_sector:'العقارات',         owned_sector:'التجزئة الكمالية', source:'Cenomi AR 2024',  verified:true  },
  { id:36, owner_code:'1120', owner_name:'الراجحي',               owned_code:'8230', owned_name:'تكافل الراجحي',          ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'البنوك',           owned_sector:'التأمين',          source:'Rajhi AR 2024',   verified:true  },
  { id:37, owner_code:'1120', owner_name:'الراجحي',               owned_code:'4340', owned_name:'الراجحي ريت',            ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  owner_sector:'البنوك',           owned_sector:'الصناديق العقارية', source:'Rajhi Capital',  verified:true  },
  { id:38, owner_code:'1150', owner_name:'الإنماء',               owned_code:'4345', owned_name:'إنماء ريت للتجزئة',      ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  owner_sector:'البنوك',           owned_sector:'الصناديق العقارية', source:'Alinma Capital', verified:true  },
  { id:39, owner_code:'1150', owner_name:'الإنماء',               owned_code:'4349', owned_name:'إنماء ريت الفندقي',      ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  owner_sector:'البنوك',           owned_sector:'الصناديق العقارية', source:'Alinma Capital', verified:true  },
  { id:40, owner_code:'1020', owner_name:'الجزيرة',               owned_code:'8012', owned_name:'جزيرة تكافل',            ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'البنوك',           owned_sector:'التأمين',          source:'AlJazira AR 2024', verified:true },
  { id:41, owner_code:'1020', owner_name:'الجزيرة',               owned_code:'4331', owned_name:'الجزيرة ريت',            ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  owner_sector:'البنوك',           owned_sector:'الصناديق العقارية', source:'AlJazira Cap', verified:true  },
  { id:42, owner_code:'GOSI', owner_name:'مؤسسة التأمينات',       owned_code:'8010', owned_name:'التعاونية',              ownership_pct:22.8,  relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'حكومي',           owned_sector:'التأمين',          source:'GOSI AR 2024',    verified:true  },
  { id:43, owner_code:'GOSI', owner_name:'مؤسسة التأمينات',       owned_code:'8210', owned_name:'بوبا العربية',           ownership_pct:10,    relation_type:'DIRECT',      layer:1, strength:5,  owner_sector:'حكومي',           owned_sector:'التأمين',          source:'GOSI AR 2024',    verified:true  },
  { id:44, owner_code:'GPFF', owner_name:'مؤسسة التقاعد',         owned_code:'8010', owned_name:'التعاونية',              ownership_pct:23.7,  relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'حكومي',           owned_sector:'التأمين',          source:'GPFF AR 2024',    verified:true  },
  { id:45, owner_code:'6018', owner_name:'الأندية للرياضة',        owned_code:'1830', owned_name:'لجام للرياضة',           ownership_pct:15,    relation_type:'DIRECT',      layer:1, strength:5,  owner_sector:'الخدمات الاستهلاكية', owned_sector:'الخدمات الاستهلاكية', source:'Annual Report', verified:true },
  { id:46, owner_code:'2250', owner_name:'المجموعة السعودية',      owned_code:'2210', owned_name:'نماء للكيماويات',        ownership_pct:20,    relation_type:'DIRECT',      layer:1, strength:6,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SIIG AR 2024',    verified:true  },
  { id:47, owner_code:'2250', owner_name:'المجموعة السعودية',      owned_code:'2220', owned_name:'معدنية',                 ownership_pct:30,    relation_type:'DIRECT',      layer:1, strength:8,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SIIG AR 2024',    verified:true  },
  { id:48, owner_code:'2082', owner_name:'أكوا باور',              owned_code:'2080', owned_name:'الغاز',                  ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:3,  owner_sector:'المرافق العامة',  owned_sector:'المرافق العامة',  source:'ACWA contracts',  verified:true  },
  { id:49, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2030', owned_name:'المصافي',                ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  owner_sector:'الطاقة',          owned_sector:'الطاقة',           source:'Aramco supplier', verified:true  },
  { id:50, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2381', owned_name:'الحفر العربية',          ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  owner_sector:'الطاقة',          owned_sector:'الطاقة',           source:'Aramco drilling', verified:true  },
  { id:51, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2190', owned_name:'سيسكو القابضة',          ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  owner_sector:'الطاقة',          owned_sector:'النقل',            source:'Aramco services', verified:true  },
  { id:52, owner_code:'2222', owner_name:'أرامكو السعودية',       owned_code:'2382', owned_name:'أديس',                   ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:6,  owner_sector:'الطاقة',          owned_sector:'الطاقة',           source:'Aramco drilling', verified:true  },
  { id:53, owner_code:'2010', owner_name:'سابك',                  owned_code:'2210', owned_name:'نماء للكيماويات',        ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'SABIC supplier',  verified:true  },
  { id:54, owner_code:'2280', owner_name:'المراعي',               owned_code:'4061', owned_name:'أنعام القابضة',          ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'إنتاج الأغذية',   owned_sector:'التجزئة الاستهلاكية', source:'Beta مشترك',   verified:false },
  { id:55, owner_code:'7010', owner_name:'اس تي سي',             owned_code:'7203', owned_name:'علم',                    ownership_pct:0,     relation_type:'OPERATIONAL', layer:3, strength:5,  owner_sector:'الاتصالات',        owned_sector:'تقنية',            source:'STC contracts',   verified:true  },
  { id:56, owner_code:'4013', owner_name:'سليمان الحبيب',         owned_code:'4004', owned_name:'دله الصحية',             ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'الرعاية الصحية',  owned_sector:'الرعاية الصحية',  source:'Beta مشترك',      verified:false },
  { id:57, owner_code:'4004', owner_name:'دله الصحية',            owned_code:'4017', owned_name:'فقيه الطبية',            ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'الرعاية الصحية',  owned_sector:'الرعاية الصحية',  source:'Beta مشترك',      verified:false },
  { id:58, owner_code:'3030', owner_name:'أسمنت السعودية',        owned_code:'3020', owned_name:'أسمنت اليمامة',          ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'Beta مشترك',      verified:false },
  { id:59, owner_code:'3020', owner_name:'أسمنت اليمامة',         owned_code:'3010', owned_name:'أسمنت العربية',          ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'المواد الأساسية', owned_sector:'المواد الأساسية',  source:'Beta مشترك',      verified:false },
  { id:60, owner_code:'7010', owner_name:'اس تي سي',             owned_code:'7030', owned_name:'زين السعودية',           ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'الاتصالات',        owned_sector:'الاتصالات',        source:'Beta مشترك',      verified:false },
  { id:61, owner_code:'7010', owner_name:'اس تي سي',             owned_code:'7020', owned_name:'اتحاد اتصالات موبايلي',  ownership_pct:0,     relation_type:'SENTIMENT',   layer:4, strength:3,  owner_sector:'الاتصالات',        owned_sector:'الاتصالات',        source:'Beta مشترك',      verified:false },
]

// ══════════════════════════════════════════════════════════════════
// قاموس الأخبار — 13 نوع + λ
// المعادلة: T(t) = e^(-λt)
// ══════════════════════════════════════════════════════════════════
const NEWS_DICT = [
  { type_id:'EARNINGS_BEAT',    name_ar:'أرباح أفضل من التوقعات',          direction:'POSITIVE', lambda:2.0, half_life_hrs:8,   default_s:1.8 },
  { type_id:'EARNINGS_MISS',    name_ar:'أرباح دون التوقعات',              direction:'NEGATIVE', lambda:2.0, half_life_hrs:8,   default_s:1.8 },
  { type_id:'RATE_HIKE',        name_ar:'رفع سعر الفائدة',                 direction:'POSITIVE', lambda:0.4, half_life_hrs:41,  default_s:1.3 },
  { type_id:'RATE_CUT',         name_ar:'خفض سعر الفائدة',                 direction:'POSITIVE', lambda:0.4, half_life_hrs:41,  default_s:1.3 },
  { type_id:'OIL_UP',           name_ar:'ارتفاع أسعار النفط +10%',         direction:'POSITIVE', lambda:1.0, half_life_hrs:17,  default_s:1.5 },
  { type_id:'OIL_DOWN',         name_ar:'انخفاض أسعار النفط -10%',         direction:'NEGATIVE', lambda:1.0, half_life_hrs:17,  default_s:1.5 },
  { type_id:'MAJOR_CONTRACT',   name_ar:'عقد حكومي كبير رؤية 2030',        direction:'POSITIVE', lambda:0.5, half_life_hrs:33,  default_s:2.0 },
  { type_id:'OPEC_CUT',         name_ar:'قرار أوبك+ تخفيض الإنتاج',        direction:'POSITIVE', lambda:1.0, half_life_hrs:17,  default_s:1.3 },
  { type_id:'OWNERSHIP_CHANGE', name_ar:'تغيير هيكل ملكية / استحواذ',      direction:'POSITIVE', lambda:0.1, half_life_hrs:168, default_s:2.5 },
  { type_id:'DIVIDEND',         name_ar:'إعلان توزيعات أرباح استثنائية',   direction:'POSITIVE', lambda:2.0, half_life_hrs:8,   default_s:1.2 },
  { type_id:'GUIDANCE_UP',      name_ar:'رفع التوقعات المستقبلية',          direction:'POSITIVE', lambda:0.3, half_life_hrs:55,  default_s:1.6 },
  { type_id:'REGULATORY',       name_ar:'قرار تنظيمي / رخصة تشغيل',        direction:'POSITIVE', lambda:0.2, half_life_hrs:84,  default_s:1.4 },
  { type_id:'GENERAL',          name_ar:'خبر عام',                          direction:'NEUTRAL',  lambda:1.0, half_life_hrs:17,  default_s:1.0 },
]

// ══════════════════════════════════════════════════════════════════
// معلومات الأسهم المختصرة للحسابات
// ══════════════════════════════════════════════════════════════════
const STOCK_INFO: Record<string, { name: string; sector: string; liquidity: number }> = {
  '2222':{ name:'أرامكو السعودية',        sector:'الطاقة',            liquidity:1.0 },
  '2010':{ name:'سابك',                   sector:'المواد الأساسية',   liquidity:1.0 },
  '2290':{ name:'ينساب',                  sector:'المواد الأساسية',   liquidity:0.9 },
  '2223':{ name:'لوبريف',                 sector:'المواد الأساسية',   liquidity:0.9 },
  '2380':{ name:'بترو رابغ',              sector:'الطاقة',            liquidity:0.9 },
  '2020':{ name:'سابك للمغذيات الزراعية', sector:'المواد الأساسية',   liquidity:1.0 },
  '2350':{ name:'كيان السعودية',          sector:'المواد الأساسية',   liquidity:0.9 },
  '2310':{ name:'سبكيم العالمية',         sector:'المواد الأساسية',   liquidity:0.9 },
  '2330':{ name:'المتقدمة',               sector:'المواد الأساسية',   liquidity:0.9 },
  '2060':{ name:'التصنيع',                sector:'المواد الأساسية',   liquidity:0.8 },
  '2250':{ name:'المجموعة السعودية',      sector:'المواد الأساسية',   liquidity:0.8 },
  '2280':{ name:'المراعي',                sector:'إنتاج الأغذية',    liquidity:1.0 },
  '2050':{ name:'صافولا',                 sector:'إنتاج الأغذية',    liquidity:0.9 },
  '2281':{ name:'تنمية',                  sector:'إنتاج الأغذية',    liquidity:0.8 },
  '6002':{ name:'هرفي للأغذية',           sector:'الخدمات الاستهلاكية', liquidity:0.8 },
  '1180':{ name:'البنك الأهلي',           sector:'البنوك',            liquidity:1.0 },
  '1060':{ name:'الأول SAB',              sector:'البنوك',            liquidity:0.9 },
  '1182':{ name:'أملاك',                  sector:'الخدمات المالية',   liquidity:0.8 },
  '1120':{ name:'الراجحي',                sector:'البنوك',            liquidity:1.0 },
  '8230':{ name:'تكافل الراجحي',          sector:'التأمين',           liquidity:0.8 },
  '4340':{ name:'الراجحي ريت',            sector:'الصناديق العقارية', liquidity:0.8 },
  '7010':{ name:'اس تي سي',              sector:'الاتصالات',         liquidity:1.0 },
  '7020':{ name:'اتحاد اتصالات موبايلي',  sector:'الاتصالات',         liquidity:0.9 },
  '7030':{ name:'زين السعودية',           sector:'الاتصالات',         liquidity:0.9 },
  '7203':{ name:'علم',                    sector:'التقنية',           liquidity:0.8 },
  '1211':{ name:'معادن',                  sector:'المواد الأساسية',   liquidity:1.0 },
  '1322':{ name:'أماك',                   sector:'المواد الأساسية',   liquidity:0.8 },
  '4013':{ name:'سليمان الحبيب',          sector:'الرعاية الصحية',    liquidity:0.9 },
  '4021':{ name:'المركز الكندي الطبي',    sector:'الرعاية الصحية',    liquidity:0.8 },
  '4321':{ name:'سينومي سنترز',           sector:'العقارات',          liquidity:0.9 },
  '4240':{ name:'سينومي ريتيل',           sector:'التجزئة الكمالية',  liquidity:0.8 },
  '8010':{ name:'التعاونية',              sector:'التأمين',           liquidity:0.9 },
  '8012':{ name:'جزيرة تكافل',            sector:'التأمين',           liquidity:0.8 },
  '8200':{ name:'الإعادة السعودية',       sector:'التأمين',           liquidity:0.8 },
  '8210':{ name:'بوبا العربية',           sector:'التأمين',           liquidity:0.8 },
  '1020':{ name:'الجزيرة',               sector:'البنوك',            liquidity:0.8 },
  '4331':{ name:'الجزيرة ريت',            sector:'الصناديق العقارية', liquidity:0.8 },
  '1150':{ name:'الإنماء',               sector:'البنوك',            liquidity:0.9 },
  '4345':{ name:'إنماء ريت للتجزئة',     sector:'الصناديق العقارية', liquidity:0.8 },
  '4349':{ name:'إنماء ريت الفندقي',      sector:'الصناديق العقارية', liquidity:0.8 },
  '2082':{ name:'أكوا باور',              sector:'المرافق العامة',    liquidity:1.0 },
  '2080':{ name:'الغاز',                  sector:'المرافق العامة',    liquidity:0.8 },
  '1111':{ name:'تداول',                  sector:'الخدمات المالية',   liquidity:1.0 },
  '2030':{ name:'المصافي',                sector:'الطاقة',            liquidity:0.8 },
  '2381':{ name:'الحفر العربية',          sector:'الطاقة',            liquidity:0.8 },
  '2382':{ name:'أديس',                   sector:'الطاقة',            liquidity:0.8 },
  '2190':{ name:'سيسكو القابضة',          sector:'النقل',             liquidity:0.8 },
  '2210':{ name:'نماء للكيماويات',        sector:'المواد الأساسية',   liquidity:0.8 },
  '2220':{ name:'معدنية',                 sector:'المواد الأساسية',   liquidity:0.8 },
  '4061':{ name:'أنعام القابضة',          sector:'التجزئة الاستهلاكية', liquidity:0.8 },
  '4004':{ name:'دله الصحية',             sector:'الرعاية الصحية',    liquidity:0.8 },
  '4017':{ name:'فقيه الطبية',            sector:'الرعاية الصحية',    liquidity:0.8 },
  '3030':{ name:'أسمنت السعودية',         sector:'المواد الأساسية',   liquidity:0.8 },
  '3020':{ name:'أسمنت اليمامة',          sector:'المواد الأساسية',   liquidity:0.8 },
  '3010':{ name:'أسمنت العربية',          sector:'المواد الأساسية',   liquidity:0.8 },
  '1830':{ name:'لجام للرياضة',           sector:'الخدمات الاستهلاكية', liquidity:0.8 },
  '6018':{ name:'الأندية للرياضة',        sector:'الخدمات الاستهلاكية', liquidity:0.8 },
  '6060':{ name:'الشرقية للتنمية',        sector:'إنتاج الأغذية',    liquidity:0.8 },
  '6070':{ name:'الجوف الزراعية',         sector:'إنتاج الأغذية',    liquidity:0.8 },
}

// ══════════════════════════════════════════════════════════════════
// محرك الحساب — المعادلة الكاملة
// Impact(B) = Base(A) × Ownership% × S × M × T(t) × L
// ══════════════════════════════════════════════════════════════════
const LAYER_DECAY: Record<number, number> = { 1:1.0, 2:0.7, 3:0.5, 4:0.25 }
const MKT_MULT: Record<string, number>    = { RISK_ON:1.3, NEUTRAL:1.0, RISK_OFF:0.7 }

function classifyNewsText(text: string): { type:string; name_ar:string; suggestedS:number; confidence:number; lambda:number } {
  const rules = [
    { p:/أرباح.{0,20}(فاق|تجاوز|أفضل|ارتفع|نما|قفز|قياسي)/i,   type:'EARNINGS_BEAT',    s:1.8 },
    { p:/أرباح.{0,20}(دون|تراجع|انخفض|خسارة|هبط|أقل من)/i,     type:'EARNINGS_MISS',    s:1.8 },
    { p:/(رفع|زيادة|ارتفاع).{0,10}(الفائدة)/i,                   type:'RATE_HIKE',        s:1.3 },
    { p:/(خفض|تخفيض|تراجع).{0,10}(الفائدة)/i,                   type:'RATE_CUT',         s:1.3 },
    { p:/(ارتفع|صعد|قفز).{0,15}(النفط|برنت|الخام)/i,            type:'OIL_UP',           s:1.5 },
    { p:/(انخفض|تراجع|هبط).{0,15}(النفط|برنت|الخام)/i,          type:'OIL_DOWN',         s:1.5 },
    { p:/(عقد|مشروع|ترسية).{0,20}(مليار|ضخم|رؤية 2030)/i,       type:'MAJOR_CONTRACT',   s:2.0 },
    { p:/أوبك.{0,20}(تخفيض|خفض).{0,15}(إنتاج)/i,               type:'OPEC_CUT',         s:1.3 },
    { p:/(استحواذ|اندماج|شراء.{0,10}حصة)/i,                      type:'OWNERSHIP_CHANGE', s:2.5 },
    { p:/(توزيعات|أرباح نقدية).{0,20}(استثنائي|إضافي)/i,         type:'DIVIDEND',         s:1.2 },
    { p:/(رفع|تحسين).{0,15}(التوقعات|الأهداف)/i,                 type:'GUIDANCE_UP',      s:1.6 },
    { p:/(رخصة|موافقة|قرار).{0,15}(هيئة|وزارة|تنظيمي)/i,        type:'REGULATORY',       s:1.4 },
  ]
  for (const r of rules) {
    if (r.p.test(text)) {
      const nt = NEWS_DICT.find(n => n.type_id === r.type)
      return { type:r.type, name_ar:nt?.name_ar??r.type, suggestedS:r.s, confidence:0.8, lambda:nt?.lambda??1.0 }
    }
  }
  return { type:'GENERAL', name_ar:'خبر عام', suggestedS:1.0, confidence:0.3, lambda:1.0 }
}

function calcImpact(params: {
  originCode: string; baseImpact: number; S: number; M: string
  hoursElapsed: number; lambda: number; maxDepth?: number; minThreshold?: number
}) {
  const { originCode, baseImpact, S, M, hoursElapsed, lambda, maxDepth=3, minThreshold=0.1 } = params
  const Mv  = MKT_MULT[M] ?? 1.0
  const T   = Math.exp(-lambda * hoursElapsed)
  const visited = new Set([originCode])
  const results: any[] = []

  const originInfo = STOCK_INFO[originCode]
  results.push({
    rank:1, stockCode:originCode, stockName:originInfo?.name??originCode,
    sector:originInfo?.sector??'—', impactPct:baseImpact,
    direction: baseImpact>0?'POSITIVE':baseImpact<0?'NEGATIVE':'NEUTRAL',
    relationType:'ORIGIN', layer:0, ownershipPct:null, effectiveOwn:1.0,
    timeframeLabel:'فوري — ثوانٍ',
    path:[originCode],
    formula:`${baseImpact}% × 1.0 × S${S} × M${Mv} × T${T.toFixed(2)} × L1.0`,
  })

  const queue: Array<{code:string; cumOwn:number; depth:number; path:string[]}> = [
    { code:originCode, cumOwn:1.0, depth:0, path:[originCode] },
  ]

  while (queue.length > 0) {
    const { code, cumOwn, depth, path } = queue.shift()!
    if (depth >= maxDepth) continue

    const rels = NETWORK_RELATIONS.filter(r => r.owner_code === code)
    for (const rel of rels) {
      if (visited.has(rel.owned_code)) continue
      visited.add(rel.owned_code)

      const ownerRatio   = rel.ownership_pct > 0 ? rel.ownership_pct/100 : 0.35
      const effOwn       = cumOwn * ownerRatio * LAYER_DECAY[rel.layer]
      const stockInfo    = STOCK_INFO[rel.owned_code]
      const L            = stockInfo?.liquidity ?? 1.0
      // المعادلة: Impact(B) = Base(A) × Ownership% × S × M × T(t) × L
      const impact       = baseImpact * effOwn * S * Mv * T * L

      if (Math.abs(impact) < minThreshold) continue

      const timeMap: Record<number,string> = { 0:'فوري', 1:'< ساعة', 2:'ساعات', 3:'يوم-يومين', 4:'أيام' }
      const newPath = [...path, rel.owned_code]

      results.push({
        rank:0, stockCode:rel.owned_code,
        stockName:stockInfo?.name??rel.owned_name,
        sector:stockInfo?.sector??rel.owned_sector,
        impactPct:parseFloat(impact.toFixed(4)),
        direction: impact>0?'POSITIVE':impact<0?'NEGATIVE':'NEUTRAL',
        relationType:rel.relation_type, layer:rel.layer,
        ownershipPct:rel.ownership_pct>0?rel.ownership_pct:null,
        effectiveOwn:parseFloat(effOwn.toFixed(4)),
        timeframeLabel: timeMap[rel.layer]??'أيام',
        path:newPath,
        formula:`${baseImpact}%×${effOwn.toFixed(3)}×S${S}×M${Mv}×T${T.toFixed(2)}×L${L}`,
        strength:rel.strength,
      })

      if (rel.layer <= 2) queue.push({ code:rel.owned_code, cumOwn:effOwn, depth:depth+1, path:newPath })
    }
  }

  results.sort((a,b) => Math.abs(b.impactPct) - Math.abs(a.impactPct))
  results.forEach((r,i) => { r.rank = i+1 })
  return results
}

// ══════════════════════════════════════════════════════════════════
// المكوّن الرئيسي
// ══════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const router  = useRouter()
  const session = useAuthStore(s => s.session)
  const logout  = useAuthStore(s => s.logout)

  // ── حالة الأصلية ──────────────────────────────────────────────
  const [tab,      setTab]      = useState(0)
  const [dirty,    setDirty]    = useState(false)
  const [saveMsg,  setSaveMsg]  = useState('')
  const [codes,    setCodes]    = useState<any[]>([])
  const [subs,     setSubs]     = useState<any[]>([])
  const [history,  setHistory]  = useState<any[]>([])
  const [apiKey,   setApiKey]   = useState('')
  const [apiMsg,   setApiMsg]   = useState('')
  const [codeForm, setCodeForm] = useState({ code:'', note:'', expiry:'' })
  const [codeMsg,  setCodeMsg]  = useState('')
  const [pwdForm,  setPwdForm]  = useState({ old:'', new1:'', new2:'' })
  const [pwdMsg,   setPwdMsg]   = useState('')
  const [admins,   setAdmins]   = useState<Array<{username:string;role:string}>>([])
  const [newAdmin, setNewAdmin] = useState({ username:'', password:'', confirm:'' })
  const [adminMsg, setAdminMsg] = useState('')

  // ── حالة نظام تأثير الأخبار (تابات 10-16) ────────────────────
  const [marketState,   setMarketStateVal] = useState<'RISK_ON'|'NEUTRAL'|'RISK_OFF'>('NEUTRAL')
  const [impactLogs,    setImpactLogs]     = useState<any[]>([])
  const [niStockSearch, setNiStockSearch]  = useState('')
  const [niSelCode,     setNiSelCode]      = useState('')
  const [niSelName,     setNiSelName]      = useState('')
  const [niBaseImpact,  setNiBaseImpact]   = useState(5)
  const [niSValue,      setNiSValue]       = useState(1.0)
  const [niMktState,    setNiMktState]     = useState<'RISK_ON'|'NEUTRAL'|'RISK_OFF'>('NEUTRAL')
  const [niHours,       setNiHours]        = useState(0)
  const [niMaxDepth,    setNiMaxDepth]     = useState(3)
  const [niThreshold,   setNiThreshold]    = useState(0.1)
  const [niNewsText,    setNiNewsText]     = useState('')
  const [niNewsType,    setNiNewsType]     = useState('')
  const [niAutoType,    setNiAutoType]     = useState('')
  const [niResults,     setNiResults]      = useState<any[]|null>(null)
  const [niLoading,     setNiLoading]      = useState(false)
  const [niSaveMsg,     setNiSaveMsg]      = useState('')
  const [niShowDrop,    setNiShowDrop]     = useState(false)
  const [netFilter,     setNetFilter]      = useState('')
  const [netTypeFilter, setNetTypeFilter]  = useState('')
  const [netRelations,  setNetRelations]   = useState(NETWORK_RELATIONS.map(r=>({...r})))
  const [netShowModal,  setNetShowModal]   = useState(false)
  const [netEditRow,    setNetEditRow]     = useState<any>(null)
  const [netForm,       setNetForm]        = useState<any>({})
  const [netMsg,        setNetMsg]         = useState('')
  const [dictRows,      setDictRows]       = useState(NEWS_DICT.map(r=>({...r})))
  const [dictEditId,    setDictEditId]     = useState<string|null>(null)
  const [dictEditData,  setDictEditData]   = useState<any>({})
  const [dictTestText,  setDictTestText]   = useState('')
  const [dictTestRes,   setDictTestRes]    = useState<any>(null)
  const [dictMsg,       setDictMsg]        = useState('')
  const [stkSearch,     setStkSearch]      = useState('')
  const [stkMkt,        setStkMkt]         = useState('')
  const [stkPage,       setStkPage]        = useState(0)
  const [logFrom,       setLogFrom]        = useState('')
  const [logTo,         setLogTo]          = useState('')
  const [logStock,      setLogStock]       = useState('')
  const [logExpanded,   setLogExpanded]    = useState<string|null>(null)
  const [scnCode,       setScnCode]        = useState('2222')
  const [scnImpact,     setScnImpact]      = useState(5)
  const [scnText,       setScnText]        = useState('')
  const [scnResults,    setScnResults]     = useState<any>(null)
  const [scnLoading,    setScnLoading]     = useState(false)

  const classifyTimer = useRef<NodeJS.Timeout>()
  const dropRef       = useRef<HTMLDivElement>(null)

  // ── حساب الإحصائيات ───────────────────────────────────────────
  const allStocks   = SECTOR_ORDER.flatMap(sec => (DB[sec]?.stocks??[]).map(s=>({...s,sector:sec})))
  const allKeywords = SECTOR_ORDER.flatMap(sec => (DB[sec]?.kw??[]).map(kw=>({kw,sector:sec})))
  const stats = {
    analyses: history.length, keywords: allKeywords.length,
    stocks: allStocks.length, sectors: SECTOR_ORDER.length,
    codes: codes.length, subs: subs.length,
  }

  // ── useEffect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!session || session.plan !== 'admin') { router.push('/admin'); return }
    setApiKey(localStorage.getItem('anthropic_key') || '')
    setHistory(readHistory())
    const ms = localStorage.getItem('mw_market_state') as any
    if (ms && ['RISK_ON','NEUTRAL','RISK_OFF'].includes(ms)) setMarketStateVal(ms)
    loadCodes(); loadSubs(); loadAdmins(); loadImpactLogs()
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setNiShowDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── دوال التحميل ──────────────────────────────────────────────
  const loadCodes = async () => {
    try { const r=await fetch('/api/codes'); const d=await r.json(); setCodes(d.data||[]) } catch {}
  }
  const loadSubs = async () => {
    try { const r=await fetch('/api/subscribers'); const d=await r.json(); setSubs(d.data||[]) } catch {}
  }
  const loadAdmins = async () => {
    try {
      const r=await fetch('/api/admins'); const d=await r.json()
      if(d.success) setAdmins(d.data.map((a:any)=>({ username:a.username, role:a.role==='main'?'رئيسي':'فرعي' })))
    } catch {}
  }
  const loadImpactLogs = async () => {
    try {
      let url = '/api/news-impact/log?limit=50'
      if (logFrom)  url += `&from=${logFrom}`
      if (logTo)    url += `&to=${logTo}`
      if (logStock) url += `&stock=${logStock}`
      const r=await fetch(url); const d=await r.json()
      if(d.success) setImpactLogs(d.data||[])
    } catch { setImpactLogs([]) }
  }

  // ── دوال الأصلية ──────────────────────────────────────────────
  const handleSave = () => {
    localStorage.setItem('anthropic_key', apiKey)
    setDirty(false); setSaveMsg('✅ تم الحفظ')
    setTimeout(()=>setSaveMsg(''),2500)
  }
  const handleExport = () => {
    const data = { exportedAt:new Date().toISOString(), stats, history:history.slice(0,50), codes }
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href=url; a.download=`mawja-export-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  const handleReset = () => {
    if(!confirm('سيتم مسح سجل التحليلات المحلي. متابعة؟')) return
    clearHistory(); setHistory([])
  }
  const genCode = () => {
    const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const r=(n:number)=>Array.from({length:n},()=>c[Math.floor(Math.random()*c.length)]).join('')
    setCodeForm(f=>({...f,code:`MW-${r(4)}-${r(4)}`}))
  }
  const addCode = async () => {
    if(!codeForm.code) return
    const r=await fetch('/api/codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',code:codeForm.code,note:codeForm.note,expiry:codeForm.expiry||undefined})})
    const d=await r.json()
    if(d.success){setCodeMsg('✅ تم الإضافة');setCodeForm({code:'',note:'',expiry:''});loadCodes()}
    else setCodeMsg('❌ '+d.error)
    setTimeout(()=>setCodeMsg(''),3000)
  }
  const toggleCode = async (code:string) => {
    await fetch('/api/codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'toggle',code})})
    loadCodes()
  }
  const deleteCode = async (code:string) => {
    if(!confirm('حذف الكود؟')) return
    await fetch('/api/codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',code})})
    loadCodes()
  }
  const saveApiKey = () => {
    localStorage.setItem('anthropic_key',apiKey)
    setApiMsg('✅ تم حفظ المفتاح'); setTimeout(()=>setApiMsg(''),3000)
  }
  const addAdmin = async () => {
    if(!newAdmin.username||!newAdmin.password) return
    if(newAdmin.password!==newAdmin.confirm){setAdminMsg('❌ كلمتا المرور غير متطابقتين');return}
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(newAdmin.password))
    const ph=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
    const r=await fetch('/api/admins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',username:newAdmin.username,password_hash:ph,role:'sub'})})
    const d=await r.json()
    if(d.success){setAdminMsg('✅ تم إضافة الأدمن');setNewAdmin({username:'',password:'',confirm:''});loadAdmins()}
    else setAdminMsg('❌ '+d.error)
    setTimeout(()=>setAdminMsg(''),3000)
  }
  const removeAdmin = async (username:string) => {
    if(!confirm('حذف الأدمن؟')) return
    const r=await fetch('/api/admins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',username})})
    const d=await r.json()
    if(d.success) loadAdmins(); else alert('❌ '+d.error)
  }

  // ── دوال نظام تأثير الأخبار ───────────────────────────────────
  const handleNiTextChange = (text: string) => {
    setNiNewsText(text)
    clearTimeout(classifyTimer.current)
    if(text.length>15) {
      classifyTimer.current = setTimeout(()=>{
        const r = classifyNewsText(text)
        if(r.confidence>0.5){ setNiAutoType(r.name_ar); setNiNewsType(r.type); setNiSValue(r.suggestedS) }
      }, 500)
    }
  }

  const handleNiCalculate = () => {
    if(!niSelCode){ alert('اختر السهم الأصلي'); return }
    setNiLoading(true); setNiResults(null)
    const classification = niNewsText ? classifyNewsText(niNewsText) : { lambda: NEWS_DICT.find(n=>n.type_id===niNewsType)?.lambda??1.0 }
    const results = calcImpact({
      originCode: niSelCode, baseImpact: niBaseImpact,
      S: niSValue, M: niMktState,
      hoursElapsed: niHours, lambda: classification.lambda,
      maxDepth: niMaxDepth, minThreshold: niThreshold,
    })
    setTimeout(()=>{ setNiResults(results); setNiLoading(false) }, 100)
  }

  const handleNiSave = async () => {
    if(!niResults) return
    try {
      const r = await fetch('/api/news-impact/log',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          meta:{ requestId:`ni-${Date.now()}`, timestamp:new Date().toISOString(),
            originStock:{code:niSelCode,name:niSelName}, baseImpact:niBaseImpact,
            parameters:{S:niSValue,M:MKT_MULT[niMktState],T:1.0,marketState:niMktState},
            newsClassification:classifyNewsText(niNewsText),
            totalAffected:niResults.length, processingMs:0 },
          impacts:niResults, newsText:niNewsText,
        }),
      })
      const d = await r.json()
      setNiSaveMsg(d.success?'✅ تم الحفظ':'❌ '+d.error)
      if(d.success) loadImpactLogs()
    } catch { setNiSaveMsg('❌ خطأ') }
    setTimeout(()=>setNiSaveMsg(''),3000)
  }

  const handleScnCompare = () => {
    setScnLoading(true)
    const cls = scnText ? classifyNewsText(scnText) : { lambda:1.0 }
    const base        = calcImpact({ originCode:scnCode, baseImpact:scnImpact, S:1.0, M:'NEUTRAL',  hoursElapsed:0, lambda:cls.lambda })
    const optimistic  = calcImpact({ originCode:scnCode, baseImpact:scnImpact, S:2.0, M:'RISK_ON',  hoursElapsed:0, lambda:cls.lambda })
    const pessimistic = calcImpact({ originCode:scnCode, baseImpact:scnImpact, S:0.5, M:'RISK_OFF', hoursElapsed:0, lambda:cls.lambda })
    setTimeout(()=>{ setScnResults({base:base.slice(0,10),optimistic:optimistic.slice(0,10),pessimistic:pessimistic.slice(0,10)}); setScnLoading(false) },100)
  }

  const exportLogCSV = () => {
    const header=['ID','الوقت','الخبر','السهم','Base%','S','M','المتأثرة']
    const rows=impactLogs.map(l=>[l.log_id?.slice(0,8),new Date(l.timestamp).toLocaleString('ar-SA'),`"${(l.news_text??'').slice(0,40).replace(/"/g,"'")}"`,l.origin_stock,l.base_impact,l.s_factor,l.m_factor,l.total_affected])
    const csv=[header,...rows].map(r=>r.join(',')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`impact-log-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  // ── قائمة الأسهم للـ dropdown ─────────────────────────────────
  const allStocksForDrop = SECTOR_ORDER.flatMap(sec=>(DB[sec]?.stocks??[]).map(s=>({code:s.t,name:s.n,sector:DB[sec]?.label??sec})))
  const filteredStocks   = allStocksForDrop.filter(s=>s.code.includes(niStockSearch)||s.name.includes(niStockSearch)).slice(0,8)

  // ── λ للنوع المختار ───────────────────────────────────────────
  const selectedLambda = NEWS_DICT.find(n=>n.type_id===niNewsType)?.lambda ?? 1.0
  const Tval           = Math.exp(-selectedLambda * niHours)
  const previewImpact  = niBaseImpact * niSValue * MKT_MULT[niMktState] * Tval

  // ══════════════════════════════════════════════════════════════
  // الـ Styles
  // ══════════════════════════════════════════════════════════════
  const pg: React.CSSProperties = { minHeight:'100vh', background:'#0D1117', color:'#E6EDF3', fontFamily:'Tajawal, Cairo, sans-serif', direction:'rtl' }
  const hdr: React.CSSProperties = { background:'#161B22', borderBottom:'1px solid #30363D', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }
  const tabBarSt: React.CSSProperties = { background:'#161B22', borderBottom:'1px solid #30363D', display:'flex', overflowX:'auto', padding:'0 8px' }
  const tabBtn = (active: boolean, isNew?: boolean): React.CSSProperties => ({
    padding:'12px 14px', border:'none', background:'transparent',
    color: active ? '#00E5FF' : isNew ? '#FF7A1A99' : '#8B949E',
    borderBottom: active ? '2px solid #00E5FF' : isNew ? '2px solid #FF7A1A44' : '2px solid transparent',
    cursor:'pointer', whiteSpace:'nowrap', fontSize:'0.78rem',
    fontWeight: active ? '700' : '400', fontFamily:'inherit',
  })
  const card: React.CSSProperties = { background:'#161B22', border:'1px solid #30363D', borderRadius:'12px', padding:'20px' }
  const inp: React.CSSProperties  = { padding:'10px 12px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'8px', color:'#E6EDF3', fontSize:'0.85rem', fontFamily:'inherit', width:'100%', boxSizing:'border-box' as const, outline:'none' }
  const sinp: React.CSSProperties = { padding:'7px 10px', background:'#0D1117', border:'1px solid #30363D', borderRadius:'6px', color:'#E6EDF3', fontSize:'0.8rem', fontFamily:'inherit', boxSizing:'border-box' as const, outline:'none' }
  const btn  = (color='#00E5FF',text='#0D1117'): React.CSSProperties => ({ padding:'8px 20px', background:color, color:text, border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'700', fontFamily:'inherit' })
  const th: React.CSSProperties   = { padding:'9px 12px', textAlign:'right' as const, color:'#8B949E', fontWeight:'600', fontSize:'0.73rem', borderBottom:'1px solid #30363D', whiteSpace:'nowrap' as const }
  const td: React.CSSProperties   = { padding:'9px 12px', fontSize:'0.8rem', borderBottom:'1px solid #21262D', verticalAlign:'middle' as const }
  const lbl: React.CSSProperties  = { display:'block', color:'#8B949E', fontSize:'0.73rem', marginBottom:'4px', fontWeight:'600' }

  const MKT_CFG = {
    RISK_ON:  { label:'صاعد ▲',  color:'#00D47A', M:1.3 },
    NEUTRAL:  { label:'محايد ◎', color:'#F0C93A', M:1.0 },
    RISK_OFF: { label:'هابط ▼',  color:'#FF3355', M:0.7 },
  }
  const LAYER_COLOR: Record<number,string> = { 0:'#00E5FF', 1:'#00D47A', 2:'#F0C93A', 3:'#FF7A1A', 4:'#9B6EFF' }
  const LAYER_LABEL: Record<number,string> = { 0:'أصلي', 1:'مباشر', 2:'غير مباشر', 3:'تشغيلي', 4:'معنوي' }
  const TYPE_COLOR: Record<string,string>  = { DIRECT:'#00D47A', INDIRECT:'#F0C93A', OPERATIONAL:'#FF7A1A', SENTIMENT:'#9B6EFF', ORIGIN:'#00E5FF' }
  const DIR_COLOR: Record<string,string>   = { POSITIVE:'#00D47A', NEGATIVE:'#FF3355', NEUTRAL:'#F0C93A', ORIGIN:'#00E5FF' }

  const PER_PAGE   = 30
  const stkFiltered= allStocksForDrop.filter(s=>(!stkSearch||(s.code.includes(stkSearch)||s.name.includes(stkSearch)))&&(!stkMkt||(s as any).market===stkMkt))
  const stkPages   = Math.ceil(stkFiltered.length/PER_PAGE)
  const stkDisplay = stkFiltered.slice(stkPage*PER_PAGE,(stkPage+1)*PER_PAGE)

  // ══════════════════════════════════════════════════════════════
  // الـ Render
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={pg}>

      {/* ─── Header ─── */}
      <div style={hdr}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ color:'#00E5FF', fontWeight:'800', fontSize:'1rem' }}>🌊 موجة الخبر</span>
          <span style={{ color:'#8B949E', fontSize:'0.75rem', border:'1px solid #30363D', padding:'2px 8px', borderRadius:'6px' }}>Admin Panel</span>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {saveMsg && <span style={{ color:'#00D47A', fontSize:'0.75rem' }}>{saveMsg}</span>}
          {dirty && !saveMsg && <span style={{ color:'#F0C93A', fontSize:'0.75rem' }}>⚠️ تغييرات غير محفوظة</span>}
          <button style={btn('#00D47A')} onClick={handleSave}>💾 حفظ</button>
          <button style={btn('#FF3355','#fff')} onClick={()=>{logout();router.push('/')}}>✕ إغلاق</button>
        </div>
      </div>

      {/* ─── Tab Bar ─── */}
      <div style={tabBarSt}>
        {TABS.map(t=>(
          <button key={t.id} style={tabBtn(tab===t.id,(t as any).isNew)} onClick={()=>setTab(t.id)}>
            {t.icon} {t.label}
            {(t as any).isNew && tab!==t.id && (
              <span style={{ marginRight:'3px', fontSize:'0.55rem', background:'#FF7A1A', color:'#fff', padding:'0 3px', borderRadius:'4px', verticalAlign:'super' }}>N</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Content ─── */}
      <div style={{ maxWidth:'1400px', margin:'0 auto', padding:'24px 16px' }}>

        {/* TAB 0: إحصائيات */}
        {tab===0 && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px', marginBottom:'24px' }}>
              {[
                {n:stats.analyses,l:'تحليل مسجّل',c:'#00E5FF'},
                {n:stats.keywords,l:'كلمة مفتاحية',c:'#00D47A'},
                {n:stats.stocks,  l:'سهم',c:'#FF7A1A'},
                {n:stats.sectors, l:'قطاع',c:'#9B6EFF'},
                {n:stats.codes,   l:'كود اشتراك',c:'#F0C93A'},
                {n:stats.subs,    l:'مشترك',c:'#00D47A'},
              ].map((x,i)=>(
                <div key={i} style={{...card,textAlign:'center'}}>
                  <div style={{fontSize:'2rem',fontWeight:'900',color:x.c,fontFamily:'monospace'}}>{x.n}</div>
                  <div style={{color:'#8B949E',fontSize:'0.75rem',marginTop:'4px'}}>{x.l}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
              <button style={btn('#00D47A')} onClick={handleSave}>💾 حفظ التغييرات</button>
              <button style={btn('#21262D','#8B949E')} onClick={handleExport}>📤 تصدير JSON</button>
              <button style={btn('#FF3355','#fff')} onClick={handleReset}>🔄 إعادة ضبط</button>
            </div>
          </div>
        )}

        {/* TAB 1: الأسهم */}
        {tab===1 && (
          <div>
            <h3 style={{color:'#00E5FF',margin:'0 0 16px'}}>📈 الأسهم ({allStocks.length} سهم)</h3>
            <div style={card}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr>{['الكود','اسم السهم','القطاع','التصنيف','الوزن'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {allStocks.map((s,i)=>(
                    <tr key={i}>
                      <td style={{...td,fontFamily:'monospace',color:'#00E5FF',fontWeight:'700'}}>{s.t}</td>
                      <td style={{...td,color:'#E6EDF3'}}>{s.n}</td>
                      <td style={td}><span style={{background:'#9B6EFF22',color:'#9B6EFF',padding:'2px 8px',borderRadius:'8px',fontSize:'0.72rem'}}>{DB[s.sector]?.icon} {DB[s.sector]?.label}</span></td>
                      <td style={{...td,color:'#8B949E',fontSize:'0.75rem'}}>{s.s}</td>
                      <td style={td}>
                        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                          <div style={{flex:1,height:'6px',background:'#21262D',borderRadius:'3px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${s.w}%`,background:s.w>=80?'#00D47A':s.w>=60?'#F0C93A':'#FF7A1A',borderRadius:'3px'}}/>
                          </div>
                          <span style={{fontFamily:'monospace',fontSize:'0.75rem',color:'#8B949E',minWidth:'28px'}}>{s.w}</span>
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
        {tab===2 && (
          <div>
            <h3 style={{color:'#00E5FF',margin:'0 0 16px'}}>🔤 الكلمات المفتاحية ({allKeywords.length} كلمة)</h3>
            {SECTOR_ORDER.map(sec=>(
              <div key={sec} style={{...card,marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                  <span style={{fontSize:'1.1rem'}}>{DB[sec].icon}</span>
                  <span style={{color:'#00E5FF',fontWeight:'700',fontSize:'0.9rem'}}>{DB[sec].label}</span>
                  <span style={{color:'#8B949E',fontSize:'0.75rem',background:'#21262D',padding:'2px 8px',borderRadius:'8px'}}>{DB[sec].kw.length} كلمة</span>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                  {DB[sec].kw.map((kw,i)=><span key={i} style={{background:'#21262D',color:'#E6EDF3',padding:'4px 10px',borderRadius:'20px',fontSize:'0.78rem',border:'1px solid #30363D'}}>{kw}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: علاقات القطاعات */}
        {tab===3 && (
          <div>
            <h3 style={{color:'#00E5FF',margin:'0 0 16px'}}>🔗 علاقات التأثير بين القطاعات</h3>
            {SECTOR_ORDER.map(sec=>{
              const rels=RELS[sec]; if(!rels) return null
              return (
                <div key={sec} style={{...card,marginBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
                    <span style={{fontSize:'1.1rem'}}>{DB[sec].icon}</span>
                    <span style={{color:'#00E5FF',fontWeight:'700'}}>{DB[sec].label}</span>
                    <span style={{color:'#8B949E',fontSize:'0.75rem'}}>يؤثر على:</span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                    {Object.entries(rels).sort((a,b)=>b[1]-a[1]).map(([target,weight])=>{
                      const pct=Math.round(weight*100); const col=pct>=80?'#00D47A':pct>=60?'#F0C93A':'#FF7A1A'
                      return (
                        <div key={target} style={{background:'#21262D',border:`1px solid ${col}33`,borderRadius:'8px',padding:'8px 12px',minWidth:'140px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                            <span style={{fontSize:'0.8rem',color:'#E6EDF3'}}>{DB[target]?.icon} {DB[target]?.label}</span>
                            <span style={{fontFamily:'monospace',fontSize:'0.8rem',fontWeight:'700',color:col}}>{pct}%</span>
                          </div>
                          <div style={{height:'4px',background:'#30363D',borderRadius:'2px'}}>
                            <div style={{height:'100%',width:`${pct}%`,background:col,borderRadius:'2px'}}/>
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
        {tab===4 && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{color:'#00E5FF',margin:0}}>📜 سجل التحليلات ({history.length})</h3>
              <div style={{display:'flex',gap:'8px'}}>
                <button style={btn()} onClick={()=>setHistory(readHistory())}>🔄 تحديث</button>
                <button style={btn('#FF3355','#fff')} onClick={handleReset}>🗑️ مسح الكل</button>
              </div>
            </div>
            {history.length===0
              ? <div style={{...card,textAlign:'center',padding:'48px',color:'#8B949E'}}>لا توجد تحليلات مسجلة بعد</div>
              : <div style={card}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr>{['العنوان','التوجه','الثقة','AI','التاريخ'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {history.slice(0,50).map((h:any,i:number)=>{
                        const dir=h.sentiment?.dir; const dc=dir==='pos'?'#00D47A':dir==='neg'?'#FF3355':'#F0C93A'; const dl=dir==='pos'?'↑ إيجابي':dir==='neg'?'↓ سلبي':'◎ محايد'
                        return (
                          <tr key={i}>
                            <td style={{...td,maxWidth:'300px'}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#E6EDF3'}}>{h.headline||h.text?.slice(0,60)||'—'}</div></td>
                            <td style={td}><span style={{color:dc,fontWeight:'700',fontSize:'0.78rem'}}>{dl}</span></td>
                            <td style={{...td,fontFamily:'monospace',color:'#8B949E'}}>{h.confidence??'—'}%</td>
                            <td style={td}>{h.usedAI?<span style={{color:'#9B6EFF',fontSize:'0.72rem'}}>✦ Claude</span>:<span style={{color:'#8B949E',fontSize:'0.72rem'}}>محلي</span>}</td>
                            <td style={{...td,color:'#8B949E',fontSize:'0.75rem',fontFamily:'monospace'}}>{h.ts?new Date(h.ts).toLocaleDateString('ar-SA'):'—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {/* TAB 5: إعدادات API */}
        {tab===5 && (
          <div style={{maxWidth:'520px'}}>
            <div style={card}>
              <h3 style={{color:'#00E5FF',marginBottom:'16px'}}>🔑 Anthropic API Key</h3>
              <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                <input style={{...inp,direction:'ltr'}} type="password" value={apiKey} onChange={e=>{setApiKey(e.target.value);setDirty(true)}} placeholder="sk-ant-api03-..."/>
                <button style={btn()} onClick={saveApiKey}>حفظ</button>
              </div>
              {apiMsg && <p style={{color:'#00D47A',fontSize:'0.8rem'}}>{apiMsg}</p>}
              <p style={{color:'#8B949E',fontSize:'0.75rem',marginTop:'8px'}}>{apiKey?'✅ مفتاح محفوظ: '+apiKey.slice(0,12)+'…':'❌ لا يوجد مفتاح'}</p>
            </div>
          </div>
        )}

        {/* TAB 6: الأمان */}
        {tab===6 && (
          <div style={{maxWidth:'420px'}}>
            <div style={card}>
              <h3 style={{color:'#00E5FF',marginBottom:'16px'}}>🔐 تغيير كلمة المرور</h3>
              {(['old','new1','new2'] as const).map((k,i)=>(
                <div key={k} style={{marginBottom:'12px'}}>
                  <label style={{display:'block',color:'#8B949E',fontSize:'0.75rem',marginBottom:'4px'}}>{i===0?'كلمة المرور الحالية':i===1?'كلمة المرور الجديدة':'تأكيد كلمة المرور'}</label>
                  <input style={inp} type="password" value={pwdForm[k]} onChange={e=>setPwdForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <button style={btn()} onClick={()=>{
                if(pwdForm.new1!==pwdForm.new2){setPwdMsg('❌ كلمتا المرور غير متطابقتين');return}
                if(pwdForm.new1.length<6){setPwdMsg('⚠️ 6 أحرف على الأقل');return}
                localStorage.setItem('mw_custom_pwd',pwdForm.new1); setPwdMsg('✅ تم الحفظ'); setPwdForm({old:'',new1:'',new2:''}); setTimeout(()=>setPwdMsg(''),3000)
              }}>🔒 تغيير</button>
              {pwdMsg && <p style={{color:pwdMsg.startsWith('✅')?'#00D47A':'#FF3355',fontSize:'0.8rem',marginTop:'8px'}}>{pwdMsg}</p>}
            </div>
          </div>
        )}

        {/* TAB 7: الأدمنز */}
        {tab===7 && (
          <div>
            <div style={{...card,marginBottom:'16px'}}>
              <h3 style={{color:'#00E5FF',marginBottom:'16px'}}>حسابات الأدمنز ({admins.length})</h3>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem'}}>
                <thead><tr>{['اسم المستخدم','الصلاحية','إجراء'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {admins.length===0?<tr><td colSpan={3} style={{textAlign:'center',padding:'24px',color:'#8B949E'}}>جارٍ التحميل...</td></tr>
                  :admins.map((a,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #21262D'}}>
                      <td style={{...td,fontFamily:'monospace',color:'#00E5FF'}}>{a.username}</td>
                      <td style={td}><span style={{background:a.role==='رئيسي'?'#00E5FF22':'#FF7A1A22',color:a.role==='رئيسي'?'#00E5FF':'#FF7A1A',padding:'2px 10px',borderRadius:'10px',fontSize:'0.7rem'}}>{a.role==='رئيسي'?'⭐ رئيسي':'👤 فرعي'}</span></td>
                      <td style={td}>{a.role==='رئيسي'?<span style={{color:'#8B949E',fontSize:'0.7rem'}}>محمي</span>:<button style={btn('#FF3355','#fff')} onClick={()=>removeAdmin(a.username)}>حذف</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={card}>
              <h3 style={{color:'#00E5FF',marginBottom:'16px'}}>➕ إضافة أدمن جديد</h3>
              {([{k:'username',l:'اسم المستخدم',t:'text'},{k:'password',l:'كلمة المرور',t:'password'},{k:'confirm',l:'تأكيد كلمة المرور',t:'password'}] as const).map(({k,l,t})=>(
                <div key={k} style={{marginBottom:'12px'}}>
                  <label style={{display:'block',color:'#8B949E',fontSize:'0.75rem',marginBottom:'4px'}}>{l}</label>
                  <input style={inp} type={t} value={newAdmin[k]} onChange={e=>setNewAdmin(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              <button style={btn()} onClick={addAdmin}>✅ إضافة</button>
              {adminMsg && <p style={{color:adminMsg.startsWith('✅')?'#00D47A':'#FF3355',fontSize:'0.8rem',marginTop:'8px'}}>{adminMsg}</p>}
            </div>
          </div>
        )}

        {/* TAB 8: أكواد الاشتراك */}
        {tab===8 && (
          <div>
            <div style={{...card,marginBottom:'16px'}}>
              <h3 style={{color:'#00E5FF',marginBottom:'16px'}}>إضافة كود جديد</h3>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px',alignItems:'flex-end'}}>
                <input style={{...inp,width:'180px',direction:'ltr',fontFamily:'monospace'}} value={codeForm.code} onChange={e=>setCodeForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="MW-XXXX-XXXX"/>
                <button style={{...btn('#21262D','#8B949E'),border:'1px solid #30363D'}} onClick={genCode}>🎲 توليد</button>
                <input style={{...inp,width:'160px'}} value={codeForm.note} onChange={e=>setCodeForm(f=>({...f,note:e.target.value}))} placeholder="ملاحظة"/>
                <input style={{...inp,width:'150px'}} type="date" value={codeForm.expiry} onChange={e=>setCodeForm(f=>({...f,expiry:e.target.value}))}/>
                <button style={btn()} onClick={addCode}>+ إضافة</button>
              </div>
              {codeMsg && <p style={{color:codeMsg.startsWith('✅')?'#00D47A':'#FF3355',fontSize:'0.8rem',marginTop:'8px'}}>{codeMsg}</p>}
            </div>
            <div style={card}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                <thead><tr>{['الكود','الملاحظة','الحالة','الانتهاء','المستخدم','إجراءات'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {codes.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'24px',color:'#8B949E'}}>لا توجد أكواد</td></tr>
                  :codes.map((c:any)=>(
                    <tr key={c.code} style={{borderBottom:'1px solid #21262D'}}>
                      <td style={{...td,fontFamily:'monospace',color:'#00E5FF'}}>{c.code}</td>
                      <td style={{...td,color:'#8B949E'}}>{c.note||'—'}</td>
                      <td style={td}><span style={{background:c.active?'#00D47A22':'#FF335522',color:c.active?'#00D47A':'#FF3355',padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>{c.active?'نشط':'معطّل'}</span></td>
                      <td style={{...td,color:'#8B949E',fontSize:'0.75rem'}}>{c.expiry||'—'}</td>
                      <td style={{...td,color:'#8B949E',fontSize:'0.75rem'}}>{c.used_by||'—'}</td>
                      <td style={td}>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button style={{...btn('#21262D','#8B949E'),border:'1px solid #30363D'}} onClick={()=>toggleCode(c.code)}>{c.active?'تعطيل':'تفعيل'}</button>
                          <button style={btn('#FF3355','#fff')} onClick={()=>deleteCode(c.code)}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: المشتركون */}
        {tab===9 && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{color:'#00E5FF',margin:0}}>👥 المشتركون ({subs.length})</h3>
              <button style={btn()} onClick={loadSubs}>🔄 تحديث</button>
            </div>
            <div style={card}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                <thead><tr>{['المستخدم','الاسم','الباقة','الحالة','التاريخ','إجراءات'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {subs.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:'24px',color:'#8B949E'}}>لا توجد بيانات</td></tr>
                  :subs.map((s:any)=>(
                    <tr key={s.id} style={{borderBottom:'1px solid #21262D'}}>
                      <td style={{...td,fontFamily:'monospace',color:'#00E5FF'}}>{s.username}</td>
                      <td style={td}>{s.name}</td>
                      <td style={td}><span style={{background:'#00E5FF22',color:'#00E5FF',padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>{s.plan}</span></td>
                      <td style={td}><span style={{background:s.status==='active'?'#00D47A22':'#F0C93A22',color:s.status==='active'?'#00D47A':'#F0C93A',padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>{s.status}</span></td>
                      <td style={{...td,color:'#8B949E',fontSize:'0.75rem'}}>{s.created_at?.slice(0,10)}</td>
                      <td style={td}>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button style={btn()} onClick={async()=>{await fetch('/api/subscribers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:s.id,action:'activate',plan:'pro'})});loadSubs()}}>تفعيل</button>
                          <button style={btn('#FF3355','#fff')} onClick={async()=>{if(!confirm('حذف؟'))return;await fetch('/api/subscribers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:s.id,action:'delete'})});loadSubs()}}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 10: رصد فوري — Live Monitor
        ══════════════════════════════════════════════════════════ */}
        {tab===10 && (
          <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
              <div>
                <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>📡 لوحة الرصد الفوري</h2>
                <p style={{color:'#8B949E',margin:'4px 0 0',fontSize:'0.75rem'}}>
                  {impactLogs.length > 0 && <span style={{marginLeft:'10px',background:'#FF335522',color:'#FF3355',padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>🔔 {impactLogs.filter(l=>Math.abs(l.base_impact)>5).length} تنبيه &gt;5%</span>}
                </p>
              </div>
              <button onClick={loadImpactLogs} style={{...btn('#21262D','#8B949E'),border:'1px solid #30363D'}}>🔄 تحديث</button>
            </div>

            {/* شريط حالة السوق */}
            <div style={{...card,padding:'16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                <span style={{color:'#8B949E',fontSize:'0.8rem',fontWeight:'700'}}>حالة السوق العامة (M):</span>
                {(['RISK_ON','NEUTRAL','RISK_OFF'] as const).map(ms=>{
                  const cfg=MKT_CFG[ms]; const active=marketState===ms
                  return (
                    <button key={ms} onClick={()=>{setMarketStateVal(ms);localStorage.setItem('mw_market_state',ms)}}
                      style={{padding:'8px 20px',border:`2px solid ${active?cfg.color:'#30363D'}`,borderRadius:'20px',cursor:'pointer',fontSize:'0.82rem',fontWeight:'700',background:active?`${cfg.color}22`:'transparent',color:active?cfg.color:'#8B949E',fontFamily:'inherit'}}>
                      {cfg.label}
                    </button>
                  )
                })}
                <span style={{marginRight:'auto',background:`${MKT_CFG[marketState].color}22`,color:MKT_CFG[marketState].color,padding:'6px 14px',borderRadius:'20px',fontSize:'0.8rem',fontWeight:'700'}}>
                  M = ×{MKT_CFG[marketState].M}
                </span>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:'20px'}}>
              {/* آخر الأخبار */}
              <div style={card}>
                <h3 style={{color:'#00E5FF',margin:'0 0 16px',fontSize:'0.9rem',fontWeight:'700'}}>📰 آخر 10 أخبار محللة</h3>
                {impactLogs.length===0
                  ? <div style={{textAlign:'center',padding:'40px',color:'#8B949E'}}>📭 لا توجد تحليلات بعد — ابدأ من تاب "إدخال خبر"</div>
                  : <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr>{['الخبر','السهم','التأثير','S×','M×','متأثرة','الوقت'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                        <tbody>
                          {impactLogs.slice(0,10).map((l:any)=>{
                            const ic=l.base_impact>0?'#00D47A':l.base_impact<0?'#FF3355':'#F0C93A'
                            return (
                              <tr key={l.log_id||l.id}>
                                <td style={{...td,maxWidth:'200px'}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#E6EDF3',fontSize:'0.78rem'}}>{l.news_text?.slice(0,50)||l.news_type||'—'}</div></td>
                                <td style={td}><span style={{fontFamily:'monospace',color:'#00E5FF',fontSize:'0.78rem',fontWeight:'700'}}>{l.origin_stock}</span></td>
                                <td style={{...td,fontFamily:'monospace',fontWeight:'700',color:ic}}>{l.base_impact>0?'+':''}{l.base_impact?.toFixed(1)}%</td>
                                <td style={{...td,fontFamily:'monospace',color:'#9B6EFF'}}>{l.s_factor?.toFixed(1)}</td>
                                <td style={{...td,fontFamily:'monospace',color:'#F0C93A'}}>{l.m_factor?.toFixed(1)}</td>
                                <td style={{...td,textAlign:'center'}}><span style={{background:'#00E5FF22',color:'#00E5FF',padding:'2px 8px',borderRadius:'8px',fontSize:'0.72rem',fontFamily:'monospace'}}>{l.total_affected}</span></td>
                                <td style={{...td,color:'#8B949E',fontSize:'0.7rem',fontFamily:'monospace'}}>{l.timestamp?new Date(l.timestamp).toLocaleString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                }
              </div>

              {/* بطاقة المعادلة */}
              <div style={{...card,background:'#0D1117',border:'1px solid #00E5FF33'}}>
                <div style={{color:'#00E5FF',fontSize:'0.75rem',fontWeight:'700',marginBottom:'12px'}}>المعادلة الفعّالة</div>
                <div style={{fontFamily:'monospace',fontSize:'0.7rem',lineHeight:2}}>
                  <div style={{color:'#E6EDF3'}}>Impact(B) =</div>
                  <div style={{color:'#00E5FF'}}>Base(A) × Ownership%</div>
                  <div style={{color:'#9B6EFF'}}>× S (معامل المفاجأة)</div>
                  <div style={{color:MKT_CFG[marketState].color}}>× M = ×{MKT_CFG[marketState].M} ({MKT_CFG[marketState].label})</div>
                  <div style={{color:'#F0C93A'}}>× T(t) = e^(-λt)</div>
                  <div style={{color:'#00D47A'}}>× L (معامل السيولة)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 11: إدخال خبر جديد
        ══════════════════════════════════════════════════════════ */}
        {tab===11 && (
          <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
            <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>📝 إدخال خبر جديد وحساب التأثير</h2>
            <p style={{color:'#8B949E',margin:0,fontSize:'0.78rem'}}>المعادلة: Impact(B) = Base(A) × Ownership% × S × M × T(t) × L</p>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
              {/* عمود المدخلات */}
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                {/* نص الخبر */}
                <div style={card}>
                  <label style={lbl}>📰 نص الخبر</label>
                  <textarea value={niNewsText} onChange={e=>handleNiTextChange(e.target.value)} rows={4}
                    placeholder="أدخل نص الخبر... سيتم تصنيفه تلقائياً"
                    style={{...inp,resize:'vertical' as const}}/>
                  {niAutoType && <div style={{marginTop:'6px',background:'#9B6EFF22',color:'#9B6EFF',padding:'5px 10px',borderRadius:'6px',fontSize:'0.75rem'}}>🤖 تصنيف تلقائي: <strong>{niAutoType}</strong></div>}
                </div>

                {/* السهم الأصلي */}
                <div style={card} ref={dropRef}>
                  <label style={lbl}>📈 السهم الأصلي *</label>
                  <div style={{position:'relative'}}>
                    <input
                      value={niSelCode?`${niSelCode} — ${niSelName}`:niStockSearch}
                      onChange={e=>{setNiStockSearch(e.target.value);setNiSelCode('');setNiSelName('');setNiShowDrop(true)}}
                      onFocus={()=>setNiShowDrop(true)}
                      placeholder="ابحث بالكود أو الاسم..." style={inp}/>
                    {niShowDrop&&niStockSearch&&filteredStocks.length>0 && (
                      <div style={{position:'absolute',top:'100%',right:0,left:0,zIndex:100,background:'#161B22',border:'1px solid #30363D',borderRadius:'8px',marginTop:'4px',maxHeight:'220px',overflowY:'auto'}}>
                        {filteredStocks.map(s=>(
                          <div key={s.code} onClick={()=>{setNiSelCode(s.code);setNiSelName(s.name);setNiStockSearch('');setNiShowDrop(false)}}
                            style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid #21262D',display:'flex',justifyContent:'space-between'}}
                            onMouseEnter={e=>(e.currentTarget.style.background='#21262D')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                            <span><span style={{fontFamily:'monospace',color:'#00E5FF',fontWeight:'700'}}>{s.code}</span> <span style={{color:'#E6EDF3',fontSize:'0.85rem'}}>{s.name}</span></span>
                            <span style={{color:'#8B949E',fontSize:'0.72rem'}}>{s.sector}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Base(A) */}
                <div style={card}>
                  <label style={lbl}>📊 نسبة التأثير Base(A)</label>
                  <input type="number" min="-50" max="50" step="0.1" value={niBaseImpact}
                    onChange={e=>setNiBaseImpact(parseFloat(e.target.value)||0)}
                    style={{...inp,width:'120px',textAlign:'center',fontFamily:'monospace',fontWeight:'700',fontSize:'1rem',color:niBaseImpact>=0?'#00D47A':'#FF3355'}}/>
                  <span style={{color:'#8B949E',fontSize:'0.78rem',marginRight:'8px'}}>النطاق: -50% إلى +50%</span>
                </div>

                {/* نوع الخبر */}
                <div style={card}>
                  <label style={lbl}>📌 نوع الخبر (يُكتشف تلقائياً)</label>
                  <select value={niNewsType} onChange={e=>{setNiNewsType(e.target.value);const nt=NEWS_DICT.find(n=>n.type_id===e.target.value);if(nt)setNiSValue(nt.default_s)}} style={inp}>
                    <option value="">— تصنيف تلقائي —</option>
                    {NEWS_DICT.map(n=><option key={n.type_id} value={n.type_id}>{n.name_ar}</option>)}
                  </select>
                </div>
              </div>

              {/* عمود المعاملات */}
              <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                {/* معامل المفاجأة S */}
                <div style={card}>
                  <label style={lbl}>⚡ معامل المفاجأة S = ×{niSValue.toFixed(1)}</label>
                  <input type="range" min="0.3" max="2.5" step="0.1" value={niSValue}
                    onChange={e=>setNiSValue(parseFloat(e.target.value))}
                    style={{width:'100%',accentColor:'#9B6EFF',cursor:'pointer'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'6px'}}>
                    {[{v:0.3,l:'مُسعَّر'},{v:1.0,l:'متوقع'},{v:1.5,l:'+10-20%'},{v:2.0,l:'+20-35%'},{v:2.5,l:'مفاجأة'}].map(p=>(
                      <button key={p.v} onClick={()=>setNiSValue(p.v)}
                        style={{background:Math.abs(niSValue-p.v)<0.05?'#9B6EFF33':'transparent',border:`1px solid ${Math.abs(niSValue-p.v)<0.05?'#9B6EFF':'#30363D'}`,borderRadius:'4px',padding:'2px 4px',color:Math.abs(niSValue-p.v)<0.05?'#9B6EFF':'#8B949E',fontSize:'0.6rem',cursor:'pointer',fontFamily:'inherit'}}>
                        ×{p.v}<br/><span style={{fontSize:'0.55rem'}}>{p.l}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* حالة السوق M */}
                <div style={card}>
                  <label style={lbl}>📡 حالة السوق M</label>
                  <div style={{display:'flex',gap:'8px'}}>
                    {(['RISK_ON','NEUTRAL','RISK_OFF'] as const).map(ms=>{
                      const cfg=MKT_CFG[ms]; const active=niMktState===ms
                      return <button key={ms} onClick={()=>setNiMktState(ms)}
                        style={{flex:1,padding:'10px 6px',border:`2px solid ${active?cfg.color:'#30363D'}`,borderRadius:'8px',background:active?`${cfg.color}22`:'transparent',color:active?cfg.color:'#8B949E',cursor:'pointer',fontSize:'0.75rem',fontWeight:'700',fontFamily:'inherit'}}>
                        {cfg.label}
                      </button>
                    })}
                  </div>
                </div>

                {/* ساعات منذ الخبر T(t) */}
                <div style={card}>
                  <label style={lbl}>⏱ ساعات منذ نشر الخبر — T(t) = {Tval.toFixed(3)}</label>
                  <input type="number" min="0" max="168" step="0.5" value={niHours}
                    onChange={e=>setNiHours(parseFloat(e.target.value)||0)} style={{...inp,fontFamily:'monospace'}}/>
                  <div style={{color:'#8B949E',fontSize:'0.72rem',marginTop:'4px'}}>0 = فوري · 2 = بعد ساعتين · 24 = يوم</div>
                </div>

                {/* معاملات متقدمة */}
                <div style={card}>
                  <label style={lbl}>⚙️ معاملات متقدمة</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                    <div>
                      <label style={{...lbl,fontSize:'0.68rem'}}>أقصى طبقات</label>
                      <select value={niMaxDepth} onChange={e=>setNiMaxDepth(parseInt(e.target.value))} style={{...sinp,width:'100%'}}>
                        <option value={1}>طبقة 1 (مباشر)</option>
                        <option value={2}>طبقتان</option>
                        <option value={3}>3 طبقات</option>
                      </select>
                    </div>
                    <div>
                      <label style={{...lbl,fontSize:'0.68rem'}}>حد التأثير الأدنى%</label>
                      <input type="number" min="0.01" max="5" step="0.01" value={niThreshold}
                        onChange={e=>setNiThreshold(parseFloat(e.target.value)||0.1)} style={{...sinp,width:'100%',fontFamily:'monospace'}}/>
                    </div>
                  </div>
                </div>

                {/* معاينة */}
                <div style={{...card,background:'#0D1117',border:'1px solid #00E5FF33'}}>
                  <div style={{color:'#8B949E',fontSize:'0.7rem',marginBottom:'8px',fontWeight:'700'}}>معاينة المعادلة</div>
                  <div style={{fontFamily:'monospace',fontSize:'0.7rem',lineHeight:2}}>
                    <div>Base = <span style={{color:'#00E5FF',fontWeight:'700'}}>{niBaseImpact>0?'+':''}{niBaseImpact}%</span></div>
                    <div>× S = <span style={{color:'#9B6EFF',fontWeight:'700'}}>×{niSValue.toFixed(1)}</span></div>
                    <div>× M = <span style={{color:MKT_CFG[niMktState].color,fontWeight:'700'}}>×{MKT_CFG[niMktState].M}</span></div>
                    <div>× T = <span style={{color:'#F0C93A',fontWeight:'700'}}>×{Tval.toFixed(3)}</span></div>
                    <div>× L (السيولة)</div>
                    <div style={{borderTop:'1px solid #30363D',paddingTop:'6px',marginTop:'4px'}}>
                      تقدير: <span style={{color:previewImpact>=0?'#00D47A':'#FF3355',fontWeight:'700',fontSize:'0.9rem'}}>{previewImpact>0?'+':''}{(previewImpact*0.7).toFixed(2)}% — {previewImpact.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* أزرار الحساب */}
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
              <button onClick={handleNiCalculate} disabled={niLoading||!niSelCode}
                style={{padding:'12px 32px',background:niLoading||!niSelCode?'#21262D':'#00E5FF',color:niLoading||!niSelCode?'#8B949E':'#0D1117',border:'none',borderRadius:'10px',cursor:niLoading||!niSelCode?'not-allowed':'pointer',fontSize:'0.9rem',fontWeight:'800',fontFamily:'inherit'}}>
                {niLoading?'⏳ جارٍ الحساب...':'⚡ احسب التأثير'}
              </button>
              {niResults && <button onClick={handleNiSave} style={{...btn('#00D47A22' as any,'#00D47A'),border:'1px solid #00D47A44'}}>💾 حفظ في السجل</button>}
              {niSaveMsg && <span style={{color:niSaveMsg.startsWith('✅')?'#00D47A':'#FF3355',fontSize:'0.8rem'}}>{niSaveMsg}</span>}
            </div>

            {/* جدول النتائج */}
            {niResults && niResults.length>0 && (
              <div style={card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                  <h3 style={{color:'#00E5FF',margin:0,fontSize:'0.95rem',fontWeight:'800'}}>نتائج التأثير — {niResults.length} سهم متأثر</h3>
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr>{['#','الكود','الاسم','القطاع','التأثير%','الاتجاه','نوع العلاقة','الطبقة','الملكية%','الإطار الزمني','مسار الوصول'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {niResults.map((r:any)=>{
                        const dc=DIR_COLOR[r.direction]??'#8B949E'
                        const lc=LAYER_COLOR[r.layer]??'#8B949E'
                        const ll=LAYER_LABEL[r.layer]??`طبقة ${r.layer}`
                        return (
                          <tr key={r.stockCode} style={{background:r.relationType==='ORIGIN'?'#00E5FF08':'transparent'}}>
                            <td style={{...td,fontFamily:'monospace',color:'#8B949E',textAlign:'center'}}>{r.rank}</td>
                            <td style={{...td,fontFamily:'monospace',color:'#00E5FF',fontWeight:'700'}}>{r.stockCode}</td>
                            <td style={{...td,color:'#E6EDF3'}}>{r.stockName}</td>
                            <td style={{...td,color:'#8B949E',fontSize:'0.75rem',whiteSpace:'nowrap'}}>{r.sector}</td>
                            <td style={{...td,fontFamily:'monospace',fontWeight:'700',color:dc,fontSize:'0.9rem'}}>{r.impactPct>0?'+':''}{r.impactPct.toFixed(2)}%</td>
                            <td style={{...td,textAlign:'center',color:dc}}>{r.direction==='POSITIVE'?'↑':r.direction==='NEGATIVE'?'↓':'◎'}</td>
                            <td style={td}><span style={{background:`${TYPE_COLOR[r.relationType]??'#8B949E'}22`,color:TYPE_COLOR[r.relationType]??'#8B949E',padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem',whiteSpace:'nowrap'}}>{r.relationType}</span></td>
                            <td style={td}><span style={{background:`${lc}22`,color:lc,padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>{ll}</span></td>
                            <td style={{...td,fontFamily:'monospace',color:'#8B949E',textAlign:'center'}}>{r.ownershipPct!=null?`${r.ownershipPct}%`:'—'}</td>
                            <td style={{...td,color:'#8B949E',fontSize:'0.72rem',whiteSpace:'nowrap'}}>{r.timeframeLabel}</td>
                            <td style={{...td,color:'#8B949E',fontSize:'0.7rem',maxWidth:'160px'}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.path.join(' ← ')}>{r.path.join(' ← ')}</div></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 12: شبكة الملكيات
        ══════════════════════════════════════════════════════════ */}
        {tab===12 && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
              <div>
                <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>🕸️ إدارة شبكة الملكيات</h2>
                <p style={{color:'#8B949E',margin:'4px 0 0',fontSize:'0.75rem'}}>{netRelations.filter(r=>(!netTypeFilter||r.relation_type===netTypeFilter)&&(!netFilter||r.owner_code.includes(netFilter)||r.owner_name.includes(netFilter))).length} علاقة معروضة</p>
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {netMsg && <span style={{color:netMsg.startsWith('✅')?'#00D47A':'#FF3355',fontSize:'0.8rem'}}>{netMsg}</span>}
                <button onClick={()=>{setNetForm({relation_type:'DIRECT',layer:1,strength:5,decay_factor:1.0,verified:false});setNetEditRow(null);setNetShowModal(true)}}
                  style={{...btn(),fontSize:'0.8rem'}}>+ إضافة علاقة</button>
              </div>
            </div>

            {/* فلاتر */}
            <div style={{...card,padding:'12px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
              <input value={netFilter} onChange={e=>setNetFilter(e.target.value)} placeholder="فلترة بالمالك..." style={{...sinp,width:'160px'}}/>
              {['','DIRECT','INDIRECT','OPERATIONAL','SENTIMENT'].map(t=>{
                const labels:Record<string,string>={'':'الكل',DIRECT:'مباشر',INDIRECT:'غير مباشر',OPERATIONAL:'تشغيلي',SENTIMENT:'معنوي'}
                return <button key={t} onClick={()=>setNetTypeFilter(t)} style={{padding:'5px 12px',borderRadius:'16px',border:`1px solid ${netTypeFilter===t?'#00E5FF':'#30363D'}`,background:netTypeFilter===t?'#00E5FF22':'transparent',color:netTypeFilter===t?'#00E5FF':'#8B949E',cursor:'pointer',fontSize:'0.75rem',fontFamily:'inherit'}}>{labels[t]??t}</button>
              })}
              {['2222','2010','2050'].map(code=>{
                const names:Record<string,string>={'2222':'أرامكو','2010':'سابك','2050':'صافولا'}
                return <button key={code} onClick={()=>setNetFilter(netFilter===code?'':code)} style={{padding:'5px 12px',borderRadius:'16px',border:`1px solid ${netFilter===code?'#9B6EFF':'#30363D'}`,background:netFilter===code?'#9B6EFF22':'transparent',color:netFilter===code?'#9B6EFF':'#8B949E',cursor:'pointer',fontSize:'0.72rem',fontFamily:'inherit'}}>{names[code]} فقط</button>
              })}
            </div>

            <div style={card}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['#','المالك','المملوك','النسبة%','النوع','الطبقة','القوة','موثق','إجراءات'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {netRelations
                      .filter(r=>(!netTypeFilter||r.relation_type===netTypeFilter)&&(!netFilter||r.owner_code.includes(netFilter)||r.owner_name.includes(netFilter)))
                      .map(r=>{
                        const lc=LAYER_COLOR[r.layer]??'#8B949E'; const tc=TYPE_COLOR[r.relation_type]??'#8B949E'
                        return (
                          <tr key={r.id}>
                            <td style={{...td,fontFamily:'monospace',color:'#8B949E',textAlign:'center',fontSize:'0.72rem'}}>{r.id}</td>
                            <td style={td}><div style={{fontFamily:'monospace',color:'#00E5FF',fontWeight:'700',fontSize:'0.78rem'}}>{r.owner_code}</div><div style={{color:'#E6EDF3',fontSize:'0.75rem'}}>{r.owner_name}</div></td>
                            <td style={td}><div style={{fontFamily:'monospace',color:'#00E5FF',fontWeight:'700',fontSize:'0.78rem'}}>{r.owned_code}</div><div style={{color:'#E6EDF3',fontSize:'0.75rem'}}>{r.owned_name}</div></td>
                            <td style={{...td,fontFamily:'monospace',fontWeight:'700',color:r.ownership_pct>50?'#00D47A':r.ownership_pct>20?'#F0C93A':'#8B949E',textAlign:'center'}}>{r.ownership_pct>0?`${r.ownership_pct}%`:'—'}</td>
                            <td style={td}><span style={{background:`${tc}22`,color:tc,padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>{r.relation_type}</span></td>
                            <td style={td}><span style={{background:`${lc}22`,color:lc,padding:'2px 8px',borderRadius:'8px',fontSize:'0.7rem'}}>{r.layer} — {LAYER_LABEL[r.layer]}</span></td>
                            <td style={{...td,textAlign:'center'}}>
                              <div style={{display:'flex',justifyContent:'center',gap:'2px'}}>
                                {Array.from({length:10}).map((_,i)=><div key={i} style={{width:'3px',height:'10px',borderRadius:'1px',background:i<r.strength?'#00E5FF':'#21262D'}}/>)}
                              </div>
                            </td>
                            <td style={{...td,textAlign:'center'}}>{r.verified?<span style={{color:'#00D47A'}}>✓</span>:<span style={{color:'#FF3355'}}>✗</span>}</td>
                            <td style={td}>
                              <div style={{display:'flex',gap:'4px'}}>
                                <button onClick={()=>{setNetForm({...r});setNetEditRow(r);setNetShowModal(true)}} style={{padding:'3px 8px',background:'#21262D',border:'1px solid #30363D',borderRadius:'6px',color:'#E6EDF3',cursor:'pointer',fontSize:'0.7rem',fontFamily:'inherit'}}>تعديل</button>
                                <button onClick={()=>{if(!confirm('حذف؟'))return;setNetRelations(rs=>rs.filter(x=>x.id!==r.id));setNetMsg('✅ تم الحذف');setTimeout(()=>setNetMsg(''),2000)}} style={{padding:'3px 8px',background:'transparent',border:'1px solid #FF335544',borderRadius:'6px',color:'#FF3355',cursor:'pointer',fontSize:'0.7rem',fontFamily:'inherit'}}>حذف</button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal إضافة/تعديل */}
            {netShowModal && (
              <div style={{position:'fixed',inset:0,background:'#000000CC',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
                <div style={{background:'#161B22',border:'1px solid #30363D',borderRadius:'16px',padding:'28px',width:'100%',maxWidth:'560px',maxHeight:'90vh',overflowY:'auto'}}>
                  <h3 style={{color:'#00E5FF',margin:'0 0 20px',fontSize:'1rem'}}>{netEditRow?'✏️ تعديل علاقة':'➕ إضافة علاقة جديدة'}</h3>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                    {[{k:'owner_code',l:'كود المالك *',ph:'2222'},{k:'owner_name',l:'اسم المالك',ph:'أرامكو'},{k:'owned_code',l:'كود المملوك *',ph:'2010'},{k:'owned_name',l:'اسم المملوك',ph:'سابك'},{k:'ownership_pct',l:'نسبة التملك%',ph:'70',t:'number'},{k:'strength',l:'قوة التأثير 1-10',ph:'5',t:'number'},{k:'owner_sector',l:'قطاع المالك',ph:'الطاقة'},{k:'owned_sector',l:'قطاع المملوك',ph:'المواد الأساسية'},{k:'source',l:'المصدر',ph:'Annual Report'}].map(({k,l,ph,t})=>(
                      <div key={k}>
                        <label style={{display:'block',color:'#8B949E',fontSize:'0.72rem',marginBottom:'3px'}}>{l}</label>
                        <input type={t??'text'} value={netForm[k]??''} onChange={e=>setNetForm((f:any)=>({...f,[k]:t==='number'?parseFloat(e.target.value)||0:e.target.value}))} placeholder={ph} style={{...sinp,width:'100%'}}/>
                      </div>
                    ))}
                    <div>
                      <label style={{display:'block',color:'#8B949E',fontSize:'0.72rem',marginBottom:'3px'}}>نوع العلاقة</label>
                      <select value={netForm.relation_type??'DIRECT'} onChange={e=>setNetForm((f:any)=>({...f,relation_type:e.target.value}))} style={{...sinp,width:'100%'}}>
                        <option value="DIRECT">DIRECT — مباشر</option><option value="INDIRECT">INDIRECT — غير مباشر</option><option value="OPERATIONAL">OPERATIONAL — تشغيلي</option><option value="SENTIMENT">SENTIMENT — معنوي</option>
                      </select>
                    </div>
                    <div>
                      <label style={{display:'block',color:'#8B949E',fontSize:'0.72rem',marginBottom:'3px'}}>الطبقة</label>
                      <select value={netForm.layer??1} onChange={e=>setNetForm((f:any)=>({...f,layer:parseInt(e.target.value)}))} style={{...sinp,width:'100%'}}>
                        <option value={1}>1 — مباشر</option><option value={2}>2 — غير مباشر</option><option value={3}>3 — تشغيلي</option><option value={4}>4 — معنوي</option>
                      </select>
                    </div>
                  </div>
                  <div style={{marginTop:'10px'}}><label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',color:'#8B949E',fontSize:'0.8rem'}}><input type="checkbox" checked={!!netForm.verified} onChange={e=>setNetForm((f:any)=>({...f,verified:e.target.checked}))}/> موثق من مصدر رسمي</label></div>
                  <div style={{display:'flex',gap:'8px',marginTop:'20px'}}>
                    <button onClick={()=>{
                      if(!netForm.owner_code||!netForm.owned_code){setNetMsg('❌ الكودان مطلوبان');return}
                      if(netEditRow){setNetRelations(rs=>rs.map(r=>r.id===netEditRow.id?{...netForm,id:netEditRow.id}:r));setNetMsg('✅ تم التعديل')}
                      else{const nid=Math.max(...netRelations.map(r=>r.id),0)+1;setNetRelations(rs=>[...rs,{...netForm,id:nid}]);setNetMsg('✅ تمت الإضافة')}
                      setNetShowModal(false);setTimeout(()=>setNetMsg(''),2500)
                    }} style={{flex:1,padding:'10px',background:'#00E5FF',color:'#0D1117',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:'800',fontSize:'0.85rem',fontFamily:'inherit'}}>
                      {netEditRow?'💾 حفظ التعديل':'➕ إضافة'}
                    </button>
                    <button onClick={()=>setNetShowModal(false)} style={{padding:'10px 20px',background:'transparent',border:'1px solid #30363D',borderRadius:'8px',color:'#8B949E',cursor:'pointer',fontFamily:'inherit'}}>إلغاء</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 13: قاموس الأخبار
        ══════════════════════════════════════════════════════════ */}
        {tab===13 && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
              <div>
                <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>📖 قاموس أنواع الأخبار</h2>
                <p style={{color:'#8B949E',margin:'4px 0 0',fontSize:'0.75rem'}}>{dictRows.length} نوع خبر — λ يتحكم في T(t) = e^(-λt)</p>
              </div>
              {dictMsg && <span style={{color:dictMsg.startsWith('✅')?'#00D47A':'#FF3355',fontSize:'0.8rem'}}>{dictMsg}</span>}
            </div>

            {/* اختبار التصنيف */}
            <div style={card}>
              <h4 style={{color:'#F0C93A',margin:'0 0 12px',fontSize:'0.85rem',fontWeight:'700'}}>🧪 اختبار التصنيف التلقائي</h4>
              <div style={{display:'flex',gap:'8px'}}>
                <input value={dictTestText} onChange={e=>setDictTestText(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){const r=classifyNewsText(dictTestText);setDictTestRes(r)}}}
                  placeholder="مثال: أرامكو تعلن أرباحاً أفضل من التوقعات..." style={{...inp,flex:1}}/>
                <button onClick={()=>setDictTestRes(classifyNewsText(dictTestText))} style={{...btn('#F0C93A'),fontSize:'0.8rem'}}>اختبر</button>
              </div>
              {dictTestRes && (
                <div style={{marginTop:'10px',background:'#0D1117',borderRadius:'8px',padding:'12px',display:'flex',gap:'20px',flexWrap:'wrap'}}>
                  <div><span style={{color:'#8B949E',fontSize:'0.72rem'}}>النوع:</span><br/><span style={{color:'#00E5FF',fontWeight:'700'}}>{dictTestRes.name_ar}</span></div>
                  <div><span style={{color:'#8B949E',fontSize:'0.72rem'}}>S مقترح:</span><br/><span style={{color:'#9B6EFF',fontWeight:'700'}}>×{dictTestRes.suggestedS}</span></div>
                  <div><span style={{color:'#8B949E',fontSize:'0.72rem'}}>λ:</span><br/><span style={{color:'#F0C93A',fontWeight:'700'}}>{dictTestRes.lambda}</span></div>
                  <div><span style={{color:'#8B949E',fontSize:'0.72rem'}}>الثقة:</span><br/><span style={{color:dictTestRes.confidence>0.7?'#00D47A':dictTestRes.confidence>0.4?'#F0C93A':'#FF3355',fontWeight:'700'}}>{Math.round(dictTestRes.confidence*100)}%</span></div>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['نوع الخبر','الاتجاه','λ (التحلل)','نصف العمر','S افتراضي','إجراءات'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dictRows.map(row=>{
                      const isEdit=dictEditId===row.type_id
                      const eRow=isEdit?dictEditData:row
                      const dc=row.direction==='POSITIVE'?'#00D47A':row.direction==='NEGATIVE'?'#FF3355':'#F0C93A'
                      return (
                        <tr key={row.type_id} style={{background:isEdit?'#00E5FF08':'transparent'}}>
                          <td style={td}><div style={{fontFamily:'monospace',color:'#8B949E',fontSize:'0.65rem'}}>{row.type_id}</div>{isEdit?<input value={dictEditData.name_ar??''} onChange={e=>setDictEditData((d:any)=>({...d,name_ar:e.target.value}))} style={{...sinp,width:'160px',marginTop:'4px'}}/>:<div style={{color:'#E6EDF3',fontWeight:'600',fontSize:'0.82rem'}}>{row.name_ar}</div>}</td>
                          <td style={td}><span style={{background:`${dc}22`,color:dc,padding:'2px 8px',borderRadius:'8px',fontSize:'0.72rem'}}>{row.direction==='POSITIVE'?'إيجابي ↑':row.direction==='NEGATIVE'?'سلبي ↓':'محايد ◎'}</span></td>
                          <td style={td}>{isEdit?<input type="number" min="0.05" max="3" step="0.05" value={dictEditData.lambda??row.lambda} onChange={e=>setDictEditData((d:any)=>({...d,lambda:parseFloat(e.target.value)||1}))} style={{...sinp,width:'70px',fontFamily:'monospace',textAlign:'center'}} title="λ أكبر = تلاشٍ أسرع"/>:<span style={{fontFamily:'monospace',color:'#F0C93A',fontWeight:'700'}}>{row.lambda}</span>}</td>
                          <td style={{...td,fontFamily:'monospace',color:'#8B949E'}}>{isEdit?`${Math.round(Math.log(2)/(dictEditData.lambda??1))}h`:`${row.half_life_hrs}h`}</td>
                          <td style={td}>{isEdit?<input type="number" min="0.3" max="2.5" step="0.1" value={dictEditData.default_s??row.default_s} onChange={e=>setDictEditData((d:any)=>({...d,default_s:parseFloat(e.target.value)||1}))} style={{...sinp,width:'65px',fontFamily:'monospace',textAlign:'center'}}/>:<span style={{fontFamily:'monospace',color:'#9B6EFF',fontWeight:'700'}}>×{row.default_s}</span>}</td>
                          <td style={td}>
                            {isEdit
                              ? <div style={{display:'flex',gap:'4px'}}>
                                  <button onClick={()=>{setDictRows(rs=>rs.map(r=>r.type_id===row.type_id?{...r,...dictEditData}:r));setDictEditId(null);setDictMsg('✅ تم الحفظ');setTimeout(()=>setDictMsg(''),3000)}} style={{padding:'4px 10px',background:'#00D47A',color:'#0D1117',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:'700',fontSize:'0.72rem',fontFamily:'inherit'}}>✓ حفظ</button>
                                  <button onClick={()=>setDictEditId(null)} style={{padding:'4px 8px',background:'transparent',border:'1px solid #30363D',borderRadius:'6px',color:'#8B949E',cursor:'pointer',fontSize:'0.72rem',fontFamily:'inherit'}}>إلغاء</button>
                                </div>
                              : <button onClick={()=>{setDictEditId(row.type_id);setDictEditData({...row})}} style={{padding:'4px 10px',background:'#21262D',border:'1px solid #30363D',borderRadius:'6px',color:'#E6EDF3',cursor:'pointer',fontSize:'0.72rem',fontFamily:'inherit'}}>تعديل</button>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* شرح λ */}
            <div style={{...card,background:'#0D1117',border:'1px solid #F0C93A33'}}>
              <h4 style={{color:'#F0C93A',margin:'0 0 10px',fontSize:'0.82rem'}}>📐 دليل قيم λ</h4>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px'}}>
                {[{l:'λ = 2.0',d:'تلاشٍ سريع جداً — ~8 ساعات (أرباح)'},{l:'λ = 1.0',d:'تلاشٍ سريع — ~17 ساعة (نفط/سلع)'},{l:'λ = 0.5',d:'متوسط — ~33 ساعة (عقود)'},{l:'λ = 0.3',d:'بطيء — ~55 ساعة (توقعات)'},{l:'λ = 0.2',d:'بطيء جداً — ~84 ساعة (تنظيمي)'},{l:'λ = 0.1',d:'مستمر لأسابيع (هيكل ملكية)'}].map(i=>(
                  <div key={i.l} style={{background:'#161B22',borderRadius:'6px',padding:'8px 10px'}}>
                    <div style={{fontFamily:'monospace',color:'#F0C93A',fontWeight:'700',fontSize:'0.78rem'}}>{i.l}</div>
                    <div style={{color:'#8B949E',fontSize:'0.68rem',marginTop:'2px'}}>{i.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 14: إدارة الأسهم 394
        ══════════════════════════════════════════════════════════ */}
        {tab===14 && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>🗂️ إدارة الأسهم ({allStocksForDrop.length} سهم)</h2>
            <div style={{...card,padding:'12px',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
              <input value={stkSearch} onChange={e=>{setStkSearch(e.target.value);setStkPage(0)}} placeholder="بحث بالكود أو الاسم..." style={{...sinp,width:'200px'}}/>
              <span style={{color:'#8B949E',fontSize:'0.75rem',marginRight:'auto'}}>{stkFiltered.length} نتيجة — صفحة {stkPage+1}/{stkPages||1}</span>
            </div>
            <div style={card}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr>{['الكود','الاسم','القطاع','السوق','الوزن'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {stkDisplay.map((s,i)=>(
                      <tr key={i}>
                        <td style={{...td,fontFamily:'monospace',color:'#00E5FF',fontWeight:'700'}}>{s.code}</td>
                        <td style={{...td,color:'#E6EDF3'}}>{s.name}</td>
                        <td style={{...td,color:'#8B949E',fontSize:'0.75rem',whiteSpace:'nowrap'}}>{s.sector}</td>
                        <td style={td}><span style={{background:'#00E5FF22',color:'#00E5FF',padding:'1px 6px',borderRadius:'4px',fontSize:'0.7rem'}}>TASI</span></td>
                        <td style={td}><div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{flex:1,height:'4px',background:'#21262D',borderRadius:'2px',minWidth:'40px'}}><div style={{height:'100%',width:'50%',background:'#00E5FF',borderRadius:'2px'}}/></div></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stkPages>1 && (
                <div style={{display:'flex',gap:'6px',marginTop:'16px',justifyContent:'center'}}>
                  <button onClick={()=>setStkPage(p=>Math.max(0,p-1))} disabled={stkPage===0} style={{padding:'5px 12px',background:'#21262D',border:'1px solid #30363D',borderRadius:'6px',color:stkPage===0?'#30363D':'#E6EDF3',cursor:stkPage===0?'not-allowed':'pointer',fontFamily:'inherit',fontSize:'0.78rem'}}>السابق</button>
                  <span style={{padding:'5px 12px',color:'#8B949E',fontSize:'0.78rem'}}>{stkPage+1} / {stkPages}</span>
                  <button onClick={()=>setStkPage(p=>Math.min(stkPages-1,p+1))} disabled={stkPage===stkPages-1} style={{padding:'5px 12px',background:'#21262D',border:'1px solid #30363D',borderRadius:'6px',color:stkPage===stkPages-1?'#30363D':'#E6EDF3',cursor:stkPage===stkPages-1?'not-allowed':'pointer',fontFamily:'inherit',fontSize:'0.78rem'}}>التالي</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 15: سجل التأثير
        ══════════════════════════════════════════════════════════ */}
        {tab===15 && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
              <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>📋 سجل التحليلات ({impactLogs.length})</h2>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={exportLogCSV} style={{...btn('#21262D','#8B949E'),border:'1px solid #30363D',fontSize:'0.78rem'}}>📥 تصدير CSV</button>
                <button onClick={loadImpactLogs} style={{...btn(),fontSize:'0.78rem'}}>🔄 تحديث</button>
              </div>
            </div>

            <div style={{...card,padding:'12px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
              <input value={logStock} onChange={e=>setLogStock(e.target.value)} placeholder="فلترة بالسهم..." style={{...sinp,width:'130px'}}/>
              <input type="date" value={logFrom} onChange={e=>setLogFrom(e.target.value)} style={{...sinp,width:'140px'}}/>
              <span style={{color:'#8B949E',lineHeight:'32px',fontSize:'0.8rem'}}>→</span>
              <input type="date" value={logTo}   onChange={e=>setLogTo(e.target.value)}   style={{...sinp,width:'140px'}}/>
              <button onClick={loadImpactLogs} style={{...btn('#21262D','#E6EDF3'),border:'1px solid #30363D',fontSize:'0.78rem'}}>فلترة</button>
            </div>

            <div style={card}>
              {impactLogs.length===0
                ? <div style={{textAlign:'center',padding:'48px',color:'#8B949E'}}>📭 لا توجد سجلات — أضف تحليلات من تاب "إدخال خبر"</div>
                : <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr>{['الوقت','الخبر','السهم','Base%','S','M','المتأثرة','تفاصيل'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {impactLogs.map((l:any)=>{
                          const ic=l.base_impact>0?'#00D47A':'#FF3355'; const isExp=logExpanded===l.log_id
                          return (
                            <>
                              <tr key={l.log_id||l.id}>
                                <td style={{...td,fontFamily:'monospace',color:'#8B949E',fontSize:'0.72rem'}}>{l.timestamp?new Date(l.timestamp).toLocaleString('ar-SA',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
                                <td style={{...td,maxWidth:'200px'}}><div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#E6EDF3',fontSize:'0.78rem'}}>{l.news_text?.slice(0,50)||l.news_type||'—'}</div></td>
                                <td style={td}><span style={{fontFamily:'monospace',color:'#00E5FF',fontWeight:'700',fontSize:'0.78rem'}}>{l.origin_stock}</span></td>
                                <td style={{...td,fontFamily:'monospace',fontWeight:'700',color:ic}}>{l.base_impact>0?'+':''}{l.base_impact?.toFixed(1)}%</td>
                                <td style={{...td,fontFamily:'monospace',color:'#9B6EFF'}}>×{l.s_factor?.toFixed(1)}</td>
                                <td style={{...td,fontFamily:'monospace',color:'#F0C93A'}}>×{l.m_factor?.toFixed(1)}</td>
                                <td style={{...td,textAlign:'center'}}><span style={{background:'#00E5FF22',color:'#00E5FF',padding:'2px 8px',borderRadius:'8px',fontSize:'0.72rem',fontFamily:'monospace'}}>{l.total_affected}</span></td>
                                <td style={td}><button onClick={()=>setLogExpanded(isExp?null:l.log_id)} style={{padding:'3px 8px',background:'#21262D',border:'1px solid #30363D',borderRadius:'6px',color:'#E6EDF3',cursor:'pointer',fontSize:'0.7rem',fontFamily:'inherit'}}>{isExp?'▲':'▼'}</button></td>
                              </tr>
                              {isExp && (
                                <tr key={`${l.log_id}-exp`}>
                                  <td colSpan={8} style={{padding:'0 12px 12px',background:'#0D1117'}}>
                                    <div style={{padding:'12px',background:'#161B22',borderRadius:'8px',border:'1px solid #30363D'}}>
                                      <div style={{color:'#8B949E',fontSize:'0.72rem',marginBottom:'8px',fontWeight:'700'}}>أبرز الأسهم المتأثرة:</div>
                                      <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                                        {(l.results??[]).slice(0,12).map((r:any)=>{
                                          const c=r.impactPct>0?'#00D47A':'#FF3355'
                                          return <div key={r.stockCode} style={{background:'#21262D',borderRadius:'6px',padding:'4px 10px',border:`1px solid ${c}33`,fontSize:'0.72rem'}}><span style={{fontFamily:'monospace',color:'#00E5FF'}}>{r.stockCode}</span><span style={{color:'#8B949E',margin:'0 4px'}}>{r.stockName}</span><span style={{color:c,fontWeight:'700'}}>{r.impactPct>0?'+':''}{r.impactPct?.toFixed(2)}%</span></div>
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 16: مقارن السيناريوهات
        ══════════════════════════════════════════════════════════ */}
        {tab===16 && (
          <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
            <h2 style={{color:'#00E5FF',margin:0,fontSize:'1.1rem',fontWeight:'800'}}>⚖️ مقارن السيناريوهات — نفس الخبر بافتراضات مختلفة</h2>

            <div style={card}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                <div><label style={lbl}>كود السهم</label><input value={scnCode} onChange={e=>setScnCode(e.target.value)} style={{...inp,fontFamily:'monospace'}} placeholder="2222"/></div>
                <div><label style={lbl}>نسبة التأثير Base(A)%</label><input type="number" min="-50" max="50" step="0.1" value={scnImpact} onChange={e=>setScnImpact(parseFloat(e.target.value)||0)} style={{...inp,fontFamily:'monospace'}}/></div>
                <div><label style={lbl}>نص الخبر (اختياري)</label><input value={scnText} onChange={e=>setScnText(e.target.value)} style={inp} placeholder="نص الخبر للتصنيف التلقائي..."/></div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'16px'}}>
                {[{key:'base',label:'أساسي',S:1.0,M:'NEUTRAL',Mv:1.0,color:'#00E5FF'},{key:'opt',label:'تفاؤلي',S:2.0,M:'RISK_ON',Mv:1.3,color:'#00D47A'},{key:'pes',label:'تحفظي',S:0.5,M:'RISK_OFF',Mv:0.7,color:'#FF3355'}].map(s=>(
                  <div key={s.key} style={{background:'#0D1117',borderRadius:'10px',padding:'14px',border:`1px solid ${s.color}44`}}>
                    <div style={{color:s.color,fontWeight:'700',fontSize:'0.85rem',marginBottom:'8px'}}>{s.label}</div>
                    <div style={{fontFamily:'monospace',fontSize:'0.75rem',lineHeight:2}}>
                      <div>S = <span style={{color:'#9B6EFF'}}>×{s.S}</span></div>
                      <div>M = <span style={{color:s.color}}>×{s.Mv}</span> ({s.M})</div>
                      <div>Base × {s.S} × {s.Mv} = <span style={{color:s.color,fontWeight:'700'}}>{scnImpact>0?'+':''}{(scnImpact*s.S*s.Mv).toFixed(2)}%</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleScnCompare} disabled={scnLoading}
                style={{padding:'11px 32px',background:scnLoading?'#21262D':'#00E5FF',color:scnLoading?'#8B949E':'#0D1117',border:'none',borderRadius:'10px',cursor:scnLoading?'not-allowed':'pointer',fontWeight:'800',fontSize:'0.9rem',fontFamily:'inherit'}}>
                {scnLoading?'⏳ جارٍ المقارنة...':'⚖️ قارن السيناريوهات'}
              </button>
            </div>

            {scnResults && (
              <div style={card}>
                <h3 style={{color:'#00E5FF',margin:'0 0 16px',fontSize:'0.9rem',fontWeight:'800'}}>نتائج المقارنة — أبرز 10 أسهم</h3>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        <th style={th}>#</th><th style={th}>السهم</th><th style={th}>القطاع</th>
                        <th style={{...th,color:'#00E5FF'}}>أساسي<br/><span style={{fontSize:'0.62rem',color:'#8B949E'}}>S×1.0 M×1.0</span></th>
                        <th style={{...th,color:'#00D47A'}}>تفاؤلي<br/><span style={{fontSize:'0.62rem',color:'#8B949E'}}>S×2.0 M×1.3</span></th>
                        <th style={{...th,color:'#FF3355'}}>تحفظي<br/><span style={{fontSize:'0.62rem',color:'#8B949E'}}>S×0.5 M×0.7</span></th>
                        <th style={th}>نطاق التأثير</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scnResults.base.map((r:any,i:number)=>{
                        const opt=scnResults.optimistic.find((x:any)=>x.stockCode===r.stockCode)
                        const pes=scnResults.pessimistic.find((x:any)=>x.stockCode===r.stockCode)
                        const vals=[r.impactPct,opt?.impactPct??0,pes?.impactPct??0]
                        const minV=Math.min(...vals); const maxV=Math.max(...vals)
                        return (
                          <tr key={r.stockCode}>
                            <td style={{...td,textAlign:'center',color:'#8B949E',fontFamily:'monospace',fontSize:'0.75rem'}}>{i+1}</td>
                            <td style={td}><span style={{fontFamily:'monospace',color:'#00E5FF',fontWeight:'700'}}>{r.stockCode}</span><span style={{color:'#E6EDF3',marginRight:'6px',fontSize:'0.78rem'}}> {r.stockName}</span></td>
                            <td style={{...td,color:'#8B949E',fontSize:'0.75rem'}}>{r.sector}</td>
                            {vals.map((v,ci)=>{
                              const colors=['#00E5FF','#00D47A','#FF3355']
                              return <td key={ci} style={{...td,fontFamily:'monospace',fontWeight:'700',textAlign:'center',color:v>=0?'#00D47A':'#FF3355'}}>{v>0?'+':''}{v.toFixed(2)}%</td>
                            })}
                            <td style={td}>
                              <div style={{fontSize:'0.7rem',fontFamily:'monospace'}}>
                                <span style={{color:minV>=0?'#00D47A':'#FF3355'}}>{minV>0?'+':''}{minV.toFixed(2)}%</span>
                                <span style={{color:'#8B949E',margin:'0 4px'}}>—</span>
                                <span style={{color:maxV>=0?'#00D47A':'#FF3355'}}>{maxV>0?'+':''}{maxV.toFixed(2)}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
