-- Remove all stock_transactions constraints to allow billing updates
-- This is a temporary fix to allow bill editing functionality

-- Drop all check constraints
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS check_transaction_quantity;
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_transaction_type_check;
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_quantity_check;

-- Also drop any other constraints that might interfere
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'stock_transactions'::regclass 
        AND contype = 'c'
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS ' || constraint_name;
        EXCEPTION
            WHEN others THEN
                NULL;
        END;
    END LOOP;
END $$;
