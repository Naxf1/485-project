import { useEffect, useState } from 'react';
import { api, type TicketWithSuggestion } from '../api';

export function QueueView({ onOpen }: { onOpen: (id: string) => void }): JSX.Element {
  const [tickets, setTickets] = useState<TicketWithSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listTickets()
      .then((result) => setTickets(result.tickets))
      .catch(() => setError('The queue could not be loaded.'));
  }, []);

  if (error) {
    return (
      <p className="alert" role="alert">
        {error}
      </p>
    );
  }

  if (!tickets) {
    return <p className="muted">Loading the queue…</p>;
  }

  const waiting = tickets.filter(
    (ticket) => ticket.status === 'New' || ticket.status === 'Triaged',
  );

  return (
    <section className="card">
      <h1>Review queue</h1>
      <p className="muted">
        {waiting.length} ticket{waiting.length === 1 ? '' : 's'} waiting for a decision. Nothing is
        assigned until you approve or edit.
      </p>

      {waiting.length === 0 ? (
        <p>The queue is empty.</p>
      ) : (
        <ul className="queue">
          {waiting.map((ticket) => (
            <li key={ticket.id} className="queue-item">
              <div className="queue-main">
                <p className="queue-title">
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => onOpen(ticket.id)}
                  >
                    {ticket.id}
                  </button>{' '}
                  {ticket.title}
                </p>
                <p className="muted">
                  {ticket.building} · {ticket.room} · reported {new Date(ticket.createdAt).toLocaleString()}
                </p>
                {ticket.suggestion && (
                  <p className="muted">Agent: {ticket.suggestion.reason}</p>
                )}
              </div>
              <div className="queue-meta">
                {ticket.suggestion ? (
                  <>
                    <span className="badge">{ticket.suggestion.category}</span>
                    <span className={`badge badge-${ticket.suggestion.priority.toLowerCase()}`}>
                      {ticket.suggestion.priority}
                    </span>
                    {ticket.suggestion.needsHuman && (
                      <span className="badge badge-warn">needs human</span>
                    )}
                  </>
                ) : (
                  <span className="badge badge-warn">no suggestion</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
