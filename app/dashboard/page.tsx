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

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-[1400px] p-4 md:p-6 space-y-6">
      <section className="bg-zinc-900 rounded-xl p-4">
        <div className="flex flex-col items-center text-center">
          <img src="/LOGO.png" alt="MacroBrief" style={{ width: '20%' }} />
          <p className="text-sm text-zinc-400 mt-2">Your one page market snapshot.</p>
        </div>
      </section>

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
    </main>
  );
}


