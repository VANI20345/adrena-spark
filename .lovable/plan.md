
سأقسم الطلبات إلى **قابل للتنفيذ من الواجهة الأمامية فقط** و**يتطلب Backend** (سأشرحه فقط بدون حلول مؤقتة، حسب طلبك).

---

## ✅ الجزء الأول — تنفيذ من الفرونت إند فقط

### 1) أزرار Google و Apple (Sign In / Sign Up) — واجهة فقط
- في `src/pages/Auth.tsx`:
  - إزالة زر Google الحالي (المعطّل فعلياً بلا OAuth مُفعّل) واستبداله بمجموعة أزرار موحّدة: **Google** و **Apple**.
  - إضافة نفس المجموعة أعلى `SignupFlow` في تبويب Signup (مع Separator "أو").
  - الأزرار `disabled` بـ tooltip: «قريباً» / "Coming soon"، بدون أي استدعاء لـ `signInWithOAuth`.
  - لوجو Google + Apple أيقونتين متجهيتين مضمّنتين (SVG) بدون تبعيات جديدة.

### 2) إخفاء تسجيل «مقدم خدمة» عند تعطيله من السوبر أدمن
- إضافة مفتاح جديد `provider_signup` إلى نظام `feature_toggles` الحالي:
  - تحديث `src/hooks/useFeatureToggles.ts` (إضافة المفتاح مع افتراضي `true`).
  - إضافة سويتش جديد في `src/components/SuperAdmin/FeatureTogglesTab.tsx` باسم «تسجيل مقدمي الخدمات».
  - في `src/components/Auth/SignupPage1.tsx`:
    - إذا `toggles.provider_signup === false` → **إخفاء كامل** لزر «مقدم خدمة» + إخفاء عنوان «نوع الحساب» عندما يتبقى خيار واحد فقط، وتثبيت `data.role = 'attendee'` تلقائياً.
    - إزالة السلوك القديم (disabled + tooltip) والاعتماد على المفتاح الجديد فقط.

### 3) حقل تأكيد كلمة المرور
- في `SignupPage1.tsx`:
  - إضافة `passwordConfirmation` إلى `SignupData` (في `SignupFlow.tsx`).
  - إضافة حقل «تأكيد كلمة المرور» بأيقونة إظهار/إخفاء.
  - التحقق قبل `onNext`: عدم التطابق → رسالة «كلمتا المرور غير متطابقتين».

### 4) تعطيل إرسال بريد التحقق بعد التسجيل — Frontend part
- من ناحية الفرونت: إزالة `emailRedirectTo` من `signUp` غير كافٍ لإيقاف الإرسال؛ **إيقاف بريد التحقق يتم من إعدادات Auth في Lovable Cloud** (Confirm email = Off).
- **ما سأنفذه في الفرونت**:
  - تنظيف رسالة النجاح لتقول «تم إنشاء الحساب وتسجيل الدخول» بدون ذكر «تحقق من بريدك».
  - إزالة أي انتظار لتأكيد البريد وتحويل المستخدم مباشرة للصفحة الرئيسية.
- **مطلوب Backend/إعدادات (سأوضّح فقط)**: إيقاف "Confirm email" في Cloud → Users → Auth Settings → Email. لا يمكن إيقافها من كود الفرونت.

### 8) قسم «الفعاليات الجارية» في My Events + منع التسجيل بعد بدء الفعالية
- في `src/pages/MyEvents.tsx`:
  - إضافة `ongoingEvents` state.
  - المعيار: `start_date <= now < end_date` وحالة الحجز `confirmed|paid`.
  - تعديل فلترة `upcoming` لتصبح `start_date > now` فقط (بدل `end_date > now`) لتجنب التداخل.
  - إضافة تبويب جديد «الجارية / Ongoing» بعدّاد.
- منع التسجيل بعد بدء الفعالية:
  - `src/pages/EventDetails.tsx` (سطر ~555): إضافة شرط `new Date(event.start_date) <= new Date()` إلى قائمة التعطيل، وتغيير نص الزر إلى «انتهى التسجيل / Registration Closed».
  - نفس المنطق في `src/components/Home/FeaturedEvents.tsx` و `RecentEvents.tsx` (الشرط الحالي `current_attendees < max_attendees` فقط).

---

## 🔍 الجزء الثاني — يتطلب Backend (شرح فقط، بدون حلول مؤقتة)

### 5) عدد أعضاء المجموعة يظهر دائماً «1»
- **السبب الجذري**: الواجهة تقرأ `groups.current_members` مباشرةً. هذا العمود لا يُحدَّث تلقائياً عند `INSERT/DELETE` على `group_memberships`. لا يوجد Trigger على `group_memberships` يُحدّث `groups.current_members` (تحقّقتُ من الاستخدامات — يُقرأ فقط، ولا يُكتب إلا عند مغادرة العضو يدوياً في `GroupDetails.tsx`).
- **نوع المشكلة**: Backend / Database.
- **الحل المطلوب في Backend**:
  1. Trigger `AFTER INSERT/DELETE` على `group_memberships` يعيد حساب:
     ```sql
     UPDATE groups SET current_members = (
       SELECT COUNT(*) FROM group_memberships WHERE group_id = NEW.group_id
     ) WHERE id = NEW.group_id;
     ```
  2. Migration لمرة واحدة لإعادة احتساب القيم الحالية لكل المجموعات.
- **لا يمكن إصلاحها من الفرونت** بشكل صحيح؛ أي حل client-side (COUNT عند العرض) سيسبب استعلامات إضافية غير موثوقة ولن يعمل في القوائم.

