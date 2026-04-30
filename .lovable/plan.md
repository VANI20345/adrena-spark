
# خطة إعادة بناء النظام المالي — 8 مراحل صارمة

## القواعد الذهبية الحاكمة (Non-negotiable)

1. **لا يدخل أي ريال إلى أي محفظة إلا عبر `payment_holds`.**
2. **الـ 30% المحجوز لا يُحرَّر تلقائياً أبداً.** الـ 72 ساعة شرط يسمح فقط بظهور زر "Release" للأدمن.
3. **أي refund pending أو ticket مفتوح يُجمِّد التحرير حتى ولو مرت 72 ساعة.**
4. **مصدر حسابي واحد فقط** (`_shared/financial.ts`) — يحظر تكرار `calculateBreakdown`.
5. **Idempotency في كل عملية دفع** + Transactions + Locks لمنع race conditions.

---

## مخطط الدفق النهائي

```text
دفع ناجح ─▶ payment-webhook ─▶ create_payment_hold_with_split
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
              user_wallets:                payment_holds:
              balance      += 70%          status      = held
              held_balance += 30%          hold_until  = event_end + 72h

[بعد 72س + لا نزاع] cron ─▶ status = ready_for_release
                            + إشعار الأدمن (بدون أي تحويل)

[نزاع/refund pending] trigger ─▶ status = dispute_hold
                                  (يجمّد كل شيء)

[الأدمن يضغط Release يدوياً]
   └▶ release_payment_hold (admin only)
      ├─ شرط: status = ready_for_release
      ├─ شرط: لا نزاع مفتوح
      ├─ wallet: balance += 30%, held_balance -= 30%
      ├─ hold.status = released
      └─ إشعار المزود
```

---

# 🟦 المرحلة 1 — التنظيف والأساسات والمحرك الحسابي (تبدأ الآن)

### 1.1 تنظيف بيانات فاسدة
- حذف جميع `service_bookings` و `bookings` بـ `total_amount = 0` مع تبعياتها (tickets, notifications, wallet_transactions, payment_holds, payments)
- إعادة بناء `user_wallets.balance` و `held_balance` و `total_earned` من الصفر بناءً على `wallet_transactions` الصحيحة

### 1.2 قيود قاعدة البيانات (Schema Migration)
- `ALTER bookings ADD CHECK (total_amount > 0)`
- `ALTER service_bookings ADD CHECK (total_amount > 0)`
- `ALTER user_wallets ADD CHECK (balance >= 0 AND held_balance >= 0)`
- `UNIQUE INDEX payment_holds(source_id)` — منع تكرار الهولد
- إضافة قيم `'ready_for_release'` و `'dispute_hold'` لـ `payment_hold_status` enum
- إضافة `profiles.vat_number TEXT`
- إضافة `payment_holds.released_by uuid` و `released_at timestamptz` (إن لم تكن موجودة)

### 1.3 بذر `system_settings` (insert tool)
| key | value |
|---|---|
| `commission_events` | `{"percentage": 10}` |
| `commission_services` | `{"percentage": 10}` |
| `commission_training` | `{"percentage": 10}` |
| `payment_hold_hours` | `72` |
| `wallet_split_immediate_percent` | `70` |
| `platform_vat_number` | `""` |
| `refund_policy` | `{"early_days":7,"early_pct":100,"medium_days":3,"medium_pct":50,"late_pct":0}` |

### 1.4 محرك حسابي مشترك واحد
- إنشاء `supabase/functions/_shared/financial.ts`:
```text
calculateBreakdown(totalAmount, commissionRate):
  vat                = totalAmount * 15 / 115
  netAmount          = totalAmount - vat
  platformCommission = netAmount * commissionRate / 100
  commissionVat      = platformCommission * 0.15
  providerEarnings   = netAmount - platformCommission
```
- مزامنة `src/utils/financialCalculations.ts` على نفس المعادلة
- حذف كل نسخ `calculateFinancialBreakdown` المكررة من المشروع
- Type-safe: ترجع `{ total, vat, netAmount, platformCommission, commissionVat, providerEarnings }`

**مخرجات المرحلة 1:** قاعدة بيانات نظيفة + قيود تمنع تكرار الأخطاء + إعدادات مكتملة + مصدر حسابي واحد.

---

# 🟦 المرحلة 2 — توحيد مسار الدفع (Webhook موحّد)

