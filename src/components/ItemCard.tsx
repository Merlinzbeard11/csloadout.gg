'use client';

interface ItemCardProps {
  itemName: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function ItemCard({ itemName, isSelected, onClick }: ItemCardProps) {
  // Extract weapon name and skin name for better display
  const parts = itemName.split(' | ');
  const weaponName = parts[0] || itemName;
  const skinName = parts.slice(1).join(' | ') || '';

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full bg-gray-800 rounded-lg p-4
        transition-all duration-200
        hover:bg-gray-750 hover:scale-105 hover:shadow-xl
        ${isSelected ? 'ring-2 ring-csgo-orange shadow-lg' : ''}
      `}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-csgo-orange rounded-full animate-pulse" />
        </div>
      )}

      {/* Item Content */}
      <div className="flex flex-col gap-2">
        {/* Weapon Name */}
        <div className="text-left">
          <h3 className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
            {weaponName}
          </h3>
          {skinName && (
            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors mt-1">
              {skinName}
            </p>
          )}
        </div>

        {/* Placeholder for future features */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-xs text-gray-600">Click to compare</span>
        </div>
      </div>
    </button>
  );
}