### 6) طلبات الانضمام للمجموعات الخاصة لا تصل لصاحب المجموعة
- **السبب الجذري**: بعد فحص `src/services/groupJoinRequests.ts` و RPC `request_group_join`: الطلب يُدخَل في جدول الطلبات فقط، ولا يوجد إشعار (`notifications` row) يُنشأ لصاحب المجموعة. الفرونت يستدعي RPC فقط ولا يملك صلاحية إدخال إشعار مباشر للـ owner (RLS تمنع ذلك — المستخدم لا يستطيع الكتابة في notifications لمستخدم آخر).
- **نوع المشكلة**: Backend (داخل RPC / Trigger).
- **الحل المطلوب**:
  - داخل RPC `request_group_join` (Security Definer): بعد إدخال الطلب، `INSERT INTO notifications` لصاحب المجموعة + أي admins بنوع `group_join_request` مع deep link.
  - أو Trigger `AFTER INSERT` على جدول `group_join_requests` يقوم بذلك.
- **لا يمكن إصلاحها من الفرونت** لأن RLS على `notifications` لا تسمح لمستخدم بإنشاء إشعار لمستخدم آخر.

### 7) عدّادات الإعجابات والتعليقات لا تتحدث
- **السبب الجذري**: `posts.likes_count` و `posts.comments_count` أعمدة مخزّنة (denormalized) تُقرأ من كل مكونات العرض (`GroupPost`, `GroupPostsFeed`, `PostDetailsDialog`, `SocialMediaLightbox`). التفاعلات تُكتب في `post_likes` / `post_comments` لكن لا يوجد Trigger لتحديث هذه العدّادات. الفرونت يحدّث state محلي فقط، والقيمة الحقيقية في DB تبقى صفر.
- **نوع المشكلة**: Backend / Database.
- **الحل المطلوب**:
  - Triggers `AFTER INSERT/DELETE` على `post_likes` و `post_comments` لتحديث `posts.likes_count` و `posts.comments_count`.
  - Migration لإعادة احتساب القيم الحالية.
- **لا يمكن إصلاحها من الفرونت** بشكل صحيح لأن العدّاد يُقرأ عبر عدة نقاط ولن يبقى متسقاً بدون trigger موثوق.

### 9) خطأ في الدفع عند وجود Plan في الفعالية
- **الاستقصاء المطلوب**: أحتاج الخطأ الفعلي من الـ Console/Network عند الشراء بخطة. من قراءة `Checkout.tsx`:
  - يتم إرسال `pricing_plan_id: activePlan?.id` إلى `create-booking` edge function وعمود `bookings.pricing_plan_id`.
  - المشتبه به الأول: عمود `bookings.pricing_plan_id` غير موجود في السكيمة، أو FK غير صحيح، أو Edge Function `create-booking` لا يقبل الحقل → PostgREST يرد بخطأ 400/500.
  - المشتبه به الثاني: `pricing_plans.available_tickets` لا يُحسم عند الحجز داخل الـ RPC، مما يُبقي الشرط `available_tickets >= tickets` غير متوافق مع نفس الفحص Server-side.
- **نوع المشكلة على الأرجح**: Backend (Edge Function `create-booking` أو RPC الحجز).
- **ما أحتاجه لتحديد السبب بدقة**:
  1. رسالة الخطأ من صفحة الدفع (Console + Network response body).
  2. أو صلاحية فحص `supabase/functions/create-booking/index.ts` — سأفحصه إن سمحت وأحدّد بدقة.
- **لن أطبّق حلاً في الفرونت** لأن أي "التفاف" (إسقاط `pricing_plan_id` مثلاً) سيكسر ربط الحجز بالخطة والاسترداد لاحقاً.

---

## الملفات التي ستتغيّر (الجزء 1 فقط)

- `src/pages/Auth.tsx` — أزرار Google/Apple placeholder.
- `src/components/Auth/SignupFlow.tsx` — إضافة `passwordConfirmation`، أزرار Google/Apple في تبويب Signup، تنظيف رسائل التحقق البريدي.
- `src/components/Auth/SignupPage1.tsx` — إخفاء زر مقدم الخدمة عبر `provider_signup`، حقل تأكيد كلمة المرور.
- `src/hooks/useFeatureToggles.ts` — إضافة مفتاح `provider_signup`.
- `src/components/SuperAdmin/FeatureTogglesTab.tsx` — سويتش جديد للتحكم في تسجيل مقدمي الخدمات.
- `src/pages/MyEvents.tsx` — تبويب «الجارية» + إعادة تعريف فلاتر upcoming/ongoing.
- `src/pages/EventDetails.tsx` + `src/components/Home/FeaturedEvents.tsx` + `RecentEvents.tsx` — منع الحجز بعد بدء الفعالية.

## ما لن يُنفَّذ (بانتظار Backend)
- (4) إيقاف إرسال بريد التحقق فعلياً — إعداد Auth.
- (5) عدّاد الأعضاء — Trigger DB.
- (6) إشعار مالك المجموعة — RPC/Trigger DB.
- (7) عدّادات Likes/Comments — Triggers DB.
- (9) خطأ Plan في الدفع — إصلاح Edge Function/RPC (بحاجة لرسالة الخطأ أو إذن فحص الـ function).

هل توافق على الخطة لأبدأ التنفيذ؟ وإذا أردت لي فحص كود Edge Function `create-booking` لتحديد سبب البند (9) بدقة أخبرني.
