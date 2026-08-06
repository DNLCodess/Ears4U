'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getStreak, logMood } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { DashboardHome } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { MoodSlider } from '@/components/checkin/mood-slider'
import { Celebration } from '@/components/checkin/celebration'

const MOODS = ['Calm', 'Restless', 'Drained', 'Hopeful', 'Heavy', 'Numb', 'Fine, actually']
const CUSTOM_MAX = 24

const CHIP = `rounded-full border-[1.5px] px-4 py-[9px] text-sm font-medium transition
  shadow-[0_1px_0_rgba(34,55,43,.05)] active:scale-[.98]
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir`
const CHIP_OFF = 'border-fir/22 bg-card'
const CHIP_ON = 'border-fir bg-fir text-oat shadow-[0_6px_16px_rgba(34,55,43,.3)]'

function CloseButton() {
  return (
    <Link
      href="/home"
      aria-label="Close check-in"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-fir/8 text-fir
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" className="h-[17px] w-[17px]" aria-hidden>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </Link>
  )
}

function Step({ n }: { n: 1 | 2 }) {
  return <p className="text-xs font-semibold text-leaf">Check-in · {n} of 2</p>
}

export default function CheckinPage() {
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()
  const slide = !reduceMotion

  const [beat, setBeat] = useState<1 | 2>(1)
  const [mood, setMood] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const [moodIntensity, setMoodIntensity] = useState(5)
  const [stressLevel, setStressLevel] = useState(5)
  const [energyLevel, setEnergyLevel] = useState(5)
  const [streak, setStreak] = useState<number | null>(null)

  const primaryMood = (customOpen ? custom : mood).trim()

  const log = useMutation({
    mutationFn: () => logMood({ primaryMood, moodIntensity, stressLevel, energyLevel }),
    onSuccess: async () => {
      // Read before invalidating, so the fallback is the streak as it stood
      // before today's check-in.
      const before = queryClient.getQueryData<DashboardHome>(qk.dashboard)?.currentStreak ?? 0
      void queryClient.invalidateQueries({ queryKey: qk.dashboard })
      void queryClient.invalidateQueries({ queryKey: qk.insights })
      void queryClient.invalidateQueries({ queryKey: qk.streak })
      // The celebration wants the freshly bumped number, so the streak is read
      // straight from the server rather than waiting on the invalidated query.
      const fresh = await getStreak().catch(() => null)
      setStreak(typeof fresh === 'number' ? fresh : before + 1)
    },
  })

  function pick(word: string) {
    setMood(word)
    setCustomOpen(false)
    setCustom('')
    setBeat(2)
  }

  if (streak !== null) return <Celebration streak={streak} />

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-oat">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-10 pt-5">
        <div className="flex justify-end">
          <CloseButton />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={beat}
            initial={slide ? { opacity: 0, x: 24 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={slide ? { opacity: 0, x: -24 } : { opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex flex-1 flex-col gap-[18px] pt-3"
          >
            {beat === 1 ? (
              <>
                <div className="space-y-1.5">
                  <Step n={1} />
                  <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em]">
                    {"How's today?"}
                  </h1>
                  <p className="text-[13.5px] opacity-65">
                    Pick the word that fits closest. There is no wrong one.
                  </p>
                </div>

                <div className="flex flex-wrap gap-[9px]">
                  {MOODS.map(word => (
                    <button
                      key={word}
                      type="button"
                      aria-pressed={mood === word}
                      onClick={() => pick(word)}
                      className={`${CHIP} ${mood === word ? CHIP_ON : CHIP_OFF}`}
                    >
                      {word}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={customOpen}
                    aria-expanded={customOpen}
                    onClick={() => { setCustomOpen(true); setMood('') }}
                    className={`${CHIP} ${customOpen ? CHIP_ON : CHIP_OFF}`}
                  >
                    Add your own
                  </button>
                </div>

                {customOpen ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">Your word for today</span>
                      <input
                        autoFocus
                        value={custom}
                        maxLength={CUSTOM_MAX}
                        onChange={e => setCustom(e.target.value.slice(0, CUSTOM_MAX))}
                        placeholder="Tender, wired, quietly ok"
                        className="w-full rounded-xl border-[1.5px] border-fir/30 bg-card px-4 py-3 text-[15px]
                          outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
                      />
                    </label>
                    <p className="text-xs opacity-55">{custom.length} of {CUSTOM_MAX} characters</p>
                    <Button
                      className="w-full"
                      disabled={custom.trim().length === 0}
                      onClick={() => setBeat(2)}
                    >
                      Continue
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Step n={2} />
                  <h1 className="font-display text-3xl font-semibold leading-[1.05] tracking-[-0.02em]">
                    {"Where's it sitting in your body?"}
                  </h1>
                  <p className="text-[13.5px] opacity-65">
                    {primaryMood ? `${primaryMood}, today.` : 'Today.'} Move each one to where it feels true.
                  </p>
                </div>

                <div className="space-y-3">
                  <MoodSlider label="How strong is it?" color="leaf" value={moodIntensity} onChange={setMoodIntensity} />
                  <MoodSlider label="Stress" color="clay" value={stressLevel} onChange={setStressLevel} />
                  <MoodSlider label="Energy" color="marigold" value={energyLevel} onChange={setEnergyLevel} />
                </div>

                {log.isError ? (
                  <ErrorState error={log.error} retry={() => log.mutate()} />
                ) : null}

                <div className="mt-auto space-y-3 pt-2">
                  <Button
                    className="w-full py-4 text-[17px]"
                    busy={log.isPending}
                    disabled={log.isPending || primaryMood.length === 0}
                    onClick={() => log.mutate()}
                  >
                    Log today
                  </Button>
                  <p className="text-center text-[13.5px] opacity-65">
                    This waters the streak. 20 seconds, no wrong answers.
                  </p>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setBeat(1)}
                      disabled={log.isPending}
                      className="text-sm underline underline-offset-4 opacity-70 disabled:opacity-40"
                    >
                      Back to the word
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
