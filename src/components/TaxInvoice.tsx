import { forwardRef } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import type { Sale } from '../types';
import { useStore } from '../store/useStore';
import './TaxInvoice.css';

interface TaxInvoiceProps {
  sale: Sale;
  companyDetails?: {
    name: string;
    address: string;
    gstin: string;
    pan: string;
    mobile: string;
    email: string;
    website: string;
    stateName: string;
    stateCode: string;
  };
  bankDetails?: {
    name: string;
    accountNo: string;
    ifscCode: string;
    bank: string;
    branch: string;
    upiId: string;
  };
  deliveryDetails?: {
    deliveryNote?: string;
    referenceNo?: string;
    referenceDate?: string;
    buyersOrderNo?: string;
    buyersOrderDate?: string;
    dispatchDocNo?: string;
    dispatchedThrough?: string;
    billOfLadingNo?: string;
    paymentTerms?: string;
    otherReferences?: string;
    deliveryNoteDate?: string;
    destination?: string;
    poNumber?: string;
    vehicleNo?: string;
  };
}

// Convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  }

  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);
  const paise = Math.round((num % 1) * 100);

  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder) result += convertLessThanThousand(remainder);

  result = result.trim() + ' Rupees';
  if (paise) result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  result += ' Only';

  return result;
}

