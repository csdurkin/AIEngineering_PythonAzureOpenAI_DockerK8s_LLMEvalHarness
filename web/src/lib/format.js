// PURPOSE: Format one value for display, the same way the harness report does: 0.85 -> 85.0%, 1.234 -> 1.23, 0.0007 -> $0.00070; null -> n/a
// SOURCE: src/llm_eval/report.py _fmt() (ported from Python to JavaScript)
// AUTHORSHIP: drafted by Claude Opus 5.5 (Anthropic) in the harness; ported by Claude; reviewed by Connor
export function fmt(value, kind) {
  if (value === null || value === undefined) {
    return 'n/a';                                       // e.g. accuracy on a refuse case
  }
  // a lookup object used like report.py's dictionary: pick the format by kind
  return {
    pct: `${(value * 100).toFixed(1)}%`,
    sec: value.toFixed(2),
    usd: `$${value.toFixed(5)}`,
    int: value.toLocaleString('en-GB'),                 // added for token counts: 1234 -> 1,234
  }[kind];
}

// PURPOSE: How many times larger one value is than another, to 1 decimal place: (6.36, 1.42) -> "4.5x"; null if it cannot be computed
// SOURCE: new
// AUTHORSHIP: drafted by Claude; reviewed by Connor
export function ratio(larger, smaller) {
  if (larger == null || smaller == null || smaller === 0) {
    return null;
  }
  return `${(larger / smaller).toFixed(1)}x`;
}
