type Opts = { method?: string; body?: unknown }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function adminMockFetch<T>(_path: string, _opts: Opts = {}): Promise<T> {
  throw new Error('adminMockFetch not yet implemented (Task 2)')
}
