import { useState } from 'react';
import { RadioButton } from '../../../components/RadioButton/RadioButton';
import { OutreachDateTimePicker } from './OutreachTab';
import styles from './PostVisitChecklist.module.css';

// Fixed checklist for the Post Visit Checklist step (Figma 482:339172).
// type: 'yesno' → Yes/No radios; 'date' → datetime input with a calendar icon.
const QUESTIONS = [
  { id: 'q1', type: 'yesno', text: 'Did you send the ICP mailer cover page to member?' },
  { id: 'q2', type: 'yesno', text: 'Did you send the ICP document to Member & PCP?' },
  { id: 'q3', type: 'yesno', text: 'Did you upload the ICP document to Provider portal?' },
  { id: 'q4', type: 'date', text: 'ICT Meeting date', value: '05/04/2024, 12:30 PM' },
  { id: 'q5', type: 'yesno', text: 'Did you send the ICT invite letter to patient & PCP?' },
  { id: 'q6', type: 'yesno', text: 'Did you send the Task to MD/Physician for signing off ICT meeting?' },
];

export function PostVisitChecklist() {
  const [answers, setAnswers] = useState(() => {
    const seed = {};
    QUESTIONS.forEach(q => { if (q.type === 'date') seed[q.id] = q.value; });
    return seed;
  });

  const setYesNo = (id, v) => setAnswers(a => ({ ...a, [id]: v }));
  const setDate = (id, v) => setAnswers(a => ({ ...a, [id]: v }));

  return (
    <div className={styles.container}>
      {QUESTIONS.map((q, i) => (
        <div key={q.id} className={styles.question}>
          <div className={styles.questionText}>
            <span className={styles.num}>{i + 1}.</span>
            <span className={styles.label}>{q.text}</span>
          </div>
          {q.type === 'date' ? (
            <div className={styles.answer}>
              <OutreachDateTimePicker
                className={styles.datePicker}
                value={answers[q.id] || ''}
                onChange={v => setDate(q.id, v)}
              />
            </div>
          ) : (
            <div className={styles.answer}>
              <RadioButton checked={answers[q.id] === 'Yes'} onChange={() => setYesNo(q.id, 'Yes')} label="Yes" />
              <RadioButton checked={answers[q.id] === 'No'} onChange={() => setYesNo(q.id, 'No')} label="No" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