### 2.1 إعادة كتابة `process-payment/index.ts`
- يقتصر على: تحقق المستخدم + استدعاء Moyasar + إرجاع الاستجابة
- **حذف** `processSuccessfulPayment` و `creditProviderWallet` بالكامل
- لا يلمس wallet ولا holds ولا bookings.status مطلقاً

### 2.2 إعادة كتابة `payment-webhook/index.ts` — مسار موحّد لـ 3DS وغير 3DS
```text
1. verifyPaymentWithProvider (Moyasar)
2. مطابقة المبلغ مع payments.amount
3. Idempotency: lock booking row, إذا booking.status='confirmed' → return ok
4. UPDATE payments.status='completed', booking.status='confirmed'
5. RPC: create_payment_hold_with_split   ← يكرد 70% فقط
6. RPC: generate_booking_invoices         ← فاتورة عميل + فاتورة عمولة
7. INSERT wallet_transactions(type='payment', amount=-total) للمستخدم
8. INSERT financial_transaction_logs(transaction_type='booking_payment')
9. tickets + loyalty + notifications
```

### 2.3 تحصين `create_payment_hold_with_split`
- التأكد أنها `SECURITY DEFINER` + `search_path=public`
- التأكد أن split محسوب من `provider_earnings` فقط (NET بعد العمولة)
- منع التكرار عبر `UNIQUE(source_id)` (موجود في 1.2)

---

# 🟦 المرحلة 3 — Cron للترقية فقط (لا تحرير تلقائي)

### 3.1 Edge function: `mark-holds-ready-for-review`
```text
لكل hold:
  status = 'held'
  AND complaint_extension = false
  AND hold_until <= now()
  AND NOT EXISTS (refunds WHERE booking_id = hold.source_id AND status IN ('pending','processing'))
  AND NOT EXISTS (support_tickets WHERE booking_id = hold.source_id AND status = 'open')
→ UPDATE status = 'ready_for_release'
→ INSERT notifications لكل admin/super_admin (نوع: 'hold_ready_for_review')
→ INSERT financial_transaction_logs (hold_ready_for_review)
```
- **لا تحويل أموال إطلاقاً.**

### 3.2 جدولة pg_cron (insert tool — كل ساعة)

### 3.3 Triggers على `refunds` و `support_tickets`
- فتح refund/ticket على حجز ⇒ UPDATE hold: `status='dispute_hold', complaint_extension=true`
- إغلاق آخر نزاع ⇒ إعادة الحالة إلى `held` أو `ready_for_release` حسب `hold_until`
- إشعار الأدمن في الحالتين

---

# 🟦 المرحلة 4 — التحرير اليدوي (Admin/SuperAdmin) + لوحة Holds

### 4.1 RPC `release_payment_hold` (مُعاد كتابتها)
- محصورة على `is_admin OR is_super_admin`
- ترفض إن `status != 'ready_for_release'`
- ترفض إن `complaint_extension = true`
- فحص ثانٍ: لا يوجد refund pending أو ticket open على الحجز
- عند النجاح:
  - UPDATE hold: `status='released', released_at=now(), released_by=auth.uid()`
  - UPDATE wallet: `balance += held_amount, held_balance -= held_amount`
  - INSERT wallet_transactions (type='release')
  - INSERT financial_transaction_logs (hold_released)
  - إشعار المزود

### 4.2 لوحة `PaymentHoldsTab` (Admin + SuperAdmin)
أعمدة: المزود | الحجز | المبلغ المحجوز | نهاية الفعالية | تاريخ الاستحقاق | الحالة | الإجراء

| الحالة | اللون | زر Release |
|---|---|---|
| `held` (لم تمر 72س) | رمادي | **disabled** + tooltip "متاح بعد {hold_until}" |
| `ready_for_release` | أخضر | **enabled** |
| `dispute_hold` | أحمر | **disabled** + tooltip "يوجد نزاع/استرداد مفتوح" |
| `released` / `refunded` | شفاف | مخفي |

### 4.3 إشعار `hold_ready_for_review` يظهر في bell الأدمن مع رابط مباشر

---

# 🟦 المرحلة 5 — نظام الاسترداد (Refund Flow)

### 5.1 Edge function: `process-refund` + RPC `process_booking_refund`
- المستخدم يطلب إلغاء `booking_id`
- حساب نسبة الاسترداد من `refund_policy` حسب الفرق الزمني
- INSERT refund(status='pending')
- Trigger يضع hold: `dispute_hold` + `complaint_extension=true`
- UPDATE booking.status='cancellation_requested'
- إشعار الأدمن

