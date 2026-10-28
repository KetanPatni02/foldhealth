import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Only accounts the server created with app_metadata.role = 'patient' may use
// this app. app_metadata is not user-editable, and RLS gates every table on
// the same role (supabase/staff_patient_rls_split_migration.sql).
export const isPatient = (session) => session?.user?.app_metadata?.role === 'patient';

export function usePatientSession() {
  const [state, setState] = useState({ ready: false, session: null, recovering: false });

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setState((s) => ({ ...s, ready: true, session: data.session }));
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({
        ready: true,
        session,
        // A reset link signs the user in with a recovery session; they must
        // choose a new password before seeing the app.
        recovering: event === 'PASSWORD_RECOVERY' || (s.recovering && event !== 'USER_UPDATED' && event !== 'SIGNED_OUT'),
      }));
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
