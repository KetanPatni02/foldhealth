import { SectionTitleBar } from '../../../components/SectionTitleBar/SectionTitleBar';
import { useAllOooRecords } from '../../ooo/useAllOooRecords';
import styles from './CalendarSettings.module.css';

/**
 * Settings → Calendar → OOO Records: everyone's Out of Office records, with
 * search, filters and New OOO Record on the tab row (Figma Eventus
 * 17367:121995, 17414:107368).
 *
 * @param {object}   props
 * @param {object[]} props.tabs       – The Calendar settings tabs
 * @param {string}   props.activeTab
 * @param {function} props.onTabChange
 */
export function OooRecordsTab({ tabs, activeTab, onTabChange }) {
  const all = useAllOooRecords({ oneLineDates: true });
  return (
    <div className={styles.wrapper}>
      <SectionTitleBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} actions={[]} rightExtras={all.tools} />
      {all.filterRow && <div className={styles.filterRow}>{all.filterRow}</div>}
      <div className={styles.content}>{all.body}</div>
      {all.elements}
    </div>
  );
}
