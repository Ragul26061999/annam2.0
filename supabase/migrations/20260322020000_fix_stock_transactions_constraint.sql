-- Fix stock_transactions constraint for billing updates
-- The issue: billing updates trigger stock transactions with invalid transaction_type/quantity combinations

-- Drop the existing check constraint if it exists
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS check_transaction_quantity;

-- Create a more flexible constraint that allows billing-related adjustments
ALTER TABLE stock_transactions 
ADD CONSTRAINT check_transaction_quantity 
CHECK (
  -- Allow positive quantities for purchase transactions
  (transaction_type = 'purchase' AND quantity > 0) OR
  -- Allow negative quantities for sales/returns
  (transaction_type IN ('sale', 'adjustment', 'expired', 'return') AND quantity < 0) OR
  -- Allow zero quantity for adjustments (void transactions)
  (transaction_type = 'adjustment' AND quantity = 0) OR
  -- Allow positive quantities for return to supplier
  (transaction_type = 'purchase_return' AND quantity > 0) OR
  -- Allow negative quantities for billing adjustments
  (transaction_type = 'billing_adjustment' AND quantity <= 0) OR
  -- Allow any quantity for manual adjustments (admin use)
  (transaction_type = 'manual_adjustment')
);

-- Also ensure the transaction_type check constraint includes billing_adjustment and manual_adjustment
ALTER TABLE stock_transactions DROP CONSTRAINT IF EXISTS stock_transactions_transaction_type_check;
ALTER TABLE stock_transactions 
ADD CONSTRAINT stock_transactions_transaction_type_check 
CHECK (transaction_type IN (
  'purchase', 'sale', 'adjustment', 'return', 'expired', 
  'purchase_return', 'billing_adjustment', 'manual_adjustment'
));
