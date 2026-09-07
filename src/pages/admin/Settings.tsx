import { useState } from 'react';
import { UserCircle, Landmark, ShieldCheck, Globe } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Profile } from '../profile/Profile';
import { OrganizationMaster } from './OrganizationMaster';
import { Roles } from '../stock/Roles';
import { LanguageSettings } from './LanguageSettings';
import '../stock/Stock.css';

type SettingsTab = 'profile' | 'organization' | 'roles' | 'language';

// Single Settings page hosting Profile, Organization, Roles, and Language as
// tabs — these were separate sidebar entries; consolidated here to cut
// sidebar clutter. Each tab renders the existing, unmodified page component.
export function Settings() {
  const { currentUser } = useStore();
  const canViewOrganization = !!currentUser?.permissions?.organization?.view;
  const canViewRoles = !!currentUser?.permissions?.roles?.view;

  // Profile and Language need no permission — every authenticated user gets
  // them, same as they were as standalone sidebar entries.
  const tabs: { key: SettingsTab; label: string; icon: typeof Landmark }[] = [
    { key: 'profile', label: 'Profile', icon: UserCircle },
    ...(canViewOrganization ? [{ key: 'organization' as const, label: 'Organization', icon: Landmark }] : []),
    ...(canViewRoles ? [{ key: 'roles' as const, label: 'Roles', icon: ShieldCheck }] : []),
    { key: 'language', label: 'Language', icon: Globe },
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Your profile, organization details, roles & permissions, and language preferences</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
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

      {activeTab === 'profile' && <Profile />}
      {activeTab === 'organization' && canViewOrganization && <OrganizationMaster />}
      {activeTab === 'roles' && canViewRoles && <Roles />}
      {activeTab === 'language' && <LanguageSettings />}
    </div>
  );
}
