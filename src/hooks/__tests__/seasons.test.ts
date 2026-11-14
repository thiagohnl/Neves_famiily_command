import { getActiveSeason, resolveSeasonState, t } from '../../seasons';
import { defaultSinterklaasDates, sleepsUntil } from '../../seasons/dates';
import { datesForYear, normalizeSeasonDates, withCrossedDays, withSeasonEntry } from '../../seasons/store';
import { journaalSoonBanner } from '../../seasons/sinterklaas';
import { translatorFor } from '../../seasons/i18n';
import { TodayItem } from '../../types/today';
import { isBirthday } from '../../seasons/birthdays';
import { applySeasonPalette } from '../../seasons/palette';
import { FamilyMember, SeasonDatesByYear } from '../../types';

const DATES: SeasonDatesByYear = {
  '2026': {
    sinterklaas: {
      intocht: '2026-11-14',
      intocht_local: '2026-11-15',
      pakjesavond: '2026-12-05',
      shoe_nights: ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'],
      journaal_start: '2026-11-09',
    },
  },
};

const member = (id: string, name: string, birth_date: string | null = null, is_parent = false): FamilyMember => ({
  id, name, avatar: '🙂', points: 0, is_parent, birth_date,
});

const MEMBERS = [
  member('p1', 'Thiago', '1985-03-02', true),
  member('p2', 'Carol', '1987-06-11', true),
  member('k1', 'Charlie', '2019-11-20'),
  member('k2', 'Isabel', '2022-02-29'),
];

const auto = { active_season: null, season_dates: DATES };

