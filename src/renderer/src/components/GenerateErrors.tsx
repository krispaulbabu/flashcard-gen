import './GenerateErrors.css'

/** What went wrong in the last "Generate cards" run: missing key, unreadable file, model error. */
export function GenerateErrors({ errors }: { errors?: string[] }): React.JSX.Element | null {
  if (!errors || errors.length === 0) return null
  return (
    <div className="generate-errors" role="alert">
      {errors.length === 1 ? (
        <p>{errors[0]}</p>
      ) : (
        <>
          <p>Some documents couldn’t be turned into cards:</p>
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
