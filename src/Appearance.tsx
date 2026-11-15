import { useState } from 'react'

const appearances = [
  { id: 'rose', label: 'Rosa chá', color: '#e9a6bb' },
  { id: 'blush', label: 'Rosa bebê', color: '#f2c6dd' },
  { id: 'coral', label: 'Coral', color: '#c34237' },
] as const

export type Accent = typeof appearances[number]['id']

export function readAccent(value: unknown): Accent {
  return appearances.find(option => option.id === value)?.id ?? 'coral'
}

export function Appearance({ selected, onPreview, onSave }: {
  selected: Accent
  onPreview: (accent: Accent) => void
  onSave: (accent: Accent) => Promise<string | null>
}) {
  const [choice, setChoice] = useState(selected)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  return <form onSubmit={async event => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      setError(await onSave(choice) ?? '')
    } catch {
      setError('Não foi possível salvar a cor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }}>
    <fieldset className="appearance-options" disabled={saving}>
      <legend>Cor de destaque</legend>
      {appearances.map(option => <label key={option.id} className="appearance-option">
        <input type="radio" name="accent" checked={choice === option.id} onChange={() => {
          setChoice(option.id)
          onPreview(option.id)
          setError('')
        }}/>
        <span className="appearance-swatch" style={{ backgroundColor: option.color }} aria-hidden="true"/>
        {option.label}
      </label>)}
    </fieldset>
    {error && <p className="error-box" role="alert">{error}</p>}
    <button className="primary full" disabled={saving || choice === selected}>
      {saving ? 'salvando…' : 'salvar aparência'}
    </button>
  </form>
}
