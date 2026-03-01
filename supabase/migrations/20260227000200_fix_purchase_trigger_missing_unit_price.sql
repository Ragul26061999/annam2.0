-- Fix trigger error: record OLD/NEW may not have unit_price column in some schemas
-- Use JSON access to safely read optional columns

BEGIN;

CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_new_qty INTEGER;
  v_old_qty INTEGER;
  v_delta_qty INTEGER;
  v_purchase_price NUMERIC;
  v_selling_price NUMERIC;
  v_effective_medication_id UUID;
  v_effective_batch_number TEXT;
  v_effective_expiry_date DATE;
  v_effective_purchase_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_qty := NEW.quantity + COALESCE(NEW.free_quantity, 0);
    v_old_qty := 0;

    v_purchase_price := COALESCE(
      (NULLIF(to_jsonb(NEW)->>'purchase_rate', ''))::NUMERIC,
      (NULLIF(to_jsonb(NEW)->>'unit_price', ''))::NUMERIC
    );
    v_selling_price := COALESCE(
      (NULLIF(to_jsonb(NEW)->>'selling_rate', ''))::NUMERIC,
      (NULLIF(to_jsonb(NEW)->>'mrp', ''))::NUMERIC
    );

    v_effective_medication_id := NEW.medication_id;
    v_effective_batch_number := NEW.batch_number;
    v_effective_expiry_date := NEW.expiry_date;
    v_effective_purchase_id := NEW.purchase_id;

  ELSIF TG_OP = 'DELETE' THEN
    v_new_qty := 0;
    v_old_qty := OLD.quantity + COALESCE(OLD.free_quantity, 0);

    v_purchase_price := COALESCE(
      (NULLIF(to_jsonb(OLD)->>'purchase_rate', ''))::NUMERIC,
      (NULLIF(to_jsonb(OLD)->>'unit_price', ''))::NUMERIC
    );
    v_selling_price := COALESCE(
      (NULLIF(to_jsonb(OLD)->>'selling_rate', ''))::NUMERIC,
      (NULLIF(to_jsonb(OLD)->>'mrp', ''))::NUMERIC
    );

    v_effective_medication_id := OLD.medication_id;
    v_effective_batch_number := OLD.batch_number;
    v_effective_expiry_date := OLD.expiry_date;
    v_effective_purchase_id := OLD.purchase_id;

  ELSIF TG_OP = 'UPDATE' THEN
    v_new_qty := NEW.quantity + COALESCE(NEW.free_quantity, 0);
    v_old_qty := OLD.quantity + COALESCE(OLD.free_quantity, 0);

    v_purchase_price := COALESCE(
      (NULLIF(to_jsonb(NEW)->>'purchase_rate', ''))::NUMERIC,
      (NULLIF(to_jsonb(NEW)->>'unit_price', ''))::NUMERIC
    );
    v_selling_price := COALESCE(
      (NULLIF(to_jsonb(NEW)->>'selling_rate', ''))::NUMERIC,
      (NULLIF(to_jsonb(NEW)->>'mrp', ''))::NUMERIC
    );

    IF NEW.medication_id IS DISTINCT FROM OLD.medication_id OR NEW.batch_number IS DISTINCT FROM OLD.batch_number THEN
      RETURN NEW;
    END IF;

    v_effective_medication_id := NEW.medication_id;
    v_effective_batch_number := NEW.batch_number;
    v_effective_expiry_date := NEW.expiry_date;
    v_effective_purchase_id := NEW.purchase_id;
  END IF;

  v_delta_qty := v_new_qty - v_old_qty;

  IF v_delta_qty <> 0 THEN
    UPDATE medications
    SET available_stock = GREATEST(0, COALESCE(available_stock, 0) + v_delta_qty),
        total_stock = GREATEST(0, COALESCE(total_stock, 0) + v_delta_qty),
        updated_at = NOW()
    WHERE id = v_effective_medication_id;

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'medicine_batches'
    ) THEN
      BEGIN
        UPDATE medicine_batches
        SET current_quantity = GREATEST(0, COALESCE(current_quantity, 0) + v_delta_qty),
            received_quantity = GREATEST(0, COALESCE(received_quantity, 0) + v_delta_qty),
            expiry_date = COALESCE(v_effective_expiry_date, expiry_date),
            purchase_price = COALESCE(v_purchase_price, purchase_price),
            selling_price = COALESCE(v_selling_price, selling_price)
        WHERE medication_id = v_effective_medication_id
          AND batch_number = v_effective_batch_number;
      EXCEPTION
        WHEN undefined_column OR invalid_column_reference THEN
          UPDATE medicine_batches
          SET current_quantity = GREATEST(0, COALESCE(current_quantity, 0) + v_delta_qty)
          WHERE batch_number = v_effective_batch_number;
        WHEN undefined_table THEN
          NULL;
      END;
    END IF;

    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, expiry_date, notes, transaction_date
    ) VALUES (
      v_effective_medication_id,
      'purchase',
      v_delta_qty,
      v_purchase_price,
      v_effective_batch_number,
      v_effective_expiry_date,
      CASE
        WHEN TG_OP = 'INSERT' THEN
          'Purchase: ' || (SELECT purchase_number FROM drug_purchases WHERE id = v_effective_purchase_id)
        WHEN TG_OP = 'DELETE' THEN
          'Purchase item removed: ' || (SELECT purchase_number FROM drug_purchases WHERE id = v_effective_purchase_id)
        ELSE
          'Purchase item updated: ' || (SELECT purchase_number FROM drug_purchases WHERE id = v_effective_purchase_id)
      END,
      NOW()
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
