import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-csgo-orange">CS Loadout</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Browse
            </Link>
            <Link
              href="#about"
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
