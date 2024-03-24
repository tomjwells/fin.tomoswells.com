
// import { HomeIcon } from "@radix-ui/react-icons";
import { Suspense } from "react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "~/shadcn/Tabs";

export default function TabsSelect() {
  return (
    <header className={`flex w-full flex-row justify-center`}>
      <div className=" container mx-16 flex h-20 items-center justify-between py-6 sm:mx-16 md:mx-24 md:max-w-2xl lg:mx-56 lg:max-w-5xl">
        <Suspense>
          <Tabs defaultValue="account" className="w-[400px]">
            <TabsList>
              <TabsTrigger value="/"><HomeIcon /></TabsTrigger>
              <TabsTrigger value="/derivatives">Options Pricing</TabsTrigger>
              <TabsTrigger value="/markowitz">Modern Portfolio Theory</TabsTrigger>
              <TabsTrigger value="/timeseries">Timeseries Forecasting</TabsTrigger>
            </TabsList>
            {/* <TabsContent value="account">Make changes to your account here.</TabsContent> */}
            {/* <TabsContent value="password">Change your password here.</TabsContent> */}
          </Tabs>
        </Suspense>
      </div>
      <div className="flex justify-end">
        <a href="https://github.com/tomjwells/finance" target="_blank" rel="noopener noreferrer">
          <img src="/github-mark-white.svg" alt="GitHub Logo" className="h-8 w-8" />
        </a>
      </div>
    </header>
  )
}

export function HomeIcon() {
  return (
    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="14px" width="14px" xmlns="http://www.w3.org/2000/svg"><path d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79z"></path><path d="m490.91 244.15-74.8-71.56V64a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0 0 43 267.56L250.5 69.28a8 8 0 0 1 11.06 0l207.52 198.28a16 16 0 0 0 22.59-.44c6.14-6.36 5.63-16.86-.76-22.97z"></path></svg>
  );
}