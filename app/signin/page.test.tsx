import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./actions', () => ({
  signIn: vi.fn(),
}));

import { signIn } from './actions';
import SignInPage from './page';

const signInMock = vi.mocked(signIn);

describe('app/signin/page — email + password signin form', () => {
  test('renders email + password inputs and a brand-styled submit button', () => {
    render(<SignInPage />);

    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toBeRequired();

    const password = screen.getByLabelText(/password/i);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toBeRequired();

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('uses "Sign in" framing', () => {
    render(<SignInPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sign in/i);
  });

  test('cross-links to /signup for new users', () => {
    render(<SignInPage />);
    const link = screen.getByRole('link', { name: /create an account/i });
    expect(link).toHaveAttribute('href', '/signup');
  });

  test('shows the action error inline', async () => {
    signInMock.mockResolvedValueOnce({
      ok: false,
      error: 'Email or password is incorrect.',
    });

    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/incorrect/i);
  });

  test('uses no default Tailwind palette utilities (brand discipline)', () => {
    const { container } = render(<SignInPage />);
    const html = container.innerHTML;
    for (const banned of [
      /\bbg-zinc-/,
      /\bbg-gray-/,
      /\btext-zinc-/,
      /\btext-gray-/,
      /\bshadow-md\b/,
      /\btransition-all\b/,
    ]) {
      expect(html).not.toMatch(banned);
    }
  });
});
