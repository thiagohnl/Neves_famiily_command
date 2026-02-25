import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParentAuthModal } from '../ParentAuthModal';

describe('ParentAuthModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAuthenticate: vi.fn().mockReturnValue(false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the modal when isOpen is true', () => {
    render(<ParentAuthModal {...defaultProps} />);
    expect(screen.getByText('Parent Access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter 4-digit PIN')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ParentAuthModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Parent Access')).not.toBeInTheDocument();
  });

  it('accepts a 4-digit PIN input', async () => {
    render(<ParentAuthModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter 4-digit PIN');

    await act(async () => {
      fireEvent.change(input, { target: { value: '1234' } });
    });

    expect(input).toHaveValue('1234');
  });

  it('limits input to 4 characters via maxLength', () => {
    render(<ParentAuthModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter 4-digit PIN');
    expect(input).toHaveAttribute('maxLength', '4');
  });

  it('calls onAuthenticate with the PIN on submit', async () => {
    const onAuthenticate = vi.fn().mockReturnValue(true);
    const user = userEvent.setup();
    render(<ParentAuthModal {...defaultProps} onAuthenticate={onAuthenticate} />);

    const input = screen.getByPlaceholderText('Enter 4-digit PIN');

    // Set the PIN value
    await act(async () => {
      fireEvent.change(input, { target: { value: '9999' } });
    });

    // Click the Unlock button (now enabled since pin.length === 4)
    const unlockBtn = screen.getByRole('button', { name: /Unlock/i });
    expect(unlockBtn).not.toBeDisabled();
    await user.click(unlockBtn);

    expect(onAuthenticate).toHaveBeenCalledWith('9999');
  });

  it('shows error message on wrong PIN', async () => {
    const onAuthenticate = vi.fn().mockReturnValue(false);
    const user = userEvent.setup();
    render(<ParentAuthModal {...defaultProps} onAuthenticate={onAuthenticate} />);

    const input = screen.getByPlaceholderText('Enter 4-digit PIN');

    await act(async () => {
      fireEvent.change(input, { target: { value: '0000' } });
    });

    const unlockBtn = screen.getByRole('button', { name: /Unlock/i });
    await user.click(unlockBtn);

    await waitFor(() => {
      expect(screen.getByText('Incorrect PIN. Please try again.')).toBeInTheDocument();
    });
  });

  it('disables submit button when PIN is not 4 digits', () => {
    render(<ParentAuthModal {...defaultProps} />);
    const unlockButton = screen.getByText('Unlock').closest('button');
    expect(unlockButton).toBeDisabled();
  });

  it('toggles PIN visibility via eye button', async () => {
    render(<ParentAuthModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter 4-digit PIN') as HTMLInputElement;
    expect(input.type).toBe('password');

    // Find and click the eye toggle button inside the input's parent
    const buttons = input.parentElement!.querySelectorAll('button');
    expect(buttons.length).toBe(1);

    await act(async () => {
      fireEvent.click(buttons[0]);
    });

    // After state update, re-query the input since React may have replaced the element
    const updatedInput = screen.getByPlaceholderText('Enter 4-digit PIN') as HTMLInputElement;
    expect(updatedInput.type).toBe('text');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ParentAuthModal {...defaultProps} />);

    await user.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
