import { amountInWords } from './amount-in-words';

describe('amountInWords', () => {

  it('handles nothing and non-numbers as zero', () => {
    expect(amountInWords(0)).toBe('Taka Zero Only');
    expect(amountInWords(null)).toBe('Taka Zero Only');
    expect(amountInWords(undefined)).toBe('Taka Zero Only');
    expect(amountInWords('' as any)).toBe('Taka Zero Only');
  });

  it('spells units, teens and tens', () => {
    expect(amountInWords(5)).toBe('Taka Five Only');
    expect(amountInWords(15)).toBe('Taka Fifteen Only');
    expect(amountInWords(42)).toBe('Taka Forty Two Only');
    expect(amountInWords(90)).toBe('Taka Ninety Only');
  });

  it('spells hundreds and thousands', () => {
    expect(amountInWords(100)).toBe('Taka One Hundred Only');
    expect(amountInWords(250)).toBe('Taka Two Hundred Fifty Only');
    expect(amountInWords(1000)).toBe('Taka One Thousand Only');
    expect(amountInWords(20090)).toBe('Taka Twenty Thousand Ninety Only');
  });

  // The point of the whole helper: Bangladesh groups by lakh and crore, not by
  // million. Getting this wrong is instantly visible to any local reader.
  it('groups by lakh and crore, not million', () => {
    expect(amountInWords(100000)).toBe('Taka One Lakh Only');
    expect(amountInWords(125000)).toBe('Taka One Lakh Twenty Five Thousand Only');
    expect(amountInWords(1000000)).toBe('Taka Ten Lakh Only');
    expect(amountInWords(10000000)).toBe('Taka One Crore Only');
    expect(amountInWords(12500000)).toBe('Taka One Crore Twenty Five Lakh Only');
  });

  it('recurses past a crore instead of truncating', () => {
    expect(amountInWords(1250000000)).toBe('Taka One Hundred Twenty Five Crore Only');
  });

  it('adds poisha only when there is a fraction', () => {
    expect(amountInWords(99.5)).toBe('Taka Ninety Nine and Fifty Poisha Only');
    expect(amountInWords(1250.75)).toBe('Taka One Thousand Two Hundred Fifty and Seventy Five Poisha Only');
    expect(amountInWords(1250.0)).toBe('Taka One Thousand Two Hundred Fifty Only');
  });

  it('carries a rounded-up fraction into Taka rather than printing 100 Poisha', () => {
    expect(amountInWords(5.999)).toBe('Taka Six Only');
  });

  it('does not lose a Taka to floating-point representation', () => {
    // 0.7 is stored as 0.6999…, so a naive floor() would report 1233 here.
    expect(amountInWords(1234.0)).toBe('Taka One Thousand Two Hundred Thirty Four Only');
    expect(amountInWords(0.7 + 1233.3)).toBe('Taka One Thousand Two Hundred Thirty Four Only');
  });

  it('ignores the sign — a refund still reads as an amount', () => {
    expect(amountInWords(-250)).toBe('Taka Two Hundred Fifty Only');
  });
});
