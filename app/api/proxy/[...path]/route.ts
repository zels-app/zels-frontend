import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000'

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const search = request.nextUrl.search
  const url = `${BACKEND_URL}/${path.join('/')}${search}`

  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  const headers: HeadersInit = {}
  const contentType = request.headers.get('content-type')
  if (contentType) headers['content-type'] = contentType
  if (token) headers['authorization'] = `Bearer ${token}`

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.arrayBuffer()
      : undefined

  const backendRes = await fetch(url, {
    method: request.method,
    headers,
    body: body ? Buffer.from(body) : undefined,
  })

  if (backendRes.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const responseBody = await backendRes.arrayBuffer()

  return new NextResponse(responseBody, {
    status: backendRes.status,
    headers: {
      'content-type': backendRes.headers.get('content-type') ?? 'application/json',
    },
  })
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as DELETE,
}
