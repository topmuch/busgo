"use client";

import { useState, useMemo } from "react";
import { ArrowRight } from "lucide-react";

export function RoiCalculator() {
  const [busCount, setBusCount] = useState(10);
  const [seatsPerBus, setSeatsPerBus] = useState(55);
  const [ticketPrice, setTicketPrice] = useState(15000);
  const [tripsPerDay, setTripsPerDay] = useState(5);
  const [retardRate, setRetardRate] = useState(10);

  const results = useMemo(() => {
    const seatsSavedPerDay =
      busCount * seatsPerBus * (retardRate / 100) * 0.5 * tripsPerDay;
    const revenuePerDay = seatsSavedPerDay * ticketPrice;
    const revenuePerMonth = revenuePerDay * 30;
    const revenuePerYear = revenuePerDay * 365;
    const busGoCost = busCount * 20000;
    const roi = busGoCost > 0 ? revenuePerMonth / busGoCost : 0;

    return {
      seatsSavedPerDay: Math.round(seatsSavedPerDay),
      revenuePerDay,
      revenuePerMonth,
      revenuePerYear,
      busGoCost,
      roi,
    };
  }, [busCount, seatsPerBus, ticketPrice, tripsPerDay, retardRate]);

  const formatFCFA = (value: number) =>
    Math.round(value).toLocaleString("fr-FR");

  return (
    <section id="calculateur-roi" className="py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-4">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Calculez vos économies
          </h2>
          <p className="mt-3 text-muted-foreground">
            Découvrez combien Bus Go peut vous faire économiser chaque mois
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* LEFT - Form */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
            <h3 className="font-semibold text-lg mb-6 text-foreground">Vos paramètres</h3>

            <div className="space-y-6">
              {/* Bus Count */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Nombre de bus
                  </label>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                    {busCount}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={busCount}
                  onChange={(e) => setBusCount(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Seats Per Bus */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Places par bus
                  </label>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                    {seatsPerBus}
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={seatsPerBus}
                  onChange={(e) => setSeatsPerBus(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Ticket Price */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Prix du billet (FCFA)
                  </label>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                    {formatFCFA(ticketPrice)}
                  </span>
                </div>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  value={ticketPrice}
                  onChange={(e) =>
                    setTicketPrice(Math.max(0, Number(e.target.value)))
                  }
                  className="w-full h-10 bg-muted rounded-lg border border-border px-3 text-sm font-medium text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Trips Per Day */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Trajets par jour
                  </label>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                    {tripsPerDay}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={tripsPerDay}
                  onChange={(e) => setTripsPerDay(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Retard Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground/80">
                    Taux de retard actuel
                  </label>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                    {retardRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={20}
                  step={1}
                  value={retardRate}
                  onChange={(e) => setRetardRate(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>

          {/* RIGHT - Results */}
          <div className="bg-primary text-white rounded-2xl p-6 md:p-8 flex flex-col">
            <h3 className="font-semibold text-lg mb-6">Vos résultats</h3>

            <div className="flex-1 space-y-6">
              {/* Seats Saved */}
              <div>
                <p className="text-primary-foreground/70 text-sm">Places sauvées / jour</p>
                <p className="text-3xl font-bold mt-1">
                  {results.seatsSavedPerDay}
                </p>
              </div>

              {/* Revenue */}
              <div>
                <p className="text-primary-foreground/70 text-sm">Revenue récupéré</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-primary-foreground/70 text-sm">/jour</span>
                    <span className="text-xl font-bold">
                      {formatFCFA(results.revenuePerDay)} FCFA
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-primary-foreground/70 text-sm">/mois</span>
                    <span className="text-xl font-bold">
                      {formatFCFA(results.revenuePerMonth)} FCFA
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-primary-foreground/70 text-sm">/an</span>
                    <span className="text-xl font-bold">
                      {formatFCFA(results.revenuePerYear)} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-primary-foreground/20" />

              {/* Cost */}
              <div className="flex items-baseline justify-between">
                <span className="text-primary-foreground/70 text-sm">Coût Bus Go</span>
                <span className="text-lg font-medium">
                  {formatFCFA(results.busGoCost)} FCFA/mois
                </span>
              </div>

              {/* ROI */}
              <div className="text-center pt-2">
                <p className="text-primary-foreground/70 text-sm mb-1">ROI</p>
                <p className="text-5xl font-bold">x{results.roi.toFixed(1)}</p>
              </div>
            </div>

            {/* CTA */}
            <button className="mt-6 w-full bg-card text-primary font-bold py-3 px-6 rounded-xl hover:bg-primary-foreground/10 transition-colors flex items-center justify-center gap-2">
              COMMENCER L&apos;ESSAI GRATUIT
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}