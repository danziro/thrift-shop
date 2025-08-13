export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/40 bg-white/50 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} Sneaker Thrift. Pre-loved, well-loved.</p>
        <div className="flex items-center gap-4">
          <a className="hover:underline" href="#">Kebijakan</a>
          <a className="hover:underline" href="#">Kontak</a>
          <a className="hover:underline" href="#">Instagram</a>
        </div>
      </div>
    </footer>
  );
}


