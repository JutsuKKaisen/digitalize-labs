import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth';

describe('Auth - Password Hashing', () => {
    it('hashPassword produces salt:hash format', () => {
        const result = hashPassword('TestPassword123!');
        expect(result).toContain(':');
        const parts = result.split(':');
        expect(parts).toHaveLength(2);
        expect(parts[0]).toHaveLength(32); // 16 bytes hex = 32 chars
        expect(parts[1]).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('hashPassword produces different hashes for same password (random salt)', () => {
        const hash1 = hashPassword('SamePassword!');
        const hash2 = hashPassword('SamePassword!');
        expect(hash1).not.toBe(hash2); // Different salts → different outputs
    });

    it('hashPassword with explicit salt is deterministic', () => {
        const salt = 'a'.repeat(32);
        const hash1 = hashPassword('TestPassword!', salt);
        const hash2 = hashPassword('TestPassword!', salt);
        expect(hash1).toBe(hash2); // Same salt → same output
    });

    it('verifyPassword returns true for correct password', () => {
        const stored = hashPassword('CorrectPassword!');
        expect(verifyPassword('CorrectPassword!', stored)).toBe(true);
    });

    it('verifyPassword returns false for wrong password', () => {
        const stored = hashPassword('CorrectPassword!');
        expect(verifyPassword('WrongPassword!', stored)).toBe(false);
    });

    it('verifyPassword returns false for empty password', () => {
        const stored = hashPassword('SomePassword!');
        expect(verifyPassword('', stored)).toBe(false);
    });
});
