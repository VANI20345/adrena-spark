
# خطة بناء النظام المالي المتكامل (Hawaya Financial Cycle)

## النموذج المعتمد

```
دفع ناجح → Hold (provider_earnings)
              ↓
        70% → wallet (متاح)
        30% → held (محجوز)
              ↓
   انتهاء 72س بعد الفعالية + لا نزاع → "جاهز للإفراج"
              ↓
        أدمن يضغط إفراج → 30% → wallet + Logs + Invoice
              ↓
   سحب: فقط من الرصيد المتاح (لا من المحجوز)
```

- **التقسيم 70/30** على `provider_earnings` (صافي أرباح الليدر، بعد خصم العمولة).
- عمولة المنصة + VAT تذهب كاملة للمنصة فوراً، لا تدخل دورة الحجز.
- **مدة الحجز:** 72 ساعة بعد `event_end_at` (للفعاليات/الخدمات بتاريخ نهاية)، أو 72 ساعة بعد الدفع للخدمات المفتوحة.
- **النزاع:** أي `refund` بحالة pending أو `support_ticket` مفتوح مرتبط بالحجز يفعّل `complaint_extension=true` تلقائياً عبر triggers.
- **الإفراج يدوي بالكامل** من السوبر أدمن.
- **جميع الحسابات في الـ backend** (edge functions / RPCs)، لا حسابات في الفرونت.

---

## 1) تعديلات قاعدة البيانات (Migration)

### 1.1 توسيع `payment_holds`
أعمدة جديدة تدعم تقسيم 70/30:
- `available_amount numeric` — مبلغ الـ 70% الذي تم تحريره فوراً للمحفظة (للسجل فقط).
- `held_amount numeric` — مبلغ الـ 30% المحجوز فعلياً.
- `status` يضاف إليها enum value: `under_review` (نزاع نشط).

### 1.2 توسيع `user_wallets`
- `held_balance numeric default 0` — مجموع الـ 30% المحجوز عبر كل الحجوزات (للعرض فقط، المصدر الحقيقي = `payment_holds`).

### 1.3 توسيع `system_settings`
- `platform_vat_number text` — رقم ضريبة المنصة لـ ZATCA.
- `payment_hold_hours integer default 72` — مدة الحجز قابلة للتعديل.
- `wallet_split_immediate_percent integer default 70`.

### 1.4 توسيع `profiles`
- `vat_number text nullable` — رقم ضريبة الليدر (اختياري).

### 1.5 ربط الفواتير بالعميل
- `platform_invoices.invoice_audience text` — `'customer'` أو `'provider'`.
- `platform_invoices.customer_id uuid` — للعميل.
- `platform_invoices.customer_name text`.

### 1.6 Triggers جديدة للنزاعات
- `trg_refund_flags_hold` على `refunds` (AFTER INSERT/UPDATE): إذا `status='pending'` ومرتبط بحجز له `payment_hold` → تفعيل `complaint_extension=true`, `status='under_review'`, `complaint_reason='refund_request'`.
- `trg_support_ticket_flags_hold` على `support_tickets` (AFTER INSERT/UPDATE): نفس المنطق إذا الـ ticket مرتبط ببحجز.
- `trg_dispute_resolved_unflags_hold` (AFTER UPDATE على refunds/tickets): إذا أُغلقت كل النزاعات على نفس الحجز → `complaint_extension=false`, status يعود `held`.

### 1.7 RPCs جديدة (كلها SECURITY DEFINER)
- **`create_payment_hold_with_split(p_booking_id, p_booking_type)`** — تستدعى من webhook/verify-payment داخل المعاملة. تنشئ الـ hold، تضيف 70% للمحفظة، تسجل `wallet_transactions` (type='earning')، تسجل في `financial_transaction_logs`.
- **`release_payment_hold(p_hold_id, p_notes)`** — تُحدّث (لا تستبدل المنطق الحالي). تضيف المنطق الكامل: تحويل `held_amount` للمحفظة، إنشاء `wallet_transactions` (type='release')، تسجيل في `financial_transaction_logs`.
- **`generate_booking_invoices(p_booking_id, p_booking_type)`** — تنشئ فاتورتين (customer + provider) في `platform_invoices`.
- **`get_provider_available_balance(p_user_id)`** — للسحب: ترجع فقط الرصيد القابل للسحب (يستثني `held_balance`).
- **`get_financial_dashboard_stats()`** — موحدة لإحصائيات لوحة السوبر أدمن: إجمالي المدفوعات، أرباح المنصة، أرباح الليدرز، المحجوز، المتاح.

### 1.8 RLS
- `platform_invoices`: SELECT للعميل (customer_id) ولليدر (provider_id) وللسوبر أدمن.
- باقي الجداول: السوبر أدمن فقط للعرض الكامل، الليدر لسجلاته.

---

## 2) تعديلات Edge Functions

### 2.1 `payment-webhook` و `verify-payment`
استبدال منطق التتبع المتفرّق بـ:
1. تحديث الحجز إلى `confirmed`.
2. استدعاء **RPC واحد** `create_payment_hold_with_split` (يقوم بكل شيء داخل معاملة).
3. إنشاء فاتورتين عبر `generate_booking_invoices`.
4. إرسال إشعارات (4 إشعارات):
   - للعميل: "تم الدفع بنجاح"
   - للّيدر: "تم شراء تذكرة جديدة" + التفاصيل.
   - للأدمنز والسوبر أدمنز: "عملية دفع جديدة" + اسم الفعالية + اسم الليدر + المبلغ.

