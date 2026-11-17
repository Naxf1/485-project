import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, type User } from './api';
import { LoginView } from './views/LoginView';
import { NewTicketView } from './views/NewTicketView';
import { MyTicketsView } from './views/MyTicketsView';
import { QueueView } from './views/QueueView';
import { ReviewView } from './views/ReviewView';

type View = 'new' | 'mine' | 'queue' | 'review';

export function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('mine');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }

    api
      .me()
      .then(({ user: current }) => {
        setUser(current);
        setView(current.role === 'supervisor' ? 'queue' : 'mine');
      })
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setSelectedId(null);
    setView('mine');
  }, []);

  const openReview = useCallback((id: string) => {
    setSelectedId(id);
    setView('review');
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  if (!ready) {
    return (
      <main className="shell">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <LoginView
        onSignedIn={(signedIn) => {
          setUser(signedIn);
          setView(signedIn.role === 'supervisor' ? 'queue' : 'mine');
        }}
      />
    );
  }

  const isSupervisor = user.role === 'supervisor';

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Campus Maintenance Triage</span>
        </div>
        <nav className="nav" aria-label="Main">
          {isSupervisor ? (
            <button
              type="button"
              className={view === 'queue' || view === 'review' ? 'nav-link is-active' : 'nav-link'}
              onClick={() => setView('queue')}
            >
              Queue
            </button>
          ) : (
            <>
              <button
                type="button"
                className={view === 'new' ? 'nav-link is-active' : 'nav-link'}
                onClick={() => setView('new')}
              >
                New ticket
              </button>
              <button
                type="button"
                className={view === 'mine' ? 'nav-link is-active' : 'nav-link'}
                onClick={() => setView('mine')}
              >
                My tickets
              </button>
            </>
          )}
        </nav>
        <div className="who">
          <span>
            {user.name} <span className="muted">· {user.role}</span>
          </span>
          <button type="button" className="button button-quiet" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="shell">
        {view === 'new' && (
          <NewTicketView
            onCreated={() => {
              refresh();
              setView('mine');
            }}
          />
        )}
        {view === 'mine' && <MyTicketsView key={refreshKey} onOpen={openReview} />}
        {view === 'queue' && <QueueView key={refreshKey} onOpen={openReview} />}
        {view === 'review' && selectedId && (
          <ReviewView
            ticketId={selectedId}
            role={isSupervisor ? 'supervisor' : 'reporter'}
            onBack={() => {
              refresh();
              setView(isSupervisor ? 'queue' : 'mine');
            }}
          />
        )}
      </main>
    </div>
  );
}
