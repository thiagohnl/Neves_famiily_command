import { render, screen } from '@testing-library/react';
import { SeasonHero } from '../../components/SeasonHero';
import { HeroSpec, illustrationFor, toneAt } from '../../seasons';
import { sinterklaas } from '../../seasons/sinterklaas';
import { christmas } from '../../seasons/christmas';
import { birthdaySeason } from '../../seasons/birthdays';
import { FamilyMember } from '../../types';

const hero: HeroSpec = { emoji: '🎁', headline: '21 sleeps until Pakjesavond', subline: '', chips: [] };

describe('season illustration', () => {
  it('gives Sinterklaas the Ozosnel picture, day and night alike', () => {
    const day = illustrationFor(sinterklaas, 10 * 60);
    const night = illustrationFor(sinterklaas, 21 * 60);
    expect(day).toMatchObject({
      src: '/seasons/sinterklaas-ozosnel-360.webp',
      fallbackSrc: '/seasons/sinterklaas-ozosnel-360.png',
      alt: 'Sinterklaas feeding Ozosnel an apple',
      width: 446,
      height: 360,
      tone: 'day',
    });
    expect(night).toMatchObject({ src: day!.src, tone: 'night' });
  });

  it('tells day from night', () => {
    expect(toneAt(7 * 60)).toBe('day');
    expect(toneAt(18 * 60 + 59)).toBe('day');
    expect(toneAt(19 * 60)).toBe('night');
    expect(toneAt(6 * 60 + 59)).toBe('night');
  });

  it('has none for Christmas, birthdays or no season', () => {
    const isabel: FamilyMember = { id: 'm1', name: 'Isabel', avatar: '👧', points: 0, is_parent: false, birth_date: '2019-11-26' };
    expect(illustrationFor(christmas, 600)).toBeNull();
    expect(illustrationFor(birthdaySeason([isabel], '2026-11-26'), 600)).toBeNull();
    expect(illustrationFor(null, 600)).toBeNull();
  });

  it('renders a picture with a WebP source and PNG fallback, clear of the text', () => {
    const { container } = render(<SeasonHero hero={hero} size="strip" illustration={illustrationFor(sinterklaas, 600)} />);
    const img = screen.getByAltText('Sinterklaas feeding Ozosnel an apple');
    expect(img.getAttribute('src')).toBe('/seasons/sinterklaas-ozosnel-360.png');
    const source = container.querySelector('picture source');
    expect(source?.getAttribute('srcset')).toBe('/seasons/sinterklaas-ozosnel-360.webp');
    expect(source?.getAttribute('type')).toBe('image/webp');
    const picture = container.querySelector('picture') as HTMLElement;
    expect(picture.className).toContain('hidden');
    expect(picture.className).toContain('min-[1100px]:block');
    expect(picture.style.height).toBe('170px');
    expect(picture.style.width).toBe('211px'); // 446 × 170 / 360
    const section = screen.getByLabelText('Season');
    expect(section.style.getPropertyValue('--illo-pad')).toBe('235px'); // width + 24
    expect(section.style.getPropertyValue('--illo-min-h')).toBe('162px'); // 170 − 20 + 12 padding
  });

  it('leaves the slot empty without an illustration', () => {
    const { container } = render(<SeasonHero hero={hero} />);
    expect(container.querySelector('picture')).toBeNull();
  });
});
