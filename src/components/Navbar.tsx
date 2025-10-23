'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WeaponCategory {
  name: string;
  weapons: string[];
}

const WEAPON_CATEGORIES: WeaponCategory[] = [
  {
    name: 'Pistols',
    weapons: ['Desert Eagle', 'Dual Berettas', 'Five-SeveN', 'Glock-18', 'P2000', 'P250', 'CZ75-Auto', 'Tec-9', 'USP-S', 'R8 Revolver']
  },
  {
    name: 'Rifles',
    weapons: ['AK-47', 'M4A4', 'M4A1-S', 'AUG', 'SG 553', 'AWP', 'SSG 08', 'SCAR-20', 'G3SG1', 'Galil AR', 'FAMAS']
  },
  {
    name: 'SMGs',
    weapons: ['MP9', 'MP7', 'MP5-SD', 'UMP-45', 'P90', 'PP-Bizon', 'MAC-10']
  },
  {
    name: 'Heavy',
    weapons: ['Nova', 'XM1014', 'MAG-7', 'Sawed-Off', 'M249', 'Negev']
  },
  {
    name: 'Equipment',
    weapons: ['Zeus x27', 'Knife', 'Gloves']
  }
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpandedCategory, setMobileExpandedCategory] = useState<string | null>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setMobileExpandedCategory(null);
  };

  const toggleMobileCategory = (categoryName: string) => {
    setMobileExpandedCategory(mobileExpandedCategory === categoryName ? null : categoryName);
  };

  return (
    <nav className="bg-gray-800 shadow-md fixed top-0 left-0 right-0 w-full z-40">
      <div className="container px-4 sm:px-6 py-4 lg:py-2 mx-auto flex items-center flex-wrap">
        {/* Logo */}
        <div id="navbar-logo" className="flex grow lg:grow-0">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-csgo-orange">CS Loadout</span>
          </Link>
        </div>

        {/* Mobile: Settings Button */}
        <button
          type="button"
          className="p-1 mr-2 block lg:hidden text-gray-300 hover:text-white"
          aria-label="Settings"
        >
          <svg className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
          </svg>
        </button>

        {/* Mobile: Search Button */}
        <button
          type="button"
          className="p-1 mr-2 block lg:hidden text-gray-300 hover:text-white"
          aria-label="Search"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>

        {/* Mobile: Hamburger Menu Button */}
        <button
          id="navbar-open-items"
          type="button"
          className={`p-1 -mr-1 ${mobileMenuOpen ? 'hidden' : 'block'} lg:hidden text-gray-300 hover:text-white`}
          onClick={toggleMobileMenu}
          aria-label="Menu"
        >
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
            <path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path>
          </svg>
        </button>

        {/* Mobile: Close Button */}
        <button
          id="navbar-close-items"
          type="button"
          className={`p-1 -mr-1 ${mobileMenuOpen ? 'block' : 'hidden'} lg:hidden text-gray-300 hover:text-white`}
          onClick={toggleMobileMenu}
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
            <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
          </svg>
        </button>

        {/* Desktop: Weapon Category Dropdowns */}
        <div
          id="navbar-items"
          className={`text-sm grow ${mobileMenuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-auto h-[calc(100dvh-4.5rem)] lg:h-auto overflow-y-scroll lg:overflow-y-visible mt-6 lg:mt-0 pb-6 lg:pb-0`}
        >
          {WEAPON_CATEGORIES.map((category) => (
            <div key={category.name} className="group inline-block relative w-full lg:w-auto">
              <button
                className="navbar-subitem-trigger py-2 lg:py-4 focus:outline-none hover:text-white transition-colors duration-200 w-full lg:w-auto flex lg:inline-flex items-center lg:px-1.5 2xl:px-2 text-blue-100"
                onClick={() => toggleMobileCategory(category.name)}
                type="button"
              >
                {category.name}
                <svg
                  className="hidden xl:block h-1.5 ml-1.5 group-hover:-rotate-180 transition-transform duration-200"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 12 7"
                >
                  <path d="M11.261 2.02A.96.96 0 009.941.623L6 4.35 2.06.623A.96.96 0 00.74 2.02l4.573 4.33a1 1 0 001.374 0l4.574-4.33z"></path>
                </svg>
              </button>

              {/* Dropdown Menu */}
              <ul
                className={`${mobileMenuOpen && mobileExpandedCategory === category.name ? 'block' : 'hidden'} lg:hidden lg:group-hover:block bg-gray-700 rounded-sm shadow-md text-blue-100 my-2 lg:my-0 overflow-hidden lg:absolute lg:max-h-[80vh] lg:overflow-y-auto`}
              >
                {category.weapons.map((weapon) => (
                  <li key={weapon}>
                    <Link
                      href={`/?weapon=${encodeURIComponent(weapon)}`}
                      className="flex items-center hover:bg-gray-600 hover:text-white transition-colors duration-200 py-2 px-4 whitespace-nowrap bg-gray-700"
                    >
                      <div className="w-9.5 h-7 mr-1.5 bg-gray-600 rounded flex items-center justify-center text-xs text-gray-400">
                        {/* Placeholder for weapon icon */}
                        {weapon.substring(0, 2)}
                      </div>
                      {weapon}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
