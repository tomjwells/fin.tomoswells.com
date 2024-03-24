
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
  return <svg height="16px" width="16px" stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z"></path><path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z"></path></svg>
}