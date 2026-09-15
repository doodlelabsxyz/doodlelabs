import { CustomCursor } from "@/components/site/custom-cursor";
import { ScrollProgress } from "@/components/site/scroll-progress";
import { Nav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { StatsBar } from "@/components/site/stats-bar";
import { Work } from "@/components/site/work";
import { Process } from "@/components/site/process";
import { Services } from "@/components/site/services";
import { Faq } from "@/components/site/faq";
import { Contact } from "@/components/site/contact";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <div className="homepage" id="top">
      <CustomCursor />
      <ScrollProgress />
      <Nav />
      <Hero />
      <Marquee />
      <StatsBar />
      <Work />
      <Process />
      <Services />
      <Faq />
      <Contact />
      <Footer />
    </div>
  );
}
