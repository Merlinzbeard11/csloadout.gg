/**
 * TDD Tests for Next.js 14 Scaffolding
 * BDD Reference: features/01-item-database.feature:82-87 (Legal compliance footer)
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Next.js Scaffolding', () => {
  describe('package.json', () => {
    it('should exist', () => {
      const exists = fs.existsSync(path.join(process.cwd(), 'package.json'));
      expect(exists).toBe(true);
    });

    it('should have Next.js 14 dependency', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      expect(pkg.dependencies.next).toMatch(/\^14\./);
    });

    it('should have React 18 dependency', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      expect(pkg.dependencies.react).toMatch(/\^18\./);
    });

    it('should have TypeScript as dev dependency', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      expect(pkg.devDependencies.typescript).toBeDefined();
    });

    it('should have Tailwind CSS as dev dependency', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      expect(pkg.devDependencies.tailwindcss).toBeDefined();
    });

    it('should have Prisma dependencies', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
      expect(pkg.dependencies['@prisma/client']).toBeDefined();
      expect(pkg.devDependencies.prisma).toBeDefined();
    });
  });

  describe('tsconfig.json', () => {
    it('should exist', () => {
      const exists = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
      expect(exists).toBe(true);
    });

    it('should have strict mode enabled', () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8'));
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });

    it('should have path alias for @/*', () => {
      const tsconfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8'));
      expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./src/*']);
    });
  });

  describe('Legal Footer (BDD Requirement)', () => {
    it('should have layout.tsx with legal footer', () => {
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const exists = fs.existsSync(layoutPath);
      expect(exists).toBe(true);

      const content = fs.readFileSync(layoutPath, 'utf-8');

      // BDD Scenario: Legal compliance footer displayed (lines 82-87)
      expect(content).toContain('csloadout.gg is not affiliated with Valve Corporation');
      expect(content).toContain('CS2, Counter-Strike, Steam trademarks are property of Valve');
      expect(content).toContain('Prices are estimates');
    });
  });

  describe('Configuration Files', () => {
    it('should have next.config.js', () => {
      const exists = fs.existsSync(path.join(process.cwd(), 'next.config.js'));
      expect(exists).toBe(true);
    });

    it('should have tailwind.config.ts with CS2 colors', () => {
      const configPath = path.join(process.cwd(), 'tailwind.config.ts');
      const exists = fs.existsSync(configPath);
      expect(exists).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('#FF6700'); // CS2 orange
      expect(content).toContain('#3B6EA5'); // CS2 blue
    });

    it('should have postcss.config.mjs', () => {
      const exists = fs.existsSync(path.join(process.cwd(), 'postcss.config.mjs'));
      expect(exists).toBe(true);
    });
  });
});