### 5.2 RPC `approve_refund` (admin only)
- UPDATE refund.status='completed', booking.status='cancelled'
- خصم نسبي من wallet المزود (من available + held حسب الحاجة)
- UPDATE hold.status='refunded' (أو خصم جزئي)
- INSERT wallet_transactions (type='refund', +) للمستخدم
- استدعاء بوابة الدفع لاسترداد فعلي (Moyasar refund API)
- إشعارات + financial_transaction_logs

### 5.3 واجهات
- زر "إلغاء واسترداد" في `MyEvents.tsx` و `MyServices.tsx`
- لوحة Admin: `RefundRequestsTab` (قبول/رفض)
- صفحة User: سجل الاستردادات

---

# 🟦 المرحلة 6 — السحوبات (Withdrawals)

### 6.1 إصلاح `process-withdrawal`
- لا يخصم من `balance` فوراً
- ينقل المبلغ من `balance` إلى `held_balance` كـ "قيد السحب"
- INSERT wallet_transactions (type='withdraw', status='pending')

### 6.2 لوحة `WithdrawalApprovalsTab` (Admin)
- جدول pending: المزود | المبلغ | البنك | IBAN | التاريخ
- زرّان: "تم التحويل" / "رفض"

### 6.3 RPCs
- `approve_withdrawal`: `held_balance -= amount, total_withdrawn += amount, status='completed'` + log + notify
- `reject_withdrawal`: `held_balance -= amount, balance += amount, status='rejected'` + log + notify

---

# 🟦 المرحلة 7 — الفواتير (ZATCA-Ready) + Logging موحّد

### 7.1 RPC `generate_booking_invoices`
يصدر صفّين في `platform_invoices`:
1. **فاتورة عميل** (`invoice_type='customer'`): total + VAT مستخرج + رقم ضريبي للمنصة
2. **فاتورة عمولة للمزود** (`invoice_type='commission'`): commission + commission_vat + vat_number المزود

### 7.2 صفحة "فواتيري" في `/wallet`
- المستخدم: فواتيره
- المزود: فواتير العمولات
- زر طباعة/PDF (مرحلة 8)

### 7.3 توحيد `financial_transaction_logs`
أنواع موحّدة فقط: `booking_payment`, `hold_created`, `hold_ready_for_review`, `hold_released`, `dispute_opened`, `dispute_closed`, `refund_requested`, `refund_approved`, `withdrawal_requested`, `withdrawal_completed`, `withdrawal_rejected`. كل RPC يكتب log واحد فقط.

---

# 🟦 المرحلة 8 — الواجهات النهائية + RLS Audit + PDF

### 8.1 `Wallet.tsx` (المزود) — ثلاث بطاقات منفصلة
- **متاح** = `balance` (قابل للسحب)
- **محجوز** = `held_balance` (في انتظار قرار الأدمن)
- **قيد السحب** = مجموع `wallet_transactions` pending withdraw

تحت "محجوز": قائمة `payment_holds` بنصوص واضحة:
- "سيكون قابلاً للمراجعة في {hold_until}"
- "جاهز للمراجعة من الأدمن"
- "يوجد نزاع — معلّق"

### 8.2 SuperAdmin Panel — تبويبات جديدة
- هولدز الدفع، طلبات السحب، طلبات الاسترداد

### 8.3 `FinancialDashboardTab` موحّد
- مصدر بيانات وحيد (`get_financial_dashboard_stats`)
- إضافة عدّادات: `ready_for_release`، `dispute_hold`

### 8.4 RLS Audit
- `payment_holds`, `platform_invoices`, `refunds`, `financial_transaction_logs`
- المستخدم يرى ما يخصه فقط (payer_id أو receiver_id = auth.uid())
- admin/super_admin يرون الكل
- جميع RPCs الجديدة `SECURITY DEFINER` + `search_path=public`

### 8.5 PDF فواتير ZATCA + QR Code

---

## ✅ البدء الآن: المرحلة 1 فقط

سأبدأ فور موافقتك بتنفيذ **المرحلة 1 كاملة** (التنظيف + القيود + بذر `system_settings` + الملف الحسابي المشترك `_shared/financial.ts` ومزامنة `src/utils/financialCalculations.ts`).

هل أبدأ؟
