import { forwardRef } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import type { Sale } from '../types';
import { useStore } from '../store/useStore';
import logoImg from '/logo.png';
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
    paymentTerms?: string;
    destination?: string;
    vehicleNo?: string;
  };
}

// Convert number to words
// Every bill's items table has at least this many rows (padded with blank
// ones when short) so a 1-item bill still lands its totals/HSN/bank/terms
// sections in the same place as every other bill. A bill with more items
// than this just grows — it's never truncated.
const MIN_ITEM_ROWS = 5;

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

// Small UPI app badges shown next to the QR code
function UpiAppIcons() {
  return (
    <div className="inv-upi-apps">
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='11' fill='%235f259f'/%3E%3Cpath d='M9 6h2.5l4 6-4 6H9l4-6-4-6z' fill='white'/%3E%3C/svg%3E"
        alt="PhonePe"
        className="inv-upi-app-icon"
      />
      <span className="inv-upi-app-label phonepe">PhonePe</span>
      <svg className="inv-upi-app-icon gpay" viewBox="0 0 46 46">
        <path fill="#4285F4" d="M23 0C10.3 0 0 10.3 0 23s10.3 23 23 23 23-10.3 23-23S35.7 0 23 0z" />
        <path fill="#fff" d="M33 23.5c0-.8-.1-1.6-.2-2.3H23v4.4h5.6c-.2 1.2-.9 2.3-1.9 3v2.5h3.1c1.8-1.7 2.9-4.2 2.9-7.6z" />
        <path fill="#fff" d="M23 35c2.6 0 4.8-.9 6.4-2.4l-3.1-2.5c-.9.6-2 .9-3.3.9-2.6 0-4.7-1.7-5.5-4.1h-3.2v2.6c1.6 3.2 5 5.5 8.7 5.5z" />
        <path fill="#fff" d="M17.5 26.9c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2v-2.6h-3.2c-.7 1.3-1.1 2.8-1.1 4.4s.4 3.1 1.1 4.4l3.2-2.2z" />
        <path fill="#fff" d="M23 17.7c1.5 0 2.8.5 3.8 1.5l2.8-2.8c-1.7-1.6-4-2.6-6.6-2.6-3.7 0-7.1 2.1-8.7 5.3l3.2 2.5c.8-2.4 2.9-4 5.5-4z" />
      </svg>
      <span className="inv-upi-app-label gpay">G Pay</span>
      <svg className="inv-upi-app-icon paytm" viewBox="0 0 50 20">
        <rect fill="#00BAF2" width="50" height="20" rx="3" />
        <text x="5" y="14" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial">pay</text>
        <text x="24" y="14" fill="#002970" fontSize="10" fontWeight="bold" fontFamily="Arial">tm</text>
      </svg>
      <svg className="inv-upi-app-icon upi" viewBox="0 0 50 20">
        <rect fill="#fff" width="50" height="20" rx="2" stroke="#097969" strokeWidth="1" />
        <text x="8" y="14" fill="#097969" fontSize="11" fontWeight="bold" fontFamily="Arial">UPI</text>
        <path d="M38 5l6 5-6 5" fill="none" stroke="#f7931a" strokeWidth="2" />
      </svg>
    </div>
  );
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
    paymentTerms: '',
    destination: '',
    vehicleNo: ''
  }
}, ref) => {
  const { getProductById, getUserById } = useStore();
  const salesman = getUserById(sale.salesmanId);

  const cgstRate = sale.cgstRate || 2.5;
  const sgstRate = sale.sgstRate || 2.5;
  const totalGstRate = cgstRate + sgstRate;

  const mergedDeliveryDetails = {
    paymentTerms: sale.modeOfPayment || deliveryDetails.paymentTerms || '',
    destination: sale.destination || deliveryDetails.destination || '',
    vehicleNo: sale.vehicleNo || deliveryDetails.vehicleNo || ''
  };

  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;

  sale.items.forEach(item => {
    const taxableValue = (item.total * 100) / (100 + totalGstRate);
    const cgst = (taxableValue * cgstRate) / 100;
    const sgst = (taxableValue * sgstRate) / 100;

    totalTaxableValue += taxableValue;
    totalCGST += cgst;
    totalSGST += sgst;
  });

  const invoiceDate = format(new Date(sale.saleDate), 'dd-MMM-yyyy');
  const totalQty = sale.items.reduce((sum, item) => sum + item.quantity, 0);
  const isFullyPaid = (sale.balanceDue || 0) <= 0;
  // Pad short bills with blank rows so every section below always lands in
  // the same place, whether the bill has 1 item or 15 — a bill with more
  // items than this simply grows taller, it's never truncated.
  const fillerRowCount = Math.max(0, MIN_ITEM_ROWS - sale.items.length);

  return (
    <div className="tax-invoice" ref={ref}>
      {/* Header */}
      <div className="inv-hd">
        <div className="inv-co">
          <img src={logoImg} alt={companyDetails.name} crossOrigin="anonymous" />
          <div className="inv-co-text">
            <h1>{companyDetails.name}</h1>
            <p>{companyDetails.address}</p>
            <p className="meta-line"><strong>GSTIN/UIN:</strong> {companyDetails.gstin} &nbsp;|&nbsp; <strong>State:</strong> {companyDetails.stateName}, Code {companyDetails.stateCode}</p>
            <p className="meta-line"><strong>Email:</strong> {companyDetails.email}</p>
          </div>
        </div>
        <div className="inv-title-box">
          <div className="t">Tax Invoice</div>
          <div className="o">Original for Recipient</div>
          <div className="inv-kv">
            <span>Invoice No.</span><b>{sale.billNumber}</b>
            <span>Date</span><b>{invoiceDate}</b>
          </div>
        </div>
      </div>

      {/* Buyer / Consignee / Dispatch */}
      <div className="inv-grid3">
        <div>
          <div className="inv-lbl">Buyer (Bill To)</div>
          <div className="inv-party">{sale.customerName}</div>
          {sale.customerAddress && <p>{sale.customerAddress}</p>}
          {sale.customerGSTIN && <p>GSTIN/UIN: {sale.customerGSTIN}</p>}
          <p>State: {companyDetails.stateName}, Code {companyDetails.stateCode}</p>
        </div>
        <div>
          <div className="inv-lbl">Consignee (Ship To)</div>
          <div className="inv-party">{sale.customerName}</div>
          {sale.customerAddress && <p>{sale.customerAddress}</p>}
          {sale.customerGSTIN && <p>GSTIN/UIN: {sale.customerGSTIN}</p>}
          <p>State: {companyDetails.stateName}, Code {companyDetails.stateCode}</p>
        </div>
        <div>
          <div className="inv-lbl">Dispatch Details</div>
          <div className="inv-meta">
            <span>Mode/Terms</span><i>{mergedDeliveryDetails.paymentTerms}</i>
            <span>Destination</span><i>{mergedDeliveryDetails.destination}</i>
            <span>Vehicle No.</span><i>{mergedDeliveryDetails.vehicleNo}</i>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="inv-items-wrap">
        <table className="inv-items">
          <thead>
            <tr>
              <th className="col-sno">S.No.</th>
              <th className="col-item">Item Description</th>
              <th className="col-hsn">HSN</th>
              <th className="col-batch">Batch No.</th>
              <th className="col-mfg">Mfg. Date</th>
              <th className="col-exp">Exp. Date</th>
              <th className="col-qty">Qty.</th>
              <th className="col-rate">Rate</th>
              <th className="col-amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => {
              const product = getProductById(item.productId);
              return (
                <tr key={index}>
                  <td className="col-sno">{index + 1}</td>
                  <td className="col-item">{item.productName}</td>
                  <td className="col-hsn">{item.hsnCode || product?.sku || '-'}</td>
                  <td className="col-batch">{item.batchNo || '-'}</td>
                  <td className="col-mfg">{item.mfgDate || '-'}</td>
                  <td className="col-exp">{item.expDate || '-'}</td>
                  <td className="col-qty">{item.quantity}</td>
                  <td className="col-rate">₹{Number(item.price).toLocaleString()}</td>
                  <td className="col-amount">₹{item.total.toLocaleString()}</td>
                </tr>
              );
            })}
            {Array.from({ length: fillerRowCount }).map((_, i) => (
              <tr key={`filler-${i}`} className="filler-row">
                <td className="col-sno">&nbsp;</td>
                <td className="col-item">&nbsp;</td>
                <td className="col-hsn">&nbsp;</td>
                <td className="col-batch">&nbsp;</td>
                <td className="col-mfg">&nbsp;</td>
                <td className="col-exp">&nbsp;</td>
                <td className="col-qty">&nbsp;</td>
                <td className="col-rate">&nbsp;</td>
                <td className="col-amount">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Words + Summary */}
      <div className="inv-row2">
        <div className="inv-words">
          <div className="lbl">Total Amount (in words)</div>
          <div className="w">{numberToWords(sale.finalAmount)}</div>
          {sale.billLocation && (
            <div className="created-by">
              <a
                href={sale.billLocation.includes('google.com/maps') ? sale.billLocation : `https://www.google.com/maps/search/${encodeURIComponent(sale.billLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                📍 {sale.billLocation}
              </a>
            </div>
          )}
        </div>
        <div className="inv-sum">
          <div><span>Taxable Value</span><b>₹{totalTaxableValue.toFixed(2)}</b></div>
          <div><span>CGST @{cgstRate}%</span><b>₹{totalCGST.toFixed(2)}</b></div>
          <div><span>SGST @{sgstRate}%</span><b>₹{totalSGST.toFixed(2)}</b></div>
          <div className="tot"><span>Grand Total ({totalQty} Qty)</span><b>₹{sale.finalAmount.toLocaleString()}</b></div>
          <div><span>Amount Paid</span><b>₹{(sale.amountPaid || 0).toLocaleString()}</b></div>
          <div className={isFullyPaid ? 'paid-ok' : 'due'}>
            <span>{isFullyPaid ? 'Fully Paid' : 'Balance Due'}</span>
            <b>₹{(sale.balanceDue || 0).toLocaleString()}</b>
          </div>
        </div>
      </div>

      <p className="inv-rate-note">* Rate is inclusive of GST. Total quantity: {totalQty}.</p>

      {/* Bank + UPI */}
      <div className="inv-pay">
        <div className="inv-box">
          <h4>Bank Details</h4>
          <div className="inv-bank">
            <span>Account Name</span><b>{bankDetails.name}</b>
            <span>Bank</span><b>{bankDetails.bank}, {bankDetails.branch}</b>
            <span>Account No.</span><b>{bankDetails.accountNo}</b>
            <span>IFSC Code</span><b>{bankDetails.ifscCode}</b>
          </div>
        </div>
        <div className="inv-box">
          <h4>Scan &amp; Pay (UPI)</h4>
          <div className="inv-upi">
            <div>
              <div style={{ fontSize: '9.5px', color: '#5f6b63' }}>UPI ID</div>
              <div className="inv-upi-id">{bankDetails.upiId}</div>
              <UpiAppIcons />
            </div>
            <div className="inv-upi-qr">
              <QRCodeSVG
                value={`upi://pay?pa=${bankDetails.upiId}&pn=${encodeURIComponent(bankDetails.name)}&cu=INR`}
                size={90}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terms + Signature */}
      <div className="inv-foot">
        <div className="inv-box inv-terms">
          <h4>Terms &amp; Conditions</h4>
          <ol>
            <li>10% discount on the standard billing.</li>
            <li>6% discount on cash and advance payment.</li>
            <li>Additional 2% discount on advance payment.</li>
            <li>Rs. 4000 per ton discount if annual billing exceeds 1000kg.</li>
            <li>Goods once sold will not be taken back.</li>
            <li>Credit period minimum 15 days.</li>
            <li>Company reserves the right to change the above price without any prior notice.</li>
          </ol>
        </div>
        <div className="inv-box inv-sign">
          <h4>For {companyDetails.name}</h4>
          <div className="sign-line">Authorised Signatory</div>
        </div>
      </div>

      <div className="inv-note">
        <span>Bill created by: <strong>{salesman?.name || 'N/A'}</strong></span>
        <span>This is a computer-generated invoice. Please verify the details before leaving.</span>
      </div>
    </div>
  );
});

TaxInvoice.displayName = 'TaxInvoice';
