import { CATEGORIES } from '../lib/constants';
import type { Category } from '../lib/constants';

const KEYWORDS: Record<Exclude<Category, 'Other'>, readonly RegExp[]> = {
  Electrical: [
    /\bsocket/i,
    /\bwire/i,
    /\bspark/i,
    /\belectric/i,
    /\bpower\b/i,
    /\blight/i,
    /\bflicker/i,
    /\blamp/i,
    /\bswitch\b/i,
    /\boutlet/i,
    /\bbreaker\b/i,
  ],
  Plumbing: [
    /\bpipe/i,
    /\bleak/i,
    /\btap\b/i,
    /\bsink\b/i,
    /\bwater\b/i,
    /\btoilet/i,
    /\bdrain/i,
    /\bflush/i,
    /\bplumbing\b/i,
  ],
  HVAC: [
    /\bac\b/i,
    /air conditioning/i,
    /air conditioner/i,
    /cooling/i,
    /heating/i,
    /hot air/i,
    /\bvent\b/i,
    /temperature/i,
    /thermostat/i,
    /\bhvac\b/i,
  ],
  Furniture: [
    /\bchair/i,
    /\bdesk/i,
    /\btable\b/i,
    /\bdoor\b/i,
    /\bshelf/i,
    /\bcabinet/i,
    /wobbl/i,
    /\bfurniture\b/i,
  ],
  IT: [
    /projector/i,
    /\bcomputer\b/i,
    /\bnetwork\b/i,
    /\bwifi\b/i,
    /\bwi-fi\b/i,
    /\bprinter\b/i,
    /\blaptop\b/i,
    /\bscreen\b/i,
    /\bmonitor\b/i,
    /\binternet\b/i,
  ],
  Cleaning: [
    /\bspill/i,
    /\bsticky\b/i,
    /\btrash\b/i,
    /\bgarbage\b/i,
    /\bdirty\b/i,
    /\bclean/i,
    /\bstain/i,
    /\bdust\b/i,
    /\bfloor\b/i,
  ],
};

/**
 * Deterministic stand-in for the model's classification. Used by `FakeLlm` so tests
 * and the offline demo run without a provider. `noise` only breaks ties.
 */
export function classifyCategory(text: string, noise = 0.5): Category {
  const scored = (Object.keys(KEYWORDS) as Exclude<Category, 'Other'>[]).map((category) => ({
    category,
    score: KEYWORDS[category].filter((pattern) => pattern.test(text)).length,
  }));

  const best = Math.max(...scored.map((entry) => entry.score));
  if (best === 0) return 'Other';

  const tied = scored.filter((entry) => entry.score === best).map((entry) => entry.category);
  if (tied.length === 1) return tied[0] as Category;

  const index = Math.min(tied.length - 1, Math.floor(noise * tied.length));
  return tied[index] as Category;
}

export const CLASSIFIABLE_CATEGORIES = CATEGORIES.filter((category) => category !== 'Other');
