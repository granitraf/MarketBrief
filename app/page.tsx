import HeroSection from '@/components/HeroSection';
import IndicesCard from "@/components/cards/IndicesCard";
import Mag7Card from "@/components/cards/Mag7Card";
import CryptoCard from "@/components/cards/CryptoCard";
import CommoditiesCard from "@/components/cards/CommoditiesCard";
import EnergyCard from "@/components/cards/EnergyCard";
import FearGreedCard from "@/components/cards/FearGreedCard";
import Calendars from "@/components/sections/Calendars";
import CurrenciesCard from "@/components/cards/CurrenciesCard";
import RealEstateCard from "@/components/cards/RealEstateCard";
import BondsAndRatesCard from "@/components/cards/BondsAndRatesCard";
import NewsSidebar from "@/components/cards/NewsSidebar";
import StockIntelligenceHub from "@/components/cards/StockIntelligenceHub";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="relative">
      {/* Hero Section with Light Rays */}
      <HeroSection />
      
      {/* Dashboard Section */}
      <div className="dashboard-section relative z-10 bg-black min-h-screen">
        <div className="mx-auto max-w-[1400px] p-4 md:p-6 space-y-6">
          {/* News moved here, full-width */}
          <section>
            <NewsSidebar />
          </section>

          <section className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <IndicesCard />
            <Mag7Card />
            <CryptoCard />
            <CommoditiesCard />
            <FearGreedCard />
            <EnergyCard />
            <BondsAndRatesCard />
            <CurrenciesCard />
            <RealEstateCard />
          </section>

          {/* Place Stock Intelligence Hub below Real Estate, full-width */}
          <section>
            <StockIntelligenceHub />
          </section>

          <Calendars />
        </div>
      </div>
    </main>
  );
}


