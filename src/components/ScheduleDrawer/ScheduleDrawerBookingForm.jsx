import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { ScheduleDrawerPatientSection } from './ScheduleDrawerPatientSection';
import { ScheduleDrawerAppointmentDetails } from './ScheduleDrawerAppointmentDetails';
import { ScheduleDrawerInstructionFields } from './ScheduleDrawerInstructionFields';
import styles from './ScheduleDrawer.module.css';

export function ScheduleDrawerBookingForm(props) {
  const {
    onClose,
    canSchedule,
    handleSchedule,
    patients,
    selectedPatient,
    setSelectedPatient,
    reasonForVisit,
    setReasonForVisit,
    requireRsvp,
    setRequireRsvp,
    openSections,
    setSectionOpen,
    memberInstructionRef,
    staffInstructionRef,
  } = props;

  return (
    <Drawer title="Schedule Appointment" onClose={onClose} noCloseDivider headerRight={
      <>
        <Button variant="primary" size="L" disabled={!canSchedule} onClick={handleSchedule}>Schedule</Button>
        <span className={styles.headerDivider} />
      </>
    } bodyClassName={styles.drawerBody}>
      <div className={styles.content}>
        <ScheduleDrawerPatientSection
          selectedPatient={selectedPatient}
          setSelectedPatient={setSelectedPatient}
          patients={patients}
          reasonForVisit={reasonForVisit}
          setReasonForVisit={setReasonForVisit}
        />
        <ScheduleDrawerAppointmentDetails {...props} />
        <ScheduleDrawerInstructionFields
          requireRsvp={requireRsvp}
          setRequireRsvp={setRequireRsvp}
          openSections={openSections}
          setSectionOpen={setSectionOpen}
          memberInstructionRef={memberInstructionRef}
          staffInstructionRef={staffInstructionRef}
        />
      </div>
    </Drawer>
  );
}
