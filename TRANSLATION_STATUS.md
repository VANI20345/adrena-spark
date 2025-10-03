# حالة الترجمة - Translation Status

## الصفحات المترجمة بالكامل (Fully Translated Pages)

### ✅ صفحات المصادقة (Authentication Pages)
- `src/pages/Auth.tsx` - **مترجم بالكامل** (Fully bilingual with AR/EN support)
- `src/pages/AccountType.tsx` - **مترجم بالكامل** (Uses LanguageContext)

### ✅ الصفحات الرئيسية (Main Pages)
- `src/pages/Index.tsx` - **مترجم بالكامل**
- `src/components/Home/HeroSection.tsx` - **مترجم بالكامل** (عربي فقط)
- `src/components/Home/CategorySection.tsx` - **مترجم بالكامل** (يستخدم name_ar من قاعدة البيانات)
- `src/components/Layout/Navbar.tsx` - **مترجم بالكامل** (Uses LanguageContext)
- `src/components/Layout/Footer.tsx` - **مترجم بالكامل** (عربي فقط)

### ✅ صفحات المستخدم (User Pages)
- `src/pages/Profile.tsx` - **مترجم بالكامل** (عربي فقط)
- `src/pages/Settings.tsx` - **مترجم بالكامل** (عربي فقط)
- `src/pages/Dashboard.tsx` - **مترجم بالكامل** (عربي فقط)

### ✅ صفحات الفعاليات (Event Pages)
- `src/pages/Explore.tsx` - **مترجم بالكامل** (يستخدم title_ar و location_ar)
- `src/pages/EventDetails.tsx` - **مترجم بالكامل** (يستخدم title_ar و description_ar)
- `src/pages/CreateEvent.tsx` - **مترجم بالكامل** (عربي فقط)
- `src/pages/MyEvents.tsx` - **مترجم بالكامل** (عربي فقط)

### ✅ صفحات الخدمات (Service Pages)
- `src/pages/Services.tsx` - **مترجم بالكامل** (يستخدم name_ar و description_ar)
- `src/pages/CreateService.tsx` - **مترجم بالكامل** (عربي فقط)

---

## ⚠️ صفحات تحتاج مراجعة أو ترجمة جزئية (Pages Needing Review or Partial Translation)

### 🔶 لوحات التحكم (Dashboard Pages)
- `src/pages/AttendeeDashboard.tsx` - **يحتاج مراجعة** (معظم النصوص بالعربية لكن قد تحتاج تحسين)
- `src/pages/OrganizerDashboard.tsx` - **يحتاج مراجعة** (معظم النصوص بالعربية)
- `src/pages/ProviderDashboard.tsx` - **يحتاج مراجعة** (معظم النصوص بالعربية)
- `src/pages/AdminPanel.tsx` - **يحتاج مراجعة** (قد يحتوي على نصوص إنجليزية)

### 🔶 صفحات إدارة المحتوى (Content Management)
- `src/pages/ManageEvents.tsx` - **يحتاج مراجعة**
- `src/pages/ManageServices.tsx` - **يحتاج مراجعة**
- `src/pages/EventManagement.tsx` - **يحتاج مراجعة**
- `src/pages/EventParticipants.tsx` - **يحتاج مراجعة**

### 🔶 صفحات الدفع والحجز (Payment & Booking)
- `src/pages/Checkout.tsx` - **يحتاج ترجمة** (قد يحتوي على نصوص إنجليزية)
- `src/pages/CheckoutSuccess.tsx` - **يحتاج ترجمة**
- `src/pages/Tickets.tsx` - **يحتاج مراجعة**

### 🔶 صفحات أخرى (Other Pages)
- `src/pages/Wallet.tsx` - **يحتاج مراجعة**
- `src/pages/Points.tsx` - **يحتاج مراجعة**
- `src/pages/Groups.tsx` - **يحتاج مراجعة**
- `src/pages/Notifications.tsx` - **يحتاج مراجعة**
- `src/pages/QRScanner.tsx` - **يحتاج مراجعة**
- `src/pages/Refund.tsx` - **يحتاج ترجمة**

### 🔶 صفحات قانونية ومساعدة (Legal & Help)
- `src/pages/Help.tsx` - **يحتاج ترجمة**
- `src/pages/Contact.tsx` - **يحتاج مراجعة**
- `src/pages/Safety.tsx` - **يحتاج ترجمة**
- `src/pages/Terms.tsx` - **يحتاج ترجمة**
- `src/pages/Privacy.tsx` - **يحتاج ترجمة**

---

## 📊 المكونات (Components)

### ✅ مكونات مترجمة (Translated Components)
- `src/components/Layout/Navbar.tsx` - **مترجم بالكامل**
- `src/components/Layout/Footer.tsx` - **مترجم بالكامل**
- `src/components/Home/HeroSection.tsx` - **مترجم بالكامل**
- `src/components/Home/CategorySection.tsx` - **مترجم بالكامل**

