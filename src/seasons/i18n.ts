import { Language } from '../types';

// Season strings only; the rest of the app is not translated yet.
// A key ending in `_one` is used instead of the base key when vars.n === 1.
const en = {
  sleepsUntilArrival: '{n} more sleeps until Sinterklaas arrives!',
  sleepsUntilArrival_one: '1 more sleep until Sinterklaas arrives!',
  sleepsUntilPakjesavond: '{n} more sleeps until Pakjesavond!',
  sleepsUntilPakjesavond_one: '1 more sleep until Pakjesavond!',
  pakjesavondToday: "It's Pakjesavond tonight!",
  sleepsUntilLocalVisit: '{n} sleeps until he visits our town',
  sleepsUntilLocalVisit_one: '1 sleep until he visits our town',
  localVisitToday: 'He visits our town today!',
  journaalTonight: 'Sinterklaasjournaal tonight at 18:00',
  pakjesavond: 'Pakjesavond',
  sleeps: '{n} sleeps',
  sleeps_one: '1 sleep',
  tonight: 'Tonight!',
  putShoeOut: 'Put your wellies out',
  sleepsUntilChristmas: '🎄 {n} sleeps until Christmas',
  sleepsUntilChristmas_one: '🎄 1 sleep until Christmas',
  merryChristmas: 'Merry Christmas!',
  happyBirthday: '🎂 Happy birthday {name}!',
  turnsAge: '{name} is {age} today',
  journaalEpisode: 'NPO 3, episode {n} of {m}',
  journaalSoon: '📺 Sinterklaasjournaal starts soon',
  intochtAt: 'At {time}',
  intochtAround: 'Around 13:00',
  nextPakjesavondToday: '🎁 Pakjesavond tonight!',
  nextPakjesavondIn: '🎁 {n} more sleeps',
  nextPakjesavondIn_one: '🎁 1 more sleep',
  nextChristmasToday: '🎄 Merry Christmas!',
  nextChristmasIn: '🎄 {n} more sleeps',
  nextChristmasIn_one: '🎄 1 more sleep',
  nextTripToday: '✈️ Off to London today!',
  nextTripTomorrow: '✈️ Off to London: tomorrow',
  nextTripIn: '✈️ London in {n} sleeps',
  calArrival: 'Sinterklaas arrives',
  calShoe: 'Wellies night',
  calPakjesavond: 'Pakjesavond',
  calJournaal: 'Sinterklaasjournaal',
  calChristmas: 'Christmas Day',
  calTrip: 'London trip',
  inNetherlands: '🚢 Sinterklaas is in the Netherlands!',
  sailsTomorrow: 'Tomorrow he sails into Haarlem',
  comesToHaarlemToday: '🚢 Sinterklaas comes to Haarlem today!',
  welliesTonight: '🥾 Wellies tonight!',
  nextWellies: '🥾 Next wellies: {day}',
  calWeekend: 'Weekend',
  calAdvent: 'Advent',
  birthdayAge: '🎂 {name} is {age} today!',
  birthdaySleeps: "🎂 {n} sleeps until {name}'s birthday",
  birthdaySleeps_one: "🎂 1 sleep until {name}'s birthday",
  birthdayToday: "🎂 It's {name}'s birthday today!",
  birthdayCell: 'TODAY',
  calBirthday: "{name}'s birthday",
  dayOff: 'Day off for {name}',
  prepareTraktatie: 'Prepare traktatie',
  traktatieSchool: 'Traktatie at school or daycare',
  cakeTime: 'Cake time',
  callVovo: 'Call Vovó',
  makeDay: "Make {name}'s day",
  papa: 'Papa',
  mama: 'Mama',
};

export type SeasonStringKey = keyof typeof en;

