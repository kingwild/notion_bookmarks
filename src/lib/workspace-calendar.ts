import { Solar } from 'lunar-javascript';
export type MarketingDay = { date: string; day: number; events: { name: string; kind: string }[] };
const fixed: Record<string, string[]> = {
  '01-01': ['元旦'], '02-14': ['情人节'], '03-08': ['妇女节'], '03-12': ['植树节'], '03-15': ['消费者权益日'],
  '04-22': ['世界地球日'], '05-01': ['劳动节'], '05-04': ['青年节'], '05-10': ['中国品牌日'], '05-20': ['520 营销节点'],
  '06-01': ['儿童节'], '06-05': ['世界环境日'], '06-18': ['618 营销节点'], '07-01': ['建党纪念日'], '08-01': ['建军节'],
  '09-01': ['开学季内容节点'], '09-10': ['教师节'], '10-01': ['国庆节'], '11-11': ['双 11 营销节点'], '12-12': ['双 12 营销节点'], '12-25': ['圣诞节'],
};
export function marketingMonth(year: number, month: number): MarketingDay[] {
  if (!Number.isInteger(year) || year < 2000 || year > 2099 || !Number.isInteger(month) || month < 1 || month > 12) return [];
  return Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, index) => {
    const day = index + 1, short = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const events = (fixed[short] || []).map(name => ({ name, kind: name.includes('节点') ? '营销' : '纪念日' }));
    events.push(...lunar.getFestivals().map(name => ({ name, kind: '传统节日' })));
    const term = lunar.getJieQi(); if (term) events.push({ name: term, kind: '节气' });
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === 0 && month === 5 && day >= 8 && day <= 14) events.push({ name: '母亲节', kind: '营销' });
    if (weekday === 0 && month === 6 && day >= 15 && day <= 21) events.push({ name: '父亲节', kind: '营销' });
    return { date: `${year}-${short}`, day, events };
  });
}
