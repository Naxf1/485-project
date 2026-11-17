import type { MouseEvent } from 'react';
import { FixlaneLogo } from './FixlaneLogo';
import { homeHrefFor, type NavRole } from '../nav';

export interface BrandLinkProps {
  role: NavRole | null;
  onHome?: () => void;
}

export function BrandLink({ role, onHome }: BrandLinkProps): JSX.Element {
  const navigate = (event: MouseEvent<HTMLAnchorElement>): void => {
    if (!onHome) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onHome();
  };

  return (
    <a className="brand" href={homeHrefFor(role)} aria-label="Fixlane home" onClick={navigate}>
      <FixlaneLogo size={28} className="brand-logo" />
      <span className="brand-name">Fixlane</span>
    </a>
  );
}
