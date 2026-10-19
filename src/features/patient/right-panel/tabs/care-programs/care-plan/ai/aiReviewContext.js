import { createContext, useContext } from 'react';

/* How an "AI · Review" badge clears its item: CarePlanView provides
   { onReview(kind, item) }. Without it (template views, read-only plans)
   the badge still shows its evidence but can't be cleared. */
export const AiReviewContext = createContext(null);
export const useAiReview = () => useContext(AiReviewContext);
