// Test script to check sales return restocking logic
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSalesReturnRestocking() {
  console.log('🔍 Testing Sales Return Restocking Logic...\n');

  try {
    // 1. Find a recent billing record with items
    const { data: recentBills, error: billsError } = await supabase
      .from('billing')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (billsError) {
      console.error('❌ Error fetching bills:', billsError);
      return;
    }

    if (!recentBills || recentBills.length === 0) {
      console.log('❌ No recent bills found');
      return;
    }

    const testBill = recentBills[0];
    console.log(`📋 Testing with Bill: ${testBill.bill_number}`);

    // 2. Get bill items
    const { data: billItems, error: itemsError } = await supabase
      .from('billing_items')
      .select(`
        *,
        medication:medications(id, name, available_stock)
      `)
      .eq('bill_id', testBill.id)
      .eq('item_type', 'medicine') // Only get medicine items
      .limit(1); // Just test with 1 item

    if (itemsError) {
      console.error('❌ Error fetching bill items:', itemsError);
      return;
    }

    if (!billItems || billItems.length === 0) {
      console.log('❌ No items found in bill');
      return;
    }

    const testItem = billItems[0];
    const medicationId = testItem.item_id;
    const originalStock = testItem.medication?.available_stock || 0;
    
    console.log(`💊 Test Item: ${testItem.medication?.name}`);
    console.log(`📊 Original Stock: ${originalStock}`);
    console.log(`📦 Bill Quantity: ${testItem.quantity}`);

    // 3. Create a sales return for 1 quantity
    const { data: returnData, error: returnError } = await supabase
      .from('sales_returns')
      .insert({
        bill_id: testBill.id,
        customer_name: testBill.customer_name || 'Test Customer',
        return_date: new Date().toISOString().split('T')[0],
        refund_mode: 'cash',
        refund_amount: 0,
        total_amount: 0,
        status: 'completed'
      })
      .select()
      .single();

    if (returnError) {
      console.error('❌ Error creating sales return:', returnError);
      return;
    }

    console.log(`🔄 Created Sales Return: ${returnData.id}`);

    // 4. Create return item for 1 quantity
    const { data: returnItem, error: returnItemError } = await supabase
      .from('sales_return_items')
      .insert({
        return_id: returnData.id,
        medication_id: medicationId,
        medication_name: testItem.medication?.name || 'Test Medicine',
        batch_number: testItem.batch_number || '',
        quantity: 1, // Return 1 quantity
        unit_price: testItem.rate || 0,
        total_amount: testItem.rate || 0,
        restock_status: 'pending' // Start as pending
      })
      .select()
      .single();

    if (returnItemError) {
      console.error('❌ Error creating return item:', returnItemError);
      return;
    }

    console.log(`📦 Created Return Item: ${returnItem.id} (Qty: 1)`);

    // 5. Check stock after creating return (should be same as original)
    const { data: stockAfterReturn, error: stockError1 } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', medicationId)
      .single();

    if (stockError1) {
      console.error('❌ Error checking stock after return:', stockError1);
      return;
    }

    console.log(`📊 Stock after return creation: ${stockAfterReturn.available_stock}`);

    // 6. Process restock (this is where the issue might occur)
    console.log('🔄 Processing restock...');
    
    const { error: restockError } = await supabase
      .from('sales_return_items')
      .update({ restock_status: 'restocked' })
      .eq('id', returnItem.id);

    if (restockError) {
      console.error('❌ Error processing restock:', restockError);
      return;
    }

    // 7. Check final stock after restock
    const { data: finalStock, error: stockError2 } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', medicationId)
      .single();

    if (stockError2) {
      console.error('❌ Error checking final stock:', stockError2);
      return;
    }

    console.log(`📊 Final stock after restock: ${finalStock.available_stock}`);
    
    // 8. Analysis
    const expectedStock = originalStock + 1; // Should increase by 1
    const actualStock = finalStock.available_stock;
    const stockDifference = actualStock - originalStock;

    console.log('\n🔍 Analysis:');
    console.log(`Expected stock increase: +1`);
    console.log(`Actual stock increase: ${stockDifference > 0 ? '+' : ''}${stockDifference}`);
    
    if (stockDifference === 1) {
      console.log('✅ Stock updated correctly - increased by 1');
    } else if (stockDifference === 2) {
      console.log('❌ ISSUE DETECTED: Stock increased by 2 instead of 1!');
      console.log('🐛 This confirms the bug - returning 1 qty doubled the stock increase');
    } else if (stockDifference === 0) {
      console.log('⚠️  Stock did not increase - restock may not be working');
    } else {
      console.log(`❌ Unexpected stock change: ${stockDifference}`);
    }

    // 9. Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('sales_return_items').delete().eq('id', returnItem.id);
    await supabase.from('sales_returns').delete().eq('id', returnData.id);
    
    // Reset stock to original value
    await supabase
      .from('medications')
      .update({ available_stock: originalStock })
      .eq('id', medicationId);
    
    console.log('✅ Test completed and data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSalesReturnRestocking();
