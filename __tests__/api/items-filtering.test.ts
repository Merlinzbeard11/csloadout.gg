/**
 * Integration tests for item filtering
 * Tests weapon_category and container_type data integrity and filtering
 */

import { ITEMS } from '@/lib/items'

describe('Weapon Category Filtering', () => {
  describe('Rifle filtering', () => {
    it('should have exactly 3,681 rifle skins', () => {
      const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
      expect(rifles.length).toBe(3681)
    })

    it('should only contain items with weapon_category Rifles', () => {
      const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
      expect(rifles.every(item => item.weapon_category === 'Rifles')).toBe(true)
    })

    it('should include AK-47 skins', () => {
      const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
      const hasAK47 = rifles.some(item => item.name.includes('AK-47'))
      expect(hasAK47).toBe(true)
    })

    it('should include AWP skins', () => {
      const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
      const hasAWP = rifles.some(item => item.name.includes('AWP'))
      expect(hasAWP).toBe(true)
    })

    it('should include M4A4 skins', () => {
      const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
      const hasM4A4 = rifles.some(item => item.name.includes('M4A4'))
      expect(hasM4A4).toBe(true)
    })
  })

  describe('Pistol filtering', () => {
    it('should have exactly 3,006 pistol skins', () => {
      const pistols = ITEMS.filter(item => item.weapon_category === 'Pistols')
      expect(pistols.length).toBe(3006)
    })

    it('should only contain items with weapon_category Pistols', () => {
      const pistols = ITEMS.filter(item => item.weapon_category === 'Pistols')
      expect(pistols.every(item => item.weapon_category === 'Pistols')).toBe(true)
    })

    it('should include Glock-18 skins', () => {
      const pistols = ITEMS.filter(item => item.weapon_category === 'Pistols')
      const hasGlock = pistols.some(item => item.name.includes('Glock-18'))
      expect(hasGlock).toBe(true)
    })

    it('should include Desert Eagle skins', () => {
      const pistols = ITEMS.filter(item => item.weapon_category === 'Pistols')
      const hasDeagle = pistols.some(item => item.name.includes('Desert Eagle'))
      expect(hasDeagle).toBe(true)
    })
  })

  describe('SMG filtering', () => {
    it('should have exactly 2,311 SMG skins', () => {
      const smgs = ITEMS.filter(item => item.weapon_category === 'SMGs')
      expect(smgs.length).toBe(2311)
    })

    it('should only contain items with weapon_category SMGs', () => {
      const smgs = ITEMS.filter(item => item.weapon_category === 'SMGs')
      expect(smgs.every(item => item.weapon_category === 'SMGs')).toBe(true)
    })
  })

  describe('Heavy filtering', () => {
    it('should have exactly 1,647 heavy weapon skins', () => {
      const heavy = ITEMS.filter(item => item.weapon_category === 'Heavy')
      expect(heavy.length).toBe(1647)
    })

    it('should only contain items with weapon_category Heavy', () => {
      const heavy = ITEMS.filter(item => item.weapon_category === 'Heavy')
      expect(heavy.every(item => item.weapon_category === 'Heavy')).toBe(true)
    })
  })

  describe('Knives category', () => {
    it('should have exactly 3,630 knife skins', () => {
      const knives = ITEMS.filter(item => item.weapon_category === 'Knives')
      expect(knives.length).toBe(3630)
    })

    it('should only contain items with weapon_category Knives', () => {
      const knives = ITEMS.filter(item => item.weapon_category === 'Knives')
      expect(knives.every(item => item.weapon_category === 'Knives')).toBe(true)
    })
  })

  describe('Gloves category', () => {
    it('should have exactly 340 glove skins', () => {
      const gloves = ITEMS.filter(item => item.weapon_category === 'Gloves')
      expect(gloves.length).toBe(340)
    })

    it('should only contain items with weapon_category Gloves', () => {
      const gloves = ITEMS.filter(item => item.weapon_category === 'Gloves')
      expect(gloves.every(item => item.weapon_category === 'Gloves')).toBe(true)
    })
  })

  describe('Combined filters', () => {
    it('should filter rifles by rarity', () => {
      const covertRifles = ITEMS.filter(item =>
        item.weapon_category === 'Rifles' && item.rarity === 'Covert'
      )
      expect(covertRifles.length).toBeGreaterThan(0)
      expect(covertRifles.every(item =>
        item.weapon_category === 'Rifles' && item.rarity === 'Covert'
      )).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should filter rifles in under 100ms', () => {
      const start = Date.now()
      const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
      const duration = Date.now() - start

      expect(rifles.length).toBe(3681)
      expect(duration).toBeLessThan(100)
    })
  })
})

