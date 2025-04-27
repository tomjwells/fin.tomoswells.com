import { tg } from '~/utils/telegram'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ errorMsg: string[] }> } ) {
  const { errorMsg } = await params
  void tg.error('Error in MPTPage', errorMsg)
  return Response.json({ res: 'ok' })
}
