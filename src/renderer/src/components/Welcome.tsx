import './Welcome.css'

/** First-launch greeting, shown above the drop-zone only while there are no projects. */
export function Welcome(): React.JSX.Element {
  return (
    <header className="welcome">
      <h1>Welcome. Let’s brew some flashcards.</h1>
      <p>
        Add your notes, papers or textbook chapters. Retain reads them, writes you a summary, and turns the important
        parts into cards at the difficulty you choose.
      </p>
    </header>
  )
}
