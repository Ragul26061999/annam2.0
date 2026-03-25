// Simplified test to check actual UI behavior with existing data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRealBillSalesReturn() {
  console.log('🔍 Testing Sales Return with Real Bill...\n');

  try {
    // 1. Get a real bill with pharmacy items
    const { data: bills, error: billsError } = await supabase
      .from('billing')
      .select('id, bill_no, total')
      .order('created_at', { ascending: false })
      .limit(5);

    if (billsError) {
      console.error('❌ Error fetching bills:', billsError);
      return;
    }

    if (!bills || bills.length === 0) {
      console.log('❌ No bills found');
      return;
    }

    // Try each bill until we find one that works
    for (const testBill of bills) {
      console.log(`📋 Testing with Bill: ${testBill.bill_no}`);

      // 2. Get billing items for this bill
      const { data: billItems, error: itemsError } = await supabase
        .from('billing_items')
        .select('*')
        .eq('billing_summary_id', testBill.id)
        .limit(1);

      if (itemsError) {
        console.log(`⚠️  No items found for bill ${testBill.bill_no}, trying next...`);
        continue;
      }

      if (!billItems || billItems.length === 0) {
        console.log(`⚠️  No items for bill ${testBill.bill_no}, trying next...`);
        continue;
      }

      const testItem = billItems[0];
      
      // 3. Get a medication to test with
      const { data: medications, error: medError } = await supabase
        .from('medications')
        .select('*')
        .gte('available_stock', 5)
        .limit(1);

      if (medError || !medications || medications.length === 0) {
        console.log('❌ No suitable medications found');
        return;
      }

      const testMed = medications[0];
      const originalStock = testMed.available_stock;
      
      console.log(`💊 Test Medication: ${testMed.name}`);
      console.log(`📊 Original Stock: ${originalStock}`);

      // 4. Create sales return with this bill
      const { data: returnResult, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
          return_number: `SR-TEST-${Date.now()}`,
          bill_id: testBill.id,
          customer_name: 'Test Customer',
          return_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          total_quantity: 1,
          total_amount: 100,
          net_amount: 100
        })
        .select()
        .single();

      if (returnError) {
        console.log(`⚠️  Could not create return for bill ${testBill.bill_no}: ${returnError.message}`);
        continue;
      }

      console.log(`🔄 Created Sales Return: ${returnResult.return_number}`);

      // 5. Create return item with 1 quantity, pending status
      const { data: returnItem, error: itemError } = await supabase
        .from('sales_return_items')
        .insert({
          return_id: returnResult.id,
          medication_id: testMed.id,
          batch_number: 'TEST-BATCH-001',
          quantity: 1,
          selling_rate: 100,
          total_amount: 100,
          restock_status: 'pending'
        })
        .select()
        .single();

      if (itemError) {
        console.error('❌ Error creating return item:', itemError);
        continue;
      }

      console.log(`📦 Created Return Item: ${returnItem.id} (Qty: 1, Status: pending)`);

      // 6. Check stock after creating return item (should be unchanged)
      const { data: stock1, error: stockError1 } = await supabase
        .from('medications')
        .select('available_stock')
        .eq('id', testMed.id)
        .single();

      if (stockError1) {
        console.error('❌ Error checking stock 1:', stockError1);
        continue;
      }

      console.log(`📊 Stock after pending item: ${stock1.available_stock} (should be ${originalStock})`);

      // 7. Update the item to 'restocked' status (this should trigger the stock increase)
      console.log('🔄 Updating item status to "restocked"...');
      
      const { error: updateError } = await supabase
        .from('sales_return_items')
        .update({ restock_status: 'restocked' })
        .eq('id', returnItem.id);

      if (updateError) {
        console.error('❌ Error updating item:', updateError);
        continue;
      }

      // 8. Check final stock (should be original + 1)
      const { data: stock2, error: stockError2 } = await supabase
        .from('medications')
        .select('available_stock')
        .eq('id', testMed.id)
        .single();

      if (stockError2) {
        console.error('❌ Error checking stock 2:', stockError2);
        continue;
      }

      console.log(`📊 Final stock after restock: ${stock2.available_stock}`);
      
      // 9. Analysis
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
        console.log('🐛 This confirms the user-reported issue');
      } else if (stockDifference === 0) {
        console.log('⚠️  Stock did not increase - trigger may not be working');
      } else {
        console.log(`❌ Unexpected stock change: ${stockDifference}`);
      }

      // 10. Check stock transactions
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

      // 11. Cleanup
      console.log('\n🧹 Cleaning up test data...');
      await supabase.from('sales_return_items').delete().eq('id', returnItem.id);
      await supabase.from('sales_returns').delete().eq('id', returnResult.id);
      
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
      return; // Exit after first successful test
    }

    console.log('❌ Could not find a suitable bill for testing');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealBillSalesReturn();