const pt: Partial<Record<SeasonStringKey, string>> = {
  sleepsUntilArrival: 'Faltam {n} noites para o Sinterklaas chegar!',
  sleepsUntilArrival_one: 'Falta 1 noite para o Sinterklaas chegar!',
  sleepsUntilPakjesavond: 'Faltam {n} noites para o Pakjesavond!',
  sleepsUntilPakjesavond_one: 'Falta 1 noite para o Pakjesavond!',
  pakjesavondToday: 'Hoje à noite é Pakjesavond!',
  sleepsUntilLocalVisit: 'Faltam {n} noites para ele visitar a nossa cidade',
  sleepsUntilLocalVisit_one: 'Falta 1 noite para ele visitar a nossa cidade',
  localVisitToday: 'Hoje ele visita a nossa cidade!',
  journaalTonight: 'Sinterklaasjournaal hoje às 18:00',
  sleeps: '{n} noites',
  sleeps_one: '1 noite',
  tonight: 'Hoje!',
  putShoeOut: 'Deixa a tua bota',
  sleepsUntilChristmas: '🎄 Faltam {n} noites para o Natal',
  sleepsUntilChristmas_one: '🎄 Falta 1 noite para o Natal',
  merryChristmas: 'Feliz Natal!',
  happyBirthday: '🎂 Feliz aniversário, {name}!',
  turnsAge: '{name} faz {age} anos hoje',
  journaalEpisode: 'NPO 3, episódio {n} de {m}',
  journaalSoon: '📺 O Sinterklaasjournaal já vai começar',
  intochtAt: 'Às {time}',
  intochtAround: 'Por volta das 13:00',
  nextPakjesavondToday: '🎁 Hoje à noite é Pakjesavond!',
  nextPakjesavondIn: '🎁 Faltam {n} noites',
  nextPakjesavondIn_one: '🎁 Falta 1 noite',
  nextChristmasToday: '🎄 Feliz Natal!',
  nextChristmasIn: '🎄 Faltam {n} noites',
  nextChristmasIn_one: '🎄 Falta 1 noite',
  nextTripToday: '✈️ Hoje vamos a Londres!',
  nextTripTomorrow: '✈️ Londres: amanhã',
  nextTripIn: '✈️ Londres daqui a {n} noites',
  calArrival: 'O Sinterklaas chega',
  calShoe: 'Noite da bota',
  calChristmas: 'Natal',
  calTrip: 'Viagem a Londres',
  inNetherlands: '🚢 O Sinterklaas está na Holanda!',
  sailsTomorrow: 'Amanhã ele chega de barco a Haarlem',
  comesToHaarlemToday: '🚢 O Sinterklaas chega hoje a Haarlem!',
  welliesTonight: '🥾 Bota hoje à noite!',
  nextWellies: '🥾 Próxima bota: {day}',
  calWeekend: 'Fim de semana',
  calAdvent: 'Advento',
  birthdayAge: '🎂 {name} faz {age} anos hoje!',
  birthdaySleeps: '🎂 Faltam {n} noites para o aniversário de {name}',
  birthdaySleeps_one: '🎂 Falta 1 noite para o aniversário de {name}',
  birthdayToday: '🎂 Hoje é o aniversário de {name}!',
  birthdayCell: 'HOJE',
  calBirthday: 'Aniversário de {name}',
  dayOff: 'Dia de folga para {name}',
  prepareTraktatie: 'Preparar a traktatie',
  traktatieSchool: 'Traktatie na escola ou creche',
  cakeTime: 'Hora do bolo',
  callVovo: 'Ligar para a Vovó',
  makeDay: 'Fazer o dia de {name} especial',
  papa: 'Papai',
  mama: 'Mamãe',
};

