import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin } from '../../../src/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = requireSupabaseAdmin();
    const searchParams = request.nextUrl.searchParams;
    const allocationId = searchParams.get('allocation_id');
    
    let query = supabase.from('uploaded_bills').select('*');
    
    if (allocationId) {
      query = query.eq('allocation_id', allocationId);
    }
    
    const { data: bills, error } = await query.order('upload_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching uploaded bills:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Failed to fetch bills from database',
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, bills: bills || [] });
  } catch (error) {
    console.error('Error fetching uploaded bills:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch bills' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    try {
      supabase = requireSupabaseAdmin();
    } catch (adminError) {
      console.error('Supabase admin client not configured:', adminError);
      return NextResponse.json({ 
        success: false, 
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not set. Please create .env.local file with SUPABASE_SERVICE_ROLE_KEY from .env.example' 
      }, { status: 500 });
    }
    
    console.log('POST /api/ip-bills - Starting upload');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const allocationId = formData.get('allocation_id') as string;
    const patientName = formData.get('patient_name') as string;
    const billDate = formData.get('bill_date') as string;
    const totalAmount = formData.get('total_amount') as string;
    
    console.log('Received data:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      allocationId, 
      patientName, 
      billDate, 
      totalAmount 
    });
    
    if (!file || !allocationId) {
      console.error('Missing required fields:', { hasFile: !!file, hasAllocationId: !!allocationId });
      return NextResponse.json({ success: false, error: 'File and allocation ID are required' }, { status: 400 });
    }
    
    // Convert file to base64 for Supabase storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    
    console.log('File converted to base64, length:', base64Data.length);
    
    // Insert into database
    const insertData = {
      allocation_id: allocationId,
      patient_name: patientName || '',
      bill_date: billDate || new Date().toISOString().split('T')[0],
      total_amount: parseFloat(totalAmount) || 0,
      file_name: file.name,
      file_type: file.type,
      file_data: base64Data,
      upload_date: new Date().toISOString()
    };
    
    console.log('Inserting into uploaded_bills:', insertData);
    
    const { data, error } = await supabase.from('uploaded_bills').insert(insertData).select();
    
    if (error) {
      console.error('Error uploading bill:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      let userFriendlyError = error.message || 'Database error occurred';
      
      // Provide more helpful message for missing table
      if (error.code === '42P01') {
        userFriendlyError = 'Database table "uploaded_bills" is missing. Please run the migration SQL script.';
      }
      
      return NextResponse.json({ 
        success: false, 
        error: userFriendlyError,
        details: error.details,
        code: error.code
      }, { status: 500 });
    }
    
    console.log('Upload successful, bill ID:', data?.[0]?.id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bill uploaded successfully',
      billId: data?.[0]?.id
    });
  } catch (error) {
    console.error('Error uploading bill:', error);
    console.error('Error stack:', (error as Error).stack);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = requireSupabaseAdmin();
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
