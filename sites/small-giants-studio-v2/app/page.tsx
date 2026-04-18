import dynamic from "next/dynamic";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { MidCTA } from "@/components/sections/MidCTA";
import { USPs } from "@/components/sections/USPs";
import { Services } from "@/components/sections/Services";
import { CTA } from "@/components/sections/CTA";

const FishTank = dynamic(
  () =>
    import("@/components/sections/FishTank").then((mod) => mod.FishTank),
);
const Testimonials = dynamic(
  () =>
    import("@/components/sections/Testimonials").then(
      (mod) => mod.Testimonials,
    ),
);
export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <FishTank />
      <MidCTA />
      <USPs />
      <Services />
      <Testimonials />
      <CTA />
    </>
  );
}
