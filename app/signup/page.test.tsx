import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

vi.mock('./actions', () => ({
  requestMagicLink: vi.fn(),
}));

import { requestMagicLink } from './actions';
import SignupPage from './page';

const requestMagicLinkMock = vi.mocked(requestMagicLink);

describe('app/signup/page — magic-link signup form', () => {
  test('renders an email input and a brand-styled submit button', () => {
    render(<SignupPage />);

    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toBeRequired();

    const submit = screen.getByRole('button', { name: /send magic link/i });
    expect(submit).toBeInTheDocument();
  });

  test('shows a "check your email" message after the action succeeds', async () => {
    requestMagicLinkMock.mockResolvedValueOnce({ ok: true, email: 'a@b.co' });

    render(<SignupPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/a@b\.co/)).toBeInTheDocument();
  });

  test('shows the error message returned by the action', async () => {
    // Submit a syntactically-valid email so the browser's type=email check
    // lets the form submit; the action mock returns the error we want to
    // assert is rendered.
    requestMagicLinkMock.mockResolvedValueOnce({
      ok: false,
      error: 'Something went wrong sending the magic link -- please try again in a minute.',
    });

    render(<SignupPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.co');
    await userEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/try again/i);
  });

  test('uses no default Tailwind palette utilities (brand discipline)', () => {
    const { container } = render(<SignupPage />);
    const html = container.innerHTML;
    // Same anti-generic guard the landing page enforces.
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
