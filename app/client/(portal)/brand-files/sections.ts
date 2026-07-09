export const FILE_SECTIONS = [
  'Brand Identity',
  'Finance',
  'Reports',
  'Contracts',
  'Creatives',
  'General',
] as const;

export type FileSection = (typeof FILE_SECTIONS)[number];
