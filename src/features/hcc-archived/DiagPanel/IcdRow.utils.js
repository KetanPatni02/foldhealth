export const TYPE_BADGE = {
  Suspect:        { className: 'typeSuspect',     label: 'Suspect' },
  Recapture:      { className: 'typeRecapture',   label: 'Recapture' },
  Manual:         { className: 'typeManual',      label: 'Manual' },
  'Added In EHR': { className: 'typeAddedInEhr',  label: 'Added In EHR' },
};

export const isAISuggested = (icd) => ['Suspect', 'Recapture'].includes(icd.type || '');
