// src/components/services/YouTubeShowcase.tsx
"use client";

export default function YouTubeShowcase() {
  return (
    <section className="bg-black py-16 md:py-20">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h3 className="text-3xl font-bold text-white mb-10">
          Zobacz, jak pomagamy 💛
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Schronisko */}
          <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/4jwYAuj8QO4"
                title="Pomoc dla zwierząt"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="p-4 text-white">
              <h4 className="text-lg font-semibold mb-2">🐾 Pomoc dla zwierząt</h4>
              <p className="text-sm opacity-80">
                Wspieramy lokalne schroniska — odwiedzamy, karmimy, kochamy.
              </p>
            </div>
          </div>

          {/* Dom dziecka */}
          <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/TbSiXeDoo1A"
                title="Wizyta w domu dziecka"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="p-4 text-white">
              <h4 className="text-lg font-semibold mb-2">👧👦 Wizyta w domu dziecka</h4>
              <p className="text-sm opacity-80">
                Dajemy dzieciom uwagę, czas i prezenty – tworzymy wspomnienia.
              </p>
            </div>
          </div>

          {/* Ekologia */}
          <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/3VnezHfE5iQ"
                title="Akcja ekologiczna"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="p-4 text-white">
              <h4 className="text-lg font-semibold mb-2">🌿 Akcja ekologiczna</h4>
              <p className="text-sm opacity-80">
                Sprzątamy lasy, sadzimy rośliny, edukujemy – razem dla natury.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
