import { Drawer } from '../../../components/Drawer/Drawer';
import { BillingMemberTable } from './BillingMemberTable';

/**
 * Read-only list of billed members: a month's Billing Report, or one
 * member's billing details from the Billable tab.
 *
 * @param {string}   props.title
 * @param {object[]} props.rows
 * @param {function} props.onClose
 */
export function BillingReportDrawer({ title, rows, onClose }) {
  return (
    // Wider than the standard drawer so all eight columns fit.
    <Drawer title={title} width={1100} onClose={onClose}>
      <BillingMemberTable rows={rows} embedded />
    </Drawer>
  );
}
