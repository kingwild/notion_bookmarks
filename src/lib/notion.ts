import { Client } from "@notionhq/client";
import { GetDatabaseResponse, DatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { cache } from "react";
import { envConfig } from '@/config';
import { localPreview } from './local-preview';
import {
    Link,
    WebsiteConfig,
    Category,
    isNotionLinkPage,
    toLink,
    isNotionConfigPage,
    getConfigItem,
    isNotionCategoryPage,
    toCategory
} from '@/types';

export const notion = new Client({
    auth: envConfig.NOTION_TOKEN,
    timeoutMs: 15000,
    fetch: (url, init) => fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) })
});

export const revalidate = parseInt(process.env.REVALIDATE_TIME ?? '300', 10);

// 获取网址链接
export const getLinks = cache(async () => {
    const preview = await localPreview();
    if (preview) return preview.links;
    const databaseId = envConfig.NOTION_LINKS_DB_ID!;
    const allLinks: Link[] = [];
    let hasMore = true;
    let nextCursor: string | undefined;

    try {
        while (hasMore) {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: nextCursor,
                sorts: [
                    {
                        property: 'category1',
                        direction: 'ascending',
                    },
                    {
                        property: 'category2',
                        direction: 'ascending',
                    },
                ],
            });

            const links = response.results
                .filter(isNotionLinkPage)
                .map(toLink);

            allLinks.push(...links);
            hasMore = response.has_more;
            nextCursor = response.next_cursor || undefined;
        }

        // 对链接进行排序：先按是否置顶，再按创建时间
        allLinks.sort((a, b) => {
            // 检查是否包含"力荐👍"
            const aIsTop = a.tags.includes('力荐👍');
            const bIsTop = b.tags.includes('力荐👍');

            // 如果置顶状态不同，置顶的排在前面
            if (aIsTop !== bIsTop) {
                return aIsTop ? -1 : 1;
            }

            // 如果置顶状态相同，按创建时间逆序排序
            return new Date(b.created).getTime() - new Date(a.created).getTime();
        });

        return allLinks;
    } catch (error) {
        console.error('Error fetching links:', error);
        return [];
    }
});

// 获取网站配置
export const getWebsiteConfig = cache(async () => {
    const preview = await localPreview();
    if (preview) return preview.config;
    try {
        const response = await notion.databases.query({
            database_id: envConfig.NOTION_WEBSITE_CONFIG_ID!,
        });

        const configMap: WebsiteConfig = {};

        response.results.forEach((page) => {
            if (!isNotionConfigPage(page)) return;
            const item = getConfigItem(page);
            if (item) {
                configMap[item.key] = item.value;
            }
        });

        // 获取配置数据库页面的图标作为网站图标
        const database = await notion.databases.retrieve({
            database_id: envConfig.NOTION_WEBSITE_CONFIG_ID!
        }) as GetDatabaseResponse;

        let favicon = '/favicon.ico';

        const fullDatabase = database as DatabaseObjectResponse;
        if (fullDatabase.icon) {
            if (fullDatabase.icon.type === 'emoji') {
                // 如果是 emoji，生成 data URL
                favicon = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${fullDatabase.icon.emoji}</text></svg>`;
            } else if (fullDatabase.icon.type === 'file' && fullDatabase.icon.file) {
                favicon = fullDatabase.icon.file.url;
            } else if (fullDatabase.icon.type === 'external' && fullDatabase.icon.external) {
                favicon = fullDatabase.icon.external.url;
            }
        }

        // 返回基础配置
        // 将配置对象转换为 WebsiteConfig 类型
        // 注意：这里我们保留原有逻辑，将动态获取的配置与默认值合并
        const config: WebsiteConfig = {
            WEATHER_CITY: configMap.WEATHER_CITY ?? '上海',
            NOTES_DATABASE_ID: configMap.NOTES_DATABASE_ID ?? '',
            // 基础配置
            SITE_TITLE: configMap.SITE_TITLE ?? '我的导航',
            SITE_DESCRIPTION: configMap.SITE_DESCRIPTION ?? '个人导航网站',
            SITE_KEYWORDS: configMap.SITE_KEYWORDS ?? '导航,网址导航',
            SITE_AUTHOR: configMap.SITE_AUTHOR ?? '',
            SITE_FOOTER: configMap.SITE_FOOTER ?? '',
            SITE_FAVICON: favicon,
            // 主题配置
            THEME_NAME: configMap.THEME_NAME ?? 'simple',
            SHOW_THEME_SWITCHER: configMap.SHOW_THEME_SWITCHER ?? 'true',

            // 社交媒体配置
            SOCIAL_GITHUB: configMap.SOCIAL_GITHUB ?? '',
            SOCIAL_BLOG: configMap.SOCIAL_BLOG ?? '',
            SOCIAL_X: configMap.SOCIAL_X ?? '',
            SOCIAL_JIKE: configMap.SOCIAL_JIKE ?? '',
            SOCIAL_WEIBO: configMap.SOCIAL_WEIBO ?? '',
            SOCIAL_XIAOHONGSHU: configMap.SOCIAL_XIAOHONGSHU ?? '',
            // 分析和统计
            CLARITY_ID: configMap.CLARITY_ID ?? '',
            GA_ID: configMap.GA_ID ?? '',
            // 新增widgets配置
            WIDGET_CONFIG: configMap.WIDGET_CONFIG ?? '',
        };

        return config;
    } catch (error) {
        console.error('获取网站配置失败:', error);
        return { SITE_TITLE: 'KING 工作基地', SITE_DESCRIPTION: '个人导航与工作基地' } as WebsiteConfig;
    }
});

export const getCategories = cache(async (): Promise<Category[]> => {
    const preview = await localPreview();
    if (preview) return preview.categories;
    const databaseId = envConfig.NOTION_CATEGORIES_DB_ID;

    if (!databaseId) {
        return [];
    }

    try {
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: 'Enabled',
                checkbox: {
                    equals: true
                }
            },
            sorts: [
                {
                    property: 'Order',
                    direction: 'ascending',
                },
            ],
        });

        const categories = response.results
            .filter(isNotionCategoryPage)
            .map(toCategory);

        return categories.sort((a, b) => a.order - b.order);
    } catch (err) {
        console.error('获取分类失败:', err);
        return [];
    }
});
