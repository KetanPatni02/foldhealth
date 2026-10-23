import { createContext } from 'react';

// The Overview provides { byWidget, run, review } once; each card is wrapped
// in its own widget key so CardInsights knows which signals are its own.
export const OverviewInsightsContext = createContext(null);
export const OverviewWidgetKeyContext = createContext(null);
