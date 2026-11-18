import {
  AppStoreLocalization,
  KEYWORD_FIELD_CHAR_LIMIT,
  KeywordCoverageRow,
  KeywordFieldSuggestion,
  keywordFieldChars,
  LintContext,
  tokenize,
  TrackedKeywordItem,
} from '@asobeast/shared';

export type IndexedListingWords = Pick<
  LintContext,
  'titleWords' | 'subtitleWords'
>;

const singular = (word: string): string =>
  word.length > 3 && word.endsWith('s') && !word.endsWith('ss')
    ? word.slice(0, -1)
    : word;

const wordForm = (
  localization: AppStoreLocalization | undefined,
): ((word: string) => string) =>
  localization === undefined || localization.startsWith('en')
    ? singular
    : (word) => word;

const scoredCandidates = (
  tracked: readonly TrackedKeywordItem[],
  coverage: readonly KeywordCoverageRow[],
): TrackedKeywordItem[] => {
  const uncovered = new Set(
    coverage.filter((row) => row.uncovered).map((row) => row.keywordId),
  );
  const score = (item: TrackedKeywordItem): number =>
    (item.volume ?? 0) * (item.relevance ?? 0);
  return tracked
    .filter((item) => uncovered.has(item.keywordId))
    .sort((a, b) => score(b) - score(a));
};

export function suggestKeywordField(
  tracked: TrackedKeywordItem[],
  coverage: KeywordCoverageRow[],
  localization: AppStoreLocalization | undefined,
  listing: IndexedListingWords = {},
): KeywordFieldSuggestion {
  const form = wordForm(localization);
  const used = new Set(
    [...(listing.titleWords ?? []), ...(listing.subtitleWords ?? [])]
      .flatMap((word) => tokenize(word))
      .map(form),
  );
  const added: string[] = [];
  for (const item of scoredCandidates(tracked, coverage)) {
    const words = [...new Set(tokenize(item.text).map(form))].filter(
      (word) => !used.has(word),
    );
    const term = words.join(' ');
    if (
      term.length === 0 ||
      keywordFieldChars([...added, term]) > KEYWORD_FIELD_CHAR_LIMIT
    ) {
      continue;
    }
    added.push(term);
    words.forEach((word) => used.add(word));
  }

  return {
    value: added.join(','),
    charactersUsed: keywordFieldChars(added),
    charactersLimit: KEYWORD_FIELD_CHAR_LIMIT,
    addedTerms: added,
    ...(localization ? { localization } : {}),
  };
}
