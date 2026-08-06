import { describe, it, expect } from 'vitest'
import { idlePingReducer, type IdlePingState } from './use-idle-ping'

const IDLE_MS = 12 * 60 * 1000

function state(overrides: Partial<IdlePingState> = {}): IdlePingState {
  return { lastActive: 0, idle: false, ...overrides }
}

describe('idlePingReducer', () => {
  it('stays not-idle while under the threshold', () => {
    const next = idlePingReducer(state({ lastActive: 0 }), { type: 'tick', at: IDLE_MS - 1 })
    expect(next.idle).toBe(false)
  })

  it('becomes idle once the threshold is reached', () => {
    const next = idlePingReducer(state({ lastActive: 0 }), { type: 'tick', at: IDLE_MS })
    expect(next.idle).toBe(true)
  })

  it('activity resets lastActive without forcing idle in either direction', () => {
    const idleState = idlePingReducer(state({ lastActive: 0 }), { type: 'tick', at: IDLE_MS })
    expect(idleState.idle).toBe(true)
    const afterActivity = idlePingReducer(idleState, { type: 'activity', at: IDLE_MS })
    expect(afterActivity.lastActive).toBe(IDLE_MS)
    // idle is still true here; the next tick is what recomputes it as false.
    expect(afterActivity.idle).toBe(true)
    const recomputed = idlePingReducer(afterActivity, { type: 'tick', at: IDLE_MS + 1 })
    expect(recomputed.idle).toBe(false)
  })

  it('stay immediately clears idle', () => {
    const idleState = idlePingReducer(state({ lastActive: 0 }), { type: 'tick', at: IDLE_MS })
    expect(idleState.idle).toBe(true)
    const stayed = idlePingReducer(idleState, { type: 'stay' })
    expect(stayed.idle).toBe(false)
  })

  it('re-arms for a new idle period after being dismissed with Stay (regression)', () => {
    // First idle period: 12 minutes pass, banner should show.
    let s = idlePingReducer(state({ lastActive: 0 }), { type: 'tick', at: IDLE_MS })
    expect(s.idle).toBe(true)

    // User clicks Stay. The click's own pointerdown reports activity first
    // (bubbles to the window listener before the click handler runs), then
    // the click handler dispatches "stay".
    s = idlePingReducer(s, { type: 'activity', at: IDLE_MS })
    s = idlePingReducer(s, { type: 'stay' })
    expect(s.idle).toBe(false)

    // A second full idle period passes with zero further activity. The
    // banner must be able to show again: this is the bug the previous
    // "dismissed" flag design broke, because dismissed only ever got
    // cleared by a fresh activity event, and there is none here.
    s = idlePingReducer(s, { type: 'tick', at: IDLE_MS + IDLE_MS })
    expect(s.idle).toBe(true)
  })

  it('unknown action is a no-op', () => {
    const s = state({ lastActive: 5, idle: true })
    // @ts-expect-error intentionally invalid action to exercise the default branch
    expect(idlePingReducer(s, { type: 'bogus' })).toBe(s)
  })
})
