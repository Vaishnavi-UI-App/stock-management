import { useState, useEffect } from 'react';
import {
  Users, Search, Plus, Wallet, AlertTriangle,
  TrendingUp, TrendingDown, Phone, Mail, MapPin, X,
  Receipt, CreditCard, DollarSign, Calendar, Download, FileText
} from 'lucide-react';
import { customersApi, paymentsApi } from '../../services/api';
import type { Customer, CustomerTransaction } from '../../types';
import { jsPDF } from 'jspdf';
import '../stock/Stock.css';

export function CustomerLedger() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'advance'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    totalAdvance: 0,
    customersWithOutstanding: 0,
    customersWithAdvance: 0,
    todayCollections: 0
  });
  const [loading, setLoading] = useState(true);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch customers based on filter
      let customersData: Customer[];
      if (filter === 'outstanding') {
        customersData = await customersApi.getOutstanding();
      } else if (filter === 'advance') {
        customersData = await customersApi.getWithAdvance();
      } else {
        customersData = await customersApi.getAll();
      }
      setCustomers(customersData);

      // Fetch summary
      const summaryData = await paymentsApi.getSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerLedger = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const ledger = await customersApi.getLedger(customer.id);
      setTransactions(ledger);
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCustomer || paymentAmount <= 0) return;

    try {
      await paymentsApi.create({
        customerId: selectedCustomer.id,
        amount: paymentAmount,
        paymentMethod,
        referenceNo: paymentRef || undefined,
        notes: paymentNotes || undefined,
        isAdvance: isAdvancePayment
      });

      // Refresh data
      await fetchData();
      await viewCustomerLedger(selectedCustomer);

      // Reset form
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentMethod('cash');
      setPaymentRef('');
      setPaymentNotes('');
      setIsAdvancePayment(false);
    } catch (error: any) {
      alert(error.message || 'Failed to record payment');
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getMonthName = (month: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1];
  };

  const getQuarterMonths = (quarter: number) => {
    const quarters: { [key: number]: string } = {
      1: 'January - March',
      2: 'April - June',
      3: 'July - September',
      4: 'October - December'
    };
    return quarters[quarter];
  };

  const getDateRange = () => {
    let startDate: Date, endDate: Date;

    if (reportType === 'monthly') {
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
    } else {
      const startMonth = (selectedQuarter - 1) * 3;
      startDate = new Date(selectedYear, startMonth, 1);
      endDate = new Date(selectedYear, startMonth + 3, 0, 23, 59, 59);
    }

    return { startDate, endDate };
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { startDate, endDate } = getDateRange();
      const allCustomers = await customersApi.getAll();

      // Collect all transactions for the period
      const salesData: any[] = [];
      const paymentsData: any[] = [];

      // Customer-wise summary
      const customerSummary: { [key: string]: {
        srNo: number;
        customerId: string;
        customerName: string;
        gstin: string;
        phone: string;
        totalSales: number;
        totalPaid: number;
        openingBalance: number;
        closingBalance: number;
      }} = {};

      let srNo = 0;
      for (const customer of allCustomers) {
        const ledger = await customersApi.getLedger(customer.id, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

        if (ledger.length > 0) {
          srNo++;
          // Initialize customer summary
          if (!customerSummary[customer.id]) {
            customerSummary[customer.id] = {
              srNo,
              customerId: customer.id,
              customerName: customer.name,
              gstin: customer.gstin || '',
              phone: customer.phone,
              totalSales: 0,
              totalPaid: 0,
              openingBalance: 0,
              closingBalance: 0
            };
          }

          // Get opening balance (balance before first transaction)
          const firstTxn = ledger[0];
          if (firstTxn) {
            // Opening balance = balanceAfter - amount for first transaction
            if (firstTxn.type === 'sale') {
              customerSummary[customer.id].openingBalance = firstTxn.balanceAfter - firstTxn.amount;
            } else {
              customerSummary[customer.id].openingBalance = firstTxn.balanceAfter + firstTxn.amount;
            }
          }

          // Get closing balance (balance after last transaction)
          const lastTxn = ledger[ledger.length - 1];
          if (lastTxn) {
            customerSummary[customer.id].closingBalance = lastTxn.balanceAfter;
          }

          ledger.forEach((txn: CustomerTransaction) => {
            const taxRate = 18; // GST rate (CGST 9% + SGST 9%)
            // Taxable Value = Invoice Value / 1.18 (removing 18% GST)
            const taxableValue = txn.type === 'sale' ? txn.amount / 1.18 : 0;
            const cgst = taxableValue * 0.09; // 9% CGST
            const sgst = taxableValue * 0.09; // 9% SGST
            const totalTax = cgst + sgst;

            // Format date as DD/MM/YYYY
            const txnDate = new Date(txn.transactionDate);
            const formattedDate = `${String(txnDate.getDate()).padStart(2, '0')}/${String(txnDate.getMonth() + 1).padStart(2, '0')}/${txnDate.getFullYear()}`;

            // Get amount received for this sale from related sale data
            const amountReceived = txn.type === 'sale' && txn.sale?.amountPaid ? txn.sale.amountPaid : 0;
            // Calculate balance after: Invoice Value - Amount Received
            const balanceAfterPayment = txn.type === 'sale' ? txn.amount - amountReceived : 0;

            const row = {
              srNo: 0,
              gstin: customer.gstin || '',
              customerName: customer.name,
              phone: customer.phone,
              placeOfSupply: 'Maharashtra',
              stateCode: '27',
              invoiceNumber: txn.description?.match(/INV-\d+/)?.[0] || txn.description?.match(/PO-\d+/)?.[0] || '-',
              invoiceDate: formattedDate,
              invoiceValue: txn.amount,
              amountReceived: amountReceived,
              balanceAfterPayment: balanceAfterPayment,
              totalTaxPercent: txn.type === 'sale' ? taxRate : 0,
              taxableValue: taxableValue,
              centralTaxAmount: cgst,
              stateUtTaxAmount: sgst,
              integratedTaxAmount: 0,
              cessAmount: 0,
              totalTaxAmount: totalTax,
              type: txn.type,
              balanceAfter: txn.balanceAfter,
              description: txn.description || ''
            };

            if (txn.type === 'sale') {
              salesData.push(row);
              customerSummary[customer.id].totalSales += txn.amount;
            } else {
              paymentsData.push(row);
              customerSummary[customer.id].totalPaid += txn.amount;
            }
          });
        }
      }

      if (salesData.length === 0 && paymentsData.length === 0) {
        alert('No transactions found for the selected period');
        setIsGenerating(false);
        return;
      }

      // Add serial numbers to sales data
      salesData.forEach((row, index) => {
        row.srNo = index + 1;
      });

      // Generate CSV content in GSTR-1 style format
      const periodLabel = reportType === 'monthly'
        ? `${getMonthName(selectedMonth)} ${selectedYear}`
        : `Q${selectedQuarter} (${getQuarterMonths(selectedQuarter)}) ${selectedYear}`;

      const startDateStr = startDate.toLocaleDateString('en-IN');
      const endDateStr = endDate.toLocaleDateString('en-IN');

      let csvContent = '';

      // Company Header
      csvContent += 'DYNAMIC CROP SCIENCE PRIVATE LTD\n';
      csvContent += 'Phone No: 7020455358\n';
      csvContent += '\n';
      csvContent += `CUSTOMER LEDGER REPORT\n`;
      csvContent += `Period: ${periodLabel}\n`;
      csvContent += `Dated: ${startDateStr} to ${endDateStr}\n`;
      csvContent += '\n';

      // ==================== CUSTOMER WISE SUMMARY ====================
      csvContent += '═══════════════════════════════════════════════════════════════\n';
      csvContent += 'CUSTOMER WISE SUMMARY\n';
      csvContent += '═══════════════════════════════════════════════════════════════\n';
      csvContent += 'Formula: Balance After = Total Sales - Total Paid\n';
      csvContent += '\n';
      csvContent += 'Sr.No,Customer Name,GSTIN,Phone,Opening Balance,Total Sales,Total Paid,Balance After (Sales-Paid),Outstanding,Advance\n';

      let grandTotalSales = 0;
      let grandTotalPaid = 0;
      let grandTotalBalanceAfter = 0;
      let grandTotalOutstanding = 0;
      let grandTotalAdvance = 0;

      Object.values(customerSummary).forEach(cust => {
        // Calculate Balance After = Total Sales - Total Paid
        const balanceAfter = cust.totalSales - cust.totalPaid;
        const outstanding = balanceAfter > 0 ? balanceAfter : 0;
        const advance = balanceAfter < 0 ? Math.abs(balanceAfter) : 0;

        grandTotalSales += cust.totalSales;
        grandTotalPaid += cust.totalPaid;
        grandTotalBalanceAfter += balanceAfter;
        grandTotalOutstanding += outstanding;
        grandTotalAdvance += advance;

        csvContent += [
          cust.srNo,
          `"${cust.customerName}"`,
          cust.gstin,
          cust.phone,
          cust.openingBalance.toFixed(2),
          cust.totalSales.toFixed(2),
          cust.totalPaid.toFixed(2),
          balanceAfter.toFixed(2),
          outstanding.toFixed(2),
          advance.toFixed(2)
        ].join(',') + '\n';
      });

      // Customer Summary Totals
      csvContent += '\n';
      csvContent += `TOTAL,,,,,${grandTotalSales.toFixed(2)},${grandTotalPaid.toFixed(2)},${grandTotalBalanceAfter.toFixed(2)},${grandTotalOutstanding.toFixed(2)},${grandTotalAdvance.toFixed(2)}\n`;
      csvContent += '\n\n';

      // ==================== SALES DETAILS (GSTR-1 FORMAT) ====================
      csvContent += '\n';
      csvContent += 'SALES DETAILS\n';
      csvContent += '\n';
      // Header row - with Amount Received and Balance After columns
      csvContent += 'Invoice Date,Invoice Value,Amount Received,Balance After,Total Tax%,Taxable Value,Central Tax,State Tax,IGST,Cess,Total Tax\n';

      let totalInvoiceValue = 0;
      let totalAmountReceived = 0;
      let totalBalanceAfter = 0;
      let totalTaxableValue = 0;
      let totalCentralTax = 0;
      let totalStateTax = 0;
      let totalIntegratedTax = 0;
      let totalCess = 0;
      let totalTaxAmount = 0;

      salesData.forEach(row => {
        totalInvoiceValue += row.invoiceValue;
        totalAmountReceived += row.amountReceived;
        totalBalanceAfter += row.balanceAfterPayment;
        totalTaxableValue += row.taxableValue;
        totalCentralTax += row.centralTaxAmount;
        totalStateTax += row.stateUtTaxAmount;
        totalIntegratedTax += row.integratedTaxAmount;
        totalCess += row.cessAmount;
        totalTaxAmount += row.totalTaxAmount;

        csvContent += [
          row.invoiceDate,
          row.invoiceValue.toFixed(2),
          row.amountReceived.toFixed(2),
          row.balanceAfterPayment.toFixed(2),
          row.totalTaxPercent,
          row.taxableValue.toFixed(2),
          row.centralTaxAmount.toFixed(2),
          row.stateUtTaxAmount.toFixed(2),
          row.integratedTaxAmount.toFixed(2),
          row.cessAmount.toFixed(2),
          row.totalTaxAmount.toFixed(2)
        ].join(',') + '\n';
      });

      // Sales Total row
      csvContent += '\n';
      csvContent += [
        'TOTAL',
        totalInvoiceValue.toFixed(2),
        totalAmountReceived.toFixed(2),
        totalBalanceAfter.toFixed(2),
        '',
        totalTaxableValue.toFixed(2),
        totalCentralTax.toFixed(2),
        totalStateTax.toFixed(2),
        totalIntegratedTax.toFixed(2),
        totalCess.toFixed(2),
        totalTaxAmount.toFixed(2)
      ].join(',') + '\n';
      csvContent += '\n\n';

      // ==================== PAYMENTS RECEIVED ====================
      csvContent += '═══════════════════════════════════════════════════════════════\n';
      csvContent += 'PAYMENTS RECEIVED\n';
      csvContent += '═══════════════════════════════════════════════════════════════\n';
      csvContent += 'Sr.No,GSTIN,Customer Name,Phone,Payment Date,Payment Type,Description,Amount Received,Balance After\n';

      let totalPaymentsReceived = 0;

      paymentsData.forEach((row, index) => {
        totalPaymentsReceived += row.invoiceValue;
        csvContent += [
          index + 1,
          row.gstin,
          `"${row.customerName}"`,
          row.phone,
          row.invoiceDate,
          row.type.toUpperCase(),
          `"${row.description}"`,
          row.invoiceValue.toFixed(2),
          row.balanceAfter.toFixed(2)
        ].join(',') + '\n';
      });

      csvContent += '\n';
      csvContent += `TOTAL PAYMENTS,${paymentsData.length} Transactions,,,,,${totalPaymentsReceived.toFixed(2)},\n`;
      csvContent += '\n\n';

      // ==================== GRAND SUMMARY ====================
      csvContent += '\n';
      csvContent += 'GRAND SUMMARY\n';
      csvContent += '\n';
      csvContent += `Report Period,${periodLabel}\n`;
      csvContent += `Date Range,${startDateStr} to ${endDateStr}\n`;
      csvContent += '\n';
      csvContent += 'SALES SUMMARY\n';
      csvContent += `Total Invoices,${salesData.length}\n`;
      csvContent += `Total Invoice Value (Incl. Tax),${totalInvoiceValue.toFixed(2)}\n`;
      csvContent += `Total Amount Received,${totalAmountReceived.toFixed(2)}\n`;
      csvContent += `Total Balance After (Invoice - Received),${totalBalanceAfter.toFixed(2)}\n`;
      csvContent += `Total Taxable Value,${totalTaxableValue.toFixed(2)}\n`;
      csvContent += `Total CGST (9%),${totalCentralTax.toFixed(2)}\n`;
      csvContent += `Total SGST (9%),${totalStateTax.toFixed(2)}\n`;
      csvContent += `Total IGST,${totalIntegratedTax.toFixed(2)}\n`;
      csvContent += `Total Cess,${totalCess.toFixed(2)}\n`;
      csvContent += `Total Tax Amount (18%),${totalTaxAmount.toFixed(2)}\n`;
      csvContent += '\n';
      csvContent += 'PAYMENT SUMMARY\n';
      csvContent += `Total Payment Transactions,${paymentsData.length}\n`;
      csvContent += `Total Payments Received,${totalPaymentsReceived.toFixed(2)}\n`;
      csvContent += '\n';
      csvContent += 'BALANCE CALCULATION FORMULA\n';
      csvContent += 'Balance After = Invoice Value - Amount Received\n';
      csvContent += '\n';
      csvContent += 'BALANCE SUMMARY\n';
      csvContent += `Total Customers,${Object.keys(customerSummary).length}\n`;
      csvContent += `Total Outstanding (Receivable),${grandTotalOutstanding.toFixed(2)}\n`;
      csvContent += `Total Advance (Payable),${grandTotalAdvance.toFixed(2)}\n`;
      csvContent += `Net Balance,${(grandTotalOutstanding - grandTotalAdvance).toFixed(2)}\n`;

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const fileName = reportType === 'monthly'
        ? `Ledger_Report_${getMonthName(selectedMonth)}_${selectedYear}.csv`
        : `Ledger_Report_Q${selectedQuarter}_${selectedYear}.csv`;

      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowReportModal(false);
      alert(`Report downloaded successfully: ${fileName}`);
    } catch (error: any) {
      alert(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePartyLedger = async () => {
    if (!selectedCustomer) return;
    try {
      const ledger = await customersApi.getLedger(selectedCustomer.id);
      // Sort ascending by date
      const sorted = [...ledger].sort((a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

      // Calculate opening balance
      let openingBalance = 0;
      if (sorted.length > 0) {
        const first = sorted[0];
        openingBalance = first.type === 'sale'
          ? first.balanceAfter - first.amount
          : first.balanceAfter + first.amount;
      }

      // Total payables (sum of all debits)
      const totalPayables = sorted.reduce((sum: number, t: any) => t.type === 'sale' ? sum + t.amount : sum, 0);

      // Date range
      const firstDate = sorted.length > 0 ? new Date(sorted[0].transactionDate) : new Date();
      const lastDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1].transactionDate) : new Date();
      const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Build XLS
      let xls = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Party Ledger</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>';

      // Company Header
      xls += '<table>';
      xls += '<tr><td colspan="9" style="font-size:16px;font-weight:bold;padding:8px">Dynamic Crop Science</td></tr>';
      xls += '<tr><td colspan="9" style="padding:4px 8px;font-size:12px">Phone no: 7020455358</td></tr>';
      xls += '<tr><td colspan="9"></td></tr>';
      xls += '<tr><td colspan="9" style="text-align:right;font-size:18px;font-weight:bold;padding:8px">Party Ledger Report</td></tr>';
      xls += '<tr><td colspan="9"></td></tr>';

      // Summary box
      xls += `<tr><td colspan="5"></td><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right;font-weight:bold">Date: ${fmtDate(firstDate)} - ${fmtDate(lastDate)}</td></tr>`;
      xls += `<tr><td colspan="5"></td><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right">Total Payables  ${totalPayables.toFixed(2)}</td></tr>`;
      xls += `<tr><td colspan="5"></td><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right">Party Name  ${selectedCustomer.name}</td></tr>`;
      xls += `<tr><td colspan="5"></td><td colspan="4" style="border:1px solid #333;padding:6px;text-align:right">GSTIN  ${selectedCustomer.gstin || 'N/A'}</td></tr>`;
      xls += '<tr><td colspan="9"></td></tr>';

      // Table Header
      const thStyle = 'style="background:#f5f5f5;font-weight:bold;padding:8px;border:1px solid #999;font-size:12px"';
      xls += `<tr><td ${thStyle}>Date</td><td ${thStyle}>Voucher</td><td ${thStyle}>Sr No</td><td ${thStyle}>Payment Mode</td><td ${thStyle}>Credit</td><td ${thStyle}>Debit</td><td ${thStyle}>TDS(party)</td><td ${thStyle}>TDS(self)</td><td ${thStyle}>Balance</td></tr>`;

      const tdStyle = 'style="padding:6px 8px;border:1px solid #ccc;font-size:12px"';

      // Opening Balance row
      xls += `<tr><td ${tdStyle}></td><td ${tdStyle}>Opening Balance</td><td ${tdStyle}></td><td ${tdStyle}></td><td ${tdStyle}>${openingBalance < 0 ? Math.abs(openingBalance).toFixed(2) : ''}</td><td ${tdStyle}></td><td ${tdStyle}></td><td ${tdStyle}></td><td ${tdStyle}>${(-openingBalance).toFixed(2)}</td></tr>`;

      // Transaction rows
      let runningBalance = -openingBalance; // negative means we owe (credit), positive means they owe (debit)
      sorted.forEach((txn: any) => {
        const date = new Date(txn.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        let voucher = '';
        let srNo = '';
        let paymentMode = '';
        let credit = '';
        let debit = '';

        if (txn.type === 'sale') {
          voucher = 'Sales Invoice';
          srNo = txn.sale?.billNumber || '';
          debit = txn.amount.toFixed(1);
          runningBalance = txn.balanceAfter;
        } else {
          // payment, advance, refund, adjustment
          voucher = 'Payment-in';
          if (txn.description) {
            voucher += '\\n' + txn.description;
          }
          srNo = txn.payment?.referenceNo || '';
          paymentMode = txn.payment?.paymentMethod || '';
          credit = txn.amount.toFixed(1);
          debit = '0.0';
          runningBalance = txn.balanceAfter;
        }

        // Balance: negative = we owe them (shown as negative)
        const balanceDisplay = (-runningBalance).toFixed(2);

        xls += `<tr><td ${tdStyle}>${date}</td><td ${tdStyle}>${voucher.replace('\\n', '<br/>')}</td><td ${tdStyle}>${srNo}</td><td ${tdStyle}>${paymentMode}</td><td ${tdStyle}>${credit}</td><td ${tdStyle}>${debit}</td><td ${tdStyle}>${txn.type === 'sale' ? '0.0' : ''}</td><td ${tdStyle}></td><td ${tdStyle}>${balanceDisplay}</td></tr>`;
      });

      xls += '</table></body></html>';

      // Download
      const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Party_Ledger_${selectedCustomer.name.replace(/\s+/g, '_')}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to generate party ledger');
      console.error(error);
    }
  };

  const generatePartyLedgerPdf = async () => {
    if (!selectedCustomer) return;
    try {
      const ledger = await customersApi.getLedger(selectedCustomer.id);
      const sorted = [...ledger].sort((a: any, b: any) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
      const pdf = new jsPDF('p', 'mm', 'a4');
      const lineHeight = 6;
      let y = 12;

      const pushLine = (text: string, isHeader = false) => {
        if (y > 285) {
          pdf.addPage();
          y = 12;
        }
        pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
        pdf.setFontSize(isHeader ? 11 : 9);
        pdf.text(text, 10, y);
        y += lineHeight;
      };

      pushLine('Dynamic Crop Science - Party Ledger', true);
      pushLine(`Customer: ${selectedCustomer.name}`);
      pushLine(`Phone: ${selectedCustomer.phone}`);
      pushLine(`GSTIN: ${selectedCustomer.gstin || 'N/A'}`);
      pushLine('');
      pushLine('Date | Voucher | Method | Debit | Credit | Balance', true);

      sorted.forEach((txn: any) => {
        const date = new Date(txn.transactionDate).toLocaleDateString('en-IN');
        const voucher = txn.type === 'sale' ? (txn.sale?.billNumber || 'Sale') : 'Payment';
        const method = txn.payment?.paymentMethod || '-';
        const debit = txn.type === 'sale' ? txn.amount.toFixed(2) : '0.00';
        const credit = txn.type !== 'sale' ? txn.amount.toFixed(2) : '0.00';
        const balance = txn.balanceAfter.toFixed(2);
        pushLine(`${date} | ${voucher} | ${method} | ${debit} | ${credit} | ${balance}`);
      });

      pdf.save(`Party_Ledger_${selectedCustomer.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      alert('Failed to generate PDF ledger');
      console.error(error);
    }
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Customer Ledger</h1>
          <p>Manage customer accounts, payments, and balances</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
          <Download size={18} />
          Generate Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: '#ffebee', borderLeft: '4px solid #c62828' }}>
          <div className="stat-icon" style={{ background: '#ffcdd2' }}>
            <AlertTriangle size={24} color="#c62828" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Outstanding</span>
            <span className="stat-value" style={{ color: '#c62828' }}>
              ₹{summary.totalOutstanding.toLocaleString()}
            </span>
            <span className="stat-change">{summary.customersWithOutstanding} customers</span>
          </div>
        </div>

        <div className="stat-card" style={{ background: '#e3f2fd', borderLeft: '4px solid #1565c0' }}>
          <div className="stat-icon" style={{ background: '#bbdefb' }}>
            <Wallet size={24} color="#1565c0" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Advance</span>
            <span className="stat-value" style={{ color: '#1565c0' }}>
              ₹{summary.totalAdvance.toLocaleString()}
            </span>
            <span className="stat-change">{summary.customersWithAdvance} customers</span>
          </div>
        </div>

        <div className="stat-card" style={{ background: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
          <div className="stat-icon" style={{ background: '#c8e6c9' }}>
            <TrendingUp size={24} color="#2e7d32" />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Collection</span>
            <span className="stat-value" style={{ color: '#2e7d32' }}>
              ₹{summary.todayCollections.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCustomer ? '1fr 1.5fr' : '1fr', gap: '24px' }}>
        {/* Customer List */}
        <div className="card">
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <div className="search-bar" style={{ marginBottom: '12px' }}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn btn-sm ${filter === 'outstanding' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('outstanding')}
                style={{ background: filter === 'outstanding' ? '#c62828' : undefined }}
              >
                <TrendingDown size={14} />
                Outstanding
              </button>
              <button
                className={`btn btn-sm ${filter === 'advance' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('advance')}
                style={{ background: filter === 'advance' ? '#1565c0' : undefined }}
              >
                <TrendingUp size={14} />
                Advance
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => viewCustomerLedger(customer)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: selectedCustomer?.id === customer.id ? '#f0f9ff' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '500', color: '#1f2937' }}>{customer.name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} />
                      {customer.phone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontWeight: '600',
                      color: customer.currentBalance > 0 ? '#c62828' : customer.currentBalance < 0 ? '#1565c0' : '#2e7d32'
                    }}>
                      ₹{Math.abs(customer.currentBalance).toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: customer.currentBalance > 0 ? '#ffebee' : customer.currentBalance < 0 ? '#e3f2fd' : '#e8f5e9',
                      color: customer.currentBalance > 0 ? '#c62828' : customer.currentBalance < 0 ? '#1565c0' : '#2e7d32'
                    }}>
                      {customer.currentBalance > 0 ? 'Due' : customer.currentBalance < 0 ? 'Advance' : 'Clear'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <Users size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>No customers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details & Ledger */}
        {selectedCustomer && (
          <div className="card">
            {/* Customer Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedCustomer.name}</h2>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} /> {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.email && (
                      <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} /> {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} /> {selectedCustomer.address}
                      </span>
                    )}
                    {selectedCustomer.gstin && (
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        GSTIN: {selectedCustomer.gstin}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: selectedCustomer.currentBalance > 0 ? '#c62828' : selectedCustomer.currentBalance < 0 ? '#1565c0' : '#2e7d32'
                  }}>
                    ₹{Math.abs(selectedCustomer.currentBalance).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    background: selectedCustomer.currentBalance > 0 ? '#ffebee' : selectedCustomer.currentBalance < 0 ? '#e3f2fd' : '#e8f5e9',
                    color: selectedCustomer.currentBalance > 0 ? '#c62828' : selectedCustomer.currentBalance < 0 ? '#1565c0' : '#2e7d32'
                  }}>
                    {selectedCustomer.currentBalance > 0 ? 'Amount Due' : selectedCustomer.currentBalance < 0 ? 'Advance Balance' : 'Account Clear'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowPaymentModal(true)}
                    >
                      <Plus size={16} />
                      Record Payment
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={generatePartyLedger}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={16} />
                      Party Ledger XLS
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={generatePartyLedgerPdf}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FileText size={16} />
                      Party Ledger PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Stats */}
              <div style={{ display: 'flex', gap: '24px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Purchases</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>₹{selectedCustomer.totalPurchases.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Paid</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#2e7d32' }}>₹{selectedCustomer.totalPaid.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={16} />
                Transaction History
              </h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {transactions.length > 0 ? (
                  <table className="data-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Debit</th>
                        <th style={{ textAlign: 'right' }}>Credit</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id}>
                          <td>{formatDate(txn.transactionDate)}</td>
                          <td>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              background: txn.type === 'sale' ? '#fff3e0' : txn.type === 'payment' ? '#e8f5e9' : '#e3f2fd',
                              color: txn.type === 'sale' ? '#ef6c00' : txn.type === 'payment' ? '#2e7d32' : '#1565c0'
                            }}>
                              {txn.type}
                            </span>
                          </td>
                          <td>{txn.description}</td>
                          <td style={{ textAlign: 'right', color: '#c62828' }}>
                            {txn.type === 'sale' ? `₹${txn.amount.toLocaleString()}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: '#2e7d32' }}>
                            {txn.type !== 'sale' ? `₹${txn.amount.toLocaleString()}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '500' }}>
                            ₹{txn.balanceAfter.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No transactions found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <CreditCard size={18} />
                Record Payment
              </h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '500' }}>{selectedCustomer.name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedCustomer.phone}</div>
                <div style={{
                  marginTop: '8px',
                  fontWeight: '600',
                  color: selectedCustomer.currentBalance > 0 ? '#c62828' : '#1565c0'
                }}>
                  Current Balance: ₹{selectedCustomer.currentBalance.toLocaleString()}
                  {selectedCustomer.currentBalance > 0 ? ' (Due)' : selectedCustomer.currentBalance < 0 ? ' (Advance)' : ''}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={14} style={{ marginRight: '4px' }} />
                  Amount (₹)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount"
                  min="0"
                  style={{ fontSize: '18px', fontWeight: '600' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Bank Transfer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference No. (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Transaction/Cheque number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-input"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Any additional notes"
                  rows={2}
                />
              </div>

              {selectedCustomer.currentBalance <= 0 && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isAdvancePayment}
                      onChange={(e) => setIsAdvancePayment(e.target.checked)}
                    />
                    This is an advance payment
                  </label>
                </div>
              )}

              {paymentAmount > 0 && (
                <div style={{ padding: '12px', background: '#e8f5e9', borderRadius: '8px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Current Balance:</span>
                    <span>₹{selectedCustomer.currentBalance.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Payment:</span>
                    <span style={{ color: '#2e7d32' }}>- ₹{paymentAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', paddingTop: '8px', borderTop: '1px solid #c8e6c9' }}>
                    <span>New Balance:</span>
                    <span style={{ color: (selectedCustomer.currentBalance - paymentAmount) > 0 ? '#c62828' : '#1565c0' }}>
                      ₹{(selectedCustomer.currentBalance - paymentAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRecordPayment}
                disabled={paymentAmount <= 0}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FileText size={18} />
                Generate Ledger Report
              </h3>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setReportType('monthly')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: reportType === 'monthly' ? '2px solid #4f46e5' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: reportType === 'monthly' ? '#e0e7ff' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Calendar size={24} color={reportType === 'monthly' ? '#4f46e5' : '#6b7280'} />
                    <span style={{ fontWeight: reportType === 'monthly' ? '600' : '400', color: reportType === 'monthly' ? '#4f46e5' : '#374151' }}>
                      Monthly Report
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType('quarterly')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: reportType === 'quarterly' ? '2px solid #4f46e5' : '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: reportType === 'quarterly' ? '#e0e7ff' : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FileText size={24} color={reportType === 'quarterly' ? '#4f46e5' : '#6b7280'} />
                    <span style={{ fontWeight: reportType === 'quarterly' ? '600' : '400', color: reportType === 'quarterly' ? '#4f46e5' : '#374151' }}>
                      Quarterly Report
                    </span>
                  </button>
                </div>
              </div>

              {reportType === 'monthly' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select
                      className="form-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select
                      className="form-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Quarter</label>
                    <select
                      className="form-select"
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                    >
                      <option value={1}>Q1 (Jan - Mar)</option>
                      <option value={2}>Q2 (Apr - Jun)</option>
                      <option value={3}>Q3 (Jul - Sep)</option>
                      <option value={4}>Q4 (Oct - Dec)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select
                      className="form-select"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ padding: '16px', background: '#f0f9ff', borderRadius: '8px', marginTop: '16px' }}>
                <div style={{ fontSize: '13px', color: '#1565c0', marginBottom: '8px' }}>
                  <strong>Report Period:</strong>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0d47a1' }}>
                  {reportType === 'monthly'
                    ? `${getMonthName(selectedMonth)} ${selectedYear}`
                    : `Q${selectedQuarter} (${getQuarterMonths(selectedQuarter)}) ${selectedYear}`
                  }
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                  The report will include all customer transactions (sales, payments, advances) for this period.
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={generateReport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Download size={16} />
                    Download Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
