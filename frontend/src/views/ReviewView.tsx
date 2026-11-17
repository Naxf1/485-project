import { useCallback, useEffect, useState } from 'react';
import {
  CATEGORIES,
  PRIORITIES,
  api,
  ApiError,
  type Category,
  type Priority,
  type Suggestion,
  type Technician,
  type Ticket,
} from '../api';

interface Draft {
  category: Category;
  priority: Priority;
  assignedTo: string;
  draftReply: string;
}

const toDraft = (ticket: Ticket, suggestion: Suggestion | null): Draft => ({
  category: suggestion?.category ?? ticket.category ?? 'Other',
  priority: suggestion?.priority ?? ticket.priority ?? 'Medium',
  assignedTo: suggestion?.suggestedTechnician ?? ticket.assignedTo ?? '',
  draftReply: suggestion?.draftReply ?? '',
});

export function ReviewView({
  ticketId,
  role,
  onBack,
}: {
  ticketId: string;
  role: 'reporter' | 'supervisor';
  onBack: () => void;
}): JSX.Element {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api.getTicket(ticketId);
      setTicket(result.ticket);
      setSuggestion(result.suggestion);
      setDraft(toDraft(result.ticket, result.suggestion));

      if (role === 'supervisor') {
        const list = await api.technicians();
        setTechnicians(list.technicians);
      }
    } catch {
      setError('This ticket could not be loaded.');
    }
  }, [ticketId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, message: string): Promise<void> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice(message);
    } catch (caught) {
      if (caught instanceof ApiError) setError(caught.message);
      else setError('The action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (error && !ticket) {
    return (
      <p className="alert" role="alert">
        {error}
      </p>
    );
  }

  if (!ticket || !draft) {
    return <p className="muted">Loading ticket…</p>;
  }

  const canDecide =
    role === 'supervisor' && (ticket.status === 'New' || ticket.status === 'Triaged');

  return (
    <section className="card">
      <div className="row-between">
        <h1>
          {ticket.id} · {ticket.title}
        </h1>
        <button type="button" className="button button-quiet" onClick={onBack}>
          Back
        </button>
      </div>

      <p className="muted">
        {ticket.building} · {ticket.room} · reported {new Date(ticket.createdAt).toLocaleString()}
      </p>
      <p>{ticket.description}</p>

      <dl className="facts">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`badge badge-${ticket.status.toLowerCase()}`}>{ticket.status}</span>
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{ticket.category ?? '—'}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{ticket.priority ?? '—'}</dd>
        </div>
        <div>
          <dt>Assigned to</dt>
          <dd>{ticket.assignedTo ?? '—'}</dd>
        </div>
        <div>
          <dt>Duplicate of</dt>
          <dd>{ticket.duplicateOf ?? '—'}</dd>
        </div>
        <div>
          <dt>Approved by</dt>
          <dd>{ticket.approvedBy ?? '—'}</dd>
        </div>
        <div>
          <dt>Human override</dt>
          <dd>{ticket.humanOverride ? 'Yes' : 'No'}</dd>
        </div>
      </dl>

      {notice && (
        <p className="alert alert-ok" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {suggestion && (
        <section className="suggestion">
          <h2>Agent suggestion</h2>
          <p>{suggestion.reason}</p>
          <p className="muted">Draft reply: {suggestion.draftReply}</p>
          {suggestion.needsHuman && (
            <p className="alert" role="status">
              The agent flagged this ticket for a human decision.
            </p>
          )}
        </section>
      )}

      {canDecide && (
        <>
          <div className="actions">
            <button
              type="button"
              className="button"
              disabled={busy || !suggestion}
              onClick={() => void run(() => api.approve(ticket.id), 'Suggestion approved and assigned.')}
            >
              Approve suggestion
            </button>
            <span className="muted">or edit the fields below and save</span>
          </div>

          <form
            className="edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () =>
                  api.edit(ticket.id, {
                    category: draft.category,
                    priority: draft.priority,
                    assignedTo: draft.assignedTo === '' ? null : draft.assignedTo,
                    draftReply: draft.draftReply === '' ? undefined : draft.draftReply,
                  }),
                'Your changes were saved as a human override.',
              );
            }}
          >
            <div className="field-row">
              <div className="field">
                <label htmlFor="edit-category">Category</label>
                <select
                  id="edit-category"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({ ...draft, category: event.target.value as Category })
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="edit-priority">Priority</label>
                <select
                  id="edit-priority"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft({ ...draft, priority: event.target.value as Priority })
                  }
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="edit-technician">Technician</label>
                <select
                  id="edit-technician"
                  value={draft.assignedTo}
                  onChange={(event) => setDraft({ ...draft, assignedTo: event.target.value })}
                >
                  <option value="">No technician</option>
                  {technicians
                    .filter((technician) => technician.available)
                    .map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} ({technician.id})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="edit-reply">Draft reply</label>
              <textarea
                id="edit-reply"
                rows={3}
                maxLength={300}
                value={draft.draftReply}
                onChange={(event) => setDraft({ ...draft, draftReply: event.target.value })}
              />
            </div>

            <button type="submit" className="button" disabled={busy}>
              Save changes
            </button>
          </form>
        </>
      )}

      {role === 'supervisor' && ticket.status === 'Assigned' && (
        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void run(() => api.setStatus(ticket.id, 'InProgress'), 'Ticket is in progress.')}
          >
            Mark in progress
          </button>
        </div>
      )}

      {role === 'supervisor' && ticket.status === 'InProgress' && (
        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => void run(() => api.setStatus(ticket.id, 'Resolved'), 'Ticket resolved.')}
          >
            Mark resolved
          </button>
        </div>
      )}
    </section>
  );
}
