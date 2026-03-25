// Complete test to simulate the exact UI sales return flow
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteUISalesReturnFlow() {
  console.log('🔍 Testing Complete UI Sales Return Flow...\n');

  try {
    // 1. Get a medication with stock
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select('*')
      .gte('available_stock', 5)
      .limit(1);

    if (medError) {
      console.error('❌ Error fetching medications:', medError);
      return;
    }

    if (!medications || medications.length === 0) {
      console.log('❌ No medications found with sufficient stock');
      return;
    }

    const testMed = medications[0];
    const originalStock = testMed.available_stock;
    console.log(`💊 Test Medication: ${testMed.name}`);
    console.log(`📊 Original Stock: ${originalStock}`);

    // 2. Create a dummy bill record (since UI expects a real bill)
    const { data: testBill, error: billError } = await supabase
      .from('billing')
      .insert({
        bill_number: `TEST-${Date.now()}`,
        customer_name: 'Test Customer',
        total_amount: 100,
        amount_paid: 100,
        payment_status: 'paid',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (billError) {
      console.error('❌ Error creating test bill:', billError);
      return;
    }

    console.log(`📋 Created Test Bill: ${testBill.bill_number}`);

    // 3. Simulate UI createSalesReturn function
    console.log('🔄 Simulating UI createSalesReturn...');
    
    const returnData = {
      bill_id: testBill.id,
      customer_name: 'Test Customer',
      return_date: new Date().toISOString().split('T')[0],
      total_amount: 100,
      status: 'draft'
    };

    const items = [{
      medication_id: testMed.id,
      batch_number: 'UI-TEST-BATCH-001',
      quantity: 1,
      unit_price: 100,
      total_amount: 100,
      restock_status: 'pending' // UI starts with pending
    }];

    // Create sales return (simulating createSalesReturn function)
    const { data: returnResult, error: returnError } = await supabase
      .from('sales_returns')
      .insert({
        return_number: `SR-${Date.now()}`,
        bill_id: returnData.bill_id,
        customer_name: returnData.customer_name,
        return_date: returnData.return_date,
        status: returnData.status,
        total_quantity: 1,
        total_amount: 100,
        net_amount: 100
      })
      .select()
      .single();

    if (returnError) {
      console.error('❌ Error creating sales return:', returnError);
      return;
    }

    console.log(`🔄 Created Sales Return: ${returnResult.return_number}`);

    // Create return items (simulating UI item insertion)
    const itemsToInsert = items.map((item) => ({
      return_id: returnResult.id,
      medication_id: item.medication_id,
      batch_number: item.batch_number,
      quantity: Number(item.quantity || 0),
      selling_rate: Number(item.unit_price || 0),
      total_amount: Number(item.total_amount || 0),
      restock_status: item.restock_status || 'pending'
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from('sales_return_items')
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting return items:', insertError);
      return;
    }

    console.log(`📦 Created Return Items: ${insertedItems.length} items (all pending status)`);

    // 4. Check stock after creating return items (should be unchanged)
    const { data: stock1, error: stockError1 } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', testMed.id)
      .single();

    if (stockError1) {
      console.error('❌ Error checking stock 1:', stockError1);
      return;
    }

    console.log(`📊 Stock after pending items: ${stock1.available_stock} (should be ${originalStock})`);

    // 5. Simulate UI processRestockSalesReturn function
    console.log('🔄 Simulating UI processRestockSalesReturn...');
    
    // Get the return items (as UI does)
    const { data: sriRows, error: sriErr } = await supabase
      .from('sales_return_items')
      .select('id, medication_id, batch_number, restock_status')
      .eq('return_id', returnResult.id);

    if (sriErr) {
      console.error('❌ Error loading return items:', sriErr);
      return;
    }

    // Build restock map (as UI does)
    const restockMap = new Map();
    items.forEach(({ item, restock }) => {
      const key = `${item.medication_id}-${item.batch_number}`;
      restockMap.set(key, restock !== undefined ? !!restock : true);
    });

    const itemsToRestock = (sriRows || []).map((r) => ({
      item_id: String(r.id),
      restock: restockMap.get(`${r.medication_id}-${r.batch_number}`) ?? 
             (String(r.restock_status || '').toLowerCase() === 'pending')
    }));

    console.log(`🔄 Processing ${itemsToRestock.length} items for restock...`);

    // Process restock (this is where the trigger should fire)
    for (const item of itemsToRestock) {
      const nextStatus = item.restock ? 'restocked' : 'disposed';
      
      const { error: updateError } = await supabase
        .from('sales_return_items')
        .update({ restock_status: nextStatus })
        .eq('id', item.item_id)
        .eq('return_id', returnResult.id);

      if (updateError) {
        console.error('❌ Error updating item:', updateError);
        return;
      }
    }

    // Update return status to completed (as UI does)
    await supabase
      .from('sales_returns')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', returnResult.id);

    console.log('✅ Sales return completed');

    // 6. Check final stock (should be original + 1)
    const { data: stock2, error: stockError2 } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', testMed.id)
      .single();

    if (stockError2) {
      console.error('❌ Error checking stock 2:', stockError2);
      return;
    }

    console.log(`📊 Final stock after restock: ${stock2.available_stock}`);
    
    // 7. Analysis
    const expectedStock = originalStock + 1;
    const actualStock = stock2.available_stock;
    const stockDifference = actualStock - originalStock;

    console.log('\n🔍 Analysis:');
    console.log(`Expected stock: ${expectedStock} (original + 1)`);
    console.log(`Actual stock: ${actualStock}`);
    console.log(`Stock difference: ${stockDifference > 0 ? '+' : ''}${stockDifference}`);
    
    if (stockDifference === 1) {
      console.log('✅ UI Flow: Stock updated correctly - increased by 1');
    } else if (stockDifference === 2) {
      console.log('❌ BUG CONFIRMED: Stock increased by 2 instead of 1!');
      console.log('🐛 The UI flow is causing the trigger to add the quantity twice');
    } else if (stockDifference === 0) {
      console.log('⚠️  Stock did not increase - trigger may not be working');
    } else {
      console.log(`❌ Unexpected stock change: ${stockDifference}`);
    }

    // 8. Check stock transactions
    console.log('\n🔍 Checking stock transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('reference_id', returnResult.id)
      .eq('reference_type', 'sales_return');

    if (transError) {
      console.error('❌ Error checking transactions:', transError);
    } else {
      console.log(`📋 Stock transactions created: ${transactions?.length || 0}`);
      transactions?.forEach((trans, index) => {
        console.log(`  ${index + 1}. Quantity: ${trans.quantity}, Notes: ${trans.notes}`);
      });
      
      if (transactions && transactions.length > 1) {
        console.log('❌ Multiple transactions created - trigger fired multiple times!');
      }
    }

    // 9. Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('sales_return_items').delete().eq('return_id', returnResult.id);
    await supabase.from('sales_returns').delete().eq('id', returnResult.id);
    await supabase.from('billing').delete().eq('id', testBill.id);
    
    // Reset stock to original value
    await supabase
      .from('medications')
      .update({ available_stock: originalStock })
      .eq('id', testMed.id);
    
    // Clean up stock transactions
    await supabase
      .from('stock_transactions')
      .delete()
      .eq('reference_id', returnResult.id);
    
    console.log('✅ Test completed and data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteUISalesReturnFlow();
