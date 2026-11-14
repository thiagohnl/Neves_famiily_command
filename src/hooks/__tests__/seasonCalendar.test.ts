import { canCrossDay, missingCrossedDays, nextSpecialLine, seasonCalendar } from '../../seasons/calendar';
import { datesForYear } from '../../seasons/store';
import { translatorFor } from '../../seasons/i18n';

const en = translatorFor('en');

const sinterklaas2026 = (shoe_nights: string[] = []) =>
  seasonCalendar('sinterklaas', datesForYear({ '2026': { sinterklaas: { shoe_nights } } }, 2026), 2026, en)!;

describe('seasonCalendar: Sinterklaas', () => {
  it('2026 runs 21 days from 15 November to 5 December', () => {
    const spec = sinterklaas2026();
    const days = Object.keys(spec.days).sort();
    expect(spec.start).toBe('2026-11-15');
    expect(spec.end).toBe('2026-12-05');
    expect(days).toHaveLength(21);
    expect(days[0]).toBe('2026-11-15');
    expect(days[20]).toBe('2026-12-05');
  });

  it('runs in date order with no blanks: 🚢 is cell 1 and 🎁 is cell 21', () => {
    const { days } = sinterklaas2026();
    const cells = Object.keys(days).sort().map(day => days[day].emoji);
    expect(cells).toHaveLength(21);
    expect(cells[0]).toBe('🚢');
    expect(cells[20]).toBe('🎁');
  });

  it('marks weekends 🍪 and weekdays 📺', () => {
    const { days } = sinterklaas2026();
    expect(days['2026-11-20']).toMatchObject({ emoji: '📺', kind: 'journaal' }); // Friday
    expect(days['2026-11-21']).toMatchObject({ emoji: '🍪', kind: 'weekend' }); // Saturday
    expect(days['2026-11-22']).toMatchObject({ emoji: '🍪', kind: 'weekend' }); // Sunday
    expect(days['2026-12-05']).toMatchObject({ emoji: '🎁', kind: 'final', gold: true }); // a Saturday, but Pakjesavond
    expect(days['2026-11-20'].gold).toBeUndefined();
  });

  it('shows shoe nights 🥾 with a gold background, only where set', () => {
    const { days } = sinterklaas2026(['2026-11-09', '2026-11-21', '2026-11-26']);
    expect(days['2026-11-21']).toMatchObject({ emoji: '🥾', kind: 'shoe', gold: true });
    expect(days['2026-11-26']).toMatchObject({ emoji: '🥾', gold: true });
    expect(days['2026-11-09']).toBeUndefined(); // before the grid starts
    expect(Object.values(days).filter(d => d.emoji === '🥾')).toHaveLength(2);
  });

  it('picks one emoji per day: birthday > Pakjesavond > shoe night > intocht > weekend > weekday', () => {
    const at = (shoe: string[], birthdays: { date: string; name: string }[] = []) =>
      seasonCalendar('sinterklaas', datesForYear({ '2026': { sinterklaas: { shoe_nights: shoe } } }, 2026), 2026, en, [], birthdays)!.days;
    // birthday beats everything, and keeps a shoe night's gold
    expect(at(['2026-11-26'], [{ date: '2026-11-26', name: 'Isabel' }])['2026-11-26']).toMatchObject({ emoji: '🎂', gold: true });
    expect(at([], [{ date: '2026-12-05', name: 'Isabel' }])['2026-12-05'].emoji).toBe('🎂');
    // Pakjesavond beats a shoe night
    expect(at(['2026-12-05'])['2026-12-05'].emoji).toBe('🎁');
    // a shoe night beats the intocht
    expect(at(['2026-11-15'])['2026-11-15'].emoji).toBe('🥾');
    // the intocht (a Sunday) beats the weekend
    expect(at([])['2026-11-15'].emoji).toBe('🚢');
    // the weekend beats a weekday's journaal
    expect(at([])['2026-11-28'].emoji).toBe('🍪');
    expect(at([])['2026-11-27'].emoji).toBe('📺');
  });

  it('needs a valid range', () => {
    const broken = seasonCalendar('sinterklaas', { sinterklaas: { intocht_local: '2026-12-10', pakjesavond: '2026-12-05' } }, 2026, en);
    expect(broken).toBeNull();
  });
});

describe('seasonCalendar: Christmas', () => {
  it('runs 1 to 25 December with 🎄 on the 25th, ✈️ on London trips and 🎅 otherwise', () => {
    const spec = seasonCalendar('christmas', {}, 2026, en, [
      { date: '2026-12-19', title: 'Eurostar to London' },
      { date: '2026-12-20', title: 'London' },
      { date: '2026-12-21', title: 'Dentist' },
    ])!;
    expect(Object.keys(spec.days)).toHaveLength(25);
    expect(spec.days['2026-12-25']).toMatchObject({ emoji: '🎄', gold: true });
    expect(spec.days['2026-12-19'].emoji).toBe('✈️');
    expect(spec.days['2026-12-20'].emoji).toBe('✈️');
    expect(spec.days['2026-12-21'].emoji).toBe('🎅');
  });
});

describe('crossing days off', () => {
  const spec = sinterklaas2026();

  it('can cross today or earlier, never a future day or one outside the grid', () => {
    expect(canCrossDay(spec, '2026-11-20', '2026-11-20')).toBe(true);
    expect(canCrossDay(spec, '2026-11-16', '2026-11-20')).toBe(true);
    expect(canCrossDay(spec, '2026-11-21', '2026-11-20')).toBe(false);
    expect(canCrossDay(spec, '2026-11-14', '2026-11-20')).toBe(false);
  });

  it('auto-crosses past days nobody crossed, but not today', () => {
    expect(missingCrossedDays(spec, ['2026-11-16'], '2026-11-18')).toEqual(['2026-11-15', '2026-11-17']);
    expect(missingCrossedDays(spec, [], '2026-11-15')).toEqual([]);
  });
});

describe('nextSpecialLine', () => {
  it('speaks in sleeps, in the season language', () => {
    const spec = sinterklaas2026(['2026-11-21']);
    expect(nextSpecialLine(spec, '2026-11-12', en)).toBe('🚢 3 sleeps until he visits our town');
    expect(nextSpecialLine(spec, '2026-11-14', en)).toBe('🚢 Tomorrow he sails into Haarlem');
    expect(nextSpecialLine(spec, '2026-11-15', en)).toBe('🚢 Sinterklaas comes to Haarlem today!');
    expect(nextSpecialLine(spec, '2026-11-20', en)).toBe('🥾 Next wellies: Saturday');
    expect(nextSpecialLine(spec, '2026-11-21', en)).toBe('🥾 Wellies tonight!');
    expect(nextSpecialLine(spec, '2026-11-20', translatorFor('nl'))).toBe('🥾 Volgende schoen: zaterdag');
    expect(nextSpecialLine(spec, '2026-12-01', en)).toBe('🎁 4 more sleeps');
    expect(nextSpecialLine(spec, '2026-12-04', en)).toBe('🎁 1 more sleep');
    expect(nextSpecialLine(spec, '2026-12-01', translatorFor('nl'))).toBe('🎁 Nog 4 nachtjes');
    expect(nextSpecialLine(spec, '2026-12-06', en)).toBeNull();
  });

  it('counts to Christmas', () => {
    const spec = seasonCalendar('christmas', {}, 2026, en)!;
    expect(nextSpecialLine(spec, '2026-12-06', en)).toBe('🎄 19 more sleeps');
    expect(nextSpecialLine(spec, '2026-12-25', en)).toBe('🎄 Merry Christmas!');
  });
});
