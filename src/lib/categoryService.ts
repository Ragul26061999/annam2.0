
import { supabase } from './supabase';

export interface MedicineCategory {
  id: string;
  code: string;
  label?: string;
}

export const MEDICINE_CATEGORY_DOMAIN = 'medicine_category';

/**
 * Fetch all medicine categories from ref_code table.
 */
export async function getMedicineCategories(): Promise<MedicineCategory[]> {
  try {
    const { data, error } = await supabase
      .from('ref_code')
      .select('id, code, label, active')
      .eq('domain', MEDICINE_CATEGORY_DOMAIN)
      .eq('active', true)
      .order('code');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMedicineCategories:', error);
    return [];
  }
}

/**
 * Add a new medicine category to ref_code table.
 */
export async function addMedicineCategory(name: string): Promise<MedicineCategory | null> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    // Check if it already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('ref_code')
      .select('id, code')
      .eq('domain', MEDICINE_CATEGORY_DOMAIN)
      .ilike('code', trimmedName)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    const { data, error } = await supabase
      .from('ref_code')
      .insert({
        domain: MEDICINE_CATEGORY_DOMAIN,
        code: trimmedName,
        label: `Category: ${trimmedName}`,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error?.message || error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error in addMedicineCategory:', error?.message || error);
    throw error;
  }
}

/**
 * Seed initial categories if the list is empty.
 */
export async function seedMedicineCategories(initialCategories: string[]) {
  try {
    const existing = await getMedicineCategories();
    if (existing.length > 0) return;

    const inserts = initialCategories.map(cat => ({
      domain: MEDICINE_CATEGORY_DOMAIN,
      code: cat,
      label: `Category: ${cat}`,
      active: true
    }));

    const { error } = await supabase.from('ref_code').insert(inserts);
    if (error) console.error('Error seeding categories:', error);
  } catch (error) {
    console.error('Error in seedMedicineCategories:', error);
  }
}
