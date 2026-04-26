export default function LoadingBanner() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
      {/* Container untuk Logo dengan efek bayangan halus */}
      <div className="relative mb-8 flex items-center justify-center">
        {/* Lingkaran Animasi di Belakang Logo */}
        <div className="absolute h-32 w-32 animate-ping rounded-full bg-blue-100 opacity-75"></div>

        {/* Logo Cita Hati (Pastikan path-nya benar) */}
        <img
          src="/252-SMA_CITA_HATI_EAST_SURABAYA.png"
          alt="Logo Cita Hati"
          className="relative h-28 w-auto animate-bounce object-contain"
        />
      </div>

      {/* Teks Loading */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-widest text-[#1e3a8a] uppercase animate-pulse">
          Cita Hati Hub
        </h2>
        <div className="mt-4 flex items-center justify-center gap-2">
          {/* Titik-titik Animasi Loading */}
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600"></div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-400">
          Loading Announcements...
        </p>
      </div>

      {/* Footer Nama Sekolah di bagian bawah */}
      <div className="absolute bottom-10 text-xs font-semibold text-slate-300 tracking-widest uppercase">
        Cita Hati Elementary Pakuwon City Campus
      </div>
    </div>
  );
}
