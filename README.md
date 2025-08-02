# 🔍 Amadeus Help Commands Extractor

## 📖 نظرة عامة
مشروع Browser Extension لاستخراج وتوثيق جميع أوامر المساعدة (HE Commands) من نظام Amadeus وتصديرها كدليل شامل بصيغة Markdown. الهدف هو إنشاء مرجع كامل لجميع أوامر Amadeus للاستفادة منه في التدريب والمراجع المستقبلية.

## 🎯 أهداف المشروع

### الهدف الرئيسي
- **استخراج شامل**: جمع جميع أوامر HE المتوفرة في نظام Amadeus
- **توثيق منظم**: إنشاء دليل مرتب وقابل للبحث
- **مشاركة مجتمعية**: توفير المعلومات للمجتمع المهني
- **مرجع دائم**: إنشاء وثيقة يمكن الرجوع إليها مستقبلاً

### الأهداف الفرعية
- ✅ أتمتة عملية استخراج أوامر المساعدة
- ✅ تنظيف وتنسيق النصوص المستخرجة
- ✅ تصنيف الأوامر حسب الوظائف
- ✅ إنشاء فهرس قابل للتنقل
- ✅ توفير إحصائيات شاملة
- ✅ دعم التصدير بصيغ متعددة

## 🏗️ هيكل المشروع

```
amadeus_help_extractor/
│
├── 📁 extension/                     # ملفات Chrome Extension
│   ├── manifest.json                 # إعدادات Extension والصلاحيات
│   ├── background.js                 # إدارة الجلسة والخلفية
│   ├── content.js                    # التفاعل مع صفحة Amadeus
│   ├── popup.html                    # واجهة التحكم
│   ├── popup.js                      # منطق واجهة المستخدم
│   └── styles.css                    # تنسيق الواجهة
│
├── 📁 src/                          # الكود الأساسي
│   ├── session-manager.js            # استخراج بيانات الجلسة
│   ├── api-client.js                 # التواصل مع Amadeus API
│   ├── command-processor.js          # معالجة الأوامر بالدفعات
│   ├── response-parser.js            # تنظيف النصوص المستخرجة
│   ├── markdown-generator.js         # إنشاء ملف Markdown
│   └── utils.js                      # دوال مساعدة
│
├── 📁 data/                         # البيانات والقوائم
│   ├── he-commands.json              # قائمة شاملة بأوامر HE
│   ├── command-categories.json       # تصنيف الأوامر
│   └── extracted-responses.json      # الاستجابات المحفوظة
│
├── 📁 output/                       # المخرجات النهائية
│   ├── amadeus_complete_guide.md     # الدليل النهائي
│   ├── commands_summary.json         # ملخص الأوامر
│   └── statistics.json               # إحصائيات الاستخراج
│
├── 📁 docs/                         # التوثيق
│   ├── installation.md               # دليل التثبيت
│   ├── api-analysis.md               # تحليل Amadeus API
│   └── troubleshooting.md            # حل المشاكل
│
├── README.md                        # هذا الملف
├── package.json                     # اعتماديات Node.js (إن وجدت)
└── .gitignore                       # ملفات Git المتجاهلة
```

## 🔧 التقنيات المستخدمة

### Frontend Technologies
- **Chrome Extension API**: للتفاعل مع المتصفح
- **Vanilla JavaScript**: للمنطق الأساسي
- **HTML5 & CSS3**: لواجهة المستخدم
- **Fetch API**: للطلبات HTTP

### Data Processing
- **JSON**: لتخزين ومعالجة البيانات
- **Markdown**: للتصدير النهائي
- **Regular Expressions**: لتنظيف النصوص

### Browser APIs Used
- **chrome.storage**: لحفظ البيانات محلياً
- **chrome.tabs**: للتفاعل مع التبويبات
- **chrome.runtime**: للتواصل بين أجزاء Extension

## 🌐 تحليل Amadeus API

### البيانات المستخرجة من النظام

#### 1. معلومات الجلسة (Session Data)
```json
{
  "jSessionId": "I4xhhW5LrS70pnBomZpe_BOY0_nSzcf_L3vboWUe!1754092514902",
  "contextId": "043DLAQNGN.rpglJ4VAeKBIWwudxbZ-6w,DC=tst-ne-cur01b-si-tst",
  "userId": "NDALKC4",
  "organization": "SV",
  "officeId": "RUHSV0401",
  "gds": "AMADEUS"
}
```

#### 2. API Endpoint
```
POST: https://uat10.resdesktop.altea.amadeus.com/cryptic/apfplus/modules/cryptic/cryptic
Parameters: SITE=ASVBASVB&LANGUAGE=GB&OCTX=ARDW_PDT_WBP
```

