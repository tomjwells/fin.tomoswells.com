import { z } from 'zod'
import { tg } from '~/utils/telegram'

export const runtime = 'nodejs'            

const payloadSchema = z.object({
  type: z.enum(['ERROR', 'SUCCESS']),
  message: z.string(),
})

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json())

    if (payload.type === 'ERROR') {
      await tg.error('MPTPage', payload.message)
    } else {
      await tg.success('MPTPage', payload.message)
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('TG route error:', err)
    return new Response('Invalid payload', { status: 400 })
  }
}
