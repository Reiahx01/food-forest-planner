import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./actions', () => ({
  signIn: vi.fn(),
}));

import { signIn } from './actions';
import SignInPage from './page';

const signInMock = vi.mocked(signIn);

describe('app/signin/page — magic-link sign-in form', () => {
  test('renders an email input and a brand-styled submit button', () => {
    render(<SignInPage />);

    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toBeRequired();

    const submit = screen.getByRole('button', { name: /send magic link/i });
    expect(submit).toBeInTheDocument();
  });

  test('uses "Sign in" framing (distinct from /signup)', () => {
    render(<SignInPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/sign in/i);
  });

  test('cross-links to /signup for new users', () => {
    render(<SignInPage />);
    const link = screen.getByRole('link', { name: /create an account/i });
    expect(link).toHaveAttribute('href', '/signup');
  });

  test('shows a "check your email" message after the action succeeds', async () => {
    signInMock.mockResolvedValueOnce({ ok: true, email: 'a@b.co' });

    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/a@b\.co/)).toBeInTheDocument();
  });

  test('shows the no-account hint when the action returns it', async () => {
    signInMock.mockResolvedValueOnce({
      ok: false,
      error: "We don't recognise that email. If you're new, sign up first.",
    });

    render(<SignInPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/don't recognise/i);
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
