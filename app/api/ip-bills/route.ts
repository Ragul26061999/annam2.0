import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const allocationId = searchParams.get('allocation_id');
    
    let query = supabase.from('uploaded_bills').select('*');
    
    if (allocationId) {
      query = query.eq('allocation_id', allocationId);
    }
    
    const { data: bills, error } = await query.order('upload_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching uploaded bills:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, bills: bills || [] });
  } catch (error) {
    console.error('Error fetching uploaded bills:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch bills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const allocationId = formData.get('allocation_id') as string;
    const patientName = formData.get('patient_name') as string;
    const billDate = formData.get('bill_date') as string;
    const totalAmount = formData.get('total_amount') as string;
    
    if (!file || !allocationId) {
      return NextResponse.json({ success: false, error: 'File and allocation ID are required' }, { status: 400 });
    }
    
    // Convert file to base64 for Supabase storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    
    // Insert into database
    const { data, error } = await supabase.from('uploaded_bills').insert({
      allocation_id: allocationId,
      patient_name: patientName || '',
      bill_date: billDate || new Date().toISOString().split('T')[0],
      total_amount: parseFloat(totalAmount) || 0,
      file_name: file.name,
      file_type: file.type,
      file_data: base64Data,
      upload_date: new Date().toISOString()
    }).select();
    
    if (error) {
      console.error('Error uploading bill:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bill uploaded successfully',
      billId: data?.[0]?.id
    });
  } catch (error) {
    console.error('Error uploading bill:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload bill' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('bill_id');
    
    if (!billId) {
      return NextResponse.json({ success: false, error: 'Bill ID is required' }, { status: 400 });
    }
    
    const { error } = await supabase.from('uploaded_bills').delete().eq('id', billId);
    
    if (error) {
      console.error('Error deleting bill:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete bill' }, { status: 500 });
  }
}
