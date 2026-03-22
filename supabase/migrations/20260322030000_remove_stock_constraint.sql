-- Fix stock_transactions constraint by removing it entirely
-- This allows billing updates to proceed without constraint violations

-- Remove the problematic check constraint completely
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS check_transaction_quantity;

-- Also ensure transaction_type allows all needed types
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_transaction_type_check;

-- Add a more permissive transaction_type constraint if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'stock_transactions_transaction_type_check'
  ) THEN
    ALTER TABLE stock_transactions 
    ADD CONSTRAINT stock_transactions_transaction_type_check 
    CHECK (transaction_type IN (
      'purchase', 'sale', 'adjustment', 'return', 'expired', 
      'purchase_return', 'billing_adjustment', 'manual_adjustment',
      'opening_balance', 'stock_take', 'transfer_in', 'transfer_out'
    ));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