#### 3. Request Structure لأوامر HE
```json
{
  "jSessionId": "[SESSION_ID]",
  "contextId": "[CONTEXT_ID]", 
  "userId": "[USER_ID]",
  "organization": "[ORG]",
  "officeId": "[OFFICE_ID]",
  "gds": "AMADEUS",
  "tasks": [{
    "type": "CRY",
    "command": {
      "command": "HE [COMMAND]",
      "prohibitedList": "SITE_JCPCRYPTIC_PROHIBITED_COMMANDS_LIST_1"
    }
  }]
}
```

#### 4. Response Structure
```json
{
  "model": {
    "output": {
      "crypticResponse": {
        "command": "HE AN",
        "response": "[النص الكامل لتوثيق الأمر]",
        "response3270": "null",
        "name": "crypticResponse"
      }
    }
  }
}
```

## 📋 قائمة أوامر HE الشاملة

### Core Booking & Operations (العمليات الأساسية)
```
HE AN    - Availability displays         HE SS    - Segment selling
HE NN    - Need segments                 HE HK    - Confirmed segments  
HE SA    - Space available               HE SB    - Rebooking
HE SC    - Schedule changes              HE SE    - Segment elements
HE SL    - Sell segments                 HE SN    - Segment numbers
HE SO    - Sell options                  HE SP    - Split PNR
HE SX    - Cancel seats
```

### Pricing & Fares (التسعير والأسعار)
```
HE FXP   - Price PNR (create TST)       HE FXX   - Price PNR (no TST)
HE FXG   - Price ancillary services     HE FXH   - Price ancillary (informative)
HE FXK   - Ancillary catalog             HE FXB   - Best pricer
HE FXL   - Lowest fare                   HE FXA   - Alternative fares
HE FXD   - Display fares                 HE FXE   - Exchange fares
HE FXF   - Fare inquiry                  HE FXI   - Involuntary reissue
HE FXO   - Override fares                HE FXQ   - Quote fares
HE FXR   - Rebook fares                  HE FXT   - Fare selection
HE FXU   - Upsell fares                  HE FXZ   - Zonal fares
```

### Ticketing & Documents (إصدار التذاكر)
```
HE TTP   - Issue tickets                 HE TTM   - Issue EMD/MCO
HE TTC   - Create TST                    HE TTD   - Delete TST
HE TTF   - TST functions                 HE TTI   - TST information
HE TTK   - Ticket operations             HE TTL   - List tickets
HE TTN   - Ticket numbers                HE TTO   - Ticket options
HE TTR   - Reissue tickets               HE TTS   - TST storage
HE TTU   - Update TST                    HE TTW   - Ticket workflow
HE TTX   - Cancel tickets                HE TTY   - Ticket display
HE TTZ   - Ticket zones
```

### Refunds & Exchanges (المبالغ المستردة والتبديل)
```
HE TRF   - Automated refunds             HE TRDC  - Cancel refunds
HE TRDR  - Reinstate refunds             HE TRE   - Exchange tickets
HE TRI   - Refund inquiry                HE TRL   - Refund list
HE TRM   - Manual refunds                HE TRN   - Refund notices
HE TRO   - Refund options                HE TRP   - Process refunds
HE TRQ   - Refund quotes                 HE TRR   - Refund reports
HE TRS   - Refund status                 HE TRT   - Refund transactions
HE TRU   - Update refunds                HE TRV   - Refund validation
HE TRW   - Refund workflow               HE TRX   - Cancel exchanges
HE TRY   - Exchange display              HE TRZ   - Exchange zones
```

### PNR Management (إدارة حجوزات الطيران)
```
HE NM    - Name elements                 HE NG    - Group names
HE NP    - Name processing               HE NR    - Name retrieval
HE NS    - Name segments                 HE NT    - Name transactions
HE NU    - Name updates                  HE NV    - Name validation
HE NW    - Name workflow                 HE NX    - Cancel names
HE NY    - Name display                  HE NZ    - Name zones
```

### Contact & Information (معلومات الاتصال)
```
HE AP    - Contact information           HE APE   - Email contacts
HE APF   - Fax contacts                  HE APM   - Mobile contacts
HE APN   - Phone contacts                HE APT   - Travel contacts
HE APX   - Contact extensions
```

### Special Services (الخدمات الخاصة)
```
HE SSR   - Special service requests      HE SR    - Service requests
HE SM    - Seat maps                     HE ST    - Seat requests
HE SK    - Keyword elements              HE SVC   - Service segments
HE SVF   - Service fees
```

