export type NavRole = 'reporter' | 'supervisor';

export type HomeView = 'new' | 'queue';

export function homeViewFor(role: NavRole): HomeView {
  return role === 'supervisor' ? 'queue' : 'new';
}

export function homeHrefFor(role: NavRole | null): string {
  if (!role) return '#/login';
  return `#/${homeViewFor(role)}`;
}
