# المرحلة 3 — مراجعة الإفراج، النزاعات، ومسار الحجز المجاني

## 1) قاعدة البيانات (Migration)

### عمود + Enum للمراجعة
- إنشاء `enum hold_review_state` بالقيم: `pending`, `ready_for_release`, `dispute_hold`.
- إضافة `review_state hold_review_state NOT NULL DEFAULT 'pending'` إلى `payment_holds`.
- Index مركّب: `(status, review_state, complaint_extension, hold_until)` لتسريع cron.

### تحديث `create_payment_hold_with_split`
- ضمان `review_state = 'pending'` عند الإنشاء (بجانب `status='held'`, `complaint_extension=false`).

### دالة موحّدة `sync_hold_dispute_state(p_booking_id uuid)`
- تُستدعى من triggers على `refunds` و `support_tickets`.
- منطق:
  - إذا يوجد `refunds` بحالة `pending/processing` **أو** `support_tickets` بحالة مفتوحة (open/in_progress/pending) مرتبطة بنفس الحجز:
    - `complaint_extension = true`, `review_state = 'dispute_hold'`.
  - إذا لا يوجد أي نزاع مفتوح:
    - `complaint_extension = false`.
    - إذا `hold_until <= now()` → `review_state = 'ready_for_release'`.
    - وإلا → `review_state = 'pending'`.
- يكتب سجل في `financial_transaction_logs` لكل تغيير حالة (نوع: `hold_dispute_state_changed`)، بدون أي تحويل أموال.
- يُرسل إشعار للـ admin/super_admin عند الانتقال إلى/من `dispute_hold`.

### إضافة عمود صريح `booking_id` إلى `support_tickets`
- `ALTER TABLE support_tickets ADD COLUMN booking_id uuid` + index.
- Backfill من `metadata->>'booking_id'` إن وُجد (one-time).
- Trigger AFTER INSERT/UPDATE على `support_tickets` يستدعي `sync_hold_dispute_state(NEW.booking_id)` عندما `booking_id IS NOT NULL`.

### Triggers على `refunds`
- AFTER INSERT/UPDATE → `sync_hold_dispute_state(NEW.booking_id)`.

### دالة `mark_holds_ready_for_review()` (تُستدعى من cron)
- منطق صارم — `complaint_extension` هو المصدر الوحيد لقفل النزاع:
  ```sql
  UPDATE payment_holds
  SET review_state = 'ready_for_release', updated_at = now()
  WHERE status = 'held'
    AND review_state = 'pending'
    AND complaint_extension = false
    AND hold_until <= now()
  RETURNING id, provider_id;
  ```
- لكل سطر مُحدَّث:
  - `INSERT INTO notifications` لكل admin/super_admin (نوع: `hold_ready_for_review`).
  - `INSERT INTO financial_transaction_logs` (نوع: `hold_ready_for_review`).
- لا أي تحويل أموال.

### تثبيت الصلاحيات
- `REVOKE ALL ... FROM public/anon/authenticated` على الدوال أعلاه.
- `GRANT EXECUTE ... TO service_role` فقط.

## 2) Edge Function: `mark-holds-ready-for-review`

- ملف جديد `supabase/functions/mark-holds-ready-for-review/index.ts`.
- `verify_jwt = false` في `config.toml` + التحقق من `INTERNAL_SECRET` في الكود (header `x-internal-secret`).
- يستدعي RPC `mark_holds_ready_for_review` ويعيد ملخصاً.
- CORS قياسي + معالجة أخطاء.

### جدولة pg_cron (insert tool — كل ساعة)
- تفعيل `pg_cron` و `pg_net` (إن لم يكن مفعّلاً).
- جدولة استدعاء الدالة كل ساعة مع `x-internal-secret` header.

## 3) مسار الحجز المجاني (total_amount = 0)

ضمان عزل تام — لا يدخل أي طبقة من طبقات الدفع/المحفظة/العمولة:

### Edge Functions
- **`create-booking/index.ts`** و **`create-service-booking/index.ts`**:
  - عند `totalAmount === 0`:
    - الحجز يُنشأ بـ `status = 'confirmed'` مباشرة (موجود جزئياً، سنوحّده ونصلبه).
    - **عدم** كتابة `commission_rate`/`platform_commission`/`provider_earnings`/`vat_*` (تبقى 0/NULL).
    - **عدم** إنشاء `platform_invoices`.
    - **عدم** كتابة `financial_transaction_logs` (أو نوع منفصل `free_booking` بقيم 0 فقط للتدقيق — اختياري).
    - **عدم** إنشاء أي `payment_holds` ولا `wallet_transactions`.
    - يُنشأ التذكرة/الإشعارات للحجز المجاني فقط.

### `process-payment` و `payment-webhook`
- Guard في بداية كل واحد: إذا الحجز `total_amount = 0` → رفض فوري `400 free_booking_no_payment`.

### Frontend — `src/pages/Checkout.tsx`
- إذا الحجز المُسترجع `total_amount === 0` → عرض شاشة "تم تأكيد الحجز مجاناً" والتوجيه مباشرة إلى صفحة النجاح/التذاكر، بدون استدعاء `process-payment` ولا فتح بوابة الدفع.

## 4) قاعدة الإفراج (تثبيت معماري — للمرحلة 4)

`release_payment_hold` (المرحلة 4) سيعتمد فقط على:
```
status = 'held'
AND review_state = 'ready_for_release'
AND complaint_extension = false
```
بدون أي `NOT EXISTS` على `refunds`/`support_tickets`.

## 5) قاعدة الاسترداد (تثبيت معماري — للمرحلة 5)

عند تنفيذ refund وخصم رصيد المزود:
- إذا `wallet.balance < refund_amount` → لا تنفيذ تلقائي.
- تحويل العملية إلى `manual_review` + إشعار super_admin.
- يُطبَّق فعلياً في المرحلة 5، مُسجَّل هنا كقرار ثابت.

## ملاحظات تقنية
- جميع الدوال الجديدة `SECURITY DEFINER` + `SET search_path = public`.
- جميع triggers idempotent (لا تحدث أي شيء إن لم تتغير الحالة).
- لا تعديل على `payment_hold_status` enum (يبقى كما هو).
- التحقق من اسم/أعمدة `support_tickets` و `refunds` قبل كتابة الـ migration النهائية.
