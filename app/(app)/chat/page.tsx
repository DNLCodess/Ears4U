'use client'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useReducedMotion } from 'motion/react'
import { getChatHistory, sendChat } from '@/lib/api/endpoints'
import { qk } from '@/lib/query/keys'
import type { ChatMessage } from '@/lib/api/types'
import { Lifeline } from '@/components/lifeline'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'

const WELCOME = "This space is yours. Say whatever is on your mind, I'm listening."
const GAP_MS = 10 * 60 * 1000

type PendingMessage = { id: string; content: string; status: 'pending' | 'failed' }

function normalizeRole(role: string): 'user' | 'assistant' | null {
  const r = role.trim().toLowerCase()
  if (r === 'user') return 'user'
  if (r === 'assistant') return 'assistant'
  return null
}

function formatTimestamp(iso: string, now: Date): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ''
  const sameDay = at.toDateString() === now.toDateString()
  const time = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return sameDay ? time : `${at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
}

function SproutIndicator({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div
      role="status"
      aria-label="Listening"
      className="flex w-fit items-center gap-1.5 self-start rounded-2xl rounded-bl-sm border-[1.5px]
        border-fir/15 bg-card px-3.5 py-3.5"
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-[7px] w-[7px] rounded-full bg-leaf"
          style={
            reduceMotion
              ? { opacity: 0.7 }
              : { animation: `sprout-bounce 1.2s ${i * 0.18}s infinite ease-in-out` }
          }
        />
      ))}
    </div>
  )
}

function Composer({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Say what's on your mind"
        aria-label="Message"
        className="h-11 min-w-0 flex-1 rounded-full border-[1.5px] border-fir/30 bg-card px-4 text-[15px]
          outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/25"
      />
      <button
        type="submit"
        disabled={disabled || text.trim().length === 0}
        aria-label="Send"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br
          from-leaf-bright to-leaf text-white shadow-lg shadow-leaf/30 transition active:scale-[.98]
          disabled:opacity-50 disabled:pointer-events-none
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </form>
  )
}

function ChatSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-5 py-6 lg:px-6">
      <Skeleton lines={2} className="max-w-[70%]" />
      <Skeleton lines={2} className="ml-auto max-w-[70%]" />
      <Skeleton lines={2} className="max-w-[70%]" />
    </div>
  )
}

export default function ChatPage() {
  const queryClient = useQueryClient()
  const reduceMotion = !!useReducedMotion()
  const [pending, setPending] = useState<PendingMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const history = useQuery({ queryKey: qk.chat, queryFn: getChatHistory })

  const send = useMutation({
    mutationFn: ({ text }: { id: string; text: string }) => sendChat(text),
    onSuccess: (data, variables) => {
      setPending(p => p.filter(m => m.id !== variables.id))
      const reply = data && (data.response ?? data.message)
      if (typeof reply === 'string' && reply.length > 0) {
        queryClient.setQueryData<ChatMessage[]>(qk.chat, old => [
          ...(old ?? []),
          { content: variables.text, role: 'User', timestamp: new Date().toISOString() },
          { content: reply, role: 'Assistant', timestamp: new Date().toISOString() },
        ])
      } else {
        void queryClient.invalidateQueries({ queryKey: qk.chat })
      }
    },
    onError: (_err, variables) => {
      setPending(p => p.map(m => (m.id === variables.id ? { ...m, status: 'failed' } : m)))
    },
  })

  function sendMessage(text: string, retryId?: string) {
    const id = retryId ?? crypto.randomUUID()
    setPending(p =>
      retryId
        ? p.map(m => (m.id === retryId ? { ...m, status: 'pending' } : m))
        : [...p, { id, content: text, status: 'pending' }]
    )
    send.mutate({ id, text })
  }

  const messages = (history.data ?? [])
    .filter(m => normalizeRole(m.role) !== null)
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  const isEmpty = messages.length === 0 && pending.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, pending.length])

  if (history.isError && !history.data) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 lg:px-6">
        <ErrorState error={history.error} retry={() => void history.refetch()} />
      </div>
    )
  }
  if (history.isLoading) return <ChatSkeleton />

  const now = new Date()
  const hasPendingSend = pending.some(m => m.status === 'pending')

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-5 pb-4 pt-6 lg:px-6">
      <h1 className="sr-only">Chat</h1>

      <div className="flex flex-col gap-3 pb-4">
        {isEmpty ? (
          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm border-[1.5px] border-fir/15
            bg-card px-4 py-3 text-[15px] leading-relaxed">
            {WELCOME}
          </div>
        ) : null}

        {messages.map((m, i) => {
          const role = normalizeRole(m.role)
          const prev = messages[i - 1]
          const showTimestamp =
            i === 0 || !prev || new Date(m.timestamp).getTime() - new Date(prev.timestamp).getTime() > GAP_MS
          return (
            <div key={`${m.timestamp}-${i}`} className="flex flex-col gap-1">
              {showTimestamp ? (
                <p className={`text-[11px] opacity-50 ${role === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTimestamp(m.timestamp, now)}
                </p>
              ) : null}
              <div
                className={
                  role === 'user'
                    ? 'max-w-[85%] self-end rounded-2xl rounded-br-sm bg-fir px-4 py-3 text-[15px]'
                      + ' leading-relaxed text-oat'
                    : 'max-w-[85%] self-start rounded-2xl rounded-bl-sm border-[1.5px] border-fir/15 bg-card'
                      + ' px-4 py-3 text-[15px] leading-relaxed'
                }
              >
                {m.content}
              </div>
            </div>
          )
        })}

        {pending.map(m => (
          <div key={m.id} className="flex flex-col gap-2">
            <div
              className={`max-w-[85%] self-end rounded-2xl rounded-br-sm bg-fir px-4 py-3 text-[15px]
                leading-relaxed text-oat ${m.status === 'failed' ? 'opacity-60' : ''}`}
            >
              {m.content}
            </div>
            {m.status === 'failed' ? (
              <button
                type="button"
                onClick={() => sendMessage(m.content, m.id)}
                className="inline-flex min-h-11 items-center self-end text-[13px] text-clay underline
                  underline-offset-4
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fir"
              >
                Not sent. Tap to retry.
              </button>
            ) : (
              <SproutIndicator reduceMotion={reduceMotion} />
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+96px)] z-20 flex flex-col gap-2
        bg-oat/95 pb-2 pt-1 backdrop-blur lg:sticky lg:bottom-4">
        <Lifeline />
        <Composer disabled={hasPendingSend} onSend={sendMessage} />
      </div>
    </div>
  )
}
