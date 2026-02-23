import { Globe, Check, Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/useLanguage';
import { translations } from '../../i18n/translations';
import type { Language } from '../../i18n/translations';
import '../stock/Stock.css';

const languageOptions = [
  { code: 'en' as Language, label: 'English', native: 'English' },
  { code: 'hi' as Language, label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr' as Language, label: 'Marathi', native: 'मराठी' },
];

// Sample translations to show in preview table
const previewKeys: (keyof typeof translations.en)[] = [
  'dashboard', 'products', 'sales', 'reports', 'customers',
  'orders', 'settings', 'attendance', 'logout', 'search',
  'save', 'cancel', 'delete', 'edit', 'checkIn', 'checkOut',
  'myRoute', 'myStock', 'createBill', 'totalAmount', 'paymentReceived'
];

export function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    // Reload page to apply language change across all components
    window.location.reload();
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>{t.languageSettings}</h1>
          <p>{t.selectLanguage}</p>
        </div>
      </div>

      {/* Language Selector */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Globe size={20} style={{ color: '#00a651' }} />
          <h3 style={{ margin: 0 }}>{t.selectLanguage}</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {languageOptions.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: '10px',
                border: language === lang.code ? '2px solid #00a651' : '2px solid #e5e7eb',
                background: language === lang.code ? '#e6f9ef' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#1f2937' }}>{lang.label}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{lang.native}</div>
              </div>
              {language === lang.code && (
                <Check size={20} style={{ color: '#00a651' }} />
              )}
            </button>
          ))}
        </div>
        <p style={{ marginTop: '16px', fontSize: '13px', color: '#9ca3af' }}>
          {t.currentlySelected}: <strong style={{ color: '#00a651' }}>{languageOptions.find(l => l.code === language)?.label}</strong>
        </p>
      </div>

      {/* Translation Preview Table */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Languages size={20} style={{ color: '#00a651' }} />
          <h3 style={{ margin: 0 }}>{t.translationPreview}</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>English</th>
                <th>Hindi (हिन्दी)</th>
                <th>Marathi (मराठी)</th>
              </tr>
            </thead>
            <tbody>
              {previewKeys.map((key) => (
                <tr key={key}>
                  <td style={{ fontWeight: '600', color: '#374151' }}>{key}</td>
                  <td style={{ background: language === 'en' ? '#e6f9ef' : undefined }}>{translations.en[key]}</td>
                  <td style={{ background: language === 'hi' ? '#e6f9ef' : undefined }}>{translations.hi[key]}</td>
                  <td style={{ background: language === 'mr' ? '#e6f9ef' : undefined }}>{translations.mr[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
