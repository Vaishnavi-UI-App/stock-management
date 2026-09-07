import { useState } from 'react';
import { Calculator, FileText, BarChart3, CircleDollarSign, Wallet, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Accounts } from './Accounts';
import { GSTReports } from '../admin/GSTReports';
import { Reports } from '../reports/Reports';
import { PaymentReceived } from './PaymentReceived';
import { PaymentOut } from './PaymentOut';
import { SalesReturns } from '../admin/SalesReturns';
import '../stock/Stock.css';

type AccountsTab = 'accounts' | 'gstReports' | 'reports' | 'paymentReceived' | 'paymentOut' | 'salesReturns';

// Single "Accounts" page hosting Accounts, GST Reports, Reports (sales
// report), Payment Received, Payment Out, and Sales Returns as tabs — same
// consolidation pattern as Settings and Attendance Mgmt. Each tab renders the
// existing, unmodified page component. Payment Out reuses the 'purchases'
// permission (it has no dedicated module — see server/src/index.js MODULE_KEYS).
export function AccountsHub() {
  const { currentUser } = useStore();
  const canViewAccounts = !!currentUser?.permissions?.accounts?.view;
  const canViewGstReports = !!currentUser?.permissions?.gstReports?.view;
  const canViewReports = !!currentUser?.permissions?.reports?.view;
  const canViewPaymentReceived = !!currentUser?.permissions?.paymentReceived?.view;
  const canViewPaymentOut = !!currentUser?.permissions?.purchases?.view;
  const canViewSalesReturns = !!currentUser?.permissions?.salesReturns?.view;

  const tabs: { key: AccountsTab; label: string; icon: typeof Calculator }[] = [
    ...(canViewAccounts ? [{ key: 'accounts' as const, label: 'Accounts', icon: Calculator }] : []),
    ...(canViewGstReports ? [{ key: 'gstReports' as const, label: 'GST Reports', icon: FileText }] : []),
    ...(canViewReports ? [{ key: 'reports' as const, label: 'Sales Report', icon: BarChart3 }] : []),
    ...(canViewPaymentReceived ? [{ key: 'paymentReceived' as const, label: 'Payment Received', icon: CircleDollarSign }] : []),
    ...(canViewPaymentOut ? [{ key: 'paymentOut' as const, label: 'Payment Out', icon: Wallet }] : []),
    ...(canViewSalesReturns ? [{ key: 'salesReturns' as const, label: 'Sales Returns', icon: RotateCcw }] : []),
  ];

  const [activeTab, setActiveTab] = useState<AccountsTab>(tabs[0]?.key ?? 'accounts');

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Accounts</h1>
          <p>Billing, GST and sales reports, and supplier/customer payments</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #00a651' : '2px solid transparent',
                marginBottom: '-2px',
                color: active ? '#00a651' : '#6b7280',
                fontWeight: active ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'accounts' && canViewAccounts && <Accounts />}
      {activeTab === 'gstReports' && canViewGstReports && <GSTReports />}
      {activeTab === 'reports' && canViewReports && <Reports />}
      {activeTab === 'paymentReceived' && canViewPaymentReceived && <PaymentReceived />}
      {activeTab === 'paymentOut' && canViewPaymentOut && <PaymentOut />}
      {activeTab === 'salesReturns' && canViewSalesReturns && <SalesReturns />}
    </div>
  );
}
