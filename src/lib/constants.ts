// 费用类型映射
export const FEE_TYPE_MAP: Record<string, string> = {
  tuition: '学费',
  lunch: '午餐费',
  nap: '午托费',
  after_school: '课后服务费',
  club: '社团费',
  agency: '代办费',
};

// 费用类型反向映射（中文 -> 英文key）
export const FEE_TYPE_REVERSE_MAP: Record<string, string> = {
  '学费': 'tuition',
  '午餐费': 'lunch',
  '午托费': 'nap',
  '课后服务费': 'after_school',
  '社团费': 'club',
  '代办费': 'agency',
};

// 费用项目定义
export const FEE_ITEMS = [
  { key: 'tuition', label: '学费', field: 'tuition_fee' },
  { key: 'lunch', label: '午餐费', field: 'lunch_fee' },
  { key: 'nap', label: '午托费', field: 'nap_fee' },
  { key: 'after_school', label: '课后服务费', field: 'after_school_fee' },
  { key: 'club', label: '社团费', field: 'club_fee' },
  { key: 'agency', label: '代办费', field: 'agency_fee' },
] as const;

// 代办费扣除项目类型
export const AGENCY_FEE_ITEM_TYPES: Record<string, string> = {
  textbook: '教材教辅',
  notebook: '簿册费',
  autumn_trip: '秋游',
  art_supplies: '美术用品',
  report_manual: '报告手册',
  daily_other: '日常其他',
};

// 代办费扣除项目类型反向映射
export const AGENCY_FEE_ITEM_TYPES_REVERSE: Record<string, string> = {
  '教材教辅': 'textbook',
  '簿册费': 'notebook',
  '秋游': 'autumn_trip',
  '美术用品': 'art_supplies',
  '报告手册': 'report_manual',
  '日常其他': 'daily_other',
};

// 代办费扣除项目列表
export const AGENCY_FEE_ITEMS = [
  { key: 'textbook', label: '教材教辅' },
  { key: 'notebook', label: '簿册费' },
  { key: 'autumn_trip', label: '秋游' },
  { key: 'art_supplies', label: '美术用品' },
  { key: 'report_manual', label: '报告手册' },
  { key: 'daily_other', label: '日常其他' },
] as const;

// 代办费扣除项目类型映射（英文 -> 中文）
export const AGENCY_FEE_ITEM_TYPE_MAP: Record<string, string> = {
  textbook: '教材教辅',
  notebook: '簿册费',
  autumn_trip: '秋游',
  art_supplies: '美术用品',
  report_manual: '报告手册',
  daily_other: '日常其他',
};

// 代办费默认金额
export const DEFAULT_AGENCY_FEE = 600;
