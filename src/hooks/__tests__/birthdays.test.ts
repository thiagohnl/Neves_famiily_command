import { getActiveSeason, resolveSeasonState } from '../../seasons';
import {
  ageOn,
  birthdayCountdownText,
  birthdayDay,
  giftChoreId,
  isSeasonBonusId,
  nextBirthday,
} from '../../seasons/birthdays';
import { seasonCalendar } from '../../seasons/calendar';
import { datesForYear, withBirthdayDone, withCrossedDays } from '../../seasons/store';
import { translatorFor } from '../../seasons/i18n';
import { buildTodayItems, pulsingContacts, TodaySources } from '../../lib/todayItems';
import { Chore, FamilyMember, SeasonDatesByYear } from '../../types';

const en = translatorFor('en');

// The family as it is in the database
const member = (over: Partial<FamilyMember> & Pick<FamilyMember, 'id' | 'name'>): FamilyMember => ({
  avatar: '👤', points: 0, is_parent: false, ...over,
});
const THIAGO = member({ id: 'thiago', name: 'Thiago', is_parent: true, gender: 'male', birth_date: '1984-12-20', photo_url: 'https://x/thiago.jpg' });
const CAROL = member({ id: 'carol', name: 'Carol', is_parent: true, gender: 'female', birth_date: '1988-07-03' });
const CHARLIE = member({ id: 'charlie', name: 'Charlie', gender: 'male', birth_date: '2020-06-10' });
const ISABEL = member({ id: 'isabel', name: 'Isabel', gender: 'female', birth_date: '2022-11-26', photo_url: 'https://x/isabel.jpg' });
const FAMILY = [THIAGO, CAROL, CHARLIE, ISABEL];

const auto = { active_season: null, season_dates: {} as SeasonDatesByYear, language: 'en' as const };

describe('birthday priority', () => {
  it('beats Sinterklaas on 26 Nov 2026 only', () => {
    expect(getActiveSeason(auto, '2026-11-25', FAMILY)?.key).toBe('sinterklaas');
    expect(getActiveSeason(auto, '2026-11-26', FAMILY)?.key).toBe('birthday');
    expect(getActiveSeason(auto, '2026-11-27', FAMILY)?.key).toBe('sinterklaas');
  });

  it('beats Christmas on 20 Dec 2026 only', () => {
    expect(getActiveSeason(auto, '2026-12-19', FAMILY)?.key).toBe('christmas');
    expect(getActiveSeason(auto, '2026-12-20', FAMILY)?.key).toBe('birthday');
    expect(getActiveSeason(auto, '2026-12-21', FAMILY)?.key).toBe('christmas');
  });

  it('beats a forced season too, but not "none"', () => {
    expect(getActiveSeason({ ...auto, active_season: 'christmas' }, '2026-11-26', FAMILY)?.key).toBe('birthday');
    expect(getActiveSeason({ ...auto, active_season: 'none' }, '2026-11-26', FAMILY)).toBeNull();
  });

  it('keeps the season underneath for the calendar and goals', () => {
    expect(resolveSeasonState(auto, '2026-11-26', FAMILY).goalSeason).toBe('sinterklaas');
    expect(resolveSeasonState(auto, '2026-12-20', FAMILY).goalSeason).toBe('christmas');
  });
});

describe('age and next birthday', () => {
  it('counts completed years across the year boundary', () => {
    expect(ageOn('2020-01-02', '2026-12-31')).toBe(6);
    expect(ageOn('2020-01-02', '2027-01-01')).toBe(6);
    expect(ageOn('2020-01-02', '2027-01-02')).toBe(7);
    expect(ageOn('2022-11-26', '2026-11-26')).toBe(4);
    expect(ageOn('2022-11-26', '2026-11-25')).toBe(3);
    expect(ageOn('2020-02-29', '2027-02-28')).toBe(7);
  });

  it('finds next year\'s birthday once this year\'s has passed', () => {
    expect(nextBirthday('2020-01-02', '2026-12-31')).toBe('2027-01-02');
    expect(nextBirthday('2022-11-26', '2026-11-26')).toBe('2026-11-26');
  });
});

