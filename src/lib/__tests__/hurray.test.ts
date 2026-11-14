import { playHurray } from '../hurray';

describe('playHurray', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does nothing (and does not throw) where there is no audio or speech', () => {
    vi.useFakeTimers();
    expect(() => playHurray('nl')).not.toThrow();
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('speaks the cheer in the season language when speech is available', () => {
    vi.useFakeTimers();
    const speak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', class { lang = ''; rate = 1; pitch = 1; constructor(public text: string) {} });
    playHurray('nl');
    vi.runAllTimers();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'Hiep hiep hoera!', lang: 'nl-NL' });
  });
});
