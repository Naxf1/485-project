import { useState } from 'react';
import {
  BUILDINGS,
  api,
  ApiError,
  type NewTicketInput,
  type Suggestion,
} from '../api';

const EMPTY: NewTicketInput = { title: '', description: '', building: '', room: '' };

export function NewTicketView({ onCreated }: { onCreated: () => void }): JSX.Element {
  const [form, setForm] = useState<NewTicketInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (field: keyof NewTicketInput) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setSuggestion(null);

    try {
      const result = await api.createTicket(form);
      setSuggestion(result.suggestion);
      setTicketId(result.ticket.id);
      setForm(EMPTY);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(
          Object.keys(error.fieldErrors).length > 0
            ? error.fieldErrors
            : { _form: error.message },
        );
      } else {
        setErrors({ _form: 'The ticket could not be submitted.' });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h1>Report a problem</h1>
      <p className="muted">
        The triage agent suggests a category, a priority and a technician. A supervisor
        approves the suggestion before anything is assigned.
      </p>

      <form onSubmit={(event) => void submit(event)} noValidate>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={form.title}
            onChange={(event) => update('title')(event.target.value)}
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'title-error' : undefined}
            maxLength={80}
            required
          />
          {errors.title && (
            <p className="field-error" id="title-error">
              {errors.title}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(event) => update('description')(event.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? 'description-error' : undefined}
            rows={4}
            maxLength={1000}
            required
          />
          {errors.description && (
            <p className="field-error" id="description-error">
              {errors.description}
            </p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="building">Building</label>
            <select
              id="building"
              value={form.building}
              onChange={(event) => update('building')(event.target.value)}
              aria-invalid={errors.building ? true : undefined}
              aria-describedby={errors.building ? 'building-error' : undefined}
              required
            >
              <option value="">Choose a building</option>
              {BUILDINGS.map((building) => (
                <option key={building} value={building}>
                  {building}
                </option>
              ))}
            </select>
            {errors.building && (
              <p className="field-error" id="building-error">
                {errors.building}
              </p>
            )}
          </div>

          <div className="field">
            <label htmlFor="room">Room</label>
            <input
              id="room"
              value={form.room}
              onChange={(event) => update('room')(event.target.value)}
              placeholder="2A-15"
              aria-invalid={errors.room ? true : undefined}
              aria-describedby={errors.room ? 'room-error' : undefined}
              required
            />
            {errors.room && (
              <p className="field-error" id="room-error">
                {errors.room}
              </p>
            )}
          </div>
        </div>

        {errors._form && (
          <p className="alert" role="alert">
            {errors._form}
          </p>
        )}

        <button type="submit" className="button" disabled={busy}>
          {busy ? 'Triaging…' : 'Submit ticket'}
        </button>
      </form>

      {suggestion && ticketId && (
        <section className="suggestion" aria-live="polite">
          <h2>Agent suggestion for {ticketId}</h2>
          <dl className="facts">
            <div>
              <dt>Category</dt>
              <dd>{suggestion.category}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{suggestion.priority}</dd>
            </div>
            <div>
              <dt>Technician</dt>
              <dd>{suggestion.suggestedTechnician ?? 'None suggested'}</dd>
            </div>
            <div>
              <dt>Possible duplicate</dt>
              <dd>{suggestion.possibleDuplicateOf ?? 'None'}</dd>
            </div>
          </dl>
          <p>{suggestion.reason}</p>
          <p className="muted">{suggestion.draftReply}</p>
          {suggestion.needsHuman && (
            <p className="alert" role="status">
              The agent is unsure, so a supervisor must review this ticket.
            </p>
          )}
          <button type="button" className="button button-quiet" onClick={onCreated}>
            Back to my tickets
          </button>
        </section>
      )}
    </section>
  );
}