describe('Container Type Filtering', () => {
  describe('Weapon Case filtering', () => {
    it('should have exactly 42 weapon cases', () => {
      const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
      expect(weaponCases.length).toBe(42)
    })

    it('should only contain items with container_type Weapon Case', () => {
      const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
      expect(weaponCases.every(item => item.container_type === 'Weapon Case')).toBe(true)
    })

    it('should only contain case type items', () => {
      const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
      expect(weaponCases.every(item => item.type === 'case')).toBe(true)
    })

    it('should include Chroma cases', () => {
      const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
      const hasChroma = weaponCases.some(item => item.name.includes('Chroma'))
      expect(hasChroma).toBe(true)
    })
  })

  describe('Sticker Capsule filtering', () => {
    it('should have exactly 92 sticker capsules', () => {
      const stickerCapsules = ITEMS.filter(item => item.container_type === 'Sticker Capsule')
      expect(stickerCapsules.length).toBe(92)
    })

    it('should only contain items with container_type Sticker Capsule', () => {
      const stickerCapsules = ITEMS.filter(item => item.container_type === 'Sticker Capsule')
      expect(stickerCapsules.every(item => item.container_type === 'Sticker Capsule')).toBe(true)
    })

    it('should include RMR or Katowice capsules', () => {
      const stickerCapsules = ITEMS.filter(item => item.container_type === 'Sticker Capsule')
      const hasRMRorKato = stickerCapsules.some(item =>
        item.name.includes('RMR') || item.name.includes('Katowice')
      )
      expect(hasRMRorKato).toBe(true)
    })
  })

  describe('All containers', () => {
    it('should have 453 total containers', () => {
      const allCases = ITEMS.filter(item => item.type === 'case')
      expect(allCases.length).toBe(453)
    })

    it('should have both Weapon Cases and Sticker Capsules classified', () => {
      const classifiedCases = ITEMS.filter(item =>
        item.container_type === 'Weapon Case' || item.container_type === 'Sticker Capsule'
      )

      expect(classifiedCases.length).toBe(134) // 42 + 92
    })

    it('should have 319 unclassified containers (Souvenir Packages, Autograph Capsules)', () => {
      const unclassified = ITEMS.filter(item =>
        item.type === 'case' && item.container_type === null
      )

      expect(unclassified.length).toBe(319)
      // These include Souvenir Packages and Autograph Capsules
      expect(unclassified.some(item => item.name.includes('Souvenir Package'))).toBe(true)
      expect(unclassified.some(item => item.name.includes('Autograph Capsule'))).toBe(true)
    })
  })

  describe('Container type field validation', () => {
    it('should have 42 Weapon Cases and 92 Sticker Capsules classified', () => {
      const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
      const stickerCapsules = ITEMS.filter(item => item.container_type === 'Sticker Capsule')

      expect(weaponCases.length).toBe(42)
      expect(stickerCapsules.length).toBe(92)
    })

    it('should have valid container types when populated', () => {
      const casesWithType = ITEMS.filter(item => item.type === 'case' && item.container_type !== null)

      expect(casesWithType.every(item =>
        item.container_type === 'Weapon Case' || item.container_type === 'Sticker Capsule'
      )).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should filter weapon cases in under 50ms', () => {
      const start = Date.now()
      const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
      const duration = Date.now() - start

      expect(weaponCases.length).toBe(42)
      expect(duration).toBeLessThan(50)
    })
  })
})

describe('Data Integrity', () => {
  it('should have correct weapon category distribution', () => {
    const rifles = ITEMS.filter(item => item.weapon_category === 'Rifles')
    const pistols = ITEMS.filter(item => item.weapon_category === 'Pistols')
    const smgs = ITEMS.filter(item => item.weapon_category === 'SMGs')
    const heavy = ITEMS.filter(item => item.weapon_category === 'Heavy')
    const knives = ITEMS.filter(item => item.weapon_category === 'Knives')
    const gloves = ITEMS.filter(item => item.weapon_category === 'Gloves')

    expect(rifles.length).toBe(3681)
    expect(pistols.length).toBe(3006)
    expect(smgs.length).toBe(2311)
    expect(heavy.length).toBe(1647)
    expect(knives.length).toBe(3630)
    expect(gloves.length).toBe(340)
  })

  it('should have correct container type distribution', () => {
    const weaponCases = ITEMS.filter(item => item.container_type === 'Weapon Case')
    const stickerCapsules = ITEMS.filter(item => item.container_type === 'Sticker Capsule')

    expect(weaponCases.length).toBe(42)
    expect(stickerCapsules.length).toBe(92)
  })

  it('should have total item count of 23,956', () => {
    expect(ITEMS.length).toBe(23956)
  })
})
