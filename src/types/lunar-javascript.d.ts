declare module 'lunar-javascript' {
  interface Solar {
    fromDate(date: Date): { getLunar(): Lunar };
    fromYmd(year: number, month: number, day: number): { getLunar(): Lunar };
  }

  interface Lunar {
    getFestivals(): string[];
    getJieQi(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
  }

  const Solar: Solar;

  export { Solar };
}
