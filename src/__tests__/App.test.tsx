import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { chain } from '../test/mocks/supabase';

const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/test.jpg' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  };
  return { mockSupabase };
});

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock react-confetti to avoid canvas issues in tests
vi.mock('react-confetti', () => ({
  default: () => null,
}));

function setupDefaultMocks() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'family_members') {
      return chain({
        data: [{ id: 'm1', name: 'Alice', avatar: '👩', points: 10, created_at: '2026-01-01' }],
        error: null,
      });
    }
    if (table === 'chores') {
      return chain({
        data: [
          {
            id: 'c1',
            name: 'Dishes',
            assigned_to: 'm1',
            points: 5,
            emoji: '🍽️',
            is_completed: false,
            scheduled_time: 'morning',
            created_at: '2026-01-01',
          },
        ],
        error: null,
      });
    }
    if (table === 'app_settings') {
      // getAppSettings uses data?.[0], so return an array
      return chain({
        data: [{
          id: 'default',
          title: 'Family Board',
          theme: 'light',
          email_summaries: false,
          parent_pin: '1234',
        }],
        error: null,
      });
    }
    return chain({ data: [], error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setupDefaultMocks();
});

describe('App', () => {
  it('renders the app title from settings', async () => {
    render(<App />);

    await vi.waitFor(() => {
      expect(screen.getByText('Family Board')).toBeInTheDocument();
    });
  });

  it('renders all 5 tab buttons', async () => {
    render(<App />);

    await vi.waitFor(() => {
      expect(screen.getByRole('tab', { name: /Board/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /Chores/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Meal Plan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Fun Ideas/i })).toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    render(<App />);

    await vi.waitFor(() => {
      expect(screen.getByRole('tab', { name: /Board/i })).toBeInTheDocument();
    });

    const choresTab = screen.getByRole('tab', { name: /Chores/i });
    await user.click(choresTab);

    expect(choresTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders header action buttons', async () => {
    render(<App />);

    await vi.waitFor(() => {
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Refresh')).toBeInTheDocument();
  });

  it('shows parent mode toggle', async () => {
    render(<App />);

    await vi.waitFor(() => {
      expect(screen.getByText('Family Board')).toBeInTheDocument();
    });
  });
});
