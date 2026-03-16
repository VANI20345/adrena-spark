-- First, set all invalid category_ids to NULL
UPDATE services 
SET category_id = NULL 
WHERE category_id NOT IN (SELECT id FROM service_categories);

-- Drop incorrect foreign keys pointing to categories table
ALTER TABLE services DROP CONSTRAINT IF EXISTS fk_services_category_id;
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_id_fkey;

-- Add correct foreign key to service_categories table
ALTER TABLE services 
ADD CONSTRAINT services_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES service_categories(id) 
ON DELETE SET NULL;