export const TaxInvoice = forwardRef<HTMLDivElement, TaxInvoiceProps>(({
  sale,
  companyDetails = {
    name: 'Dynamic Crop Science',
    address: 'Office 707, B wing, Tanish Park, Alandi Road, Charoli Bk, PUNE\nFACTORY: Bamboli, Chakan MIDC PHASE-II, CHAKAN, Pune,\nMaharashtra, 412105',
    gstin: '27AAWFD2451Q1ZN',
    pan: 'AAWFD2451Q',
    mobile: '7020455358',
    email: 'dynamiccropscience@gmail.com',
    website: 'www.dynamiccrops.com',
    stateName: 'Maharashtra',
    stateCode: '27'
  },
  bankDetails = {
    name: 'DYNAMIC CROP SCIENCE',
    accountNo: '9349370447',
    ifscCode: 'KKBK0001774',
    bank: 'Kotak Mahindra Bank',
    branch: 'BHOSARI BRANCH',
    upiId: '7276291431@kotak'
  },
  deliveryDetails = {
    deliveryNote: '',
    referenceNo: '',
    referenceDate: '',
    buyersOrderNo: '',
    buyersOrderDate: '',
    dispatchDocNo: '',
    dispatchedThrough: '',
    paymentTerms: '',
    otherReferences: '',
    deliveryNoteDate: '',
    destination: '',
    poNumber: '',
    vehicleNo: ''
  }
}, ref) => {
  const { getProductById, getUserById } = useStore();
  const salesman = getUserById(sale.salesmanId);

  // Get GST rates from sale or use defaults
  const cgstRate = sale.cgstRate || 2.5;
  const sgstRate = sale.sgstRate || 2.5;
  const totalGstRate = cgstRate + sgstRate;

  // Merge delivery details from sale with defaults
  const mergedDeliveryDetails = {
    deliveryNote: sale.deliveryNote || deliveryDetails.deliveryNote || '',
    referenceNo: sale.referenceNo || deliveryDetails.referenceNo || '',
    referenceDate: deliveryDetails.referenceDate || '',
    buyersOrderNo: sale.buyersOrderNo || deliveryDetails.buyersOrderNo || '',
    buyersOrderDate: sale.buyersOrderDate || deliveryDetails.buyersOrderDate || '',
    dispatchDocNo: sale.dispatchDocNo || deliveryDetails.dispatchDocNo || '',
    dispatchedThrough: sale.dispatchedThrough || deliveryDetails.dispatchedThrough || '',
    paymentTerms: sale.modeOfPayment || deliveryDetails.paymentTerms || '',
    otherReferences: sale.otherReferences || deliveryDetails.otherReferences || '',
    deliveryNoteDate: sale.deliveryNoteDate || deliveryDetails.deliveryNoteDate || '',
    destination: sale.destination || deliveryDetails.destination || '',
    poNumber: sale.poNumber || deliveryDetails.poNumber || '',
    vehicleNo: sale.vehicleNo || deliveryDetails.vehicleNo || ''
  };

  // Calculate GST breakdown by HSN
  const hsnSummary: { [key: string]: { taxableValue: number; cgst: number; sgst: number; total: number } } = {};
  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;

  sale.items.forEach(item => {
    const product = getProductById(item.productId);
    const hsn = item.hsnCode || product?.sku || '';

    // Price is inclusive of GST, calculate backwards using sale's GST rates
    const taxableValue = (item.total * 100) / (100 + totalGstRate);
    const cgst = (taxableValue * cgstRate) / 100;
    const sgst = (taxableValue * sgstRate) / 100;

    totalTaxableValue += taxableValue;
    totalCGST += cgst;
    totalSGST += sgst;

    if (hsn) {
      if (!hsnSummary[hsn]) {
        hsnSummary[hsn] = { taxableValue: 0, cgst: 0, sgst: 0, total: 0 };
      }
      hsnSummary[hsn].taxableValue += taxableValue;
      hsnSummary[hsn].cgst += cgst;
      hsnSummary[hsn].sgst += sgst;
      hsnSummary[hsn].total += cgst + sgst;
    }
  });

  const invoiceDate = format(new Date(sale.saleDate), 'dd-MMM-yy');

  return (
    <div className="tax-invoice" ref={ref}>
      {/* Header */}
      <div className="invoice-header-title">
        <h2>Tax Invoice</h2>
      </div>

      {/* Main Header Section */}
      <div className="invoice-header-section">
        {/* Left Side - Company & Addresses */}
        <div className="header-left-column">
          {/* Company Details */}
          <div className="company-box">
            <p className="company-name-bold">{companyDetails.name}</p>
            <p className="company-addr">{companyDetails.address}</p>
            <p>GSTIN/UIN: {companyDetails.gstin}</p>
            <p>State Name : {companyDetails.stateName}, Code : {companyDetails.stateCode}</p>
            <p>E-Mail : {companyDetails.email}</p>
          </div>

          {/* Consignee (Ship to) and Buyer (Bill to) - Side by Side */}
          <div className="address-row">
            <div className="address-box-half">
              <p className="address-label">Consignee (Ship to)</p>
              <p className="customer-name-bold">{sale.customerName}</p>
              <p>{sale.customerAddress || ''}</p>
              {sale.customerGSTIN && <p>GSTIN/UIN : {sale.customerGSTIN}</p>}
              <p>State Name : {companyDetails.stateName}, Code : {companyDetails.stateCode}</p>
            </div>
            <div className="address-box-half">
              <p className="address-label">Buyer (Bill to)</p>
              <p className="customer-name-bold">{sale.customerName}</p>
              <p>{sale.customerAddress || ''}</p>
              {sale.customerGSTIN && <p>GSTIN/UIN : {sale.customerGSTIN}</p>}
              <p>State Name : {companyDetails.stateName}, Code : {companyDetails.stateCode}</p>
            </div>
          </div>
        </div>

        {/* Right Side - Invoice Details Grid */}
        <div className="header-right-column">
          <table className="invoice-details-table">
            <tbody>
              <tr>
                <td className="detail-label">Invoice No.</td>
                <td className="detail-value">{sale.billNumber}</td>
                <td className="detail-label">Dated</td>
                <td className="detail-value">{invoiceDate}</td>
              </tr>
              <tr>
                <td className="detail-label">Delivery Note</td>
                <td className="detail-value">{mergedDeliveryDetails.deliveryNote}</td>
                <td className="detail-label">Mode/Terms of Payment</td>
                <td className="detail-value">{mergedDeliveryDetails.paymentTerms}</td>
              </tr>
              <tr>
                <td className="detail-label">Reference No. & Date.</td>
                <td className="detail-value">
                  {mergedDeliveryDetails.referenceNo}
                  {mergedDeliveryDetails.referenceDate && ` dt. ${mergedDeliveryDetails.referenceDate}`}
                </td>
                <td className="detail-label">Other References</td>
                <td className="detail-value">{mergedDeliveryDetails.otherReferences}</td>
              </tr>
              <tr>
                <td className="detail-label">Buyer's Order No.</td>
                <td className="detail-value">{mergedDeliveryDetails.buyersOrderNo}</td>
                <td className="detail-label">Dated</td>
                <td className="detail-value">{mergedDeliveryDetails.buyersOrderDate}</td>
              </tr>
              <tr>
                <td className="detail-label">Dispatch Doc No.</td>
                <td className="detail-value">{mergedDeliveryDetails.dispatchDocNo}</td>
                <td className="detail-label">Delivery Note Date</td>
                <td className="detail-value">{mergedDeliveryDetails.deliveryNoteDate}</td>
              </tr>
              <tr>
                <td className="detail-label">Dispatched through</td>
                <td className="detail-value">{mergedDeliveryDetails.dispatchedThrough}</td>
                <td className="detail-label">Destination</td>
                <td className="detail-value">{mergedDeliveryDetails.destination}</td>
              </tr>
              <tr>
                <td className="detail-label">PO Number</td>
                <td className="detail-value">{mergedDeliveryDetails.poNumber}</td>
                <td className="detail-label">Vehicle No.</td>
                <td className="detail-value">{mergedDeliveryDetails.vehicleNo}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <div className="invoice-items-section">
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th className="col-sno">S.NO.</th>
              <th className="col-item">ITEMS</th>
              <th className="col-hsn">HSN</th>
              <th className="col-batch">BATCH NO.</th>
              <th className="col-exp">EXP. DATE</th>
              <th className="col-mfg">MFG DATE</th>
              <th className="col-qty">QTY.</th>
              <th className="col-rate">RATE</th>
              <th className="col-amount">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => {
              const product = getProductById(item.productId);
              return (
                <tr key={index}>
                  <td className="col-sno">{index + 1}</td>
                  <td className="col-item">{item.productName} {item.unit || product?.unit || ''}</td>
                  <td className="col-hsn">{item.hsnCode || product?.sku || '-'}</td>
                  <td className="col-batch">{item.batchNo || '-'}</td>
                  <td className="col-exp">{item.expDate || '-'}</td>
                  <td className="col-mfg">{item.mfgDate || '-'}</td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-rate">{item.price}</td>
                  <td className="col-amount">{item.total.toLocaleString()}</td>
                </tr>
              );
            })}
            {/* Empty rows to maintain format */}
            {Array.from({ length: Math.max(0, 5 - sale.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="empty-row">
                <td className="col-sno">&nbsp;</td>
                <td className="col-item"></td>
                <td className="col-hsn"></td>
                <td className="col-batch"></td>
                <td className="col-exp"></td>
                <td className="col-mfg"></td>
                <td className="col-qty"></td>
                <td className="col-rate"></td>
                <td className="col-amount"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* GST Summary */}
      <div className="invoice-gst-section">
        <div className="gst-rows">
          <div className="gst-row">
            <span className="gst-label">CGST @{cgstRate}%</span>
            <span className="gst-dash">-</span>
            <span className="gst-dash">-</span>
            <span className="gst-value">₹ {totalCGST.toFixed(2)}</span>
          </div>
          <div className="gst-row">
            <span className="gst-label">SGST @{sgstRate}%</span>
            <span className="gst-dash">-</span>
            <span className="gst-dash">-</span>
            <span className="gst-value">₹ {totalSGST.toFixed(2)}</span>
          </div>
          <div className="gst-row total-row">
            <span className="gst-label"><strong>TOTAL</strong></span>
            <span></span>
            <span className="total-qty"><strong>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></span>
            <span className="gst-value total-amount"><strong>₹ {sale.finalAmount.toLocaleString()}</strong></span>
          </div>
          <div className="gst-row" style={{ borderTop: '1px dashed #cbd5e0' }}>
            <span className="gst-label" style={{ color: '#22863a' }}>Amount Paid</span>
            <span></span>
            <span></span>
            <span className="gst-value" style={{ color: '#22863a', fontWeight: 600 }}>₹ {(sale.amountPaid || 0).toLocaleString()}</span>
          </div>
          <div className="gst-row">
            <span className="gst-label" style={{ color: (sale.balanceDue || 0) > 0 ? '#c62828' : '#22863a', fontWeight: 600 }}>
              {(sale.balanceDue || 0) > 0 ? 'Balance Due' : 'Fully Paid'}
            </span>
            <span></span>
            <span></span>
            <span className="gst-value" style={{ color: (sale.balanceDue || 0) > 0 ? '#c62828' : '#22863a', fontWeight: 700, fontSize: '14px' }}>
              ₹ {(sale.balanceDue || 0).toLocaleString()}
            </span>
          </div>
        </div>
        {/* Salesman Info & Location */}
        <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f0f4f8', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#4a5568' }}>Bill Created By: <strong style={{ color: '#2d3748' }}>{salesman?.name || 'N/A'}</strong></span>
          {sale.billLocation && (
            <a
              href={sale.billLocation.includes('google.com/maps') ? sale.billLocation : `https://www.google.com/maps/search/${encodeURIComponent(sale.billLocation)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '11px', color: '#1565c0', textDecoration: 'underline', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              📍 {sale.billLocation}
            </a>
          )}
        </div>
      </div>

      {/* HSN Summary Table */}
      <div className="invoice-hsn-section">
        <table className="hsn-table">
          <thead>
            <tr>
              <th>HSN/SAC</th>
              <th>Taxable Value</th>
              <th colSpan={2}>CGST</th>
              <th colSpan={2}>SGST</th>
              <th>Total Tax Amount</th>
            </tr>
            <tr className="sub-header">
              <th></th>
              <th></th>
              <th>Rate</th>
              <th>Amount</th>
              <th>Rate</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(hsnSummary).map(([hsn, data]) => (
              <tr key={hsn}>
                <td>{hsn}</td>
                <td>{data.taxableValue.toFixed(2)}</td>
                <td>{cgstRate}%</td>
                <td>{data.cgst.toFixed(2)}</td>
                <td>{sgstRate}%</td>
                <td>{data.sgst.toFixed(2)}</td>
                <td>₹ {data.total.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="hsn-total-row">
              <td><strong>Total</strong></td>
              <td><strong>{totalTaxableValue.toFixed(2)}</strong></td>
              <td></td>
              <td><strong>{totalCGST.toFixed(2)}</strong></td>
              <td></td>
              <td><strong>{totalSGST.toFixed(2)}</strong></td>
              <td><strong>₹ {(totalCGST + totalSGST).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div className="invoice-amount-words">
        <h4>Total Amount (in words)</h4>
        <p>{numberToWords(sale.finalAmount)}</p>
      </div>

      {/* Footer Section */}
      <div className="invoice-footer-section">
        <div className="bank-details">
          <h4>Bank Details</h4>
          <table className="bank-table">
            <tbody>
              <tr>
                <td>Name:</td>
                <td>{bankDetails.name}</td>
              </tr>
              <tr>
                <td>IFSC Code:</td>
                <td>{bankDetails.ifscCode}</td>
              </tr>
              <tr>
                <td>Account No:</td>
                <td>{bankDetails.accountNo}</td>
              </tr>
              <tr>
                <td>Bank:</td>
                <td>{bankDetails.bank}, {bankDetails.branch}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="payment-qr-box">
          <div className="payment-qr-content">
            <div className="payment-qr-info">
              <h4 className="payment-title">Payment QR Code</h4>
              <p className="upi-label">UPI ID:</p>
              <p className="upi-value">{bankDetails.upiId}</p>
              <div className="payment-apps">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%235f259f'/%3E%3Cpath d='M9 6h2.5l4 6-4 6H9l4-6-4-6z' fill='white'/%3E%3C/svg%3E" alt="PhonePe" className="payment-app-icon" />
                <span className="app-label phonepe">PhonePe</span>
                <svg className="payment-app-icon gpay-icon" viewBox="0 0 46 46">
                  <path fill="#4285F4" d="M23 0C10.3 0 0 10.3 0 23s10.3 23 23 23 23-10.3 23-23S35.7 0 23 0z"/>
                  <path fill="#fff" d="M33 23.5c0-.8-.1-1.6-.2-2.3H23v4.4h5.6c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.7 2.9-4.2 2.9-7.6z"/>
                  <path fill="#fff" d="M23 35c2.6 0 4.8-.9 6.4-2.4l-3.1-2.5c-.9.6-2 .9-3.3.9-2.6 0-4.7-1.7-5.5-4.1h-3.2v2.6c1.6 3.2 5 5.5 8.7 5.5z"/>
                  <path fill="#fff" d="M17.5 26.9c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2v-2.6h-3.2c-.7 1.3-1.1 2.8-1.1 4.4s.4 3.1 1.1 4.4l3.2-2.2z"/>
                  <path fill="#fff" d="M23 17.7c1.5 0 2.8.5 3.8 1.5l2.8-2.8c-1.7-1.6-4-2.6-6.6-2.6-3.7 0-7.1 2.1-8.7 5.3l3.2 2.5c.8-2.4 2.9-4 5.5-4z"/>
                </svg>
                <span className="app-label gpay">G Pay</span>
                <svg className="payment-app-icon paytm-icon" viewBox="0 0 50 20">
                  <rect fill="#00BAF2" width="50" height="20" rx="3"/>
                  <text x="5" y="14" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">pay</text>
                  <text x="24" y="14" fill="#002970" fontSize="10" fontWeight="bold" fontFamily="Arial">tm</text>
                </svg>
                <svg className="payment-app-icon upi-icon" viewBox="0 0 50 20">
                  <rect fill="#fff" width="50" height="20" rx="2" stroke="#097969" strokeWidth="1"/>
                  <text x="8" y="14" fill="#097969" fontSize="11" fontWeight="bold" fontFamily="Arial">UPI</text>
                  <path d="M38 5l6 5-6 5" fill="none" stroke="#f7931a" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            <div className="payment-qr-code">
              <QRCodeSVG
                value={`upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(bankDetails.name)}&cu=INR`}
                size={95}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Signature */}
      <div className="invoice-terms-section">
        <div className="terms">
          <h4>Terms And Condition</h4>
          <ol>
            <li>10% Discount On The Standard Billing</li>
            <li>6% Discount On Cash And Advance Payment</li>
            <li>Addition 2% Discount On Advance Payment</li>
            <li>Rs 4000 Per Ton Discount If Annual Billing Exceeds 1000kg</li>
            <li>Goods Ones Sold Will Not Be Taken Returned</li>
            <li>Credit Period Minimum 15 Days</li>
            <li>Company Reserve The Right To Change Above Price Without Any Prior Notice.</li>
          </ol>
        </div>
        <div className="signature">
          <p>Authorised Signatory For</p>
          <p><strong>{companyDetails.name}</strong></p>
        </div>
      </div>

      {/* Machine Generated Note */}
      <div className="invoice-machine-note">
        <p>This is a machine-generated bill. Please verify the details before leaving.</p>
      </div>
    </div>
  );
});

TaxInvoice.displayName = 'TaxInvoice';
