import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./actions', () => ({
  signUp: vi.fn(),
}));

import { signUp } from './actions';
import SignupPage from './page';

const signUpMock = vi.mocked(signUp);

describe('app/signup/page — email + password signup form', () => {
  test('renders an email + password input and a brand-styled submit button', () => {
    render(<SignupPage />);

    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toBeRequired();

    const password = screen.getByLabelText(/password/i);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toBeRequired();
    expect(password).toHaveAttribute('minLength', '8');

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('uses "Sign up" framing', () => {
    render(<SignupPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sign up/i);
  });

  test('cross-links to /signin for returning users', () => {
    render(<SignupPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/signin');
  });

  test('shows the error message returned by the action', async () => {
    signUpMock.mockResolvedValueOnce({
      ok: false,
      error: 'An account with that email already exists. Sign in instead.',
    });

    render(<SignupPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'correcthorse');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/already exists/i);
  });

  test('uses no default Tailwind palette utilities (brand discipline)', () => {
    const { container } = render(<SignupPage />);
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
