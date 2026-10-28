import { createContext, useContext } from 'react';

// { profiles, profile, select(memberId), choose() } for the signed-in
// patient; `profile` is the person every screen currently acts for.
export const ProfileContext = createContext(null);

export const useProfile = () => useContext(ProfileContext);
