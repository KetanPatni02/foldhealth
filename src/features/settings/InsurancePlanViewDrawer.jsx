import { useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { InsuranceCardPreview } from './InsuranceCardPreview';
import styles from './InsurancePlanViewDrawer.module.css';

/* ── InfoField: label + value read-only display ── */
function InfoField({ label, value, wide }) {
  return (
    <div className={`${styles.infoField} ${wide ? styles.infoFieldWide : ''}`}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value || '—'}</span>
    </div>
  );
}

/* ── Section ── */
function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.sectionFields}>
        {children}
      </div>
    </div>
  );
}

export function InsurancePlanViewDrawer({ plan, onClose }) {
  const [activeTab, setActiveTab] = useState('plan');
  const [maskMemberId, setMaskMemberId] = useState(true);
  const { cardTheme } = plan;

  return (
    <Drawer
      title={plan.planName || 'Insurance Plan'}
      onClose={onClose}
      headerRight={
        <>
          <Button variant="secondary" size="L" leadingIcon="solar:pen-linear" onClick={() => {}}>
            Edit
          </Button>
          <span className={styles.headerDivider} />
        </>
      }
      className={`insurancePlanPanel ${styles.widePanel}`}
      bodyClassName={styles.drawerBody}
      headerStyle={{ padding: '8px 12px 8px 16px', borderBottom: '0.5px solid var(--neutral-150)' }}
      titleStyle={{ fontSize: 16, fontWeight: 500 }}
    >
      {/* ── Left: detail panel ── */}
      <div className={styles.leftPanel}>

        {/* Tabs */}
        <div className={styles.tabsRow}>
          <button
            className={`${styles.tab} ${activeTab === 'plan' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('plan')}
          >
            Plan Information
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'cost' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('cost')}
          >
            Cost Sharing Information
          </button>
        </div>

        <div className={styles.scrollArea}>

          {activeTab === 'plan' ? (
            <>
              <Section title="Plan Identifiers">
                <InfoField label="Plan Name" value={plan.planName} />
                <InfoField label="Plan Type" value={plan.planType} />
                <InfoField label="Group Number" value={plan.groupNumber} />
                <InfoField label="External ID" value={plan.externalId} />
                <InfoField label="EDI Payer ID" value={plan.ediPayerId} />
                <InfoField label="Provider Network Name" value={plan.providerNetworkName} />
                {(plan.logoPreviewUrl || plan.planLogoUrl) && (
                  <div className={styles.logoSection}>
                    <span className={styles.infoLabel}>Plan Logo</span>
                    <div className={styles.logoBox}>
                      <img
                        src={plan.logoPreviewUrl || plan.planLogoUrl}
                        alt="Plan Logo"
                        className={styles.logoImg}
                      />
                    </div>
                  </div>
                )}
              </Section>

              <Section title="Support Info">
                <InfoField label="Member Support Phone Number" value={plan.memberSupportPhone} />
                <InfoField label="Provider Support Phone Number" value={plan.providerSupportPhone} />
                <InfoField
                  label="Claims Mailing Address"
                  value={[plan.addressLine1, plan.addressLine2, [plan.zipcode, plan.city, plan.state].filter(Boolean).join(', ')].filter(Boolean).join('\n')}
                  wide
                />
                <InfoField label="Plan Website URL" value={plan.planWebsiteUrl} wide />
                <InfoField label="Additional Note" value={plan.additionalNote} wide />
              </Section>

              <Section title="Prescription Benefits">
                <InfoField label="Pharmacy Benefits Manager Name" value={plan.pbmName} />
                <InfoField label="Pharmacy Benefits Manager Phone" value={plan.pbmPhone} />
                <InfoField label="Pharmacy Benefits Manager URL" value={plan.pbmUrl} />
                <InfoField label="Rx BIN" value={plan.rxBin} />
                <InfoField label="Rx PCN" value={plan.rxPcn} />
                <InfoField label="Rx Group" value={plan.rxGroup} />
              </Section>
            </>
          ) : (
            <>
              <Section title="In Network Coverage">
                <InfoField label="Deductible" value={plan.inNetDeductible ? `$${plan.inNetDeductible}` : undefined} />
                <InfoField label="OOP Max" value={plan.inNetOopMax ? `$${plan.inNetOopMax}` : undefined} />
                <InfoField label="PCP Copay" value={plan.inNetCopayPcp ? `$${plan.inNetCopayPcp}` : undefined} />
                <InfoField label="Specialist Copay" value={plan.inNetCopaySpecialist ? `$${plan.inNetCopaySpecialist}` : undefined} />
                <InfoField label="Urgent Care Copay" value={plan.inNetCopayUrgent ? `$${plan.inNetCopayUrgent}` : undefined} />
                <InfoField label="ER Copay" value={plan.inNetCopayEr ? `$${plan.inNetCopayEr}` : undefined} />
                <InfoField label="PCP Coinsurance" value={plan.inNetCoinsurancePcp ? `$${plan.inNetCoinsurancePcp}` : undefined} />
                <InfoField label="Specialist Coinsurance" value={plan.inNetCoinsuranceSpecialist ? `$${plan.inNetCoinsuranceSpecialist}` : undefined} />
                <InfoField label="Urgent Care Coinsurance" value={plan.inNetCoinsuranceUrgent ? `$${plan.inNetCoinsuranceUrgent}` : undefined} />
                <InfoField label="ER Coinsurance" value={plan.inNetCoinsuranceEr ? `$${plan.inNetCoinsuranceEr}` : undefined} />
              </Section>
              <Section title="Out of Network Coverage">
                <InfoField label="Deductible" value={plan.outNetDeductible ? `$${plan.outNetDeductible}` : undefined} />
                <InfoField label="OOP Max" value={plan.outNetOopMax ? `$${plan.outNetOopMax}` : undefined} />
                <InfoField label="PCP Copay" value={plan.outNetCopayPcp ? `$${plan.outNetCopayPcp}` : undefined} />
                <InfoField label="Specialist Copay" value={plan.outNetCopaySpecialist ? `$${plan.outNetCopaySpecialist}` : undefined} />
                <InfoField label="Urgent Care Copay" value={plan.outNetCopayUrgent ? `$${plan.outNetCopayUrgent}` : undefined} />
                <InfoField label="ER Copay" value={plan.outNetCopayEr ? `$${plan.outNetCopayEr}` : undefined} />
              </Section>
            </>
          )}

        </div>
      </div>

      {/* ── Right: card preview (read-only) ── */}
      <div className={styles.rightPanel}>
        <div className={styles.previewHeader}>
          <span className={styles.previewTitle}>Card Preview</span>
        </div>
        <InsuranceCardPreview
          data={plan}
          logoPreviewUrl={plan.logoPreviewUrl}
          cardTheme={cardTheme}
          onThemeChange={undefined}
          maskMemberId={maskMemberId}
          onMaskChange={setMaskMemberId}
        />
      </div>

    </Drawer>
  );
}
