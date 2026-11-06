import Link from 'next/link'

import { Wordmark } from '@/components/brand/Wordmark'
import { HairlinePlate } from '@/components/landing/HairlinePlate'
import { StoryPlate } from '@/components/landing/StoryPlate'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const coverage = [
  { label: 'Number Systems', seat: '01', state: 'present' },
  { label: 'Algebra', seat: '02', state: 'present' },
  { label: 'Democracy and Citizenship', seat: '03', state: 'weak' },
  { label: 'Chemical reactions', seat: '04', state: 'present' },
  { label: 'Cell cycle', seat: '05', state: 'next' },
  { label: 'English paper 1', seat: '06', state: 'empty' },
  { label: 'Maps and topography', seat: '07', state: 'empty' },
  { label: 'Hindi / regional', seat: '08', state: 'empty' },
]

const beats = [
  {
    ariaLabel:
      'Roll call: twelve numbered tags on a board. Move across the tags to pull one and read its seat.',
    body: 'Every chapter holds a numbered seat. The roll call is the syllabus, laid out in one room.',
    figureName: 'roll',
    figureTitle: 'Roll call',
    hint: 'Move across the tags',
    readLabel: 'Roll call',
    title: 'A desk for the whole syllabus.',
  },
  {
    ariaLabel:
      'Sitting: a desk with a clock and answer paper. Move across the desk to fill the paper and run the clock.',
    body: 'A chapter sets the paper, a clock runs the sitting, and the answer fills line by line.',
    figureName: 'sitting',
    figureTitle: 'Sitting',
    hint: 'Move across the desk',
    readLabel: 'Sitting',
    title: 'One sitting, start to mark.',
  },
  {
    ariaLabel:
      'Register: an open mark book. Run the pointer down the rows to lift a paper tab and show its mark.',
    body: "The examiner's mark book keeps the reason and points to the next seat to revise.",
    figureName: 'register',
    figureTitle: 'Register',
    hint: 'Run down the rows',
    readLabel: 'Register',
    title: 'Marks that say where to go next.',
  },
] as const

const failures = [
  { mark: '2 / 3', note: 'Named the process, missed the condition.' },
  { mark: '0 / 2', note: 'No working shown, so no method marks.' },
  { mark: '4 / 4', note: 'Full mark, clean method.' },
]

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-topbar">
        <Link className="wordmark-link" href="/">
          <Wordmark />
        </Link>
        <p className="landing-topline">Class 9–10 · All boards · Revision desk</p>
        <nav aria-label="Landing navigation" className="landing-topnav">
          <Link className="landing-nav-link" href="#how">
            The method
          </Link>
          <Link className="landing-nav-link" href="#coverage">
            Coverage
          </Link>
          <Link className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))} href="/login">
            Sign in
          </Link>
        </nav>
      </header>

      <section aria-labelledby="landing-title" className="landing-hero">
        <div className="landing-margin">
          <h1 id="landing-title">Every chapter has a seat. Take yours.</h1>
          <p className="landing-lede">
            Markhall turns any Class 9–10 syllabus into an exam hall. Choose a numbered seat,
            answer a short paper, and get the marks and notes that tell you where to sit next.
          </p>
          <div className="landing-hero-actions">
            <Link
              className={cn(buttonVariants({ size: 'lg' }))}
              href="/login?mode=signup"
            >
              Create account
            </Link>
            <Link className="landing-text-link" href="#how">
              See the method
            </Link>
          </div>
          <p className="landing-smallprint">
            Free to start. Synthetic sample questions are labelled throughout.
          </p>
        </div>

        <figure className="landing-plate">
          <div className="landing-plate-head">
            <span className="landing-plate-label">Roll call · Today&apos;s desk</span>
            <span>Move across the cards</span>
          </div>
          <HairlinePlate play />
          <figcaption>
            Eight seats. The card under your pointer is the chapter you revise next.
          </figcaption>
        </figure>

        <aside aria-label="Start a revision session" className="landing-action">
          <h2>Start with one seat, not the whole syllabus.</h2>
          <ol className="landing-action-list">
            <li>Pick a chapter seat.</li>
            <li>Answer examiner-style questions.</li>
            <li>Get marks, notes, and the next seat.</li>
          </ol>
          <Link
            className={cn(buttonVariants({ className: 'w-full' }))}
            href="/login?mode=signup"
          >
            Take your seat
          </Link>
          <p className="landing-action-note">
            Already on the roll? <Link href="/login">Sign in</Link>
          </p>
        </aside>
      </section>

      <section className="landing-section" id="how">
        <div className="landing-section-head">
          <div>
            <h2>What it is. How it runs. Why it moves the mark.</h2>
          </div>
          <p className="landing-section-note">
            Three views of the same desk. Move the pointer over each.
          </p>
        </div>
        <div className="landing-story">
          {beats.map((beat) => (
            <StoryPlate key={beat.figureName} {...beat} />
          ))}
        </div>
      </section>

      <section className="landing-section landing-two-up" id="feedback">
        <div>
          <h2>Marks that say where they went.</h2>
          <p className="landing-section-lede">
            Every answer comes back with the mark, the reason, and the line that earned it. The
            weak seats on your roll are the ones to revisit.
          </p>
          <ul className="landing-marks">
            {failures.map((failure) => (
              <li key={failure.mark}>
                <span>{failure.mark}</span>
                <p>{failure.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="landing-sample">
          <div className="landing-sample-top">
            <p className="landing-sample-label">Sample · not a real attempt</p>
            <Badge variant="outline">Marked</Badge>
          </div>
          <div className="landing-sample-row">
            <span>Question 4 · Chemistry</span>
            <span className="landing-sample-mark">2 / 3</span>
          </div>
          <p>
            You named the process but did not state the condition. The equation is balanced and the
            observation is in the right order.
          </p>
          <div className="landing-sample-rule" />
          <p className="landing-sample-note">Examiner note · Add the condition for the third mark.</p>
        </div>
      </section>

      <section className="landing-section" id="coverage">
        <div className="landing-section-head">
          <div>
            <h2>The roll call is the progress bar.</h2>
          </div>
          <p className="landing-section-note">A filled seat is a chapter you can hold under exam pressure.</p>
        </div>
        <div className="landing-roll" aria-label="Sample syllabus coverage">
          {coverage.map((seat) => (
            <div className={`landing-roll-seat is-${seat.state}`} key={seat.seat}>
              <span>{seat.seat}</span>
              <span className="landing-roll-label">{seat.label}</span>
              <span aria-hidden="true" className="landing-roll-mark" />
            </div>
          ))}
        </div>
        <p className="landing-sample-note">Sample coverage · not your roll</p>
      </section>

      <section className="landing-section landing-cta">
        <h2>The hall is open.</h2>
        <p>Create an account and take the first seat. Your roll waits on this device.</p>
        <Link className={cn(buttonVariants({ size: 'lg' }))} href="/login?mode=signup">
          Create account
        </Link>
      </section>

      <footer className="landing-footer">
        <p>
          Markhall · A revision desk for Class 9–10
          <br />
          Every chapter has a seat. Every answer earns its mark.
        </p>
        <nav aria-label="Footer">
          <Link href="/login">Sign in</Link>
          <Link href="/login?mode=signup">Create account</Link>
        </nav>
        <p>Not affiliated with any examination board.</p>
      </footer>
    </main>
  )
}