### 🔶 مكونات تحتاج مراجعة (Components Needing Review)
- `src/components/Chat/*` - **يحتاج مراجعة**
- `src/components/Groups/*` - **يحتاج مراجعة**
- `src/components/Notifications/*` - **يحتاج مراجعة**
- `src/components/Payment/*` - **يحتاج مراجعة**
- `src/components/QR/*` - **يحتاج مراجعة**
- `src/components/Reviews/*` - **يحتاج مراجعة**
- `src/components/Search/*` - **يحتاج مراجعة**
- `src/components/Upload/*` - **يحتاج مراجعة**
- `src/components/Wallet/*` - **يحتاج مراجعة**

---

## 🛠️ كيفية تطبيق الترجمة (How to Implement Translation)

### الطريقة الحالية (Current Method)
يستخدم المشروع حالياً نظام ترجمة مزدوج:

1. **LanguageContext** (`src/contexts/LanguageContext.tsx`):
   - يوفر دالة `t()` للترجمة
   - يدعم اللغتين العربية والإنجليزية
   - يستخدم في: Navbar, Authentication pages

2. **قاعدة البيانات** (Database fields):
   - حقول منفصلة للعربية والإنجليزية (مثل `title` و `title_ar`)
   - تستخدم في: Events, Services, Categories, Cities

### الطريقة الموصى بها (Recommended Method)

#### للصفحات الثابتة (For Static Pages):
استخدام `LanguageContext` مع ملفات ترجمة:

```typescript
import { useLanguageContext } from '@/contexts/LanguageContext';

const MyPage = () => {
  const { t, language } = useLanguageContext();
  
  return (
    <div>
      <h1>{t('page.title')}</h1>
      <p>{t('page.description')}</p>
    </div>
  );
};
```

#### للبيانات الديناميكية (For Dynamic Data):
استخدام الحقول المنفصلة في قاعدة البيانات:

```typescript
// في قاعدة البيانات
event: {
  title: "Adventure Trip",
  title_ar: "رحلة مغامرة",
  description: "Join us for...",
  description_ar: "انضم إلينا في..."
}

// في الكود
const { language } = useLanguageContext();
<h1>{language === 'ar' ? event.title_ar : event.title}</h1>
```

---

## 📋 خطوات التنفيذ (Implementation Steps)

### المرحلة 1: مراجعة الصفحات الموجودة (Phase 1: Review Existing Pages)
1. ✅ مراجعة جميع الصفحات المترجمة والتأكد من جودة الترجمة
2. ⚠️ تحديد النصوص الإنجليزية المتبقية في الصفحات
3. ⚠️ توحيد أسلوب الترجمة عبر المشروع

### المرحلة 2: ترجمة الصفحات المتبقية (Phase 2: Translate Remaining Pages)
1. ⏳ ترجمة صفحات الدفع والحجز
2. ⏳ ترجمة الصفحات القانونية
3. ⏳ ترجمة صفحات المساعدة

### المرحلة 3: ترجمة المكونات (Phase 3: Translate Components)
1. ⏳ مراجعة وترجمة مكونات Chat
2. ⏳ مراجعة وترجمة مكونات Groups
3. ⏳ مراجعة وترجمة مكونات Payment
4. ⏳ مراجعة وترجمة مكونات Reviews

### المرحلة 4: التحسينات (Phase 4: Improvements)
1. ⏳ إضافة ترجمات ديناميكية للرسائل من Backend
2. ⏳ ترجمة رسائل الأخطاء والنجاح (Toast messages)
3. ⏳ ترجمة تنسيقات التاريخ والوقت
4. ⏳ ترجمة تنسيقات الأرقام والعملات

---

## 🔍 ملاحظات مهمة (Important Notes)

1. **اتجاه النص (Text Direction)**:
   - معظم الصفحات تستخدم RTL بشكل افتراضي
   - بعض الحقول (مثل البريد الإلكتروني) تستخدم `dir="ltr"`

2. **قاعدة البيانات (Database)**:
   - جداول: events, services, categories, cities لها حقول `_ar`
   - يجب التأكد من إدخال البيانات بكلا اللغتين

3. **Toast Messages**:
   - معظم رسائل النجاح/الخطأ بالعربية حالياً
   - يُنصح بترجمتها للغة الإنجليزية أيضاً

4. **أولوية الترجمة (Translation Priority)**:
   - ✅ عالية (High): صفحات المستخدم الأساسية والمصادقة
   - 🔶 متوسطة (Medium): صفحات الدفع والإدارة
   - ⏳ منخفضة (Low): الصفحات القانونية والمساعدة

---

## 📞 للمساعدة (For Help)
إذا كنت بحاجة لترجمة صفحة معينة أو مكون، يرجى:
1. تحديد الملف المراد ترجمته
2. تحديد النصوص التي تحتاج ترجمة
3. استخدام نمط الترجمة الموصى به أعلاه
