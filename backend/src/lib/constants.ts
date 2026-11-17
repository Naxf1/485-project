export const MAX_TOOL_CALLS = 5;

export const CATEGORIES = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Furniture',
  'IT',
  'Cleaning',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;

export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = [
  'New',
  'Triaged',
  'Assigned',
  'InProgress',
  'Resolved',
  'Duplicate',
] as const;

export type TicketStatus = (typeof STATUSES)[number];

export const ROLES = ['reporter', 'supervisor'] as const;

export type Role = (typeof ROLES)[number];

export const BUILDINGS = [
  'Building 1',
  'Building 2',
  'Building 3',
  'Building 4',
  'Building 5',
  'Building 6',
  'Building 7',
  'Library',
  'Sports Hall',
] as const;

export type Building = (typeof BUILDINGS)[number];

export const ROOM_PATTERN = /^[0-9]{1,2}[A-Z]-[0-9]{1,3}$/;

export const DUPLICATE_WINDOW_HOURS = 48;

export const MAX_REPLY_LENGTH = 300;

/** Hard ceiling for one agent run (NFR-02). */
export const AGENT_TIMEOUT_MS = 15_000;

export const TITLE_MIN = 5;
export const TITLE_MAX = 80;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;
