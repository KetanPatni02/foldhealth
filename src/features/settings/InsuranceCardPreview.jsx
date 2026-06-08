import { Switch } from '../../components/Switch/Switch';
import { CardThemePicker } from './CardThemePicker';
import styles from './InsuranceCardPreview.module.css';

export function InsuranceCardPreview({
  data,
  logoPreviewUrl,
  cardTheme,
  onThemeChange,
  maskMemberId,
  onMaskChange,
}) {
  return (
    <>
      <div className={styles.previewScroll}>

        {/* Front View */}
        <div className={styles.cardViewSection}>
          <span className={`${styles.cardViewLabel} ${styles.cardViewLabelFront}`}>Front View</span>
          <div
            className={styles.insuranceCard}
            style={{
              background: cardTheme?.bg,
              '--card-text-primary':   cardTheme?.textPrimary,
              '--card-text-secondary': cardTheme?.textSecondary,
              '--card-divider':        cardTheme?.dividerColor,
            }}
          >
            <div className={styles.cardInner}>
              <div className={styles.cardTopRow}>
                <div className={styles.cardPlanInfo}>
                  {(logoPreviewUrl || data?.planLogoUrl) ? (
                    <img src={logoPreviewUrl || data?.planLogoUrl} alt="Plan Logo" className={styles.cardLogoImg} />
                  ) : (
                    <span className={styles.cardPlanLogo}>{'{Plan Logo}'}</span>
                  )}
                  <span className={styles.cardPlanName}>{data?.planName || '{Plan Name}'}</span>
                </div>
                <span
                  className={styles.cardTypeBadge}
                  style={{
                    color:      cardTheme?.badgeTextColor,
                    background: cardTheme?.isLight
                      ? 'linear-gradient(180deg, rgba(130,252,191,0.4) 0%, rgba(6,198,102,0.2) 100%)'
                      : 'linear-gradient(180deg, rgba(180,252,218,0.22) 0%, rgba(6,198,102,0.1) 100%)',
                    border: `0.355px solid ${cardTheme?.isLight ? 'rgba(120,220,170,0.35)' : 'rgba(180,252,218,0.35)'}`,
                  }}
                >
                  {data?.planType || 'TYPE'}
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
                  <span className={styles.cardMetaValue}>{data?.groupNumber || '{Group ID}'}</span>
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
              background: cardTheme?.bg,
              '--card-text-primary':   cardTheme?.textPrimary,
              '--card-text-secondary': cardTheme?.textSecondary,
              '--card-divider':        cardTheme?.dividerColor,
            }}
          >
            <div className={styles.backCardInner}>
              <div className={styles.backRow}>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>In-Network Deductible</span>
                  <span className={styles.backFieldValue}>{data?.inNetDeductible ? `$${data.inNetDeductible}` : '{$}'}</span>
                </div>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>Out of-Network Deductible</span>
                  <span className={styles.backFieldValue}>{data?.outNetDeductible ? `$${data.outNetDeductible}` : '{$}'}</span>
                </div>
              </div>
              <div className={styles.backRow}>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>In-Network OOP Max</span>
                  <span className={styles.backFieldValue}>{data?.inNetOopMax ? `$${data.inNetOopMax}` : '{$}'}</span>
                </div>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>Out of-Network OOP Max</span>
                  <span className={styles.backFieldValue}>{data?.outNetOopMax ? `$${data.outNetOopMax}` : '{$}'}</span>
                </div>
              </div>

              <div className={styles.backCardDivider} />

              <div className={styles.backRow}>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>RX BIN</span>
                  <span className={styles.backFieldValue}>{data?.rxBin || '{Rx BIN}'}</span>
                </div>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>RX PCN</span>
                  <span className={styles.backFieldValue}>{data?.rxPcn || '{Rx PCN}'}</span>
                </div>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>RX Group</span>
                  <span className={styles.backFieldValue}>{data?.rxGroup || '{Rx Group}'}</span>
                </div>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>EDI Payer ID</span>
                  <span className={styles.backFieldValue}>{data?.ediPayerId || '{EDI Payer ID}'}</span>
                </div>
              </div>

              <div className={styles.backCardDivider} />

              <div className={`${styles.backRow} ${styles.backRowAlignStart}`}>
                <div className={styles.backField}>
                  <span className={styles.backFieldLabel}>Claims Mailing Address</span>
                  <div className={styles.backAddressBlock}>
                    <span className={styles.backFieldValue}>{data?.addressLine1 || '{Address Line 1}'}</span>
                    {data?.addressLine2 && <span className={styles.backFieldValue}>{data.addressLine2}</span>}
                    <span className={styles.backFieldValue}>
                      {(data?.zipcode || data?.city || data?.state)
                        ? [data.zipcode, data.city, data.state].filter(Boolean).join(', ')
                        : '{Zipcode, City, State}'}
                    </span>
                  </div>
                </div>
                <div className={`${styles.backField} ${styles.backFieldGroup}`}>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>Provider Support:</span>
                    <span className={styles.backFieldValue}>{data?.providerSupportPhone || '{Provider Support number}'}</span>
                  </div>
                  <div className={styles.backField}>
                    <span className={styles.backFieldLabel}>Member Support:</span>
                    <span className={styles.backFieldValue}>{data?.memberSupportPhone || '{Member Support number}'}</span>
                  </div>
                </div>
              </div>

              <div className={styles.backCardDivider} />

              <div className={styles.backField}>
                <span className={styles.backFieldLabel}>For any queries, Please visit:</span>
                <span className={styles.backFieldValue}>{data?.planWebsiteUrl || '{Plan Website}'}</span>
              </div>

              <div className={styles.backCardDivider} />

              <p className={styles.backNote}>
                {data?.additionalNote || 'Note: Please Call your Healthcare provider for any issues related to claims or your health plans or visit the plan website.'}
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className={styles.previewFooter}>
        <Switch checked={maskMemberId} onChange={onMaskChange} label="Mask Member ID on card" />
        <span className={styles.previewFooterDivider} />
        {onThemeChange ? (
          <CardThemePicker theme={cardTheme} onThemeChange={onThemeChange} />
        ) : (
          <span
            className={styles.themeSwatchStatic}
            style={{ background: cardTheme?.dot }}
            title={`Theme: ${cardTheme?.name || 'Custom'}`}
          />
        )}
      </div>
    </>
  );
}
