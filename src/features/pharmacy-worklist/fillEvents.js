import { addDaysMdy, parseMdy } from './pharmacyWorklist.utils';

// Fill events that ripple through a pharmacy member's record when someone
// confirms a pickup (Outreach outcome or Pharmacy Verification): the measure
// is pickup-confirmed (Gap Closure status follows), and each active
// medication's last / next fill moves to the pickup with a refill-history row
// marked as call-confirmed (claims may not show it for weeks).

const earliest = (dates) => dates.reduce((min, d) => (!min || parseMdy(d) < parseMdy(min) ? d : min), null);

export function applyPickup(member, codes, date, source) {
  const changes = [];
  const measures = member.measures.map(x => {
    if (!codes.includes(x.code)) return x;
    const medications = x.medications.map(d => {
      if (d.status === 'Discontinued' || parseMdy(date) <= parseMdy(d.lastFill)) return d;
      const nextFill = addDaysMdy(date, d.daysSupply);
      changes.push(`${x.code} ${d.name}: last fill ${d.lastFill} → ${date}, next fill ${nextFill}`);
      return {
        ...d,
        lastFill: date,
        nextFill,
        refills: [{
          date, qty: d.qty, daysSupply: d.daysSupply,
          pharmacy: d.pharmacy?.name, prescriber: d.prescriber?.name,
          prescriberAddress: d.refills?.[0]?.prescriberAddress || '',
          source,
        }, ...(d.refills || [])],
      };
    });
    return {
      ...x,
      pickupConfirmed: date,
      pendingPickupSince: null,
      nextFillDue: earliest(medications.map(d => d.nextFill)) || x.nextFillDue,
      medications,
    };
  });
  return { measures, changes };
}

export function applyPendingPickup(member, codes, date) {
  return member.measures.map(x => (codes.includes(x.code) ? { ...x, pendingPickupSince: date } : x));
}

// Outcome text → fill event. Covers the schema's pickup outcomes
// ("Confirmed medication pickup", "…pickup date") and "Pending — Pick up".
export function fillEventFor(outcome) {
  const o = (outcome || '').toLowerCase();
  if (o.includes('confirmed medication pickup')) return 'pickup';
  if (o.includes('pending — pick up')) return 'pending-pickup';
  return null;
}
