import { KeywordCoverageRow, TrackedKeywordItem } from '@asobeast/shared';
import { suggestKeywordField } from './keyword-field-suggestion';

const item = (
  keywordId: string,
  text: string,
  volume: number,
): TrackedKeywordItem =>
  ({ keywordId, text, volume, relevance: 100 }) as TrackedKeywordItem;

const row = (keywordId: string, uncovered: boolean): KeywordCoverageRow =>
  ({ keywordId, uncovered }) as KeywordCoverageRow;

describe('suggestKeywordField', () => {
  const tracked = [
    item('k1', 'habits', 5),
    item('k2', 'sleep timer', 9),
    item('k3', 'focus', 7),
  ];
  const coverage = [row('k1', true), row('k2', true), row('k3', false)];

  it('packs the uncovered keywords by score, singular', () => {
    expect(suggestKeywordField(tracked, coverage, undefined)).toEqual({
      value: 'sleep timer,habit',
      charactersUsed: 'sleep timer,habit'.length,
      charactersLimit: 100,
      addedTerms: ['sleep timer', 'habit'],
    });
  });

  it('names the localization it was built for', () => {
    expect(suggestKeywordField(tracked, coverage, 'es-MX')).toMatchObject({
      localization: 'es-MX',
    });
  });

  it('keeps the words of a localization that is not english as they are', () => {
    const german = [item('k1', 'yoga kurs', 9)];

    expect(
      suggestKeywordField(german, [row('k1', true)], 'de').addedTerms,
    ).toEqual(['yoga kurs']);
  });

  describe('with the words the title and subtitle already index', () => {
    const listing = {
      titleWords: ['lensplate', 'calorie', 'counter'],
      subtitleWords: ['food', 'diary', 'macro', 'tracker'],
    };
    const uncovered = [
      item('k1', 'calorie tracker', 9),
      item('k2', 'weight tracker', 8),
      item('k3', 'macro calculator', 7),
      item('k4', 'tdee calculator', 6),
    ];
    const rows = uncovered.map(({ keywordId }) => row(keywordId, true));

    it('leaves out the words the listing holds and never repeats a word', () => {
      expect(
        suggestKeywordField(uncovered, rows, 'en-US', listing).addedTerms,
      ).toEqual(['weight', 'calculator', 'tdee']);
    });

    it('counts a plural in the listing as the singular word', () => {
      expect(
        suggestKeywordField(
          [item('k1', 'meal tracker', 9)],
          [row('k1', true)],
          'en-US',
          { titleWords: ['meals'], subtitleWords: ['trackers'] },
        ).addedTerms,
      ).toEqual([]);
    });
  });
});
