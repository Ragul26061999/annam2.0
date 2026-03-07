
import { supabase } from './supabase';

export const MANUFACTURER_DOMAIN = 'manufacturer';

/**
 * Fetch all unique manufacturers from medications table and ref_code table.
 */
export async function getManufacturers(): Promise<string[]> {
  try {
    // 1. Get unique manufacturers from medications table
    const { data: medData, error: medError } = await supabase
      .from('medications')
      .select('manufacturer')
      .neq('manufacturer', '')
      .not('manufacturer', 'is', null);

    // 2. Get manufacturers from ref_code table
    const { data: refData, error: refError } = await supabase
      .from('ref_code')
      .select('code')
      .eq('domain', MANUFACTURER_DOMAIN)
      .eq('active', true);

    const manufacturers = new Set<string>();

    if (medData) {
      medData.forEach((m: any) => {
        if (m.manufacturer) manufacturers.add(m.manufacturer.trim());
      });
    }

    if (refData) {
      refData.forEach((r: any) => {
        if (r.code) manufacturers.add(r.code.trim());
      });
    }

    return Array.from(manufacturers).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return [];
  }
}

/**
 * Add a new manufacturer to ref_code table to make it available in the list.
 */
export async function addManufacturer(name: string): Promise<boolean> {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) return false;

    // Check if it already exists in ref_code
    const { data: existing } = await supabase
      .from('ref_code')
      .select('id')
      .eq('domain', MANUFACTURER_DOMAIN)
      .ilike('code', trimmedName)
      .maybeSingle();

    if (existing) return true;

    const { error } = await supabase
      .from('ref_code')
      .insert({
        domain: MANUFACTURER_DOMAIN,
        code: trimmedName,
        label: trimmedName,
        active: true
      });

    if (error) {
      console.error('Error adding manufacturer:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addManufacturer:', error);
    return false;
  }
}
