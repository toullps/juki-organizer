type TimedTask = { due_time?: string | null; estimated_minutes?: number | null };
// Each connected overlap group shares columns; touching endpoints do not overlap.
export function calendarLayout<T extends TimedTask>(tasks: T[]) {
  const events = tasks.filter(t => !!t.due_time).map(task => {
    const [h, m] = task.due_time!.split(':').map(Number);
    const start = h * 60 + m;
    return { task, start, end: Math.min(1440, start + Math.max(1, task.estimated_minutes || 30)), column: 0, columns: 1 };
  }).sort((a, b) => a.start - b.start || b.end - a.end);
  let group: typeof events = [], ends: number[] = [], groupEnd = -1;
  const finish = () => { for (const event of group) event.columns = ends.length; };
  for (const event of events) {
    if (event.start >= groupEnd) { finish(); group = []; ends = []; }
    let column = ends.findIndex(end => end <= event.start);
    if (column < 0) column = ends.length;
    event.column = column; ends[column] = event.end; group.push(event);
    groupEnd = Math.max(...ends);
  }
  finish();
  return events;
}
