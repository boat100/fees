// 费用类型映射
export const FEE_TYPE_MAP: Record<string, string> = {
  tuition: '学费',
  lunch: '午餐费',
  nap: '午托费',
  after_school: '课后服务费',
  club: '社团费',
  other: '其他费用',
};

// 费用类型反向映射（中文 -> 英文key）
export const FEE_TYPE_REVERSE_MAP: Record<string, string> = {
  '学费': 'tuition',
  '午餐费': 'lunch',
  '午托费': 'nap',
  '课后服务费': 'after_school',
  '社团费': 'club',
  '其他费用': 'other',
};

// 费用项目定义
export const FEE_ITEMS = [
  { key: 'tuition', label: '学费', field: 'tuition_fee' },
  { key: 'lunch', label: '午餐费', field: 'lunch_fee' },
  { key: 'nap', label: '午托费', field: 'nap_fee' },
  { key: 'after_school', label: '课后服务费', field: 'after_school_fee' },
  { key: 'club', label: '社团费', field: 'club_fee' },
  { key: 'other', label: '其他费用', field: 'other_fee' },
] as const;
