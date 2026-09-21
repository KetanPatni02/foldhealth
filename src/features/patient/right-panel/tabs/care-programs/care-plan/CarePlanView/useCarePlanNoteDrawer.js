import { useState } from 'react';

/** Care plan header note drawer: open/close with unsaved guard. */
export function useCarePlanNoteDrawer(latestPlanNote) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteBaseline, setNoteBaseline] = useState('');
  const [noteDiscardOpen, setNoteDiscardOpen] = useState(false);
  const [noteDeleteOpen, setNoteDeleteOpen] = useState(false);

  const noteDirty = noteText.trim() !== (noteBaseline || '').trim();

  const openNoteDrawer = () => {
    const seed = latestPlanNote?.detail || '';
    setNoteText(seed);
    setNoteBaseline(seed);
    setNoteOpen(true);
  };

  const closeNoteDrawer = ({ force = false } = {}) => {
    if (!force && noteDirty) {
      setNoteDiscardOpen(true);
      return;
    }
    setNoteOpen(false);
    setNoteText('');
    setNoteBaseline('');
  };

  return {
    noteOpen,
    setNoteOpen,
    noteText,
    setNoteText,
    noteBaseline,
    noteDiscardOpen,
    setNoteDiscardOpen,
    noteDeleteOpen,
    setNoteDeleteOpen,
    noteDirty,
    openNoteDrawer,
    closeNoteDrawer,
  };
}
