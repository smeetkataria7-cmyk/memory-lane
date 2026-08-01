// The day key is always local, never UTC - a day belongs to the calendar
// date the person was living in, not the server's.
export const todayKey = (d = new Date()): string => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
