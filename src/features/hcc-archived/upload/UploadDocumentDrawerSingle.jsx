import { useEffect, useMemo, useRef, useState } from 'react';
import { POS_LABEL } from './mockOcr';
import {
  buildAllIcds,
  filterIcdMatches,
  filterPatientMatches,
} from './UploadDocumentDrawerSingle.utils';
import {
  SinglePhasePatientSection,
  SinglePhaseIcdSection,
  SinglePhaseDosSection,
  SinglePhaseEncounterGrid,
  SinglePhaseFileSection,
  SinglePhaseFooter,
} from './UploadDocumentDrawerSingleSections';
import styles from './UploadDocumentDrawer.module.css';

export function SinglePhase({ hccMembers, batchId, showToast, createFromEncounter, onDone }) {
  const [patient, setPatient] = useState(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [icdQuery, setIcdQuery] = useState('');
  const [icds, setIcds] = useState([]);
  const [dosMode, setDosMode] = useState('existing');
  const [dos, setDos] = useState('');
  const [provider, setProvider] = useState('');
  const [pos, setPos] = useState('11');
  const [docType, setDocType] = useState('Progress Note');
  const [condition, setCondition] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const patientMatches = useMemo(
    () => filterPatientMatches(hccMembers, patientQuery),
    [hccMembers, patientQuery],
  );
  const allIcds = useMemo(() => buildAllIcds(), []);
  const icdMatches = useMemo(
    () => filterIcdMatches(allIcds, icdQuery),
    [allIcds, icdQuery],
  );

  const addIcd = (item) => {
    if (icds.some(i => i.code === item.code)) return;
    setIcds([...icds, item]);
    setIcdQuery('');
  };
  const removeIcd = (code) => setIcds(icds.filter(i => i.code !== code));

  const existingDosList = patient?.dos_list?.map(d => d.date) || [];
  const canConfirm = patient && icds.length > 0 && dos && provider && pos;

  const handleConfirm = () => {
    if (!canConfirm) return;
    const result = createFromEncounter({
      tempId: `single-${Date.now()}`,
      patient: {
        name: patient.name,
        dob: patient.dob,
        matchedMemberId: patient.id,
        matchConfidence: 100,
      },
      dos,
      provider,
      pos,
      posDesc: POS_LABEL[pos] || '',
      icds: icds.map(i => ({ code: i.code, valid: true })),
      _docName: file?.name || `Manual entry — ${condition || 'encounter'}.pdf`,
      _docType: docType,
      errors: [],
    });
    if (result.kind === 'skipped') {
      showToast('Could not save — patient not matched');
      return;
    }
    const label = result.kind === 'created'
      ? `Encounter added for ${patient.name}`
      : result.kind === 'updated'
        ? `ICDs merged into existing DOS for ${patient.name}`
        : `Related DOS created for ${patient.name}`;
    showToast(label);
    onDone?.();
  };

  return (
    <div className={styles.singlePhase}>
      <p className={styles.pickerSubtitle}>
        Add a single encounter manually — pick a patient, attach ICDs, and upload
        the supporting document.
      </p>

      <SinglePhasePatientSection
        patient={patient}
        patientQuery={patientQuery}
        patientMatches={patientMatches}
        onQueryChange={setPatientQuery}
        onSelectPatient={(m) => { setPatient(m); setPatientQuery(''); }}
        onClearPatient={() => { setPatient(null); setPatientQuery(''); }}
      />

      <SinglePhaseIcdSection
        icdQuery={icdQuery}
        icdMatches={icdMatches}
        icds={icds}
        onQueryChange={setIcdQuery}
        onAddIcd={addIcd}
        onRemoveIcd={removeIcd}
      />

      <SinglePhaseDosSection
        patient={patient}
        dosMode={dosMode}
        dos={dos}
        existingDosList={existingDosList}
        onDosModeChange={setDosMode}
        onDosChange={setDos}
      />

      <SinglePhaseEncounterGrid
        provider={provider}
        pos={pos}
        docType={docType}
        condition={condition}
        onProviderChange={setProvider}
        onPosChange={setPos}
        onDocTypeChange={setDocType}
        onConditionChange={setCondition}
      />

      <SinglePhaseFileSection
        file={file}
        fileInputRef={fileInputRef}
        showToast={showToast}
        onFileChange={setFile}
        onRemoveFile={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
      />

      <SinglePhaseFooter canConfirm={canConfirm} onConfirm={handleConfirm} />
    </div>
  );
}
