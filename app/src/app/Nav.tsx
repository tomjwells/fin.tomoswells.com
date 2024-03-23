
import { Suspense } from "react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "~/shadcn/Tabs";

export default function TabsSelect() {
  return (
    <header className={`flex w-full flex-row justify-center`}>
      <div className=" container mx-16 flex h-20 items-center justify-between py-6 sm:mx-16 md:mx-24 md:max-w-2xl lg:mx-56 lg:max-w-5xl">
        <Suspense>
          <Tabs defaultValue="account" className="w-[400px]">
            <TabsList>
              <TabsTrigger value="/derivatives">Options Pricing</TabsTrigger>
              <TabsTrigger value="/markowitz">Modern Portfolio Theory</TabsTrigger>
              <TabsTrigger value="/timeseries">Timeseries Forecasting</TabsTrigger>
            </TabsList>
            {/* <TabsContent value="account">Make changes to your account here.</TabsContent> */}
            {/* <TabsContent value="password">Change your password here.</TabsContent> */}
          </Tabs>
        </Suspense>
      </div>
    </header>
  )
}