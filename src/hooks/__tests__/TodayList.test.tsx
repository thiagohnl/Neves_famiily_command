import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TodayList } from '../../components/home/TodayList';
import { FamilyMember } from '../../types';
import { TodayItem } from '../../types/today';

const members: FamilyMember[] = [{ id: 'k1', name: 'Charlie', avatar: '🧒', points: 0, is_parent: false }];

const items: TodayItem[] = [
  { id: 'a', kind: 'google', emoji: '🏫', title: 'School drop off', start: '08:00', end: '08:30', memberIds: [], isPast: true, isNow: false },
  {
    id: 'b', kind: 'chore', emoji: '🧹', title: 'Sweep', subtitle: 'Chore, 10 points', start: '17:00', memberIds: ['k1'],
    isPast: false, isNow: false, completable: { choreId: 'c1', points: 10, assignedTo: 'k1' },
  },
];

describe('TodayList', () => {
  it('mutes past items, draws the NOW line before upcoming ones, and completes a chore on Done', async () => {
    const onComplete = vi.fn();
    render(<TodayList items={items} familyMembers={members} nowMinutes={16 * 60 + 10} onComplete={onComplete} />);

    expect(screen.getByText('School drop off')).toHaveClass('line-through');
    expect(screen.getByText('NOW 16:10')).toBeInTheDocument();
    expect(screen.getByLabelText('Charlie')).toBeInTheDocument();

    const rows = screen.getAllByRole('listitem');
    expect(rows.map(r => (r.hasAttribute('data-now-line') ? 'NOW' : r.textContent))).toEqual([
      expect.stringContaining('School drop off'),
      'NOW',
      expect.stringContaining('Sweep'),
    ]);

    await userEvent.click(screen.getByRole('button', { name: /Done!/ }));
    expect(onComplete).toHaveBeenCalledWith(items[1]);
  });

  it('says so when nothing is planned', () => {
    render(<TodayList items={[]} familyMembers={members} nowMinutes={600} onComplete={vi.fn()} />);
    expect(screen.getByText(/Nothing planned today/)).toBeInTheDocument();
  });
});
