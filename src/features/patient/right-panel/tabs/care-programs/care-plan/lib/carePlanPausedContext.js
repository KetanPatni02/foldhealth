import { createContext, useContext } from 'react';

/* Whether the care plan being shown is paused (lib/carePlanPause), set by
   CarePlanView so its tables and previews can drop overdue flags and show
   automations as paused without threading a prop through every row. */
export const CarePlanPausedContext = createContext(false);
export const useCarePlanPaused = () => useContext(CarePlanPausedContext);
