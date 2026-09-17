import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { notion } from './notion';
import { shanghaiDay, isTaskToday, type TodayTask } from './workspace-task-dates';

export const TASK_DATABASE_ID = '201056cc-e99d-81a2-a7b8-cff3b7e7a45c';

export async function getTodayTasks(): Promise<TodayTask[]> {
  const today = shanghaiDay();
  const items: TodayTask[] = [];
  let cursor: string | undefined;
  do {
    // Include ranges beginning before today; the end date is checked below.
    const response = await notion.databases.query({ database_id: process.env.NOTION_TASKS_DB_ID || TASK_DATABASE_ID, start_cursor: cursor, page_size: 100,
      filter: { and: [{ property: '发送到归档', checkbox: { equals: false } }, { property: '到期', date: { before: `${today}T23:59:59.999+08:00` } }] },
      sorts: [{ property: '到期', direction: 'descending' }] });
    for (const page of response.results) {
      if (!('properties' in page)) continue;
      const p = (page as PageObjectResponse).properties;
      const due = p['到期'];
      if (due?.type !== 'date' || !due.date || !isTaskToday(due.date.start, due.date.end, today)) continue;
      const title = p['任务'], status = p['状态'], priority = p['重要性'];
      items.push({ id: page.id, title: title?.type === 'title' ? title.title.map(t => t.plain_text).join('') : '未命名任务',
        status: status?.type === 'status' ? status.status?.name || '待办' : '待办',
        priority: priority?.type === 'select' ? priority.select?.name || '' : '', due: due.date.start, url: `https://www.notion.so/${page.id.replaceAll('-', '')}` });
    }
    cursor = response.has_more ? response.next_cursor || undefined : undefined;
  } while (cursor);
  return items.sort((a, b) => Number(a.status === '已完成') - Number(b.status === '已完成') || Number(b.priority === '重要') - Number(a.priority === '重要'));
}
