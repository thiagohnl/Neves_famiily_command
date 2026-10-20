import { Language } from '../types';

// Season strings only; the rest of the app is not translated yet.
// A key ending in `_one` is used instead of the base key when vars.n === 1.
const en = {
  sleepsUntilArrival: '{n} more sleeps until Sinterklaas arrives!',
  sleepsUntilArrival_one: '1 more sleep until Sinterklaas arrives!',
  arrivesToday: 'Sinterklaas arrives today!',
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
  shoeTonight: 'Shoe tonight?',
  yes: 'Yes',
  no: 'No',
  putShoeOut: 'Put your shoe out',
  sleepsUntilChristmas: '{n} more sleeps until Christmas!',
  sleepsUntilChristmas_one: '1 more sleep until Christmas!',
  merryChristmas: 'Merry Christmas!',
  happyBirthday: 'Happy birthday {name}!',
  turnsAge: '{name} is {age} today',
};

export type SeasonStringKey = keyof typeof en;

const pt: Partial<Record<SeasonStringKey, string>> = {
  sleepsUntilArrival: 'Faltam {n} noites para o Sinterklaas chegar!',
  sleepsUntilArrival_one: 'Falta 1 noite para o Sinterklaas chegar!',
  arrivesToday: 'O Sinterklaas chega hoje!',
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
  shoeTonight: 'Sapatinho hoje?',
  yes: 'Sim',
  no: 'Não',
  putShoeOut: 'Coloque o sapatinho',
  sleepsUntilChristmas: 'Faltam {n} noites para o Natal!',
  sleepsUntilChristmas_one: 'Falta 1 noite para o Natal!',
  merryChristmas: 'Feliz Natal!',
  happyBirthday: 'Feliz aniversário, {name}!',
  turnsAge: '{name} faz {age} anos hoje',
};

const nl: Partial<Record<SeasonStringKey, string>> = {
  sleepsUntilArrival: 'Nog {n} nachtjes slapen tot Sinterklaas komt!',
  sleepsUntilArrival_one: 'Nog 1 nachtje slapen tot Sinterklaas komt!',
  arrivesToday: 'Vandaag komt Sinterklaas aan!',
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
  shoeTonight: 'Schoen zetten?',
  yes: 'Ja',
  no: 'Nee',
  putShoeOut: 'Zet je schoen',
  sleepsUntilChristmas: 'Nog {n} nachtjes slapen tot Kerst!',
  sleepsUntilChristmas_one: 'Nog 1 nachtje slapen tot Kerst!',
  merryChristmas: 'Vrolijk kerstfeest!',
  happyBirthday: 'Gefeliciteerd, {name}!',
  turnsAge: '{name} wordt vandaag {age}',
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

/** `t` with the language already chosen, as handed to seasons. */
export type Translate = (key: SeasonStringKey, vars?: Vars) => string;

export const translatorFor = (lang: string | undefined): Translate => (key, vars) => t(key, lang, vars);
