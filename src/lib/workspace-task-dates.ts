export type TodayTask = { id: string; title: string; status: string; priority: string; due: string; url: string };
export function shanghaiDay(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function isTaskToday(start: string, end: string | null, today: string): boolean {
  const day = (value: string) => value.length === 10 ? value : shanghaiDay(new Date(value));
  return day(start) <= today && day(end || start) >= today;
}
export function addDays(day: string, count: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function isTaskInRange(start: string, end: string | null, from: string, to: string): boolean {
  const day = (value: string) => value.length === 10 ? value : shanghaiDay(new Date(value));
  return day(start) <= to && day(end || start) >= from;
}
