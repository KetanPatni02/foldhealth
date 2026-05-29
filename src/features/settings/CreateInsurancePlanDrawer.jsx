import { useState, useRef } from 'react';
import { Drawer }          from '../../components/Drawer/Drawer';
import { Button }          from '../../components/Button/Button';
import { Icon }            from '../../components/Icon/Icon';
import { Input }           from '../../components/Input/Input';
import { Select }          from '../../components/Select/Select';
import { Textarea }        from '../../components/Textarea/Textarea';
import { Switch }          from '../../components/Switch/Switch';
import { CardThemePicker, DEFAULT_CARD_THEME } from './CardThemePicker';
import styles from './CreateInsurancePlanDrawer.module.css';

/* ── Static option lists ── */
const PLAN_TYPE_OPTIONS = [
  'HMO', 'PPO', 'EPO', 'POS', 'HDHP',
  'Medicare Advantage', 'Medicaid', 'Dual Eligible',
].map(t => ({ value: t, label: t }));

const US_STATE_OPTIONS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
].map(s => ({ value: s, label: s }));

/* ── FieldLabel — label row with optional required dot and info icon ── */
function FieldLabel({ children, required, info }) {
  return (
    <div className={styles.label}>
      {children}
      {required && <span className={styles.required} />}
      {info && (
        <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-200)" style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

/* ── CollapsibleSection — reusable accordion card used by each form section ── */
function CollapsibleSection({ icon, title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={styles.sectionCard}>
      <div
        className={`${styles.sectionHeader} ${collapsed ? styles.collapsed : ''}`}
        onClick={() => setCollapsed(v => !v)}
      >
        <span className={styles.sectionIconAvatar}>
          <Icon name={icon} size={14} color="var(--primary-300)" />
        </span>
        <span className={styles.sectionTitle}>{title}</span>
        <Icon
          name={collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'}
          size={12}
          color="var(--neutral-300)"
        />
      </div>
      <div className={`${styles.collapseOuter} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.collapseInner}>
          <div className={styles.sectionBody}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export function CreateInsurancePlanDrawer({ onClose }) {
  const [maskMemberId, setMaskMemberId] = useState(true);
  const [showPreview,  setShowPreview]  = useState(true);
  const [cardTheme,    setCardTheme]    = useState(DEFAULT_CARD_THEME);
  const [logoFile,     setLogoFile]     = useState(null);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    planName: '', planType: '', groupNumber: '', externalId: '',
    ediPayerId: '', providerNetworkName: '', planLogoUrl: '',
    memberSupportPhone: '', providerSupportPhone: '',
    addressLine1: '', addressLine2: '', zipcode: '', city: '', state: '',
    planWebsiteUrl: '', additionalNote: '',
    pbmName: '', pbmPhone: '', pbmUrl: '',
    rxBin: '', rxPcn: '', rxGroup: '',
  });

  /* Input onChange — receives a DOM event */
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  /* Select onChange — receives a plain value string */
  const setVal = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setLogoFile(file.name);
  };

  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (file) setLogoFile(file.name);
  };

  const canSave =
    form.planName.trim()         !== '' &&
    form.groupNumber.trim()      !== '' &&
    form.ediPayerId.trim()       !== '' &&
    (form.planLogoUrl.trim()     !== '' || logoFile !== null) &&
    form.memberSupportPhone.trim() !== '' &&
    form.addressLine1.trim()     !== '' &&
    form.planWebsiteUrl.trim()   !== '';

  return (
    <Drawer
      title="New Insurance Plan"
      onClose={onClose}
      headerRight={
        <>
          <Button variant="secondary" size="L" disabled={!canSave} onClick={() => {}}>Save</Button>
          <span className={styles.headerDivider} />
        </>
      }
      className={`insurancePlanPanel${showPreview ? ` ${styles.widePanel}` : ''}`}
      bodyClassName={styles.drawerBody}
      headerStyle={{ padding: '8px 12px 8px 16px', borderBottom: '0.5px solid var(--neutral-150)' }}
      titleStyle={{ fontSize: 16, fontWeight: 500 }}
    >

      {/* ── Left: form panel ── */}
      <div className={styles.leftPanel}>

        {/* Stage indicator */}
        <div className={styles.stageNavRow}>
          <div className={styles.stageNav}>
            <div className={styles.stageItem}>
              <span className={`${styles.stageBadge} ${styles.stageBadgeActive}`}>1</span>
              <span className={`${styles.stageLabel} ${styles.stageLabelActive}`}>Plan Information</span>
            </div>
            <span className={styles.stageConnector} />
            <div className={styles.stageItem}>
              <span className={`${styles.stageBadge} ${styles.stageBadgeInactive}`}>2</span>
              <span className={`${styles.stageLabel} ${styles.stageLabelInactive}`}>Cost Sharing(Tier)</span>
            </div>
          </div>
          {!showPreview && (
            <Button
              variant="secondary"
              size="L"
              leadingIcon="solar:eye-linear"
              onClick={() => setShowPreview(true)}
            >
              Show ID Preview
            </Button>
          )}
        </div>

        {/* Plan Identifiers */}
        <CollapsibleSection icon="solar:shield-user-linear" title="Plan Identifiers">

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel required>Plan Name</FieldLabel>
              <Input placeholder="Enter Plan Name" value={form.planName} onChange={set('planName')} />
            </div>
            <div className={styles.field}>
              <FieldLabel>Plan Type</FieldLabel>
              <Select
                options={PLAN_TYPE_OPTIONS}
                value={form.planType}
                onChange={setVal('planType')}
                placeholder="Select Plan Type"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel required>Group Number</FieldLabel>
              <Input placeholder="Enter Group Number" value={form.groupNumber} onChange={set('groupNumber')} />
            </div>
            <div className={styles.field}>
              <FieldLabel>External ID</FieldLabel>
              <Input placeholder="Enter External ID" value={form.externalId} onChange={set('externalId')} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel required>EDI Payer ID</FieldLabel>
              <Input placeholder="Enter EDI Payer ID" value={form.ediPayerId} onChange={set('ediPayerId')} />
            </div>
            <div className={styles.field}>
              <FieldLabel>Provider Network Name</FieldLabel>
              <Input placeholder="Enter Provider Network Name" value={form.providerNetworkName} onChange={set('providerNetworkName')} />
            </div>
          </div>

          <div className={styles.fieldFull}>
            <FieldLabel required>Plan Logo</FieldLabel>
            <Input placeholder="Paste Image URL" value={form.planLogoUrl} onChange={set('planLogoUrl')} />
            <div className={styles.orDivider}>
              <span className={styles.orLine} />
              <span className={styles.orText}>OR</span>
              <span className={styles.orLine} />
            </div>
            <div
              className={styles.dropZone}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="solar:upload-linear" size={24} color="var(--neutral-300)" />
              <div className={styles.dropZoneText}>
                {logoFile
                  ? <strong>{logoFile}</strong>
                  : <>Drag and drop file here or <span className={styles.dropZoneLink}>Choose file</span></>
                }
              </div>
              <input ref={fileInputRef} type="file" accept=".svg,image/*" style={{ display: 'none' }} onChange={handleFilePick} />
            </div>
            <div className={styles.dropZoneMeta}>
              <span className={styles.dropZoneMetaText}>Supported formats: SVG</span>
              <span className={styles.dropZoneMetaText}>Max size: 5 MB</span>
            </div>
          </div>

        </CollapsibleSection>

        {/* Support Info */}
        <CollapsibleSection icon="solar:phone-calling-linear" title="Support Info">

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel required>Member Support Phone Number</FieldLabel>
              <Input placeholder="Enter Phone Number" value={form.memberSupportPhone} onChange={set('memberSupportPhone')} />
            </div>
            <div className={styles.field}>
              <FieldLabel>Provider Support Phone Number</FieldLabel>
              <Input placeholder="Enter Phone Number" value={form.providerSupportPhone} onChange={set('providerSupportPhone')} />
            </div>
          </div>

          <div className={styles.fieldFull}>
            <FieldLabel required>Claims Mailing Address</FieldLabel>
            <div className={styles.addressStack}>
              <Input placeholder="Address Line 1" value={form.addressLine1} onChange={set('addressLine1')} />
              <Input placeholder="Address Line 2" value={form.addressLine2} onChange={set('addressLine2')} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <Input placeholder="Zipcode" value={form.zipcode} onChange={set('zipcode')} />
            </div>
            <div className={styles.field}>
              <Input placeholder="City" value={form.city} onChange={set('city')} />
            </div>
            <div className={styles.field}>
              <Select
                options={US_STATE_OPTIONS}
                value={form.state}
                onChange={setVal('state')}
                placeholder="State"
              />
            </div>
          </div>

          <div className={styles.fieldFull}>
            <FieldLabel required>Plan Website URL</FieldLabel>
            <Input placeholder="Paste Website URL" value={form.planWebsiteUrl} onChange={set('planWebsiteUrl')} />
          </div>

          <div className={styles.fieldFull}>
            <FieldLabel>Additional Note</FieldLabel>
            <Textarea
              placeholder="Add Additional Note"
              value={form.additionalNote}
              onChange={set('additionalNote')}
            />
          </div>

        </CollapsibleSection>

        {/* Prescription Benefits */}
        <CollapsibleSection icon="solar:pill-linear" title="Prescription Benefits">

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel>Pharmacy Benefits Manager Name</FieldLabel>
              <Input placeholder="Select Pharmacy Benefits Manager" value={form.pbmName} onChange={set('pbmName')} />
            </div>
            <div className={styles.field}>
              <FieldLabel>Pharmacy Benefits Manager Phone</FieldLabel>
              <Input placeholder="Enter Pharmacy Benefits Manager Phone" value={form.pbmPhone} onChange={set('pbmPhone')} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel>Pharmacy Benefits Manager URL</FieldLabel>
              <Input placeholder="Select Pharmacy Benefits Manager URL" value={form.pbmUrl} onChange={set('pbmUrl')} />
            </div>
            <div className={styles.field}>
              <FieldLabel info>Rx BIN</FieldLabel>
              <Input placeholder="Enter RxBIN" value={form.rxBin} onChange={set('rxBin')} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <FieldLabel info>Rx PCN</FieldLabel>
              <Input placeholder="Enter RxPCN" value={form.rxPcn} onChange={set('rxPcn')} />
            </div>
            <div className={styles.field}>
              <FieldLabel info>Rx Group</FieldLabel>
              <Input placeholder="Enter RxGroup" value={form.rxGroup} onChange={set('rxGroup')} />
            </div>
          </div>

        </CollapsibleSection>

        {/* Next button */}
        <div className={styles.nextBtnRow}>
          <Button variant="secondary" size="L" fullWidth disabled={!canSave} onClick={() => {}}>
            Next
          </Button>
        </div>

      </div>

      {/* ── Right: card preview panel ── */}
      {showPreview && (
        <div className={styles.rightPanel}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Card Preview</span>
            <Button
              variant="secondary"
              size="L"
              leadingIcon="solar:eye-closed-linear"
              onClick={() => setShowPreview(false)}
            >
              Hide ID Preview
            </Button>
          </div>

          <div className={styles.previewScroll}>

            {/* Front View */}
            <div className={styles.cardViewSection}>
              <span className={`${styles.cardViewLabel} ${styles.cardViewLabelFront}`}>Front View</span>
              <div
                className={styles.insuranceCard}
                style={{
                  background: cardTheme.bg,
                  '--card-text-primary':   cardTheme.textPrimary,
                  '--card-text-secondary': cardTheme.textSecondary,
                  '--card-divider':        cardTheme.dividerColor,
                }}
              >
                <div className={styles.cardInner}>
                  <div className={styles.cardTopRow}>
                    <div className={styles.cardPlanInfo}>
                      <span className={styles.cardPlanLogo}>{form.planLogoUrl ? '' : '{Plan Logo}'}</span>
                      <span className={styles.cardPlanName}>{form.planName || '{Plan Name}'}</span>
                    </div>
                    <span
                      className={styles.cardTypeBadge}
                      style={{
                        color:      cardTheme.badgeTextColor,
                        background: cardTheme.isLight
                          ? 'linear-gradient(180deg, rgba(130,252,191,0.4) 0%, rgba(6,198,102,0.2) 100%)'
                          : 'linear-gradient(180deg, rgba(180,252,218,0.22) 0%, rgba(6,198,102,0.1) 100%)',
                        border: `0.355px solid ${cardTheme.isLight ? 'rgba(120,220,170,0.35)' : 'rgba(180,252,218,0.35)'}`,
                      }}
                    >
                      {form.planType || 'TYPE'}
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
                      <span className={styles.cardMetaValue}>{form.groupNumber || '{Group ID}'}</span>
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

            {/* Back View */}
            <div className={`${styles.cardViewSection} ${styles.cardViewSectionLast}`}>
              <span className={`${styles.cardViewLabel} ${styles.cardViewLabelBack}`}>Back View</span>
              <div
                className={styles.backCard}
                style={{
                  background: cardTheme.bg,
                  '--card-text-primary':   cardTheme.textPrimary,
                  '--card-text-secondary': cardTheme.textSecondary,
                  '--card-divider':        cardTheme.dividerColor,
                }}
              >
                <div className={styles.backCardInner}>
                  <div className={styles.backRow}>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>In-Network Deductible</span>
                      <span className={styles.backFieldValue}>I: {'{$}'} | F: {'{$}'}</span>
                    </div>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>Out of-Network Deductible</span>
                      <span className={styles.backFieldValue}>I: {'{$}'} | F: {'{$}'}</span>
                    </div>
                  </div>
                  <div className={styles.backRow}>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>In-Network OOP Max</span>
                      <span className={styles.backFieldValue}>I: {'{$}'} | F: {'{$}'}</span>
                    </div>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>Out of-Network OOP Max</span>
                      <span className={styles.backFieldValue}>I: {'{$}'} | F: {'{$}'}</span>
                    </div>
                  </div>

                  <div className={styles.backCardDivider} />

                  <div className={styles.backRow}>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>RX BIN</span>
                      <span className={styles.backFieldValue}>{form.rxBin || '{Rx BIN}'}</span>
                    </div>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>RX PCN</span>
                      <span className={styles.backFieldValue}>{form.rxPcn || '{Rx PCN}'}</span>
                    </div>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>RX Group</span>
                      <span className={styles.backFieldValue}>{form.rxGroup || '{Rx Group}'}</span>
                    </div>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>EDI Payer ID</span>
                      <span className={styles.backFieldValue}>{form.ediPayerId || '{EDI Payer ID}'}</span>
                    </div>
                  </div>

                  <div className={styles.backCardDivider} />

                  <div className={`${styles.backRow} ${styles.backRowAlignStart}`}>
                    <div className={styles.backField}>
                      <span className={styles.backFieldLabel}>Claims Mailing Address</span>
                      <div className={styles.backAddressBlock}>
                        <span className={styles.backFieldValue}>{form.addressLine1 || '{Address Line 1}'}</span>
                        {form.addressLine2 && <span className={styles.backFieldValue}>{form.addressLine2}</span>}
                        <span className={styles.backFieldValue}>
                          {(form.zipcode || form.city || form.state)
                            ? [form.zipcode, form.city, form.state].filter(Boolean).join(', ')
                            : '{Zipcode, City, State}'}
                        </span>
                      </div>
                    </div>
                    <div className={`${styles.backField} ${styles.backFieldGroup}`}>
                      <div className={styles.backField}>
                        <span className={styles.backFieldLabel}>Provider Support:</span>
                        <span className={styles.backFieldValue}>{form.providerSupportPhone || '{Provider Support number}'}</span>
                      </div>
                      <div className={styles.backField}>
                        <span className={styles.backFieldLabel}>Member Support:</span>
                        <span className={styles.backFieldValue}>{form.memberSupportPhone || '{Member Support number}'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.backCardDivider} />

                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>For any queries, Please visit:</span>
                    <span className={styles.backFieldValue}>{form.planWebsiteUrl || '{Plan Website}'}</span>
                  </div>

                  <div className={styles.backCardDivider} />

                  <p className={styles.backNote}>
                    {form.additionalNote || '{Additional Note}'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Preview footer */}
          <div className={styles.previewFooter}>
            <Switch
              checked={maskMemberId}
              onChange={setMaskMemberId}
              label="Mask Member ID on card"
            />
            <span className={styles.previewFooterDivider} />
            <CardThemePicker theme={cardTheme} onThemeChange={setCardTheme} />
          </div>
        </div>
      )}

    </Drawer>
  );
}
