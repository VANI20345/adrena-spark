-- Remove duplicate foreign key constraints
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Check and remove old bookings constraint if exists
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conname = 'bookings_event_id_fkey' 
    LOOP
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || constraint_name;
    END LOOP;
    
    -- Check and remove old events constraint if exists  
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conname = 'events_category_id_fkey'
    LOOP
        EXECUTE 'ALTER TABLE events DROP CONSTRAINT ' || constraint_name;
    END LOOP;
    
    -- Check and remove old service requests constraints if exist
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conname IN ('service_requests_event_id_fkey', 'service_requests_service_id_fkey', 'service_requests_organizer_id_fkey', 'service_requests_provider_id_fkey')
    LOOP
        EXECUTE 'ALTER TABLE service_requests DROP CONSTRAINT ' || constraint_name;
    END LOOP;
    
    -- Check and remove old reviews constraints if exist
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conname IN ('reviews_event_id_fkey', 'reviews_service_id_fkey', 'reviews_booking_id_fkey', 'reviews_user_id_fkey')
    LOOP
        EXECUTE 'ALTER TABLE reviews DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;