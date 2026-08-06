type Ctx = { params: Promise<{ path: string[] }> }

async function forward(req: Request, ctx: Ctx) {
  const { path } = await ctx.params
  const url = `${process.env.API_URL}/api/v1/auth/${path.join("/")}`

  const headers = new Headers()
  const passthrough = ["content-type", "authorization", "cookie", "accept"]
  for (const h of passthrough) {
    const v = req.headers.get(h)
    if (v) headers.set(h, v)
  }

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "manual",
  })

  const resHeaders = new Headers()
  const contentType = upstream.headers.get("content-type")
  if (contentType) resHeaders.set("content-type", contentType)
  for (const cookie of upstream.headers.getSetCookie()) {
    resHeaders.append("set-cookie", cookie)
  }
  return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE }
