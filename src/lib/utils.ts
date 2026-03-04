import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化金额：整数不显示小数位，有小数时自动去掉末尾的0
 * 例如：100.00 → "100"，100.50 → "100.5"，100.12 → "100.12"
 */
export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return '-';
  const rounded = Math.round(amount * 100) / 100; // 保留两位小数
  // 去掉末尾不必要的0
  return parseFloat(rounded.toFixed(2)).toString();
}
