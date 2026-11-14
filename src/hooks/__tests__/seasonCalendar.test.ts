import { bounceDay, canCrossDay, missingCrossedDays, nextSpecialLine, seasonCalendar } from '../../seasons/calendar';
import { datesForYear } from '../../seasons/store';
import { translatorFor } from '../../seasons/i18n';

const en = translatorFor('en');

const sinterklaas2026 = (shoe_nights: string[] = []) =>
  seasonCalendar('sinterklaas', datesForYear({ '2026': { sinterklaas: { shoe_nights } } }, 2026), 2026, en)!;

describe('seasonCalendar: Sinterklaas', () => {
  it('2026 starts at the national intocht: 22 days from 14 November to 5 December', () => {
    const spec = sinterklaas2026();
    const days = Object.keys(spec.days).sort();
    expect(spec.start).toBe('2026-11-14');
    expect(spec.end).toBe('2026-12-05');
    expect(days).toHaveLength(22);
    expect(days[0]).toBe('2026-11-14');
    expect(days[21]).toBe('2026-12-05');
  });

  it('runs in date order with no blanks: 🚢 on 14 and 15 November, 🎁 is cell 22', () => {
    const { days } = sinterklaas2026();
    const cells = Object.keys(days).sort().map(day => days[day].emoji);
    expect(cells.slice(0, 2)).toEqual(['🚢', '🚢']);
    expect(cells[21]).toBe('🎁');
    expect(days['2026-11-14'].label).toBe('Sinterklaas arrives');
    expect(days['2026-11-15'].label).toBe('Sinterklaas in Haarlem');
  });

  it('with a shoe night on the 15th: 🚢 on the 14th, 🥾 on the 15th (wellies win over the intocht)', () => {
    const { days } = sinterklaas2026(['2026-11-15']);
    expect(days['2026-11-14']).toMatchObject({ emoji: '🚢', kind: 'arrival' });
    expect(days['2026-11-15']).toMatchObject({ emoji: '🥾', kind: 'shoe', gold: true });
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
    expect(canCrossDay(spec, '2026-11-14', '2026-11-20')).toBe(true); // first cell now
    expect(canCrossDay(spec, '2026-11-13', '2026-11-20')).toBe(false); // before the grid
  });

  it('auto-crosses past days nobody crossed, but not today', () => {
    expect(missingCrossedDays(spec, ['2026-11-16'], '2026-11-18')).toEqual(['2026-11-14', '2026-11-15', '2026-11-17']);
    expect(missingCrossedDays(spec, [], '2026-11-14')).toEqual([]);
  });
});

describe('nextSpecialLine', () => {
  it('on 14 November 2026 reads "🥾 Wellies tomorrow night!"', () => {
    expect(nextSpecialLine(sinterklaas2026(['2026-11-15']), '2026-11-14', en)).toBe('🥾 Wellies tomorrow night!');
  });

  it('speaks in sleeps with no weekday names, in the season language', () => {
    const spec = sinterklaas2026(['2026-11-21']);
    expect(nextSpecialLine(spec, '2026-11-18', en)).toBe('🥾 Wellies in 3 sleeps');
    expect(nextSpecialLine(spec, '2026-11-20', en)).toBe('🥾 Wellies tomorrow night!');
    expect(nextSpecialLine(spec, '2026-11-21', en)).toBe('🥾 Wellies tonight!');
    expect(nextSpecialLine(spec, '2026-11-20', translatorFor('nl'))).toBe('🥾 Schoen zetten morgen!');
    expect(nextSpecialLine(spec, '2026-11-18', translatorFor('nl'))).toBe('🥾 Schoen zetten over 3 nachtjes');
    expect(nextSpecialLine(spec, '2026-11-18', translatorFor('pt'))).toBe('🥾 Bota em 3 sonos');
    expect(nextSpecialLine(spec, '2026-11-21', translatorFor('pt'))).toBe('🥾 Bota hoje à noite!');
    expect(nextSpecialLine(spec, '2026-12-01', en)).toBe('🎁 4 more sleeps');
    expect(nextSpecialLine(spec, '2026-12-04', en)).toBe('🎁 1 more sleep');
    expect(nextSpecialLine(spec, '2026-12-01', translatorFor('nl'))).toBe('🎁 Nog 4 nachtjes');
    expect(nextSpecialLine(spec, '2026-12-06', en)).toBeNull();
  });

  it('names a birthday the way the hero chip does', () => {
    const spec = seasonCalendar('sinterklaas', datesForYear({}, 2026), 2026, en, [], [{ date: '2026-11-26', name: 'Isabel' }])!;
    expect(nextSpecialLine(spec, '2026-11-23', en)).toBe("🎂 3 sleeps until Isabel's birthday");
  });

  it('counts to Christmas', () => {
    const spec = seasonCalendar('christmas', {}, 2026, en)!;
    expect(nextSpecialLine(spec, '2026-12-06', en)).toBe('🎄 19 more sleeps');
    expect(nextSpecialLine(spec, '2026-12-25', en)).toBe('🎄 Merry Christmas!');
  });
});

describe('bounceDay', () => {
  it('bounces only the next 🥾, 🎂 or 🎁 after today, whichever is nearest', () => {
    const spec = seasonCalendar('sinterklaas', datesForYear({ '2026': { sinterklaas: { shoe_nights: ['2026-11-21', '2026-11-28'] } } }, 2026), 2026, en, [], [{ date: '2026-11-26', name: 'Isabel' }])!;
    expect(bounceDay(spec, '2026-11-14')).toBe('2026-11-21'); // the 🚢 days don't bounce
    expect(bounceDay(spec, '2026-11-21')).toBe('2026-11-26'); // today has its own ring; next is 🎂
    expect(bounceDay(spec, '2026-11-26')).toBe('2026-11-28');
    expect(bounceDay(spec, '2026-11-29')).toBe('2026-12-05'); // then 🎁
    expect(bounceDay(spec, '2026-12-05')).toBeNull();
  });
});