### Remarks & Information (الملاحظات والمعلومات)
```
HE RM    - General remarks               HE RC    - Confidential remarks
HE RI    - Information remarks           HE RN    - Numeric remarks
HE RO    - Office remarks                HE RP    - Passenger remarks
HE RQ    - Queue remarks                 HE RR    - Retrieval remarks
HE RS    - System remarks                HE RT    - Retrieve PNR
HE RU    - Update remarks                HE RV    - Validation remarks
HE RW    - Workflow remarks              HE RX    - Cancel remarks
HE RY    - Display remarks               HE RZ    - Zone remarks
```

### Payment & Financial (الدفع والمعاملات المالية)
```
HE FP    - Forms of payment              HE FA    - Automated tickets
HE FB    - Booking records               HE FC    - Fare calculation
HE FD    - Fare discounts                HE FE    - Exchange records
HE FG    - Group fares                   HE FH    - History records
HE FI    - Invoice records               HE FJ    - Joint fares
HE FK    - Fare keys                     HE FL    - Fare lines
HE FM    - Commission                    HE FN    - Fare notes
HE FO    - Original issue                HE FQ    - Fare quotes
HE FR    - Fare rules                    HE FS    - Fare segments
HE FT    - Fare types                    HE FU    - Fare updates
HE FV    - Validating carrier            HE FW    - Fare workflow
HE FY    - Yield management
```

### Queue Management (إدارة القوائم)
```
HE QC    - Queue count                   HE QR    - Queue removal
HE QUE   - Queue operations              HE QA    - Queue actions
HE QB    - Queue browsing                HE QD    - Queue display
HE QE    - Queue entry                   HE QF    - Queue filtering
HE QG    - Queue groups                  HE QH    - Queue history
HE QI    - Queue information             HE QJ    - Queue jobs
HE QK    - Queue keys                    HE QL    - Queue lists
HE QM    - Queue management              HE QN    - Queue notifications
HE QO    - Queue options                 HE QP    - Queue processing
HE QQ    - Queue queries                 HE QS    - Queue status
HE QT    - Queue transactions            HE QU    - Queue updates
HE QV    - Queue validation              HE QW    - Queue workflow
HE QX    - Queue cancel                  HE QY    - Queue display
HE QZ    - Queue zones
```

### Other Services (خدمات أخرى)
```
HE HOTEL    - Hotel bookings             HE CAR      - Car rentals
HE RAIL     - Rail bookings              HE CRUISE   - Cruise bookings
HE TOUR     - Tour packages              HE INS      - Insurance
HE VISA     - Visa information
```

### Reporting & Analysis (التقارير والتحليل)
```
HE TJQ   - Query reports                 HE TJS   - Sales reports
HE TJD   - Daily reports                 HE TJF   - Financial reports
HE TJI   - Item reports                  HE TJN   - Net reports
HE TJC   - Cash reports                  HE TJT   - Transaction reports
```

### System & Technical (النظام والتقنيات)
```
HE SYS      - System information         HE HELP     - Help system
HE STEPS    - Step-by-step guides        HE UPDATES  - System updates
HE TRAINING - Training modules           HE GENERAL  - General information
HE BACK     - Back office                HE DIR      - Direct access
HE NSP      - Negotiated space           HE TLA      - Light ticketing
HE TCH      - TCH e-ticketing            HE EMD      - Electronic misc documents
HE ANC      - Ancillary services         HE ITR      - Itinerary receipts
HE TWD      - Ticket display             HE TWH      - Ticket history
```

### Geographic & Codes (الرموز الجغرافية)
```
HE CITY     - City codes                 HE AIRPORT  - Airport codes
HE AIRLINE  - Airline codes              HE COUNTRY  - Country codes
HE CURRENCY - Currency codes             HE MEAL     - Meal codes
HE PTC      - Passenger type codes       HE IAD      - Discount codes
```

### Error & Troubleshooting (الأخطاء وحل المشاكل)
```
HE ERROR    - Error messages             HE WARNING  - Warning messages
HE FORMAT   - Format help                HE SYNTAX   - Syntax help
HE EXAMPLES - Command examples
```

## 🔍 الميزات الرئيسية

### 1. استخراج تلقائي
- **معالجة مجمعة**: تنفيذ جميع الأوامر بشكل تلقائي
- **إدارة الأخطاء**: التعامل مع الأوامر غير المتوفرة
- **تحكم في السرعة**: تأخير قابل للتعديل بين الطلبات
- **إيقاف واستكمال**: إمكانية الإيقاف المؤقت والاستكمال