const nl: Partial<Record<SeasonStringKey, string>> = {
  sleepsUntilArrival: 'Nog {n} nachtjes slapen tot Sinterklaas komt!',
  sleepsUntilArrival_one: 'Nog 1 nachtje slapen tot Sinterklaas komt!',
  sleepsUntilPakjesavond: 'Nog {n} nachtjes slapen tot Pakjesavond!',
  sleepsUntilPakjesavond_one: 'Nog 1 nachtje slapen tot Pakjesavond!',
  pakjesavondToday: 'Vanavond is het Pakjesavond!',
  sleepsUntilLocalVisit: 'Nog {n} nachtjes tot hij in ons dorp komt',
  sleepsUntilLocalVisit_one: 'Nog 1 nachtje tot hij in ons dorp komt',
  localVisitToday: 'Vandaag komt hij in ons dorp!',
  journaalTonight: 'Vanavond om 18:00 het Sinterklaasjournaal',
  sleeps: '{n} nachtjes',
  sleeps_one: '1 nachtje',
  tonight: 'Vanavond!',
  putShoeOut: 'Zet je schoen',
  sleepsUntilChristmas: '🎄 Nog {n} nachtjes tot Kerst',
  sleepsUntilChristmas_one: '🎄 Nog 1 nachtje tot Kerst',
  merryChristmas: 'Vrolijk kerstfeest!',
  happyBirthday: '🎂 Gefeliciteerd, {name}!',
  turnsAge: '{name} wordt vandaag {age}',
  journaalEpisode: 'NPO 3, aflevering {n} van {m}',
  journaalSoon: '📺 Het Sinterklaasjournaal begint zo',
  intochtAt: 'Om {time}',
  intochtAround: 'Rond 13:00',
  nextPakjesavondToday: '🎁 Vanavond is het Pakjesavond!',
  nextPakjesavondIn: '🎁 Nog {n} nachtjes',
  nextPakjesavondIn_one: '🎁 Nog 1 nachtje',
  nextChristmasToday: '🎄 Vrolijk kerstfeest!',
  nextChristmasIn: '🎄 Nog {n} nachtjes',
  nextChristmasIn_one: '🎄 Nog 1 nachtje',
  nextTripToday: '✈️ Vandaag naar Londen!',
  nextTripTomorrow: '✈️ Londen: morgen',
  nextTripIn: '✈️ Londen over {n} nachtjes',
  calArrival: 'Sinterklaas komt',
  calShoe: 'Schoen zetten',
  calChristmas: 'Kerstmis',
  calTrip: 'Reis naar Londen',
  inNetherlands: '🚢 Sinterklaas is in Nederland!',
  sailsTomorrow: 'Morgen vaart hij Haarlem binnen',
  comesToHaarlemToday: '🚢 Sinterklaas komt vandaag naar Haarlem!',
  welliesTonight: '🥾 Schoen zetten vanavond!',
  nextWellies: '🥾 Volgende schoen: {day}',
  calWeekend: 'Weekend',
  calAdvent: 'Advent',
  birthdayAge: '🎂 {name} wordt vandaag {age}!',
  birthdaySleeps: '🎂 Nog {n} nachtjes tot {name} jarig is',
  birthdaySleeps_one: '🎂 Nog 1 nachtje tot {name} jarig is',
  birthdayToday: '🎂 Vandaag is {name} jarig!',
  birthdayCell: 'VANDAAG',
  calBirthday: '{name} is jarig',
  dayOff: 'Vrije dag voor {name}',
  prepareTraktatie: 'Traktatie klaarmaken',
  traktatieSchool: 'Trakteren op school of opvang',
  cakeTime: 'Taart!',
  callVovo: 'Vovó bellen',
  makeDay: 'Maak er een feestdag van voor {name}',
  papa: 'Papa',
  mama: 'Mama',
};

const dictionaries: Record<Language, Partial<Record<SeasonStringKey, string>>> = { en, pt, nl };

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'nl', label: 'Nederlands' },
];

type Vars = Record<string, string | number>;

/** Translate a season string, falling back to English for a missing language or key. */
export const t = (key: SeasonStringKey, lang: string | undefined, vars: Vars = {}): string => {
  const dict = dictionaries[lang as Language] ?? en;
  const pluralKey = `${key}_one` as SeasonStringKey;
  const template =
    (vars.n === 1 && (dict[pluralKey] ?? en[pluralKey])) || dict[key] || en[key] || key;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
};

/** `t` with the language already chosen, as handed to seasons; `lang` is that language. */
export type Translate = ((key: SeasonStringKey, vars?: Vars) => string) & { lang?: Language };

export const translatorFor = (lang: string | undefined): Translate =>
  Object.assign((key: SeasonStringKey, vars?: Vars) => t(key, lang, vars), {
    lang: (lang && lang in dictionaries ? lang : 'en') as Language,
  });

const LOCALES: Record<Language, string> = { en: 'en-GB', pt: 'pt-PT', nl: 'nl-NL' };

/** "Friday", "vrijdag", "sexta-feira" for a YYYY-MM-DD date. */
export const weekdayName = (iso: string, lang: Language = 'en'): string =>
  new Intl.DateTimeFormat(LOCALES[lang] ?? 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
