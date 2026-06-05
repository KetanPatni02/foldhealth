import { useState } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Icon } from '../../components/Icon/Icon';
import { Switch } from '../../components/Switch/Switch';
import { CardThemePicker } from './CardThemePicker';
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
  const cardTheme = plan.cardTheme;

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

      {/* ── Right: card preview ── */}
      <div className={styles.rightPanel}>
        <div className={styles.previewHeader}>
          <span className={styles.previewTitle}>Card Preview</span>
        </div>
        <div className={styles.previewScroll}>

          {/* Front */}
          <div className={styles.cardViewSection}>
            <span className={styles.cardViewLabelFront}>Front View</span>
            <div
              className={styles.insuranceCard}
              style={{
                background: cardTheme?.bg,
                '--card-text-primary': cardTheme?.textPrimary,
                '--card-text-secondary': cardTheme?.textSecondary,
                '--card-divider': cardTheme?.dividerColor,
              }}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardTopRow}>
                  <div className={styles.cardPlanInfo}>
                    {(plan.logoPreviewUrl || plan.planLogoUrl) ? (
                      <img src={plan.logoPreviewUrl || plan.planLogoUrl} alt="Plan Logo" className={styles.cardLogoImg} />
                    ) : (
                      <span className={styles.cardPlanLogo}>{'{Plan Logo}'}</span>
                    )}
                    <span className={styles.cardPlanName}>{plan.planName || '{Plan Name}'}</span>
                  </div>
                  <span
                    className={styles.cardTypeBadge}
                    style={{
                      color: cardTheme?.badgeTextColor,
                      background: cardTheme?.isLight
                        ? 'linear-gradient(180deg, rgba(130,252,191,0.4) 0%, rgba(6,198,102,0.2) 100%)'
                        : 'linear-gradient(180deg, rgba(180,252,218,0.22) 0%, rgba(6,198,102,0.1) 100%)',
                      border: `0.355px solid ${cardTheme?.isLight ? 'rgba(120,220,170,0.35)' : 'rgba(180,252,218,0.35)'}`,
                    }}
                  >
                    {plan.planType || 'TYPE'}
                  </span>
                </div>
                <div className={styles.cardMemberSection}>
                  <div className={styles.cardFieldGroup}>
                    <span className={styles.cardFieldLabel}>Member Name</span>
                    <span className={styles.cardFieldValue}>{'{Member Name}'}</span>
                  </div>
                  <div className={styles.cardFieldGroup}>
                    <span className={styles.cardFieldLabel}>Member ID</span>
                    <span className={styles.cardMemberId}>
                      {maskMemberId ? '•••-••••-••••-XYXY' : '{Member ID}'}
                    </span>
                  </div>
                </div>
                <div className={styles.cardDivider} />
                <div className={styles.cardMetaRow}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaLabel}>Sex/DOB</span>
                    <span className={styles.cardMetaValue}>{'{S • MM/DD/YYYY}'}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaLabel}>Member Code</span>
                    <span className={styles.cardMetaValue}>{'{Member Code}'}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaLabel}>Group</span>
                    <span className={styles.cardMetaValue}>{plan.groupNumber || '{Group ID}'}</span>
                  </div>
                </div>
                <div className={styles.cardMetaRow}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaLabel}>Coverage</span>
                    <span className={styles.cardMetaValue}>Individual</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaLabel}>Validity</span>
                    <span className={styles.cardMetaValue}>-</span>
                  </div>
                  <div className={styles.cardMeta} />
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className={`${styles.cardViewSection} ${styles.cardViewSectionLast}`}>
            <span className={styles.cardViewLabelBack}>Back View</span>
            <div
              className={styles.backCard}
              style={{
                background: cardTheme?.bg,
                '--card-text-primary': cardTheme?.textPrimary,
                '--card-text-secondary': cardTheme?.textSecondary,
                '--card-divider': cardTheme?.dividerColor,
              }}
            >
              <div className={styles.backCardInner}>
                <div className={styles.backRow}>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>In-Network Deductible</span>
                    <span className={styles.backFieldValue}>{plan.inNetDeductible ? `$${plan.inNetDeductible}` : '{$}'}</span>
                  </div>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>Out of-Network Deductible</span>
                    <span className={styles.backFieldValue}>{plan.outNetDeductible ? `$${plan.outNetDeductible}` : '{$}'}</span>
                  </div>
                </div>
                <div className={styles.backRow}>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>In-Network OOP Max</span>
                    <span className={styles.backFieldValue}>{plan.inNetOopMax ? `$${plan.inNetOopMax}` : '{$}'}</span>
                  </div>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>Out of-Network OOP Max</span>
                    <span className={styles.backFieldValue}>{plan.outNetOopMax ? `$${plan.outNetOopMax}` : '{$}'}</span>
                  </div>
                </div>
                <div className={styles.backCardDivider} />
                <div className={styles.backRow}>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>RX BIN</span>
                    <span className={styles.backFieldValue}>{plan.rxBin || '{Rx BIN}'}</span>
                  </div>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>RX PCN</span>
                    <span className={styles.backFieldValue}>{plan.rxPcn || '{Rx PCN}'}</span>
                  </div>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>RX Group</span>
                    <span className={styles.backFieldValue}>{plan.rxGroup || '{Rx Group}'}</span>
                  </div>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>EDI Payer ID</span>
                    <span className={styles.backFieldValue}>{plan.ediPayerId || '{EDI Payer ID}'}</span>
                  </div>
                </div>
                <div className={styles.backCardDivider} />
                <div className={`${styles.backRow} ${styles.backRowAlignStart}`}>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>Claims Mailing Address</span>
                    <div className={styles.backAddressBlock}>
                      <span className={styles.backFieldValue}>{plan.addressLine1 || '{Address Line 1}'}</span>
                      {plan.addressLine2 && <span className={styles.backFieldValue}>{plan.addressLine2}</span>}
                      <span className={styles.backFieldValue}>
                        {(plan.zipcode || plan.city || plan.state)
                          ? [plan.zipcode, plan.city, plan.state].filter(Boolean).join(', ')
                          : '{Zipcode, City, State}'}
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.backField} ${styles.backFieldGroup}`}>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>Provider Support:</span>
                      <span className={styles.backFieldValue}>{plan.providerSupportPhone || '{Provider Support number}'}</span>
                    </div>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>Member Support:</span>
                      <span className={styles.backFieldValue}>{plan.memberSupportPhone || '{Member Support number}'}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.backCardDivider} />
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>For any queries, Please visit:</span>
                  <span className={styles.backFieldValue}>{plan.planWebsiteUrl || '{Plan Website}'}</span>
                </div>
                <div className={styles.backCardDivider} />
                <p className={styles.backNote}>
                  {plan.additionalNote || 'Note: Please Call your Healthcare provider for any issues related to claims or your health plans or visit the plan website.'}
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.previewFooter}>
          <Switch checked={maskMemberId} onChange={setMaskMemberId} label="Mask Member ID on card" />
          <span className={styles.previewFooterDivider} />
          <CardThemePicker theme={cardTheme} onThemeChange={() => {}} />
        </div>
      </div>

    </Drawer>
  );
}
