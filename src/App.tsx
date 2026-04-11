import { useState } from 'react'
import './App.css'
import TreeSketch from './TreeSketch.tsx'
import { calculateSQS } from './sqs.ts'
import { triggerEndSession } from './sketch.ts'

function App() {
  const [totalHours, setTotalHours] = useState(8)
  const [sqs, setSqs] = useState(0.7)

  const handleEndSession = () => {
    // Example session data
    const session = {
      durationMinutes: 30,
      uninterruptedMinutes: 25,
      stillnessScore: 0.8,
      moodBefore: 3,
      moodAfter: 4,
      distractionCount: 2,
      distractionSeconds: 60
    }
    const history = {
      recentSQS: [0.6, 0.65],
      sessionsLast7Days: 3,
      totalHours: totalHours
    }
    const newSqs = calculateSQS(session, history)
    const newHours = totalHours + 0.5
    setSqs(newSqs)
    setTotalHours(newHours)
    triggerEndSession(newHours, session.durationMinutes / 60)
  }

  return (
    <>
      <section id="center">
        <div className="hero">
          <h1>Stillgrove</h1>
          <TreeSketch totalHours={totalHours} sqs={sqs} />
        </div>
        <div>
          <h2>Session Quality Score: {sqs.toFixed(2)}</h2>
          <button onClick={handleEndSession}>
            End Session (+0.5 hours)
          </button>
        </div>
      </section>
    </>
  )
}

export default App
