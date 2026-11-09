import { useId, useState, type InputHTMLAttributes } from 'react'
import { IconButton } from './Button'
import './TextField.css'

interface BaseProps {
  label: string
  hint?: string
  /** Replaces the hint in the danger colour and marks the field invalid. */
  error?: string
  /** Replaces the hint in the success colour (e.g. "Key verified"). */
  success?: string
  /** Monospace text — API keys, model ids, URLs. */
  mono?: boolean
  className?: string
}

type InputProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & { options?: undefined }
type SelectProps = BaseProps & {
  /** Renders a select instead of an input. */
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function TextField(props: InputProps | SelectProps): React.JSX.Element {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const { label, hint, error, success, mono, className } = props
  const message = error ?? success ?? hint
  const status = error ? 'field-error' : success ? 'field-ok' : undefined
  const describedBy = message ? `${id}-hint` : undefined

  let control: React.JSX.Element
  let isSecret = false
  if (props.options) {
    const { options, value, onChange } = props
    control = (
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { label: _l, hint: _h, error: _e, success: _s, mono: _m, className: _c, options: _o, type, ...rest } = props
    isSecret = type === 'password'
    control = (
      <input
        id={id}
        type={isSecret && revealed ? 'text' : type}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        spellCheck={mono ? false : undefined}
        autoComplete="off"
        {...rest}
      />
    )
  }

  return (
    <div className={['field', mono && 'field-mono', status, className].filter(Boolean).join(' ')}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={['field-box', props.options && 'field-box-select'].filter(Boolean).join(' ')}>
        {control}
        {isSecret && (
          <IconButton
            icon={revealed ? 'eyeOff' : 'eye'}
            label={revealed ? 'Hide key' : 'Show key'}
            aria-pressed={revealed}
            onClick={() => setRevealed((r) => !r)}
          />
        )}
      </div>
      {message && (
        <span className="field-hint" id={`${id}-hint`}>
          {message}
        </span>
      )}
    </div>
  )
}