حذف الحسابات اليدوية الحالية في الـ webhook (commission/vat). كل الحسابات تتم في الـ RPC.

### 2.2 `process-withdrawal`
استبدال فحص الرصيد:
- بدلاً من `wallet.balance - 50`، استدعاء `get_provider_available_balance(userId)`.
- إضافة فحص: لا يمكن سحب أي مبلغ إذا كان جزء منه ضمن `held_amount`.

### 2.3 إدارة النزاعات
لا حاجة لـ edge function جديدة - الـ triggers تتولى ذلك تلقائياً.

### 2.4 إشعار "جاهز للإفراج" (اختياري - cron)
cron job يومي يبحث عن holds جاهزة منذ ≥24 ساعة بدون إفراج، ويرسل إشعار للسوبر أدمن.

---

## 3) تعديلات الواجهة (Super Admin Financial Dashboard)

### 3.1 `FinancialDashboardTab.tsx`
- استبدال البطاقات الإحصائية الحالية بـ `get_financial_dashboard_stats()`:
  - إجمالي المدفوعات
  - إجمالي أرباح المنصة (عمولة + VAT)
  - إجمالي أرباح الليدرز
  - **الأموال المحجوزة** (مجموع `held_amount`)
  - **الأموال المتاحة** (مجموع `available_amount` المحرّر)

### 3.2 `PaymentHoldsSection.tsx` (تحديث شامل)
- عرض `held_amount` و `available_amount` بشكل منفصل في الجدول.
- شارة جديدة `under_review` (لون أحمر داكن) للنزاعات النشطة.
- زر "إفراج" معطّل إذا `complaint_extension=true` مع رسالة "نزاع مفتوح".
- إضافة فلتر بالحالة: held / ready / under_review / released.
- إضافة Pagination (20 سجل/صفحة).

### 3.3 قسم جديد: `FinancialAuditLogSection.tsx`
- يعرض `financial_transaction_logs` مع:
  - فلترة حسب النوع (booking_payment, wallet_credit, hold_release, withdrawal, refund).
  - فلترة بالتاريخ.
  - Pagination.
  - تصدير CSV.

### 3.4 الواجهة للّيدر (`Wallet.tsx`)
- عرض الرصيد المتاح (للسحب) منفصل عن الرصيد المحجوز.
- بطاقة "أموالك المحجوزة" مع شرح: "ستُحرّر بعد X ساعة من انتهاء الفعالية".
- قائمة الفواتير الخاصة به (provider invoices).

### 3.5 الواجهة للعميل (`Profile.tsx` أو صفحة جديدة)
- زر "فواتيري" يعرض كل `platform_invoices` بـ `customer_id = user.id`.

### 3.6 حذف أي حسابات مالية في الفرونت
- مراجعة `useFinancialCalculations.ts` — يبقى للعرض فقط (تحويل عملات/تنسيق)، لا للحسابات الجوهرية.
- إزالة أي حسابات يدوية في `Checkout.tsx` و `ServiceBooking.tsx` — استدعاء RPC لجلب الـ breakdown.

---

## 4) نظام الإشعارات الكامل

أنواع جديدة في `notifications.type`:

| Trigger | المستلم | النوع |
|---|---|---|
| دفع ناجح | العميل | `payment_success` |
| دفع ناجح | الليدر | `new_booking_received` |
| دفع ناجح | كل أدمن/سوبر أدمن | `admin_new_payment` |
| فتح نزاع (refund/ticket) | السوبر أدمن + الليدر | `payment_dispute_opened` |
| إفراج عن hold | الليدر | `funds_released` |
| رفض الإفراج (لاحقاً) | الليدر | `release_rejected` |
| تنفيذ سحب | الليدر | `withdrawal_processed` |
| hold جاهز للإفراج | السوبر أدمن | `hold_ready_for_release` |

---

## 5) ترتيب التنفيذ

1. **Migration** (الجداول + الـ enums + RPCs + Triggers + RLS).
2. تحديث `payment-webhook` و `verify-payment` لاستخدام الـ RPC الموحّد.
3. تحديث `process-withdrawal` لاستخدام `get_provider_available_balance`.
4. تحديث `PaymentHoldsSection` و `FinancialDashboardTab`.
5. إضافة `FinancialAuditLogSection`.
6. تحديث صفحة `Wallet` للّيدر (رصيد متاح / محجوز / فواتير).
7. إضافة عرض فواتير العميل في `Profile`.
8. إضافة cron job لإشعار "جاهز للإفراج" (اختياري).

---

## نقاط تقنية مهمة

- جميع العمليات المالية الحرجة (إنشاء hold + خصم/إضافة محفظة + لوغ) **في RPC واحد** لضمان الـ atomicity.
- الـ triggers على refunds/tickets تستخدم `SECURITY DEFINER` للوصول لـ `payment_holds`.
- لا يتم حذف أي بيانات مالية - الإفراج = تحديث status فقط.
- جميع المبالغ بـ `numeric` (لا `float`) لتجنب أخطاء التقريب.
- التواريخ بـ `timestamp with time zone`.
- بعد التنفيذ: `useFinancialCalculations` يبقى لعرض breakdown قبل الدفع فقط (بدون كتابة).

هل تريد المتابعة بهذه الخطة؟
