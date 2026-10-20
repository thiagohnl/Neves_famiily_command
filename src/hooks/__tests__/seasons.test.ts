import { getActiveSeason, resolveSeasonState, t } from '../../seasons';
import { sleepsUntil } from '../../seasons/dates';
import { isBirthday } from '../../seasons/birthdays';
import { applySeasonPalette } from '../../seasons/palette';
import { FamilyMember, SeasonDates } from '../../types';

const DATES: SeasonDates = {
  sinterklaas: {
    intocht: '2026-11-14',
    intocht_local: '2026-11-15',
    pakjesavond: '2026-12-05',
    shoe_nights: ['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'],
    journaal_start: '2026-11-09',
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

  it('needs Sinterklaas dates to run automatically', () => {
    expect(getActiveSeason({ active_season: null, season_dates: {} }, '2026-11-20', [])).toBeNull();
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
    expect(resolveSeasonState(auto, '2026-12-06', []).hero?.headline).toBe('19 more sleeps until Christmas!');
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
