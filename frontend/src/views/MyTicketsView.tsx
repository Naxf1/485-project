import { useEffect, useState } from 'react';
import { api, type TicketWithSuggestion } from '../api';

const formatDate = (iso: string): string => new Date(iso).toLocaleString();

export function MyTicketsView({
  onOpen,
}: {
  onOpen: (id: string) => void;
}): JSX.Element {
  const [tickets, setTickets] = useState<TicketWithSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listTickets()
      .then((result) => setTickets(result.tickets))
      .catch(() => setError('Your tickets could not be loaded.'));
  }, []);

  if (error) {
    return (
      <p className="alert" role="alert">
        {error}
      </p>
    );
  }

  if (!tickets) {
    return <p className="muted">Loading tickets…</p>;
  }

  if (tickets.length === 0) {
    return (
      <section className="card">
        <h1>My tickets</h1>
        <p className="muted">You have not reported anything yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>My tickets</h1>
      <table className="table">
        <caption className="visually-hidden">Your reported tickets and their status</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            <th scope="col">Category</th>
            <th scope="col">Priority</th>
            <th scope="col">Reported</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>
                <button type="button" className="link-button" onClick={() => onOpen(ticket.id)}>
                  {ticket.id}
                </button>
              </td>
              <td>{ticket.title}</td>
              <td>
                <span className={`badge badge-${ticket.status.toLowerCase()}`}>
                  {ticket.status}
                </span>
              </td>
              <td>{ticket.category ?? '—'}</td>
              <td>{ticket.priority ?? '—'}</td>
              <td>{formatDate(ticket.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
