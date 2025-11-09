/**
 * TDD Tests for Prisma Database Schema
 * BDD Reference: features/01-item-database.md (Database Schema Requirements)
 *
 * Critical Gotcha: PostgreSQL 17 NULLS DISTINCT requirement for unique constraints
 * Gotcha ID: 2676c79b-d8ac-4d97-93a1-3c335f0db3b1
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Prisma Schema', () => {
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  let schemaContent: string;

  beforeAll(() => {
    if (fs.existsSync(schemaPath)) {
      schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    }
  });

  describe('Schema File', () => {
    it('should exist at prisma/schema.prisma', () => {
      const exists = fs.existsSync(schemaPath);
      expect(exists).toBe(true);
    });

    it('should use PostgreSQL provider', () => {
      expect(schemaContent).toContain('provider = "postgresql"');
    });

    it('should have Prisma client generator', () => {
      expect(schemaContent).toContain('generator client');
      expect(schemaContent).toContain('provider = "prisma-client-js"');
    });
  });

  describe('Item Model', () => {
    it('should have Item model defined', () => {
      expect(schemaContent).toContain('model Item');
    });

    it('should have UUID id field with default', () => {
      expect(schemaContent).toContain('id');
      expect(schemaContent).toMatch(/id\s+String\s+@id\s+@default\(uuid\(\)\)/);
    });

    it('should have name fields (name, display_name, search_name)', () => {
      expect(schemaContent).toContain('name');
      expect(schemaContent).toContain('display_name');
      expect(schemaContent).toContain('search_name');
    });

    it('should have type and rarity fields', () => {
      expect(schemaContent).toContain('type');
      expect(schemaContent).toContain('rarity');
    });

    it('should have quality field with default', () => {
      expect(schemaContent).toContain('quality');
      expect(schemaContent).toMatch(/quality.*@default/);
    });

    it('should have wear field with default', () => {
      expect(schemaContent).toContain('wear');
      expect(schemaContent).toMatch(/wear.*@default/);
    });

    it('should have image URL fields (image_url, image_url_fallback, image_local_path)', () => {
      expect(schemaContent).toContain('image_url');
      expect(schemaContent).toContain('image_url_fallback');
      expect(schemaContent).toContain('image_local_path');
    });

    it('should have wear min/max float fields', () => {
      expect(schemaContent).toContain('wear_min');
      expect(schemaContent).toContain('wear_max');
    });

    it('should have pattern_count field', () => {
      expect(schemaContent).toContain('pattern_count');
    });

    it('should have timestamps (created_at, updated_at)', () => {
      expect(schemaContent).toContain('created_at');
      expect(schemaContent).toContain('updated_at');
    });

    it('should have composite unique constraint on [name, quality, wear]', () => {
      // Prisma uses @@unique for composite unique constraints
      expect(schemaContent).toMatch(/@@unique\(\[name.*quality.*wear\]\)/);
    });

    it('should have indexes for search_name and type+rarity', () => {
      expect(schemaContent).toMatch(/@@index\(\[search_name\]\)/);
      expect(schemaContent).toMatch(/@@index\(\[type.*rarity\]\)/);
    });
  });

  describe('.env.example', () => {
    it('should exist with DATABASE_URL template', () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      const exists = fs.existsSync(envExamplePath);
      expect(exists).toBe(true);

      if (exists) {
        const content = fs.readFileSync(envExamplePath, 'utf-8');
        expect(content).toContain('DATABASE_URL');
        expect(content).toContain('postgresql://');
      }
    });
  });
});
