import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Toggle } from '../../components/Toggle/Toggle';
import { OverlayVerticalScroll, highlightJson, highlightHtml } from './PropertiesPanel.utils.jsx';
import { CodeTabHtmlOverrideBanner, CodeTabCustomHtmlBanner } from './PropertiesPanelCodeTabBanners.jsx';
import { usePropertiesPanelCodeTab } from './usePropertiesPanelCodeTab.js';
import styles from './EmailBuilder.module.css';

export function CodeTab({ doc }) {
  const {
    mode,
    text,
    error,
    textareaRef,
    htmlPreviewOverride,
    setEmailDocument,
    doc: currentDoc,
    handleChange,
    handleBlur,
    copy,
    reformat,
    switchMode,
    setError,
  } = usePropertiesPanelCodeTab(doc);

  const highlighted = mode === 'json' ? highlightJson(text) : highlightHtml(text);

  return (
    <div className={styles.codeScroll}>
      <div className={styles.codeToolbar}>
        <Toggle
          items={[{ key: 'json', label: 'JSON' }, { key: 'html', label: 'HTML' }]}
          active={mode}
          size="S"
          onChange={switchMode}
        />
        <div className={styles.codeToolbarRight}>
          <button className={styles.codeCopyBtn} onClick={reformat} aria-label="Format">
            <Icon name="solar:magic-stick-3-linear" size={14} color="currentColor" />
            Format
          </button>
          <button className={styles.codeCopyBtn} onClick={copy} aria-label="Copy">
            <Icon name="solar:copy-linear" size={14} color="currentColor" />
            Copy
          </button>
        </div>
      </div>

      {mode === 'html' && htmlPreviewOverride && (
        <CodeTabHtmlOverrideBanner
          doc={currentDoc}
          htmlPreviewOverride={htmlPreviewOverride}
          setEmailDocument={setEmailDocument}
        />
      )}
      {mode === 'html' && !htmlPreviewOverride && currentDoc?.root?.data?.customHtml && (
        <CodeTabCustomHtmlBanner doc={currentDoc} setEmailDocument={setEmailDocument} setError={setError} />
      )}

      {error && (
        <div className={styles.codeError}>
          <Icon name="solar:danger-triangle-linear" size={12} color="currentColor" />
          {error}
        </div>
      )}

      <OverlayVerticalScroll className={styles.codeEditorScroll}>
        <div className={styles.codeEditor}>
          <pre className={styles.codePre} aria-hidden="true">
            <code className={styles.codeBlock} dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} />
          </pre>
          <textarea
            ref={textareaRef}
            className={styles.codeTextarea}
            value={text}
            onChange={handleChange}
            onBlur={handleBlur}
            spellCheck={false}
            autoComplete="off"
            aria-label={`Edit ${mode.toUpperCase()}`}
          />
        </div>
      </OverlayVerticalScroll>
    </div>
  );
}
