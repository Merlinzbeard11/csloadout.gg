'use client';

interface ItemCardProps {
  itemName: string;
  isSelected: boolean;
  onClick: () => void;
  rarity?: 'consumer' | 'industrial' | 'milspec' | 'restricted' | 'classified' | 'covert' | 'contraband';
  wear?: 'FN' | 'MW' | 'FT' | 'WW' | 'BS';
  floatValue?: number;
  price?: number;
}

// CS2 Rarity Colors matching csgoskins.gg
const RARITY_COLORS = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  contraband: '#e4ae39',
};

// Wear Condition Badge Styles
const WEAR_STYLES = {
  FN: { bg: 'bg-green-600', text: 'Factory New' },
  MW: { bg: 'bg-green-500', text: 'Minimal Wear' },
  FT: { bg: 'bg-yellow-500', text: 'Field-Tested' },
  WW: { bg: 'bg-orange-500', text: 'Well-Worn' },
  BS: { bg: 'bg-red-600', text: 'Battle-Scarred' },
};

export default function ItemCard({
  itemName,
  isSelected,
  onClick,
  rarity,
  wear,
  floatValue,
  price
}: ItemCardProps) {
  // Extract weapon name and skin name for better display
  const parts = itemName.split(' | ');
  const weaponName = parts[0] || itemName;
  const skinName = parts.slice(1).join(' | ') || '';

  const rarityColor = rarity ? RARITY_COLORS[rarity] : undefined;
  const wearStyle = wear ? WEAR_STYLES[wear] : undefined;

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full bg-gray-700 rounded-sm p-4
        transition-all duration-150 shadow-md
        hover:bg-gray-600 hover:scale-105 hover:shadow-md
        ${isSelected ? 'ring-2 ring-csgo-orange shadow-md' : ''}
      `}
      style={{
        borderTop: rarityColor ? `3px solid ${rarityColor}` : undefined,
      }}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-3 h-3 bg-csgo-orange rounded-full animate-pulse" />
        </div>
      )}

      {/* Item Content */}
      <div className="flex flex-col gap-3 h-full">
        {/* Weapon Name */}
        <div className="text-left flex-grow">
          <h3 className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors line-clamp-1">
            {weaponName}
          </h3>
          {skinName && (
            <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors mt-1 line-clamp-2">
              {skinName}
            </p>
          )}
        </div>

        {/* Badges Container */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Wear Condition Badge */}
          {wearStyle && (
            <span
              className={`${wearStyle.bg} text-white text-xs px-2 py-0.5 rounded-full font-semibold`}
              title={wearStyle.text}
            >
              {wear}
            </span>
          )}

          {/* Float Value Badge */}
          {floatValue !== undefined && (
            <span
              className="bg-purple-600 text-purple-100 text-xs px-2 py-0.5 rounded-full font-medium"
              title={`Float: ${floatValue.toFixed(4)}`}
            >
              {floatValue.toFixed(4)}
            </span>
          )}
        </div>

        {/* Price Display */}
        <div className="mt-auto pt-2 border-t border-gray-700">
          {price !== undefined ? (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">Best Price</span>
              <span className="text-2xl font-bold text-csgo-orange">
                ${price.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-xs text-gray-500">Checking prices...</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
