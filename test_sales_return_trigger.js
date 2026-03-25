// Simplified test to check sales return restocking trigger
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSalesReturnTrigger() {
  console.log('🔍 Testing Sales Return Stock Update Trigger...\n');

  try {
    // 1. Get a medication with stock
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select('*')
      .gte('available_stock', 5) // Need at least 5 items
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

    // 2. Create a test sales return
    const { data: returnData, error: returnError } = await supabase
      .from('sales_returns')
      .insert({
        bill_id: '00000000-0000-0000-0000-000000000000', // Dummy ID
        customer_name: 'Test Customer',
        return_date: new Date().toISOString().split('T')[0],
        total_amount: 100,
        status: 'completed'
      })
      .select()
      .single();

    if (returnError) {
      console.error('❌ Error creating sales return:', returnError);
      return;
    }

    console.log(`🔄 Created Sales Return: ${returnData.id}`);

    // 3. Create a return item with 1 quantity, pending status
    const { data: returnItem, error: itemError } = await supabase
      .from('sales_return_items')
      .insert({
        return_id: returnData.id,
        medication_id: testMed.id,
        batch_number: 'TEST-BATCH-001',
        quantity: 1,
        selling_rate: 100,
        total_amount: 100,
        restock_status: 'pending' // Start as pending
      })
      .select()
      .single();

    if (itemError) {
      console.error('❌ Error creating return item:', itemError);
      return;
    }

    console.log(`📦 Created Return Item: ${returnItem.id} (Qty: 1, Status: pending)`);

    // 4. Check stock after creating return item (should be unchanged)
    const { data: stock1, error: stockError1 } = await supabase
      .from('medications')
      .select('available_stock')
      .eq('id', testMed.id)
      .single();

    if (stockError1) {
      console.error('❌ Error checking stock 1:', stockError1);
      return;
    }

    console.log(`📊 Stock after pending item: ${stock1.available_stock} (should be ${originalStock})`);

    // 5. Update the item to 'restocked' status (this should trigger the stock increase)
    console.log('🔄 Updating item status to "restocked"...');
    
    const { error: updateError } = await supabase
      .from('sales_return_items')
      .update({ restock_status: 'restocked' })
      .eq('id', returnItem.id);

    if (updateError) {
      console.error('❌ Error updating item:', updateError);
      return;
    }

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
      console.log('✅ Stock updated correctly - increased by 1');
    } else if (stockDifference === 2) {
      console.log('❌ BUG CONFIRMED: Stock increased by 2 instead of 1!');
      console.log('🐛 The trigger is adding the quantity twice');
    } else if (stockDifference === 0) {
      console.log('⚠️  Stock did not increase - trigger may not be working');
    } else {
      console.log(`❌ Unexpected stock change: ${stockDifference}`);
    }

    // 8. Check if trigger fired twice by looking at stock transactions
    console.log('\n🔍 Checking stock transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('stock_transactions')
      .select('*')
      .eq('reference_id', returnData.id)
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
    await supabase.from('sales_return_items').delete().eq('id', returnItem.id);
    await supabase.from('sales_returns').delete().eq('id', returnData.id);
    
    // Reset stock to original value
    await supabase
      .from('medications')
      .update({ available_stock: originalStock })
      .eq('id', testMed.id);
    
    // Clean up stock transactions
    await supabase
      .from('stock_transactions')
      .delete()
      .eq('reference_id', returnData.id);
    
    console.log('✅ Test completed and data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSalesReturnTrigger();
