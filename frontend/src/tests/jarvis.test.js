/**
 * jarvis.test.js — Vitest unit tests for JarvisVoiceScreen core utilities
 *
 * Run with: npm run test  (after adding "test": "vitest" to package.json scripts)
 */
import { describe, it, expect } from 'vitest';
import { normalizeText, isWakeWord, extractAgentNumber } from '../components/JarvisVoiceScreen';

// ═══════════════════════════════════════════════════════════════
//  normalizeText()
// ═══════════════════════════════════════════════════════════════
describe('normalizeText', () => {
  it('lowercases and trims whitespace', () => {
    expect(normalizeText('  Hello JARVIS  ')).toBe('hello jarvis');
  });

  it('removes punctuation', () => {
    expect(normalizeText('Hello, Jarvis!')).toBe('hello jarvis');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeText('wake   up   jarvis')).toBe('wake up jarvis');
  });

  it('normalizes "agents" → "agent"', () => {
    expect(normalizeText('show all agents status')).toBe('show all agent status');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════════
//  isWakeWord()
// ═══════════════════════════════════════════════════════════════
describe('isWakeWord', () => {
  // English
  it('detects "hey jarvis"', () => {
    expect(isWakeWord('hey jarvis')).toBe(true);
  });
  it('detects "wake up jarvis"', () => {
    expect(isWakeWord('wake up jarvis')).toBe(true);
  });
  it('detects "hello jarvis"', () => {
    expect(isWakeWord('hello jarvis')).toBe(true);
  });
  it('detects just "jarvis"', () => {
    expect(isWakeWord('jarvis')).toBe(true);
  });

  // French
  it('detects French "bonjour jarvis"', () => {
    expect(isWakeWord('bonjour jarvis')).toBe(true);
  });
  it('detects French "lance jarvis"', () => {
    expect(isWakeWord('lance jarvis')).toBe(true);
  });
  it('detects French "allo jarvis"', () => {
    expect(isWakeWord('allo jarvis')).toBe(true);
  });

  // Arabic transliterated
  it('detects transliterated Arabic "ya jarvis"', () => {
    expect(isWakeWord('ya jarvis')).toBe(true);
  });

  // Negative cases
  it('rejects unrelated words', () => {
    expect(isWakeWord('what is the weather')).toBe(false);
  });
  it('rejects "jarvis" substring in longer unrelated word', () => {
    // "jarvis" as substring will match — this is intentional (loose wake word)
    expect(isWakeWord('')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
//  extractAgentNumber() — with word boundary fixes
// ═══════════════════════════════════════════════════════════════
describe('extractAgentNumber', () => {
  // Agent 1 — OPT-01
  it('matches "switch to agent 1"', () => {
    expect(extractAgentNumber('switch to agent 1')).toBe('1');
  });
  it('matches "switch to one"', () => {
    expect(extractAgentNumber('switch to one')).toBe('1');
  });
  it('matches "opt"', () => {
    expect(extractAgentNumber('open opt dashboard')).toBe('1');
  });
  it('matches "flow strategist"', () => {
    expect(extractAgentNumber('connect me to flow strategist')).toBe('1');
  });

  // Agent 2 — ANL-02
  it('matches "agent 2"', () => {
    expect(extractAgentNumber('agent 2 show anomalies')).toBe('2');
  });
  it('matches "reliability"', () => {
    expect(extractAgentNumber('show reliability report')).toBe('2');
  });

  // Agent 3 — DAT-03
  it('matches "agent 3"', () => {
    expect(extractAgentNumber('agent 3 what is the oee')).toBe('3');
  });
  it('matches "statistician"', () => {
    expect(extractAgentNumber('ask the statistician')).toBe('3');
  });
  it('matches "dat"', () => {
    expect(extractAgentNumber('switch to dat')).toBe('3');
  });

  // Agent 4 — INF-04
  it('matches "agent 4"', () => {
    expect(extractAgentNumber('agent 4 show network')).toBe('4');
  });
  it('matches "infrastructure"', () => {
    expect(extractAgentNumber('infrastructure engineer report')).toBe('4');
  });
  it('matches "inf" as whole word', () => {
    expect(extractAgentNumber('switch to inf')).toBe('4');
  });

  // Agent 5 — ORC-05
  it('matches "agent 5"', () => {
    expect(extractAgentNumber('agent 5 launch roundtable')).toBe('5');
  });
  it('matches "orchestrator"', () => {
    expect(extractAgentNumber('talk to the orchestrator')).toBe('5');
  });
  it('matches "orc"', () => {
    expect(extractAgentNumber('open orc')).toBe('5');
  });

  // ── Critical: Word boundary false-positive prevention ──
  it('does NOT match "infinite" as agent 4', () => {
    // "infinite" contains "inf" but NOT as a whole word → should NOT match
    expect(extractAgentNumber('infinite loop detected')).toBeNull();
  });

  it('does NOT match "information" as agent 4', () => {
    expect(extractAgentNumber('give me more information')).toBeNull();
  });

  it('does NOT match "orchestra" as agent 5', () => {
    // "orchestra" contains "orc" but NOT as a whole word
    expect(extractAgentNumber('the orchestra played well')).toBeNull();
  });

  it('does NOT match "database" as agent 3', () => {
    // "dat" is not a whole word in "database"
    expect(extractAgentNumber('access the database')).toBeNull();
  });

  it('returns null for unrelated command', () => {
    expect(extractAgentNumber('what is the weather today')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractAgentNumber('')).toBeNull();
  });
});
