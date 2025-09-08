export default function Footer() {
  return (
    <footer className="mt-12 sm:mt-16 border-t border-white/40 bg-white/50 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 text-sm text-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <p className="text-center sm:text-left">© {new Date().getFullYear()} Sneaker Thrift. Pre-loved, well-loved.</p>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
          <a className="hover:underline" href="#">Kebijakan</a>
          <a className="hover:underline" href="#">Kontak</a>
          <a className="hover:underline" href="#">Instagram</a>
        </div>
      </div>
    </footer>
  );
}


