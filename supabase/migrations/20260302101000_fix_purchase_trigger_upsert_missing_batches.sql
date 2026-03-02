-- Fix regression: purchase stock trigger was updating medicine_batches with UPDATE only.
-- If a batch row doesn't exist yet, inventory won't reflect new purchases.
-- This migration restores UPSERT behavior for INSERT operations.

BEGIN;

CREATE OR REPLACE FUNCTION update_stock_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_new_qty_packs INTEGER;
  v_old_qty_packs INTEGER;
  v_pack_size INTEGER;
  v_new_units INTEGER;
  v_old_units INTEGER;
  v_delta_units INTEGER;
  v_purchase_price NUMERIC;
  v_selling_price NUMERIC;
  v_effective_medication_id UUID;
  v_effective_batch_number TEXT;
  v_effective_expiry_date DATE;
  v_effective_purchase_id UUID;
  v_txn_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_qty_packs := NEW.quantity + COALESCE(NEW.free_quantity, 0);
    v_old_qty_packs := 0;
    v_pack_size := COALESCE(NEW.pack_size, 1);

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
    v_new_qty_packs := 0;
    v_old_qty_packs := OLD.quantity + COALESCE(OLD.free_quantity, 0);
    v_pack_size := COALESCE(OLD.pack_size, 1);

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
    v_new_qty_packs := NEW.quantity + COALESCE(NEW.free_quantity, 0);
    v_old_qty_packs := OLD.quantity + COALESCE(OLD.free_quantity, 0);
    v_pack_size := COALESCE(NEW.pack_size, OLD.pack_size, 1);

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

  v_new_units := v_new_qty_packs * GREATEST(1, v_pack_size);
  v_old_units := v_old_qty_packs * GREATEST(1, v_pack_size);
  v_delta_units := v_new_units - v_old_units;

  IF v_delta_units <> 0 THEN
    UPDATE medications
    SET available_stock = GREATEST(0, COALESCE(available_stock, 0) + v_delta_units),
        total_stock = GREATEST(0, COALESCE(total_stock, 0) + v_delta_units),
        updated_at = NOW()
    WHERE id = v_effective_medication_id;

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'medicine_batches'
    ) THEN
      BEGIN
        -- On INSERT we must ensure the batch row exists (UPSERT). For negative deltas, only update.
        IF v_delta_units > 0 THEN
          INSERT INTO medicine_batches (
            medicine_id,
            medication_id,
            batch_number,
            expiry_date,
            received_date,
            received_quantity,
            current_quantity,
            purchase_price,
            selling_price,
            supplier_id,
            status,
            notes,
            updated_at
          ) VALUES (
            v_effective_medication_id,
            v_effective_medication_id,
            v_effective_batch_number,
            v_effective_expiry_date,
            (SELECT purchase_date FROM drug_purchases WHERE id = v_effective_purchase_id),
            v_delta_units,
            v_delta_units,
            v_purchase_price,
            v_selling_price,
            (SELECT supplier_id FROM drug_purchases WHERE id = v_effective_purchase_id),
            'active',
            'Auto-created from purchase '
              || (SELECT purchase_number FROM drug_purchases WHERE id = v_effective_purchase_id),
            NOW()
          )
          ON CONFLICT (medicine_id, batch_number)
          DO UPDATE SET
            current_quantity = GREATEST(0, COALESCE(medicine_batches.current_quantity, 0) + EXCLUDED.current_quantity),
            received_quantity = GREATEST(0, COALESCE(medicine_batches.received_quantity, 0) + EXCLUDED.received_quantity),
            expiry_date = COALESCE(EXCLUDED.expiry_date, medicine_batches.expiry_date),
            purchase_price = COALESCE(EXCLUDED.purchase_price, medicine_batches.purchase_price),
            selling_price = COALESCE(EXCLUDED.selling_price, medicine_batches.selling_price),
            supplier_id = COALESCE(EXCLUDED.supplier_id, medicine_batches.supplier_id),
            received_date = COALESCE(EXCLUDED.received_date, medicine_batches.received_date),
            status = COALESCE(EXCLUDED.status, medicine_batches.status),
            updated_at = NOW();
        ELSE
          UPDATE medicine_batches
          SET current_quantity = GREATEST(0, COALESCE(current_quantity, 0) + v_delta_units),
              received_quantity = GREATEST(0, COALESCE(received_quantity, 0) + v_delta_units),
              expiry_date = COALESCE(v_effective_expiry_date, expiry_date),
              purchase_price = COALESCE(v_purchase_price, purchase_price),
              selling_price = COALESCE(v_selling_price, selling_price),
              updated_at = NOW()
          WHERE medicine_id = v_effective_medication_id
            AND batch_number = v_effective_batch_number;
        END IF;
      EXCEPTION
        WHEN undefined_column OR invalid_column_reference THEN
          -- Older schemas fallback
          UPDATE medicine_batches
          SET current_quantity = GREATEST(0, COALESCE(current_quantity, 0) + v_delta_units)
          WHERE batch_number = v_effective_batch_number;
        WHEN undefined_table THEN
          NULL;
      END;
    END IF;

    v_txn_type := CASE WHEN v_delta_units > 0 THEN 'purchase' ELSE 'purchase_return' END;

    INSERT INTO stock_transactions (
      medication_id, transaction_type, quantity, unit_price,
      batch_number, expiry_date, notes, transaction_date
    ) VALUES (
      v_effective_medication_id,
      v_txn_type,
      v_delta_units,
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

-- Ensure trigger uses the latest function
DROP TRIGGER IF EXISTS trg_update_stock_on_purchase ON drug_purchase_items;
CREATE TRIGGER trg_update_stock_on_purchase
AFTER INSERT OR UPDATE OR DELETE ON drug_purchase_items
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_purchase();

COMMIT;