### 2. معالجة ذكية للنصوص
- **تنظيف تلقائي**: إزالة رموز التنسيق والمسافات الزائدة
- **استخراج المعلومات**: تحديد العناوين والأمثلة والملاحظات
- **تصنيف محتوى**: تجميع المعلومات حسب النوع

### 3. تصدير متقدم
- **Markdown منسق**: مع عناوين وفهارس
- **JSON منظم**: للاستخدام البرمجي
- **إحصائيات شاملة**: معدلات النجاح والفشل
- **فهرس تفاعلي**: للتنقل السريع

### 4. واجهة مستخدم بديهية
- **شريط تقدم**: عرض حالة الاستخراج
- **إعدادات مرنة**: تخصيص السرعة والتصدير
- **سجل العمليات**: تتبع الأوامر المنفذة
- **تحكم كامل**: بدء وإيقاف واستكمال

## ⚙️ متطلبات التشغيل

### Browser Requirements
- **Google Chrome**: الإصدار 88 أو أحدث
- **Microsoft Edge**: الإصدار 88 أو أحدث
- **Firefox**: مع بعض التعديلات (قيد التطوير)

### System Requirements
- **نظام التشغيل**: Windows, macOS, Linux
- **ذاكرة**: 4GB RAM أو أكثر
- **مساحة القرص**: 100MB للتخزين المؤقت

### Amadeus Requirements
- **وصول إلى نظام Amadeus**: حساب صالح
- **صلاحيات HE Commands**: القدرة على تنفيذ أوامر المساعدة
- **اتصال مستقر**: لضمان عدم انقطاع الجلسة

## 🚀 خطة التطوير

### المرحلة الأولى: الأساسيات
- [ ] إعداد Extension manifest
- [ ] استخراج بيانات الجلسة
- [ ] تنفيذ طلبات API الأساسية
- [ ] واجهة تحكم بسيطة

### المرحلة الثانية: معالجة البيانات
- [ ] معالجة الأوامر بالدفعات
- [ ] تنظيف وتحليل النصوص
- [ ] إدارة الأخطاء والاستثناءات
- [ ] حفظ البيانات محلياً

### المرحلة الثالثة: التصدير والتقارير
- [ ] إنشاء ملفات Markdown
- [ ] تصدير JSON منظم
- [ ] إحصائيات شاملة
- [ ] فهرس تفاعلي

### المرحلة الرابعة: التحسين والاختبار
- [ ] تحسين الأداء
- [ ] اختبار شامل
- [ ] توثيق المطور
- [ ] دليل المستخدم

## 📚 المراجع والموارد

### Amadeus Documentation
- [Amadeus Selling Platform Manual](https://amadeus.com/documents)
- [Cryptic Commands Reference](https://amadeus.com/cryptic-reference)
- [API Integration Guide](https://amadeus.com/api-guide)

### Technical References
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Markdown Specification](https://spec.commonmark.org/)

### Tools & Libraries
- **Text Processing**: Custom regex patterns
- **Data Validation**: JSON Schema validation
- **Export Generation**: Custom Markdown generator

## 🤝 المساهمة في المشروع

### للمطورين الجدد
1. **قراءة التوثيق**: ابدأ بفهم هيكل المشروع
2. **دراسة API**: تحليل طريقة عمل Amadeus API
3. **اختبار محلي**: تجربة Extension في بيئة التطوير
4. **المساهمة التدريجية**: ابدأ بالمهام البسيطة

### المهام المطلوبة
- **تحسين UI/UX**: تطوير واجهة المستخدم
- **معالجة البيانات**: تحسين خوارزميات تنظيف النصوص
- **اختبار شامل**: كتابة اختبارات آلية
- **توثيق إضافي**: إضافة أمثلة وشروحات

### معايير الكود
- **JavaScript ES6+**: استخدام المعايير الحديثة
- **تعليقات واضحة**: شرح الوظائف المعقدة
- **معالجة الأخطاء**: التعامل مع جميع الحالات الاستثنائية
- **اختبار الكود**: ضمان جودة الوظائف

## 📄 الترخيص
هذا المشروع مفتوح المصدر تحت رخصة MIT. الهدف هو إفادة المجتمع المهني وتطوير أدوات مساعدة لمستخدمي Amadeus.

## 📞 التواصل والدعم
- **Issues**: لبلاغ المشاكل والاقتراحات
- **Discussions**: للنقاشات التقنية
- **Wiki**: للتوثيق التفصيلي

---
**آخر تحديث**: يناير 2024  
**الإصدار**: 1.0.0  
**المطورون**: فريق Amadeus Community Tools