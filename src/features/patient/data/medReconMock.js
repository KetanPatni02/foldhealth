// Medication Reconciliation step content (Figma 482:423825): the patient's
// active medications + the post-visit reconciliation checklist.
export const MED_RECON_MOCK = {
  dischargeUpdates: 2,
  medications: [
    { id: 'm1', name: 'Atorvastatin (Lipitor) 40mg', start: '11/09/2024', stop: '01/30/2025', sig: '1 tab • 1 time a day • Any Time' },
    { id: 'm2', name: 'Amlodipine (Norvasc) 5mg', start: '05/05/2024', stop: '09/12/2025', sig: '1 tab • 1 time a day • Any Time' },
    { id: 'm3', name: 'Escitalopram (Lexapro) 10mg', start: '02/28/2024', stop: '06/18/2025', sig: '1 tab • 1 time a day • Evening' },
    { id: 'm4', name: 'Metoprolol (Lopressor) 25mg', start: '10/04/2024', stop: '04/11/2024', sig: '1 tab • 2 times a day • After Meal' },
    { id: 'm5', name: 'Omeprazole (Prilosec) 20mg', start: '08/21/2024', stop: '12/30/2024', sig: '1 tab • 1 time a day • Before Meal' },
    { id: 'm6', name: 'Levothyroxine (Synthroid) 100mcg', start: '01/15/2024', stop: '03/22/2024', sig: '1 tab • 1 time a day • Before Meal' },
    { id: 'm7', name: 'Gabapentin (Neurontin) 300mg', start: '07/07/2024', stop: '11/11/2024', sig: '1 tab • 3 times a day • Any Time' },
    { id: 'm8', name: 'Hydrochlorothiazide (Microzide) 25mg', start: '02/14/2023', stop: '06/30/2023', sig: '1 tab • 1 time a day • Morning' },
  ],
  checklist: [
    { id: 'c1', label: 'The current medication list has been reconciled against the discharge medications.', checked: true },
    { id: 'c2', label: 'Discharge summary was filed in the system.', checked: true },
    { id: 'c3', label: 'No medications were prescribed or ordered upon discharge.', checked: false },
    { id: 'c4', label: 'Medication reconciliation was uploaded to portal.', checked: true },
    { id: 'c5', label: 'Medication reconciliation was faxed to PCP.', checked: false },
  ],
};
