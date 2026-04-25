## التشخيص
المشكلة ليست في `text-align` فقط. من مراجعة كود `/super-admin` اتضح أن الخلل الأساسي في مستوى الحاويات والـ layout نفسه:

1. تم إصلاح محاذاة النصوص سابقاً عبر CSS عام، لكن كثيراً من عناصر السوبر أدمن ما زالت تستخدم حاويات داخلية `flex` و `grid` بدون تثبيت واضح لجهة البداية في RTL.
2. في `src/pages/SuperAdminPanel.tsx` يوجد شريط التبويبات والصفوف العلوية مع `justify-start` و `flex-row-reverse` بشكل غير كافٍ، وهذا يسبب بقاء بعض الحاويات منطلقة بصرياً من اليسار رغم أن النص داخلها `text-right`.
3. عدة تبويبات تبني الهيدر والبطاقات بنفس النمط:
   - `flex items-start justify-between`
   - عنصر نصي داخلي بدون `flex-1`/`w-full`
   - أزرار `self-start`
   هذا يجعل الحاوية نفسها shrink-wrapped أو غير مثبتة لليمين بشكل صارم.
4. يوجد ملف `SuperAdminLayoutWrapper.tsx` مخصص لتوحيد RTL/LTR، لكنه عملياً غير مستغل كقاعدة موحدة لكل تبويبات السوبر أدمن.
5. جزء من CSS السابق يستهدف selectors مثل `[data-slot="card"]` بينما مكونات `card.tsx` الحالية لا تولد هذه الخصائص، لذلك جزء من “الإصلاح العام” لا يطبق فعلياً كما هو متوقع.

بالتالي: النص أصبح يمين داخل عناصر كثيرة، لكن الحاوية الأم نفسها ما زالت غير مبنية بنظام RTL صارم، لذلك تظهر وكأنها محاذاة يسار الصفحة.

## الخطة
### 1) إصلاح shell الصفحة الرئيسية للسوبر أدمن
تعديل `src/pages/SuperAdminPanel.tsx` بحيث يصبح RTL على مستوى الهيكل نفسه، وليس النص فقط:
- جعل شريط التبويبات يدعم RTL فعلياً بدلاً من `justify-start` الثابت.
- ضبط `TabsList` و `TabsContent` بحيث تكون البداية المنطقية في العربية من اليمين.
- توحيد الهيدر العلوي وصفوف العناوين/الأزرار بنمط full-width ثابت.

### 2) بناء wrapper/layout موحد للحاويات الداخلية
استخدام/توسيع `SuperAdminLayoutWrapper.tsx` ليقدم primitives واضحة لكل تبويب:
- حاوية رئيسية `w-full`
- Header داخلي بنمط `flex-row-reverse + flex-1 + text-right`
- Action area لا تدفع المحتوى بصرياً لليسار
- Cards/sections بعرض كامل ومحاذاة RTL حقيقية

### 3) استبدال نمط “محاذاة النص فقط” بنمط “محاذاة الحاوية + النص”
مراجعة التبويبات المتأثرة واستبدال الأنماط المتكررة مثل:
- `text-right` فقط
- `flex-row-reverse` فقط
- `self-start` للأزرار

بـ patterns موحدة مثل:
- `w-full`
- `flex-1`
- `items-start`
- `justify-between` مع توزيع صحيح في RTL
- `text-right` على العنصر النصي، وليس كحل وحيد

### 4) تطبيق الإصلاح على التبويبات التي ما زالت تعاني من left-anchoring
المراجعة ستشمل على الأقل:
- `src/pages/SuperAdminPanel.tsx`
- `src/components/SuperAdmin/CityManagementTab.tsx`
- `src/components/SuperAdmin/FinancialDashboardTab.tsx`
- `src/components/SuperAdmin/AdminPerformanceTab.tsx`
- `src/components/SuperAdmin/SuspiciousActivityTab.tsx`
- `src/components/SuperAdmin/SocialMediaManagementTab.tsx`
- `src/components/SuperAdmin/RoleManagementTab.tsx`
- `src/components/SuperAdmin/StaffDashboardTab.tsx`
- `src/components/SuperAdmin/SuperAdminOverviewTab.tsx`
- `src/components/SuperAdmin/SuperAdminActivityLogsTab.tsx`
- `src/components/Admin/ContactSettingsTab.tsx`
- `src/components/Admin/CommissionSettingsTab.tsx`
- `src/components/Admin/AdminReportsTab.tsx`

### 5) تنظيف CSS العام حتى لا يبقى شكلياً فقط
تعديل `src/index.css` ليصبح دوره داعماً فقط، وليس بديلاً عن بنية RTL الصحيحة:
- إزالة/تقليل الاعتماد على selectors غير الفعالة
- إضافة utility classes خاصة بالسوبر أدمن للحاويات والهيدرات والـ cards
- الإبقاء على دعم الـ portals (Dialog/Select/Popover) لأن هذا ما يزال مطلوباً

### 6) التحقق النهائي
بعد التنفيذ سيتم فحص `/super-admin` بشكل صارم للتأكد من:
- الحاوية نفسها تبدأ من اليمين في العربية
- العناوين والبطاقات والجداول والحقول ليست فقط `text-right` بل موضوعة مكانياً بشكل صحيح
- عدم وجود sections ما زالت shrink-wrapped أو مثبتة يسار
- عدم كسر LTR أو الوضع الإنجليزي
- عدم تأثر الـ Switch components التي يجب أن تبقى `dir="ltr"`

## تفاصيل تقنية
الهدف ليس إضافة `text-right` أكثر، بل تحويل السوبر أدمن إلى RTL structural layout:

```text
Page shell
└── Tab content (full width, RTL)
    └── Section header (title area flex-1 on the right, actions isolated)
        ├── Title block aligned right
        └── Action block positioned correctly for RTL
    └── Card / table / form sections with full-width containers
```

سيتم اعتماد نمط موحد بدلاً من إصلاحات متفرقة لكل نص، حتى لا تتكرر نفس المشكلة في الحاويات الداخلية.

## النتيجة المتوقعة
بعد التنفيذ، لن يكون النص فقط صحيحاً؛ بل كل بلوك داخل `/super-admin` سيكون متموضعاً يميناً بشكل فعلي ومتسق، مع اختفاء الإحساس الحالي بأن الحاوية نفسها ما زالت محاذية لليسار.