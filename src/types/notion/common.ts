import {
    PageObjectResponse,
    TitlePropertyItemObjectResponse,
    RichTextPropertyItemObjectResponse,
    FilesPropertyItemObjectResponse,
    SelectPropertyItemObjectResponse,
    MultiSelectPropertyItemObjectResponse,
    UrlPropertyItemObjectResponse
} from "@notionhq/client/build/src/api-endpoints";

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Type Guard for PageObjectResponse
export function isPageObjectResponse(response: unknown): response is PageObjectResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'properties' in response &&
        'object' in response &&
        (response as { object: string }).object === 'page'
    );
}

// Property Extractors
export function extractTitle(property: TitlePropertyItemObjectResponse | unknown): string {
    const p = property as TitlePropertyItemObjectResponse;
    if (!p?.title || !Array.isArray(p.title)) return '';
    return p.title[0]?.plain_text ?? '';
}

export function extractRichText(property: RichTextPropertyItemObjectResponse | unknown): string {
    const p = property as RichTextPropertyItemObjectResponse;
    if (!p?.rich_text || !Array.isArray(p.rich_text)) return '';
    return p.rich_text.map(item => item.plain_text ?? '').join('');
}

export function extractFileUrl(property: FilesPropertyItemObjectResponse | unknown): string {
    const p = property as FilesPropertyItemObjectResponse;
    if (!p?.files || !Array.isArray(p.files) || !p.files[0]) return '';
    const file = p.files[0];

    if (file.type === 'external' && file.external) {
        return file.external.url;
    }
    if (file.type === 'file' && file.file) {
        return file.file.url;
    }
    return '';
}

export function extractSelect(property: SelectPropertyItemObjectResponse | unknown): string {
    const p = property as SelectPropertyItemObjectResponse;
    return p?.select?.name ?? '';
}

export function extractMultiSelect(property: MultiSelectPropertyItemObjectResponse | unknown): string[] {
    const p = property as MultiSelectPropertyItemObjectResponse;
    return p?.multi_select?.map(item => item.name) ?? [];
}

export function extractUrl(property: UrlPropertyItemObjectResponse | unknown): string {
    const p = property as UrlPropertyItemObjectResponse;
    return p?.url ?? '';
}
