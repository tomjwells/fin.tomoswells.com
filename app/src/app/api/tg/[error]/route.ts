import { tg } from '~/utils/telegram'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: { error: string } }) {
  tg.error('Error in MPTPage', params.error)
  return Response.json({ res: 'ok' })
}
