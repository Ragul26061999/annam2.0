const { getIPComprehensiveBilling } = require('./src/lib/ipBillingService');

getIPComprehensiveBilling('fa17595b-e137-4450-99db-9d446f6c7924')
  .then(data => console.log('Service works:', data))
  .catch(err => console.error('Service error:', err));
