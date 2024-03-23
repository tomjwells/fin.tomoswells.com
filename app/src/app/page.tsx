import Link from "next/link";
import { Container, Flex, Heading, Text } from "@radix-ui/themes"

export default function HomePage() {
  return (
    <Container size="1" p="2">
      <Flex direction="column" align="center" gap="4">
        Hi
        {/* <Intro />
        <Links /> */}
      </Flex>
    </Container>
  );
}
