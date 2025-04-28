import '~/styles/globals.css'
import '@radix-ui/themes/styles.css'

import { Tabs, TabsList, TabsTrigger } from '~/shadcn/Tabs'

import { Inter } from 'next/font/google'

import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

import { Callout, Container, Flex, Theme } from '@radix-ui/themes'
import { env } from '~/env'
import { InfoCircledIcon } from '@radix-ui/react-icons'

export const runtime = 'edge'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata = {
  title: 'Financial Mathematics Tools',
  description: 'Quantitative Finance Tools - created by TJW',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='dark' style={{ colorScheme: 'dark' }}>
      {/* <body className={`font-sans ${inter.variable}`}> */}
      <script async src='/u' data-website-id={env.HOME_UID} />
      <body className={inter.variable}>
        <Theme appearance='dark'>
          <div className='flex min-h-screen flex-col'>
            <span className='py-4 sm:py-8' />
            <Nav />
            <main className='flex-1'>
              {/* <Container size='3' p='2'>
                <Flex direction='column' align='center' gap='4'>
                  <Callout.Root variant='surface' color='orange'>
                    <Callout.Icon>
                      <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>The cloud database provider for this site is currently experiencing elevated latency. While this is being addressed, some features may exhibit temporary instability or reduced performance.</Callout.Text>
                  </Callout.Root>
                </Flex>
              </Container> */}
              <Container size='3' p='2'>
                <Flex direction='column' align='center' gap='4'>
                  {children}
                </Flex>
              </Container>
            </main>
          </div>
        </Theme>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}

function Nav() {
  return (
    <header className={`flex w-full flex-col-reverse sm:flex-row justify-center`}>
      <div className='w-full container mx-0 flex sm:h-20 items-center justify-center sm:justify-between py-6 sm:mx-16 md:mx-24 md:max-w-2xl lg:mx-56 lg:max-w-5xl'>
        <Tabs defaultValue='/'>
          <TabsList className='flex-col sm:flex-row h-auto sm:h-9 gap-1.5 sm:gap-0'>
            <TabsTrigger value='/' className='w-full sm:w-auto'>
              <HomeIcon />
            </TabsTrigger>
            <TabsTrigger value='/markowitz' className='w-full sm:w-auto'>
              Modern Portfolio Theory
            </TabsTrigger>
            <TabsTrigger value='/derivatives' className='w-full sm:w-auto'>
              Options Pricing
            </TabsTrigger>
            {env.NODE_ENV === 'development' && (
              <TabsTrigger value='/timeseries' className='w-full sm:w-auto'>
                Timeseries Forecasting
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>
      <div className='flex justify-center sm:justify-end sm:mr-20'>
        <a href='https://github.com/tomjwells/finance' target='_blank' rel='noopener noreferrer'>
          <img src='/github-mark-white.svg' alt='GitHub Logo' className='h-8 w-8 min-w-8' />
        </a>
      </div>
    </header>
  )
}

function HomeIcon() {
  return (
    <svg height='16px' width='16px' stroke='currentColor' fill='currentColor' strokeWidth='0' viewBox='0 0 24 24' aria-hidden='true' xmlns='http://www.w3.org/2000/svg'>
      <path d='M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z'></path>
      <path d='M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z'></path>
    </svg>
  )
}
