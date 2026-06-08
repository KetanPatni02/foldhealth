import { useState, useRef } from 'react';
import { Drawer }          from '../../components/Drawer/Drawer';
import { Button }          from '../../components/Button/Button';
import { Input }           from '../../components/Input/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Textarea }        from '../../components/Textarea/Textarea';
import { Switch }          from '../../components/Switch/Switch';
import { DEFAULT_CARD_THEME } from './CardThemePicker';
import { FieldLabel, PrefixInput, CollapsibleSection } from './InsurancePlanFormUtils';
import { InsuranceCardPreview } from './InsuranceCardPreview';
import { Icon }            from '../../components/Icon/Icon';
import styles from './CreateInsurancePlanDrawer.module.css';

/* ── Static option lists ── */
const PLAN_TYPE_OPTIONS = [
  'Medical', 'Dental', 'Vision',
].map(t => ({ value: t, label: t }));

const US_STATE_OPTIONS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
].map(s => ({ value: s, label: s }));

/* ── Main component ── */
export function CreateInsurancePlanDrawer({ onClose, onSave = () => {} }) {
  const [step,           setStep]          = useState(1);
  const [maskMemberId,   setMaskMemberId]  = useState(true);
  const [showPreview,    setShowPreview]   = useState(true);
  const [cardTheme,      setCardTheme]     = useState(DEFAULT_CARD_THEME);
  const [logoFile,       setLogoFile]      = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [coverageFamily, setCoverageFamily] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    planName: '', planType: '', groupNumber: '', externalId: '',
    ediPayerId: '', providerNetworkName: '', planLogoUrl: '',
    memberSupportPhone: '', providerSupportPhone: '',
    addressLine1: '', addressLine2: '', zipcode: '', city: '', state: '',
    planWebsiteUrl: '', additionalNote: '',
    pbmName: '', pbmPhone: '', pbmUrl: '',
    rxBin: '', rxPcn: '', rxGroup: '',
    /* Step 2 — Cost Sharing */
    /* individual-only mode (coverageFamily=false) */
    inNetDeductible: '', inNetOopMax: '',
    outNetDeductible: '', outNetOopMax: '',
    /* family mode (coverageFamily=true) — individual + family split */
    inNetDeductibleInd: '', inNetDeductibleFam: '',
    inNetOopMaxInd: '', inNetOopMaxFam: '',
    outNetDeductibleInd: '', outNetDeductibleFam: '',
    outNetOopMaxInd: '', outNetOopMaxFam: '',
    /* copays & coinsurance */
    inNetCopayPcp: '', inNetCopaySpecialist: '', inNetCopayUrgent: '', inNetCopayEr: '',
    inNetCoinsurancePcp: '', inNetCoinsuranceSpecialist: '', inNetCoinsuranceUrgent: '', inNetCoinsuranceEr: '',
    outNetCopayPcp: '', outNetCopaySpecialist: '', outNetCopayUrgent: '', outNetCopayEr: '',
    outNetCoinsurancePcp: '', outNetCoinsuranceSpecialist: '', outNetCoinsuranceUrgent: '', outNetCoinsuranceEr: '',
  });

  /* Input onChange — receives a DOM event */
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  /* Select onChange — receives a plain value string */
  const setVal = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setLogoFile(file.name);
      setLogoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file.name);
      setLogoPreviewUrl(URL.createObjectURL(file));
    }
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
          <Button variant="secondary" size="L" disabled={!canSave} onClick={() => { onSave({ ...form, logoPreviewUrl, cardTheme, coverageFamily }); onClose(); }}>Save</Button>
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
            <button className={styles.stageItem} onClick={() => setStep(1)}>
              <span className={`${styles.stageBadge} ${step === 1 ? styles.stageBadgeActive : styles.stageBadgeInactive}`}>1</span>
              <span className={`${styles.stageLabel} ${step === 1 ? styles.stageLabelActive : styles.stageLabelInactive}`}>Plan Information</span>
            </button>
            <span className={styles.stageConnector} />
            <button
              className={styles.stageItem}
              onClick={() => canSave && setStep(2)}
              disabled={!canSave}
              style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'default' }}
            >
              <span className={`${styles.stageBadge} ${step === 2 ? styles.stageBadgeActive : styles.stageBadgeInactive}`}>2</span>
              <span className={`${styles.stageLabel} ${step === 2 ? styles.stageLabelActive : styles.stageLabelInactive}`}>Cost Sharing(Tier)</span>
            </button>
          </div>
          <div className={styles.stageNavRight}>
            {!showPreview && (
              <Button variant="secondary" size="L" leadingIcon="solar:eye-linear" onClick={() => setShowPreview(true)}>
                Show ID Preview
              </Button>
            )}
            {step === 1 ? (
              <Button variant="primary" size="L" disabled={!canSave} onClick={() => setStep(2)}>
                Next
              </Button>
            ) : (
              <Button variant="secondary" size="L" leadingIcon="solar:alt-arrow-left-linear" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
          </div>
        </div>

        {step === 1 ? (
          <>
            {/* Plan Identifiers */}
            <CollapsibleSection icon="solar:shield-user-linear" title="Plan Identifiers">

              <div className={styles.row}>
                <div className={styles.field}>
                  <FieldLabel required>Plan Name</FieldLabel>
                  <Input placeholder="Enter Plan Name" value={form.planName} onChange={set('planName')} />
                </div>
                <div className={styles.field}>
                  <FieldLabel>Plan Type</FieldLabel>
                  <Select value={form.planType || undefined} onValueChange={setVal('planType')}>
                    <SelectTrigger><SelectValue placeholder="Select Plan Type" /></SelectTrigger>
                    <SelectContent>
                      {PLAN_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                {(logoPreviewUrl || form.planLogoUrl) ? (
                  /* ── Uploaded state: preview + Replace / Delete ── */
                  <div className={styles.logoPreviewContainer}>
                    <img
                      src={logoPreviewUrl || form.planLogoUrl}
                      alt="Plan Logo"
                      className={styles.logoPreviewImg}
                    />
                    <div className={styles.logoActions}>
                      <button
                        className={styles.logoActionBtn}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Icon name="solar:restart-linear" size={12} color="var(--neutral-300)" />
                        <span>Replace</span>
                      </button>
                      <button
                        className={`${styles.logoActionBtn} ${styles.logoDeleteBtn}`}
                        onClick={() => { setLogoFile(null); setLogoPreviewUrl(null); setForm(f => ({ ...f, planLogoUrl: '' })); }}
                      >
                        <Icon name="solar:trash-bin-2-linear" size={12} color="#D72825" />
                        <span>Delete</span>
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".svg,image/*" style={{ display: 'none' }} onChange={handleFilePick} />
                  </div>
                ) : (
                  /* ── Empty state: URL input + drag-drop ── */
                  <>
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
                      <div className={styles.dropZoneText}>
                        Drag and drop file here or <span className={styles.dropZoneLink}>Choose file</span>
                      </div>
                      <input ref={fileInputRef} type="file" accept=".svg,image/*" style={{ display: 'none' }} onChange={handleFilePick} />
                    </div>
                    <div className={styles.dropZoneMeta}>
                      <span className={styles.dropZoneMetaText}>Supported formats: SVG</span>
                      <span className={styles.dropZoneMetaText}>Max size: 5 MB</span>
                    </div>
                  </>
                )}
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
                  <Select value={form.state || undefined} onValueChange={setVal('state')}>
                    <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                    <SelectContent>
                      {US_STATE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
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

          </>
        ) : (
          <div className={styles.costSharingContent}>

            {/* Info alert */}
            <div className={styles.costSharingAlert}>
              <Icon name="solar:info-circle-linear" size={16} color="#145ECC" />
              <span className={styles.costSharingAlertText}>All fields are mandatory.</span>
            </div>

            {/* Coverage family toggle */}
            <div className={styles.coverageSwitchRow}>
              <Switch
                checked={coverageFamily}
                onChange={setCoverageFamily}
              />
              <span className={styles.coverageSwitchLabel}>Coverage Applies to Subscriber's Family</span>
            </div>

            {/* In Network Coverage — flat section, no card */}
            <div className={styles.coverageSection}>
              <div className={styles.coverageSectionTitle}>In Network Coverage</div>
              <div className={styles.coverageSectionBody}>

                {coverageFamily ? (
                  <>
                    <div className={styles.coverageRow}>
                      <div className={styles.field}>
                        <FieldLabel>Individual Deductible</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetDeductibleInd} onChange={set('inNetDeductibleInd')} />
                      </div>
                      <div className={styles.field}>
                        <FieldLabel>Family Deductible</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetDeductibleFam} onChange={set('inNetDeductibleFam')} />
                      </div>
                    </div>
                    <div className={styles.coverageRow}>
                      <div className={styles.field}>
                        <FieldLabel>Individual OOP Max</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetOopMaxInd} onChange={set('inNetOopMaxInd')} />
                      </div>
                      <div className={styles.field}>
                        <FieldLabel>Family OOP Max</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetOopMaxFam} onChange={set('inNetOopMaxFam')} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>Deductible</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetDeductible} onChange={set('inNetDeductible')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>OOP Max</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetOopMax} onChange={set('inNetOopMax')} />
                    </div>
                  </div>
                )}

                <div className={styles.coverageSubGroup}>
                  <span className={styles.coverageSubLabel}>Copays</span>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>PCP</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCopayPcp} onChange={set('inNetCopayPcp')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>Specialist</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCopaySpecialist} onChange={set('inNetCopaySpecialist')} />
                    </div>
                  </div>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>Urgent Care</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCopayUrgent} onChange={set('inNetCopayUrgent')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>ER</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCopayEr} onChange={set('inNetCopayEr')} />
                    </div>
                  </div>
                </div>

                <div className={styles.coverageSubGroup}>
                  <span className={styles.coverageSubLabel}>Coinsurance</span>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>PCP</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCoinsurancePcp} onChange={set('inNetCoinsurancePcp')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>Specialist</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCoinsuranceSpecialist} onChange={set('inNetCoinsuranceSpecialist')} />
                    </div>
                  </div>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>Urgent Care</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCoinsuranceUrgent} onChange={set('inNetCoinsuranceUrgent')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>ER</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.inNetCoinsuranceEr} onChange={set('inNetCoinsuranceEr')} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Out of Network Coverage — flat section, no card */}
            <div className={styles.coverageSection}>
              <div className={styles.coverageSectionTitle}>Out of Network Coverage</div>
              <div className={styles.coverageSectionBody}>

                {coverageFamily ? (
                  <>
                    <div className={styles.coverageRow}>
                      <div className={styles.field}>
                        <FieldLabel>Individual Deductible</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetDeductibleInd} onChange={set('outNetDeductibleInd')} />
                      </div>
                      <div className={styles.field}>
                        <FieldLabel>Family Deductible</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetDeductibleFam} onChange={set('outNetDeductibleFam')} />
                      </div>
                    </div>
                    <div className={styles.coverageRow}>
                      <div className={styles.field}>
                        <FieldLabel>Individual OOP Max</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetOopMaxInd} onChange={set('outNetOopMaxInd')} />
                      </div>
                      <div className={styles.field}>
                        <FieldLabel>Family OOP Max</FieldLabel>
                        <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetOopMaxFam} onChange={set('outNetOopMaxFam')} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>Deductible</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetDeductible} onChange={set('outNetDeductible')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>OOP Max</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetOopMax} onChange={set('outNetOopMax')} />
                    </div>
                  </div>
                )}

                <div className={styles.coverageSubGroup}>
                  <span className={styles.coverageSubLabel}>Copays</span>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>PCP</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCopayPcp} onChange={set('outNetCopayPcp')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>Specialist</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCopaySpecialist} onChange={set('outNetCopaySpecialist')} />
                    </div>
                  </div>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>Urgent Care</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCopayUrgent} onChange={set('outNetCopayUrgent')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>ER</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCopayEr} onChange={set('outNetCopayEr')} />
                    </div>
                  </div>
                </div>

                <div className={styles.coverageSubGroup}>
                  <span className={styles.coverageSubLabel}>Coinsurance</span>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>PCP</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCoinsurancePcp} onChange={set('outNetCoinsurancePcp')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>Specialist</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCoinsuranceSpecialist} onChange={set('outNetCoinsuranceSpecialist')} />
                    </div>
                  </div>
                  <div className={styles.coverageRow}>
                    <div className={styles.field}>
                      <FieldLabel>Urgent Care</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCoinsuranceUrgent} onChange={set('outNetCoinsuranceUrgent')} />
                    </div>
                    <div className={styles.field}>
                      <FieldLabel>ER</FieldLabel>
                      <PrefixInput prefix="$" placeholder="Enter Value" value={form.outNetCoinsuranceEr} onChange={set('outNetCoinsuranceEr')} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

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
          <InsuranceCardPreview
            data={form}
            logoPreviewUrl={logoPreviewUrl}
            cardTheme={cardTheme}
            onThemeChange={setCardTheme}
            maskMemberId={maskMemberId}
            onMaskChange={setMaskMemberId}
          />
        </div>
      )}

    </Drawer>
  );
}