describe('run-up chip', () => {
  it('reads naturally at 7, 1 and 0 sleeps', () => {
    expect(birthdayCountdownText('Isabel', 7, en)).toBe("🎂 7 sleeps until Isabel's birthday");
    expect(birthdayCountdownText('Isabel', 1, en)).toBe("🎂 1 sleep until Isabel's birthday");
    expect(birthdayCountdownText('Isabel', 0, en)).toBe("🎂 It's Isabel's birthday today!");
    expect(birthdayCountdownText('Isabel', 3, translatorFor('nl'))).toBe('🎂 Nog 3 nachtjes tot Isabel jarig is');
  });

  it('joins the Sinterklaas hero from 19 to 25 November', () => {
    const chipOn = (day: string) => resolveSeasonState(auto, day, FAMILY).hero?.chips.find(c => c.value.startsWith('🎂'));
    expect(chipOn('2026-11-18')).toBeUndefined();
    expect(chipOn('2026-11-19')).toEqual({ label: '', value: "🎂 7 sleeps until Isabel's birthday" });
    expect(chipOn('2026-11-25')).toEqual({ label: '', value: "🎂 1 sleep until Isabel's birthday" });
    expect(resolveSeasonState(auto, '2026-11-25', FAMILY).hero?.headline).toContain('Pakjesavond');
  });

  it('calls a parent Papa: "1 sleep until Papa\'s birthday" on 19 December', () => {
    const hero = resolveSeasonState(auto, '2026-12-19', FAMILY).hero;
    expect(hero?.headline).toBe('🎄 6 sleeps until Christmas');
    expect(hero?.chips).toContainEqual({ label: '', value: "🎂 1 sleep until Papa's birthday" });
  });
});

describe('the day itself', () => {
  it('turns the board the member\'s colour on cream with confetti, photo and a big age', () => {
    const state = resolveSeasonState(auto, '2026-11-26', FAMILY);
    expect(state.palette).toMatchObject({ accent: '#F59E0B', bg: '#FFF8EC', pattern: 'confetti' }); // fourth member's colour
    expect(state.hero).toMatchObject({
      headline: '🎂 Isabel is 4 today!',
      headlineBig: { before: '🎂 Isabel is ', big: '4', after: ' today!' },
      photo: { memberId: 'isabel', url: 'https://x/isabel.jpg' },
    });
    expect(state.birthdayIds).toEqual(['isabel']);
  });

  it('says only "Happy birthday" when the age is hidden', () => {
    const shy = [THIAGO, CAROL, CHARLIE, { ...ISABEL, show_age: false }];
    const hero = resolveSeasonState(auto, '2026-11-26', shy).hero;
    expect(hero?.headline).toBe('🎂 Happy birthday Isabel!');
    expect(hero?.headlineBig).toBeUndefined();
  });

  it('names Papa on Thiago\'s day, in his colour, inside Christmas', () => {
    const state = resolveSeasonState(auto, '2026-12-20', FAMILY);
    expect(state.hero?.headline).toBe('🎂 Papa is 42 today!');
    expect(state.palette?.accent).toBe('#8B5CF6');
  });

  it('is back to Sinterklaas on 27 November with the crossed days intact', () => {
    const crossed = withCrossedDays({}, 2026, 'sinterklaas', ['2026-11-15', '2026-11-26']);
    const state = resolveSeasonState({ ...auto, season_dates: crossed }, '2026-11-27', FAMILY);
    expect(state.season?.key).toBe('sinterklaas');
    expect(state.dates.sinterklaas?.crossed_days).toEqual(['2026-11-15', '2026-11-26']);
  });
});

