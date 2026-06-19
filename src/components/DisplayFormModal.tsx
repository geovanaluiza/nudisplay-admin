import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { EMPTY_DISPLAY_FORM, type Display, type DisplayFormData } from '../types/display'
import { createDisplay, updateDisplay } from '../services/displays'
import { logEvent } from '../services/events'
import {
  IconExternal, IconAlert,
} from './icons'

type Mode =
  | { kind: 'closed' }
  | { kind: 'add' }
  | { kind: 'edit'; display: Display }

type Props = {
  mode: Mode
  onClose: () => void
  onSaved: () => void
}

export function DisplayFormModal({ mode, onClose, onSaved }: Props) {
  const isEdit = mode.kind === 'edit'
  const editingDisplay = isEdit ? mode.display : null

  const [form, setForm] = useState<DisplayFormData>(EMPTY_DISPLAY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (editingDisplay) {
      setForm({
        name: editingDisplay.name,
        location: editingDisplay.location,
        orientation: editingDisplay.orientation ?? '',
        notes: editingDisplay.notes ?? '',
        public_url: editingDisplay.public_url,
      })
    } else {
      setForm(EMPTY_DISPLAY_FORM)
    }
    setError(null)
    setTouched(false)
  }, [editingDisplay, mode.kind])

  if (mode.kind === 'closed') return null

  const setField =
    <K extends keyof DisplayFormData>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const fieldsValid =
    form.name.trim().length > 0 &&
    form.location.trim().length > 0 &&
    form.public_url.trim().length > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!fieldsValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (isEdit && editingDisplay) {
        await updateDisplay(editingDisplay.id, form)
        await logEvent('command_sent', {
          displayId: editingDisplay.id,
          message: `Display edited: ${form.name}`,
        })
      } else {
        const created = await createDisplay(form)
        await logEvent('command_sent', {
          displayId: created.id,
          message: `Display added: ${form.name}`,
        })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save display')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Display' : 'Add Display'}
      subtitle={
        isEdit
          ? `Update the configuration for ${editingDisplay?.name ?? ''}.`
          : 'Register a new kiosk. It will appear in the dashboard immediately.'
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field
          label="Display name"
          required
          error={touched && form.name.trim().length === 0 ? 'Name is required' : null}
        >
          <input
            type="text"
            value={form.name}
            onChange={setField('name')}
            placeholder="Barton Left Arrow"
            className="nu-input"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Location"
            required
            error={touched && form.location.trim().length === 0 ? 'Location is required' : null}
          >
            <input
              type="text"
              value={form.location}
              onChange={setField('location')}
              placeholder="Barton Hall · 2nd Floor"
              className="nu-input"
            />
          </Field>
          <Field label="Orientation">
            <input
              type="text"
              value={form.orientation}
              onChange={setField('orientation')}
              placeholder="Left arrow"
              className="nu-input"
            />
          </Field>
        </div>

        <Field label="Public URL" required>
          <div className="relative">
            <input
              type="url"
              value={form.public_url}
              onChange={setField('public_url')}
              placeholder="https://display-barton-left-arrow.vercel.app"
              className="nu-input pr-10"
            />
            {form.public_url && (
              <a
                href={form.public_url}
                target="_blank"
                rel="noreferrer noopener"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nu-skylight hover:text-nu-tour transition-colors"
                aria-label="Open URL in a new tab"
              >
                <IconExternal size={14} />
              </a>
            )}
          </div>
        </Field>

        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={setField('notes')}
            placeholder="Optional context for staff (e.g. '2nd floor lobby, points visitors to Admissions on the left')."
            className="nu-input min-h-[80px] resize-y"
            rows={3}
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 text-[13px] text-nu-amber bg-nu-amber/10 border border-nu-amber/30 rounded-glass px-4 py-3">
            <IconAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!fieldsValid || submitting}
          >
            {submitting
              ? isEdit ? 'Saving…' : 'Adding…'
              : isEdit ? 'Save changes' : 'Add display'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label, required, error, children,
}: {
  label: string
  required?: boolean
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.22em] uppercase text-nu-skylight/80 mb-1.5">
        {label}{required && <span className="text-nu-tour ml-1">*</span>}
      </span>
      {children}
      {error && (
        <span className="block mt-1.5 text-[12px] text-nu-amber">{error}</span>
      )}
    </label>
  )
}