describe('sleepsUntil', () => {
  it('counts nights across a month boundary', () => {
    expect(sleepsUntil('2026-10-20', '2026-11-14')).toBe(25);
    expect(sleepsUntil('2026-11-30', '2026-12-05')).toBe(5);
    expect(sleepsUntil('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('is not thrown off by DST changes', () => {
    // Europe: clocks go back 25 Oct 2026 and forward 28 Mar 2027
    expect(sleepsUntil('2026-10-24', '2026-10-26')).toBe(2);
    expect(sleepsUntil('2027-03-27', '2027-03-29')).toBe(2);
  });

  it('is 0 on the day and negative afterwards', () => {
    expect(sleepsUntil('2026-12-05', '2026-12-05')).toBe(0);
    expect(sleepsUntil('2026-12-06', '2026-12-05')).toBe(-1);
  });
});

describe('t', () => {
  it('fills variables and uses the singular form for n = 1', () => {
    expect(t('sleepsUntilArrival', 'en', { n: 3 })).toBe('3 more sleeps until Sinterklaas arrives!');
    expect(t('sleepsUntilArrival', 'en', { n: 1 })).toBe('1 more sleep until Sinterklaas arrives!');
    expect(t('sleepsUntilArrival', 'nl', { n: 1 })).toBe('Nog 1 nachtje slapen tot Sinterklaas komt!');
  });

  it('falls back to English for an unknown language', () => {
    expect(t('putShoeOut', 'fr')).toBe('Put your shoe out');
    expect(t('putShoeOut', undefined)).toBe('Put your shoe out');
  });

  it('falls back to English for a key a language does not define', () => {
    // 'pakjesavond' is only in the English dictionary
    expect(t('pakjesavond', 'pt')).toBe('Pakjesavond');
    expect(t('pakjesavond', 'nl')).toBe('Pakjesavond');
  });
});

describe('getActiveSeason', () => {
  it('returns null outside every season', () => {
    expect(getActiveSeason(auto, '2026-10-20', MEMBERS)).toBeNull();
  });

  it('runs Sinterklaas from journaal_start to pakjesavond inclusive', () => {
    expect(getActiveSeason(auto, '2026-11-08', MEMBERS)).toBeNull();
    expect(getActiveSeason(auto, '2026-11-09', MEMBERS)?.key).toBe('sinterklaas');
    expect(getActiveSeason(auto, '2026-12-05', MEMBERS)?.key).toBe('sinterklaas');
  });

  it('runs Christmas from 6 to 26 December', () => {
    expect(getActiveSeason(auto, '2026-12-06', MEMBERS)?.key).toBe('christmas');
    expect(getActiveSeason(auto, '2026-12-26', MEMBERS)?.key).toBe('christmas');
    expect(getActiveSeason(auto, '2026-12-27', MEMBERS)).toBeNull();
  });

  it('puts a birthday ahead of the other seasons, for that day only', () => {
    expect(getActiveSeason(auto, '2026-11-20', MEMBERS)?.key).toBe('birthday');
    expect(getActiveSeason(auto, '2026-11-21', MEMBERS)?.key).toBe('sinterklaas');
  });

  it('honours a manual override, and none forces no season', () => {
    expect(getActiveSeason({ ...auto, active_season: 'christmas' }, '2026-10-20', MEMBERS)?.key).toBe('christmas');
    expect(getActiveSeason({ ...auto, active_season: 'none' }, '2026-11-20', MEMBERS)).toBeNull();
  });

  it('treats an unknown override as auto', () => {
    expect(getActiveSeason({ ...auto, active_season: 'easter' }, '2026-11-09', MEMBERS)?.key).toBe('sinterklaas');
  });

  it('computes the Sinterklaas dates when none are set', () => {
    const none = { active_season: null, season_dates: {} };
    expect(getActiveSeason(none, '2026-11-08', [])).toBeNull();
    expect(getActiveSeason(none, '2026-11-09', [])?.key).toBe('sinterklaas');
    expect(getActiveSeason(none, '2027-11-08', [])?.key).toBe('sinterklaas'); // Monday before 13 Nov 2027
  });
});

describe('Sinterklaas hero and rituals', () => {
  it('counts sleeps to the arrival in English and Dutch (forced on 20 October)', () => {
    const forced = { ...auto, active_season: 'sinterklaas' };
    expect(resolveSeasonState({ ...forced, language: 'en' }, '2026-10-20', MEMBERS).hero?.headline)
      .toBe('25 more sleeps until Sinterklaas arrives!');
    expect(resolveSeasonState({ ...forced, language: 'nl' }, '2026-10-20', MEMBERS).hero?.headline)
      .toBe('Nog 25 nachtjes slapen tot Sinterklaas komt!');
  });

  it('switches to counting sleeps to Pakjesavond after the arrival', () => {
    const state = resolveSeasonState({ ...auto, language: 'en' }, '2026-11-16', []);
    expect(state.hero?.headline).toBe('19 more sleeps until Pakjesavond!');
    expect(resolveSeasonState(auto, '2026-11-14', []).hero?.headline).toBe('Sinterklaas arrives today!');
    expect(resolveSeasonState(auto, '2026-12-05', []).hero?.headline).toBe("It's Pakjesavond tonight!");
  });

  it('on 9 November has the 18:00 journaal, a shoe night and the shoe chip on Yes', () => {
    const state = resolveSeasonState({ ...auto, language: 'en' }, '2026-11-09', []);
    expect(state.rituals.map(r => [r.start, r.emoji, r.title])).toEqual([
      ['18:00', '📺', 'Sinterklaasjournaal'],
      ['19:30', '👟', 'Put your shoe out'],
    ]);
    expect(state.rituals.every(r => r.kind === 'ritual' && r.memberIds.length === 0)).toBe(true);
    expect(state.rituals[0]).toMatchObject({ end: '18:10', subtitle: 'NPO 3, episode 1 of 27' });
    expect(state.hero?.chips).toContainEqual({ label: 'Shoe tonight?', value: 'Yes' });
    expect(state.hero?.chips).toContainEqual({ label: 'Pakjesavond', value: '26 sleeps' });
  });

  it('has only the journaal on a night without a shoe', () => {
    const state = resolveSeasonState(auto, '2026-11-10', []);
    expect(state.rituals.map(r => r.title)).toEqual(['Sinterklaasjournaal']);
    expect(state.hero?.chips).toContainEqual({ label: 'Shoe tonight?', value: 'No' });
  });
});

describe('Christmas and birthdays', () => {
  it('counts sleeps to the 25th', () => {
    expect(resolveSeasonState(auto, '2026-12-06', []).hero?.headline).toBe('🎄 19 sleeps until Christmas');
    expect(resolveSeasonState(auto, '2026-12-24', []).hero?.headline).toBe('🎄 1 sleep until Christmas');
    expect(resolveSeasonState(auto, '2026-12-25', []).hero?.headline).toBe('Merry Christmas!');
  });

  it('greets the birthday member with their age and colour', () => {
    const state = resolveSeasonState(auto, '2026-11-20', MEMBERS);
    expect(state.hero?.headline).toBe('Happy birthday Charlie!');
    expect(state.hero?.subline).toBe('Charlie is 7 today');
    expect(state.palette?.accent).toBe('#10B981'); // third member's colour
  });

  it('celebrates 29 February on the 28th in non-leap years', () => {
    expect(isBirthday('2022-02-29', '2027-02-28')).toBe(true);
    expect(isBirthday('2022-02-29', '2028-02-28')).toBe(false);
    expect(isBirthday('2022-02-29', '2028-02-29')).toBe(true);
    expect(isBirthday(null, '2028-02-29')).toBe(false);
  });
});

describe('applySeasonPalette', () => {
  it('sets the CSS variables and removes them again when no season is active', () => {
    const root = document.createElement('html');
    const { palette } = resolveSeasonState(auto, '2026-11-09', []);
    applySeasonPalette(root, palette);
    expect(root.style.getPropertyValue('--season-accent')).toBe('#9B1B2A');
    expect(root.style.getPropertyValue('--season-gold')).toBe('#D4A017');
    expect(root.classList.contains('season-active')).toBe(true);

    applySeasonPalette(root, resolveSeasonState(auto, '2026-10-20', []).palette);
    expect(root.style.getPropertyValue('--season-accent')).toBe('');
    expect(root.classList.contains('season-active')).toBe(false);
  });
});

describe('defaultSinterklaasDates', () => {
  it.each([
    [2024, '2024-11-16', '2024-11-17', '2024-11-11'],
    [2025, '2025-11-15', '2025-11-16', '2025-11-10'],
    [2026, '2026-11-14', '2026-11-15', '2026-11-09'],
    [2027, '2027-11-13', '2027-11-14', '2027-11-08'],
  ])('%i: intocht %s, local %s, journaal from %s', (year, intocht, local, journaal) => {
    expect(defaultSinterklaasDates(year)).toEqual({
      intocht,
      intocht_local: local,
      journaal_start: journaal,
      pakjesavond: `${year}-12-05`,
      shoe_nights: [],
    });
  });

  it('skips a Saturday 11 November (strictly after)', () => {
    // 11 Nov 2023 was a Saturday
    expect(defaultSinterklaasDates(2023).intocht).toBe('2023-11-18');
  });
});

describe('season_dates by year', () => {
  it('moves the old flat shape under its year', () => {
    const flat = { sinterklaas: { journaal_start: '2026-11-09', pakjesavond: '2026-12-05' } };
    expect(normalizeSeasonDates(flat)).toEqual({ '2026': flat });
    expect(normalizeSeasonDates(null)).toEqual({});
  });

  it('fills in computed defaults and lets stored values win', () => {
    const merged = datesForYear({ '2026': { sinterklaas: { intocht_local: '2026-11-22', shoe_nights: ['2026-11-16'] } } }, 2026);
    expect(merged.sinterklaas).toMatchObject({
      intocht: '2026-11-14',
      intocht_local: '2026-11-22',
      journaal_start: '2026-11-09',
      pakjesavond: '2026-12-05',
      shoe_nights: ['2026-11-16'],
    });
    // Another year's values don't leak in
    expect(datesForYear(DATES, 2027).sinterklaas?.shoe_nights).toEqual([]);
  });

  it('treats an empty string as unset', () => {
    expect(datesForYear({ '2026': { sinterklaas: { intocht: '' } } }, 2026).sinterklaas?.intocht).toBe('2026-11-14');
  });

  it('writes one season of one year and keeps the rest', () => {
    const next = withSeasonEntry(DATES, 2026, 'christmas', { crossed_days: ['2026-12-01'] });
    expect(next['2026'].sinterklaas).toEqual(DATES['2026'].sinterklaas);
    expect(next['2026'].christmas).toEqual({ crossed_days: ['2026-12-01'] });
  });

  it('adds and removes crossed days, sorted and unique', () => {
    const once = withCrossedDays(DATES, 2026, 'sinterklaas', ['2026-11-16', '2026-11-15']);
    expect(once['2026'].sinterklaas?.crossed_days).toEqual(['2026-11-15', '2026-11-16']);
    expect(once['2026'].sinterklaas?.shoe_nights).toHaveLength(4);
    const twice = withCrossedDays(once, 2026, 'sinterklaas', ['2026-11-15']);
    expect(twice['2026'].sinterklaas?.crossed_days).toEqual(['2026-11-15', '2026-11-16']);
    const undone = withCrossedDays(twice, 2026, 'sinterklaas', ['2026-11-16'], false);
    expect(undone['2026'].sinterklaas?.crossed_days).toEqual(['2026-11-15']);
  });
});

describe('Sinterklaasjournaal', () => {
  it('on 14 November 2026 is episode 6 of 27, with the computed dates', () => {
    const state = resolveSeasonState({ active_season: null, season_dates: {}, language: 'en' }, '2026-11-14', []);
    const journaal = state.rituals.find(r => r.title === 'Sinterklaasjournaal');
    expect(journaal).toMatchObject({ start: '18:00', end: '18:10', emoji: '📺', subtitle: 'NPO 3, episode 6 of 27' });
  });

  it('runs through Pakjesavond (episode 27) and not after', () => {
    expect(resolveSeasonState(auto, '2026-12-05', []).rituals[0].subtitle).toBe('NPO 3, episode 27 of 27');
    expect(resolveSeasonState(auto, '2026-12-06', []).rituals).toEqual([]);
  });

  it('still airs on a birthday during the season', () => {
    const state = resolveSeasonState(auto, '2026-11-20', MEMBERS);
    expect(state.season?.key).toBe('birthday');
    expect(state.goalSeason).toBe('sinterklaas');
    expect(state.rituals.map(r => r.title)).toContain('Sinterklaasjournaal');
  });

  it('shows the "starts soon" banner from 17:50 until it starts', () => {
    const t = translatorFor('en');
    const items: TodayItem[] = resolveSeasonState(auto, '2026-11-14', []).rituals;
    expect(journaalSoonBanner(items, 17 * 60 + 49, t)).toBeNull();
    expect(journaalSoonBanner(items, 17 * 60 + 50, t)).toBe('📺 Sinterklaasjournaal starts soon');
    expect(journaalSoonBanner(items, 17 * 60 + 59, t)).toBe('📺 Sinterklaasjournaal starts soon');
    expect(journaalSoonBanner(items, 18 * 60, t)).toBeNull();
    expect(journaalSoonBanner(items, 17 * 60 + 55, translatorFor('nl'))).toBe('📺 Het Sinterklaasjournaal begint zo');
  });
});

describe('Intocht day and season goals in the hero', () => {
  it('on our own intocht names Haarlem and takes the time from the calendar', () => {
    const state = resolveSeasonState({ ...auto, language: 'en' }, '2026-11-15', []);
    const withEntry = state.heroFor({ calendar: [{ title: 'Intocht Haarlem', start: '12:30' }], goals: [] });
    expect(withEntry?.headline).toBe('🚢 Today Sinterklaas sails into Haarlem!');
    expect(withEntry?.subline).toBe('Intocht at 12:30');
    expect(state.heroFor({ calendar: [], goals: [] })?.subline).toBe('Intocht around 13:00');
  });

  it('replaces "Shoe tonight? No" with one chip per child, but the shoe chip wins on shoe nights', () => {
    const goals = [
      { name: 'Charlie', earned: 62, target: 100 },
      { name: 'Isabel', earned: 30, target: 200 },
    ];
    const plain = resolveSeasonState(auto, '2026-11-17', []).heroFor({ calendar: [], goals });
    expect(plain?.chips).toEqual([
      { label: 'Pakjesavond', value: '18 sleeps' },
      { label: 'Charlie', value: '🍫 62%' },
      { label: 'Isabel', value: '🍫 15%' },
    ]);
    const shoeNight = resolveSeasonState(auto, '2026-11-16', []).heroFor({ calendar: [], goals });
    expect(shoeNight?.chips).toContainEqual({ label: 'Shoe tonight?', value: 'Yes' });
    expect(shoeNight?.chips.map(c => c.label)).not.toContain('Charlie');
  });

  it('caps progress at 100%', () => {
    const hero = resolveSeasonState(auto, '2026-11-17', []).heroFor({ calendar: [], goals: [{ name: 'Charlie', earned: 250, target: 200 }] });
    expect(hero?.chips).toContainEqual({ label: 'Charlie', value: '🍫 100%' });
  });
});

describe('Christmas handoff', () => {
  it('switches to the green and gold palette on 6 December', () => {
    const state = resolveSeasonState(auto, '2026-12-06', []);
    expect(state.season?.key).toBe('christmas');
    expect(state.goalSeason).toBe('christmas');
    expect(state.palette).toMatchObject({ accent: '#1F5B3F', gold: '#D4A017' });
    expect(state.rituals).toEqual([]);
  });
});