describe('chore substitution', () => {
  const chore = (over: Partial<Chore>): Chore => ({
    id: 'c', name: 'Chore', assigned_to: 'isabel', points: 10, is_completed: false, scheduled_time: '17:00', ...over,
  });
  const CHORES = [
    chore({ id: 'isa', name: 'Tidy toys', assigned_to: 'isabel' }),
    chore({ id: 'cha', name: 'Feed the fish', assigned_to: 'charlie' }),
    chore({ id: 'thi', name: 'Bins', assigned_to: 'thiago' }),
  ];
  const sources = (day: string): TodaySources => {
    const state = resolveSeasonState(auto, day, FAMILY);
    return {
      today: day, chores: CHORES, members: FAMILY, scheduleEvents: [], googleEvents: [], activities: [],
      plannedActivities: [], funIdeas: [], dinner: null, rituals: state.rituals, choresOffFor: state.choresOffFor,
    };
  };

  it('a child: her chores give way to one "Day off" row, and Charlie gets the 50 point gift chore', () => {
    const items = buildTodayItems(sources('2026-11-26'), 12 * 60);
    const titles = items.map(i => i.title);
    expect(titles).not.toContain('Tidy toys');
    expect(titles).toContain('Feed the fish');
    expect(titles).toContain('Bins');
    const dayOff = items.find(i => i.title === 'Day off for Isabel')!;
    expect(dayOff).toMatchObject({ emoji: '🎉', memberIds: ['isabel'], allDay: true });
    expect(dayOff.completable).toBeUndefined();

    const gifts = items.filter(i => i.emoji === '🎁');
    expect(gifts).toHaveLength(1);
    expect(gifts[0]).toMatchObject({
      title: "Make Isabel's day",
      memberIds: ['charlie'],
      completable: { choreId: giftChoreId('isabel', 'charlie', '2026-11-26'), points: 50, assignedTo: 'charlie' },
    });
    expect(isSeasonBonusId(gifts[0].completable!.choreId)).toBe(true);

    expect(items.filter(i => i.kind === 'ritual').map(i => [i.start, i.title])).toEqual(expect.arrayContaining([
      ['08:00', 'Traktatie at school or daycare'],
      ['16:00', 'Cake time'],
      ['17:30', 'Call Vovó'],
      ['18:00', 'Sinterklaasjournaal'],
    ]));
  });

  it('an adult: no day off and no traktatie, his chores stay, both children get the gift chore', () => {
    const items = buildTodayItems(sources('2026-12-20'), 12 * 60);
    const titles = items.map(i => i.title);
    expect(titles).toContain('Bins');
    expect(titles.some(t => t.startsWith('Day off'))).toBe(false);
    expect(titles.some(t => t.toLowerCase().includes('traktatie'))).toBe(false);
    expect(titles).toEqual(expect.arrayContaining(['Cake time', 'Call Vovó']));
    expect(items.filter(i => i.title === "Make Papa's day").map(i => i.memberIds[0]).sort()).toEqual(['charlie', 'isabel']);
  });

  it('reminds parents the evening before a child\'s birthday, not before an adult\'s', () => {
    const eve = resolveSeasonState(auto, '2026-11-25', FAMILY).rituals.find(r => r.title === 'Prepare traktatie');
    expect(eve).toMatchObject({ start: '20:00', memberIds: ['thiago', 'carol'], subtitle: 'Isabel' });
    expect(resolveSeasonState(auto, '2026-12-19', FAMILY).rituals.some(r => r.title === 'Prepare traktatie')).toBe(false);
  });

  it('shows a done gift chore as done, without a Done button', () => {
    const done = [giftChoreId('isabel', 'charlie', '2026-11-26')];
    const gift = birthdayDay(FAMILY, '2026-11-26', en, done).items.find(i => i.emoji === '🎁')!;
    expect(gift.isPast).toBe(true);
    expect(gift.completable).toBeUndefined();
    // Recorded under the year in season_dates
    expect(datesForYear(withBirthdayDone({}, 2026, done), 2026).birthdays?.done).toEqual(done);
  });

  it('pulses the Vovó pill while the call is on, 17:30 to 18:00', () => {
    const { rituals } = resolveSeasonState(auto, '2026-11-26', FAMILY);
    expect(pulsingContacts(rituals, 17 * 60 + 29)).toEqual([]);
    expect(pulsingContacts(rituals, 17 * 60 + 30)).toEqual(['Vovó']);
    expect(pulsingContacts(rituals, 17 * 60 + 59)).toEqual(['Vovó']);
    expect(pulsingContacts(rituals, 18 * 60)).toEqual([]);
  });
});

describe('season calendar birthdays', () => {
  it('puts 🎂 on Isabel\'s day in the Sinterklaas grid and Thiago\'s in the advent grid', () => {
    const sk = seasonCalendar('sinterklaas', datesForYear({}, 2026), 2026, en, [], [{ date: '2026-11-26', name: 'Isabel' }])!;
    expect(sk.days['2026-11-26']).toMatchObject({ emoji: '🎂', kind: 'birthday', label: "Isabel's birthday" });
    const xmas = seasonCalendar('christmas', {}, 2026, en, [], [{ date: '2026-12-20', name: 'Papa' }, { date: '2026-07-03', name: 'Mama' }])!;
    expect(xmas.days['2026-12-20'].emoji).toBe('🎂');
    expect(Object.values(xmas.days).filter(d => d.emoji === '🎂')).toHaveLength(1);
  });
});
