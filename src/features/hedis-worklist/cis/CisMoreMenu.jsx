import { useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { downloadCisSchedule } from './downloadCisSchedule';
import { seriesStartDate } from './cisStatusConfig';

/**
 * CIS-CMB10 more-actions (⋯) menu: download the schedule or the
 * immunization record PDF. Scheduling a vaccine reminder is the Suggested
 * Action; saving the record to Documents is its own button.
 *
 * @param {object}   props
 * @param {object}   props.member
 * @param {object}   props.result           – evaluateCis() output
 * @param {object}   [props.notes]          – cis_dose_notes by 'dtap:1'
 * @param {'S'|'L'}  [props.size='S']
 */
export function CisMoreMenu({ member, result, notes, size = 'S' }) {
  const [rect, setRect] = useState(null);
  const items = [
    { key: 'schedule', icon: 'solar:download-minimalistic-linear', label: 'Download Schedule' },
    { key: 'record', icon: 'solar:download-minimalistic-linear', label: 'Download Immunization Record' },
  ];
  const params = { member, result, notes, startedOn: seriesStartDate(result) };
  const select = async (key) => {
    setRect(null);
    // The immunization record carries Astrana's header and footer (their
    // team's preview); the schedule keeps the Trailhead report branding.
    downloadCisSchedule({ ...params, mode: key, brand: key === 'record' ? 'astrana' : 'trailhead' });
  };
  return (
    <>
      <ActionButton
        size={size}
        icon="solar:menu-dots-linear"
        tooltip="More actions"
        tooltipLeft
        onClick={(e) => setRect(e.currentTarget.getBoundingClientRect())}
      />
      {rect && (
        <MenuPopover
          anchorRect={rect}
          items={items}
          onSelect={select}
          onClose={() => setRect(null)}
          ariaLabel="More actions"
          width={264}
        />
      )}
    </>
  );
}
