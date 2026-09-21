import { Solar } from 'lunar-javascript';
import { fixedMarketingEvents, type MarketingEvent } from './workspace-marketing-data';
export type MarketingDay = { date: string; day: number; events: MarketingEvent[] };
const festivalIdeas: Record<string, string> = {
  '春节': '围绕团聚与返乡记录员工、客户的真实故事，提前准备新年服务时间和礼赠内容。',
  '元宵节': '把行业知识融入灯谜，邀请客户参与互动并附上简明产品原理解释。',
  '端午节': '讲述地方习俗与工艺，联动本地匠人设计有出处的文化内容。',
  '七夕节': '以长期陪伴和合作为主题，采访一位老客户，呈现产品融入生活的细节。',
  '中秋节': '围绕团圆、异地团队和老客户关系策划人物故事，提前准备节礼与包装幕后内容。',
  '重阳节': '邀请年长用户体验产品，以可读性、易用性和服务改进回应真实需求。',
};
export function marketingMonth(year: number, month: number): MarketingDay[] {
  if (!Number.isInteger(year) || year < 2000 || year > 2099 || !Number.isInteger(month) || month < 1 || month > 12) return [];
  return Array.from({ length: new Date(Date.UTC(year, month, 0)).getUTCDate() }, (_, index) => {
    const day = index + 1, short = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    const events: MarketingEvent[] = [...(fixedMarketingEvents[short] || [])];
    events.push(...lunar.getFestivals().map(name => ({ name, kind: '传统节日', theme: '品牌文化' as const, leadDays: 21, idea: festivalIdeas[name] || '采访当地员工或客户，记录节日习俗，把文化故事与真实使用场景自然连接。' })));
    const term = lunar.getJieQi(); if (term) events.push({ name: term, kind: '节气', theme: '绿色公益', leadDays: 7, idea: `以${term}的季节变化为线索，记录生产现场、材料表现或用户生活的变化，制作季节使用与养护指南。` });
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === 0 && month === 5 && day >= 8 && day <= 14) events.push({ name: '母亲节', kind: '营销', theme: '消费营销', leadDays: 14, idea: '邀请不同年龄的母亲讲述真实需要，策划体验活动与实用礼赠指南。' });
    if (weekday === 0 && month === 6 && day >= 15 && day <= 21) events.push({ name: '父亲节', kind: '营销', theme: '消费营销', leadDays: 14, idea: '记录家庭共同完成一件事的过程，以实际体验连接产品与陪伴。' });
    return { date: `${year}-${short}`, day, events };
  });
}
