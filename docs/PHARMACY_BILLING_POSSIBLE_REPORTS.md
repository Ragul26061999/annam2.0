# Possible Reports from Pharmacy Billing Tables

Based on the tables used by `/pharmacy/billing`, the following reports can be generated:

---

## 1. Sales & Revenue Reports

### Daily Sales Summary
- **Tables**: `billing`, `billing_item`
- **Metrics**: Total sales, number of bills, average bill value, payment method breakdown
- **Filters**: Date range, staff, payment status
- **Group by**: Date, payment method, staff

### Monthly Revenue Report
- **Tables**: `billing`, `billing_item`
- **Metrics**: Monthly revenue, growth %, top-selling months
- **Filters**: Year-to-date, fiscal year
- **Group by**: Month, quarter

### Payment Method Analysis
- **Tables**: `billing`, `billing_payments`
- **Metrics**: Revenue by payment method (cash/card/online/credit), split payment trends
- **Filters**: Date range, payment status
- **Group by**: Payment method, date

---

## 2. Customer & Patient Reports

### Customer Sales History
- **Tables**: `billing`, `billing_item`, `patients`
- **Metrics**: Total spend per customer, visit frequency, average purchase
- **Filters**: Customer name, patient ID, date range
- **Group by**: Customer, patient

### Walk-in vs Registered Patients
- **Tables**: `billing`, `patients`
- **Metrics**: % walk-in vs registered, revenue comparison
- **Filters**: Date range
- **Group by**: Customer type

---

## 3. Product & Medication Reports

### Top-Selling Medicines
- **Tables**: `billing_item`, `medications`
- **Metrics**: Quantity sold, revenue per medicine, sales frequency
- **Filters**: Date range, medication category, manufacturer
- **Group by**: Medicine, category, manufacturer

### Medication Sales by Category
- **Tables**: `billing_item`, `medications`
- **Metrics**: Revenue by dosage form, combination, schedule
- **Filters**: Date range
- **Group by**: Category, dosage form, schedule

### Batch-wise Sales
- **Tables**: `billing_item`
- **Metrics**: Sales per batch number, expiry tracking
- **Filters**: Date range, batch number
- **Group by**: Batch number

---

## 4. Staff Performance Reports

### Staff Sales Performance
- **Tables**: `billing`, `staff`
- **Metrics**: Bills created, revenue generated, average bill value
- **Filters**: Staff, date range
- **Group by**: Staff member

### Staff Shift Analysis
- **Tables**: `billing`, `staff`
- **Metrics**: Sales by time of day, staff productivity
- **Filters**: Date range, time slots
- **Group by**: Hour, staff

---

## 5. Financial & Accounting Reports

### GST/Tax Reports
- **Tables**: `billing`
- **Metrics**: CGST, SGST, IGST amounts, taxable vs non-taxable sales
- **Filters**: Date range, GSTIN
- **Group by**: Date, tax type

### Discount Analysis
- **Tables**: `billing`
- **Metrics**: Total discounts, discount % by type, most discounted items
- **Filters**: Date range, discount type
- **Group by**: Discount type, staff

### Outstanding/Pending Payments
- **Tables**: `billing`
- **Metrics**: Total outstanding, aging analysis, credit bills
- **Filters**: Payment status, date range
- **Group by**: Payment status, aging buckets

---

## 6. Returns & Refunds Reports

### Sales Return Summary
- **Tables**: `sales_returns`, `sales_return_items`
- **Metrics**: Number of returns, refund amount, return reasons
- **Filters**: Date range, return status
- **Group by**: Reason, medication, staff

### Restocking Report
- **Tables**: `sales_return_items`
- **Metrics**: Items to restock, quantities, batch numbers
- **Filters**: Restock status, date range
- **Group by**: Medication, batch

---

## 7. Operational Reports

### Bill Volume Analysis
- **Tables**: `billing`
- **Metrics**: Bills per hour/day, peak times, slow periods
- **Filters**: Date range, time slots
- **Group by**: Hour, day of week

### Edit/Audit Trail
- **Tables**: `billing`
- **Metrics**: Number of edits, edit frequency, staff making edits
- **Filters**: Date range, staff
- **Group by**: Staff, date

### Payment Attachment Tracking
- **Tables**: `billing`
- **Metrics**: Bills with attachments, attachment types
- **Filters**: Date range, attachment status
- **Group by**: Staff, date

---

## 8. Advanced Analytics

### Customer Segmentation
- **Tables**: `billing`, `patients`
- **Metrics**: High-value customers, frequent buyers, one-time customers
- **Filters**: Date range, spend thresholds
- **Group by**: Customer segments

### Trend Analysis
- **Tables**: `billing`, `billing_item`
- **Metrics**: MoM growth, seasonal trends, product lifecycle
- **Filters**: Multiple date ranges
- **Group by**: Month, quarter, year

### Profitability Analysis
- **Tables**: `billing`, `billing_item`
- **Metrics**: Gross margin, discount impact, payment method costs
- **Filters**: Date range, product categories
- **Group by**: Product, category

---

## Report Generation Capabilities

### Export Formats
- PDF (for printing/archival)
- Excel (for data analysis)
- CSV (for data import)

### Scheduling
- Daily/weekly/monthly automated reports
- Email delivery options
- Dashboard real-time views

### Filtering Options
- Date ranges (custom, preset)
- Staff, customer, medication filters
- Payment status, method filters
- Multi-dimensional filters

### Visualization Types
- Bar charts (sales by category)
- Line charts (trends over time)
- Pie charts (payment methods)
- Tables (detailed data)
- Heatmaps (sales by time)

---

## Implementation Notes

- All reports can be generated using the existing tables without additional schema changes
- Reports can be built using SQL queries or BI tools
- Some reports may require joins with `medications`, `patients`, `staff` for descriptive fields
- Real-time reports can be built using database views
- Historical reports are supported due to `created_at` timestamps on all tables
