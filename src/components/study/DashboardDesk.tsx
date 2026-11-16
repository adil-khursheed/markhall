import Link from 'next/link'

type Seat = {
  chapterId: number
  chapterTitle: string
  subjectName: string
  mastery: number
  attempts: number
}

type RecentMock = {
  attemptId: number
  testId: number
  title: string
  totalMarks: number | null
  score: number | null
  status: string
}

export function DashboardDesk({
  coverage,
  nextSeat,
  recentMocks,
  strong,
  weak,
}: {
  coverage: number | undefined
  nextSeat: Seat | null
  recentMocks: RecentMock[]
  strong: Seat[]
  weak: Seat[]
}) {
  return (
    <>
      <main className="main-column">
        <section className="now-seat" aria-labelledby="now-seat-title">
          <div className="now-seat-copy">
            <h1 id="now-seat-title">
              {nextSeat ? nextSeat.chapterTitle : 'No seats stamped yet'}
            </h1>
            <p className="now-seat-sub">
              {nextSeat
                ? `${nextSeat.subjectName} · mastery ${(nextSeat.mastery * 100).toFixed(0)}% across ${nextSeat.attempts} answer${nextSeat.attempts === 1 ? '' : 's'}. ${coverage ?? 0}% of your syllabus has a seat.`
                : 'Practise a chapter or sit a mock test to stamp your first seat. Your weak chapters will appear here.'}
            </p>
          </div>
          <div className="now-seat-actions">
            <Link
              className="button button-primary button-large"
              href={nextSeat ? `/practice?chapter=${nextSeat.chapterId}` : '/practice'}
            >
              {nextSeat ? 'Practise this seat' : 'Start practice'}
              <span className="button-meta">Bank questions</span>
            </Link>
            <p className="now-seat-foot">
              {nextSeat ? 'Weakest chapter by mastery' : 'Nothing attempted yet'}
            </p>
          </div>
        </section>

        <p className="dash-note">
          Real data from your attempts. Mock papers are in <Link href="/mock">Mock tests</Link>; the
          doubt tutor is in <Link href="/tutor">Ask a doubt</Link>.
        </p>
      </main>

      <aside className="right-rail" aria-label="Your progress">
        <section className="rail-card">
          <div className="rail-card-head">
            <h2>Recent mocks</h2>
            <span className="rail-count">{recentMocks.length}</span>
          </div>
          {recentMocks.length === 0 ? (
            <p className="rail-empty">
              No mock attempts yet. Published papers are waiting in{' '}
              <Link href="/mock">Mock tests</Link>.
            </p>
          ) : (
            <ul className="block-list">
              {recentMocks.map((attempt) => (
                <li key={attempt.attemptId}>
                  <Link className="block-row" href={`/mock/${attempt.testId}`}>
                    <span className="block-copy">
                      <span className="block-subject">
                        {attempt.status === 'graded' ? 'Graded' : attempt.status === 'expired' ? 'Closed' : 'Grading…'}
                      </span>
                      <span className="block-name">{attempt.title}</span>
                    </span>
                    <span className="block-time">
                      {attempt.score == null ? '—' : `${attempt.score}/${attempt.totalMarks ?? '?'}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rail-card">
          <div className="rail-card-head">
            <h2>Weak seats</h2>
            <span className="rail-count is-red">{weak.length}</span>
          </div>
          {weak.length === 0 ? (
            <div className="rail-empty">
              <p>No weak seats marked.</p>
              <p>Seats fall below 60% mastery when answers go wrong.</p>
            </div>
          ) : (
            <ul className="weak-list">
              {weak.map((seat) => (
                <li key={seat.chapterId}>
                  <Link className="weak-row" href={`/practice?chapter=${seat.chapterId}`}>
                    <span className="weak-copy">
                      <span className="weak-subject">{seat.subjectName}</span>
                      <span className="weak-name">{seat.chapterTitle}</span>
                    </span>
                    <span className="weak-lost">{(seat.mastery * 100).toFixed(0)}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {weak.length > 0 && (
            <p className="rail-footnote">
              Mastery drops with wrong answers and climbs slowly with correct ones. Tap a seat to practise it.
            </p>
          )}
        </section>

        {strong.length > 0 && (
          <section className="rail-card">
            <div className="rail-card-head">
              <h2>Strong seats</h2>
              <span className="rail-count">{strong.length}</span>
            </div>
            <ul className="block-list">
              {strong.map((seat) => (
                <li key={seat.chapterId}>
                  <Link className="block-row" href={`/practice?chapter=${seat.chapterId}`}>
                    <span className="block-copy">
                      <span className="block-subject">{seat.subjectName}</span>
                      <span className="block-name">{seat.chapterTitle}</span>
                    </span>
                    <span className="block-time">{(seat.mastery * 100).toFixed(0)}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </>
  )
}
