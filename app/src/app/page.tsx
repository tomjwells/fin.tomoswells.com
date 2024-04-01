import { Container, Flex, Heading, Text, Card, Link } from "@radix-ui/themes"
import NextLink from "next/link"


export default function HomePage() {
  return (
    <Card className="w-full before:![background-color:transparent] !p-5" >
      <Heading size="6">Home</Heading>
      <Flex direction="column" gap="2" my="4">
        <Text>This site provides access to try out a variety of tools related to the subject of financial mathematics.</Text>
        <Text>The code used to create the site is open source and available on <Link href="https://github.com/tomjwells/finance">GitHub</Link>.</Text>
        <br />
        <Text>
          The currently implemented topics are:
        </Text>
        <ul className="list-disc my-3 ml-6">
          <li >
            <Link asChild><NextLink href="/derivatives" >Options Pricing</NextLink></Link>
          </li>
          <li >
            <Link asChild><NextLink href="/markowitz">Modern Portfolio Theory</NextLink></Link>
          </li>
          <li >
            <Link asChild><NextLink href="/timeseries">Timeseries Forecasting</NextLink></Link>
          </li>
        </ul>

      </Flex>
    </Card>
  );
}
