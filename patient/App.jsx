import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isPatient, usePatientSession } from './lib/usePatientSession';
import { LoginPage } from './auth/LoginPage';
import { SetPasswordPage } from './auth/SetPasswordPage';
import { PatientShell } from './shell/PatientShell';

const NOT_A_PATIENT = 'This portal is for patients. Staff members sign in through the Fold Health staff app.';

export function App() {
  const { ready, session, recovering } = usePatientSession();
  const [notice, setNotice] = useState('');
  const staffSession = session && !isPatient(session);

  useEffect(() => {
    if (staffSession) supabase.auth.signOut().then(() => setNotice(NOT_A_PATIENT));
  }, [staffSession]);

  if (!ready) return null;
  if (recovering && session) return <SetPasswordPage />;
  if (!session || staffSession) return <LoginPage notice={staffSession ? NOT_A_PATIENT : notice} />;
  return <PatientShell user={session.user} />;
}
