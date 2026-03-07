
import { supabase } from './supabase';

export interface DosageForm {
  id: string;
  code: string;
  label?: string;
}

export const DOSAGE_FORM_DOMAIN = 'dosage_form';

/**
 * Fetch all dosage forms from ref_code table.
 * If none found, returns a default list (but won't seed automatically to avoid side effects in getter).
 */
export async function getDosageForms(): Promise<DosageForm[]> {
  try {
    const { data, error } = await supabase
      .from('ref_code')
      .select('id, code, label, active')
      .eq('domain', DOSAGE_FORM_DOMAIN)
      .eq('active', true)
      .order('code');

    if (error) {
      console.error('Error fetching dosage forms:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDosageForms:', error);
    return [];
  }
}

/**
 * Add a new dosage form to ref_code table.
 */
export async function addDosageForm(name: string): Promise<DosageForm | null> {
  try {
    // Check if it already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('ref_code')
      .select('id, code')
      .eq('domain', DOSAGE_FORM_DOMAIN)
      .ilike('code', name)
      .single();

    if (existing) {
      console.log('Dosage form already exists:', existing);
      return existing;
    }

    const { data, error } = await supabase
      .from('ref_code')
      .insert({
        domain: DOSAGE_FORM_DOMAIN,
        code: name,
        label: `Dosage form: ${name}`,
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding dosage form:', error?.message || error);
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error in addDosageForm:', error?.message || error);
    throw error;
  }
}

/**
 * Seed initial dosage forms if the list is empty.
 */
export async function seedDosageForms(initialForms: string[]) {
  try {
    // Check for each form individually
    const { data: existing } = await supabase
      .from('ref_code')
      .select('code')
      .eq('domain', DOSAGE_FORM_DOMAIN);
    
    const existingCodes = new Set((existing || []).map((e: { code: string }) => e.code.toLowerCase()));
    
    const missingForms = initialForms.filter(f => !existingCodes.has(f.toLowerCase()));
    
    if (missingForms.length === 0) return;

    const inserts = missingForms.map(form => ({
      domain: DOSAGE_FORM_DOMAIN,
      code: form,
      label: `Dosage form: ${form}`,
      active: true
    }));

    const { error } = await supabase.from('ref_code').insert(inserts);
    if (error) console.error('Error seeding dosage forms:', error);
  } catch (error) {
    console.error('Error in seedDosageForms:', error);
  }
}
