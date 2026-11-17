import { useState } from 'react';
import { api, type User } from '../api';
import { BrandLink } from '../components/BrandLink';

const DEMO_USERS = [
  { id: 'U-17', name: 'Sara Al-Harbi', role: 'reporter' },
  { id: 'U-18', name: 'Omar Al-Qahtani', role: 'reporter' },
  { id: 'SUP-01', name: 'Khalid Al-Otaibi', role: 'supervisor' },
];

export function LoginView({ onSignedIn }: { onSignedIn: (user: User) => void }): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const signIn = async (userId: string): Promise<void> => {
    setBusy(userId);
    setError(null);
    try {
      const { token, user } = await api.login(userId);
      localStorage.setItem('triage.token', token);
      window.location.reload();
      onSignedIn(user);
    } catch {
      setError('That account could not sign in.');
      setBusy(null);
    }
  };

  return (
    <main className="shell shell-narrow">
      <div className="brand-row">
        <BrandLink role={null} />
      </div>
      <section className="card">
        <h1>Sign in</h1>
        <p className="muted">
          Synthetic demo accounts. No real student or staff data is used.
        </p>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <ul className="plain-list">
          {DEMO_USERS.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="button button-wide"
                onClick={() => void signIn(user.id)}
                disabled={busy !== null}
              >
                <span>{user.name}</span>
                <span className="muted"> · {user.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
