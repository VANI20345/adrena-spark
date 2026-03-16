-- حذف التصنيفات المكررة والاحتفاظ بواحد فقط من كل مجموعة
-- سنحذف التصنيفات المكررة ونبقي على الأقدم (الأصغر ID)

-- أولاً نحدد المكررات ونحذفها
DELETE FROM service_categories
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name_ar ORDER BY created_at ASC) as row_num
    FROM service_categories
  ) t
  WHERE t.row_num > 1
);

-- التأكد من أن جميع التصنيفات المتبقية نشطة
UPDATE service_categories
SET is_active = true
WHERE is_active IS NULL OR is_active = false;