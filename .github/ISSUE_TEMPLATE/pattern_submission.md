---
name: Pattern Submission
about: Submit a new command safety pattern
title: '[PATTERN] '
labels: pattern, enhancement
assignees: ''

---

**Pattern Type**
- [ ] Dangerous (will be blocked by default)
- [ ] Suspicious (will show warning)
- [ ] Whitelisted (override blocking)

**Pattern Details**

**Name:** `pattern_name_here`

**Regex Pattern:**
```regex
^your_regex_pattern_here
```

**Description:**
Clear description of what this pattern detects and why it's dangerous/suspicious.

**Severity Level:**
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

**Example Commands:**

Commands that SHOULD match:
```bash
example command 1
example command 2
```

Commands that should NOT match:
```bash
safe command 1
safe command 2
```

**Why This Pattern is Needed:**
Explain the security concern or use case for this pattern.

**Testing:**

Have you tested this pattern?
- [ ] Yes, using `manage-patterns.ts test`
- [ ] No, need help testing

Test results:
```
Paste test output here
```

**Impact Assessment:**

Could this pattern cause false positives?
- [ ] No, very specific
- [ ] Possibly, needs review
- [ ] Yes, but acceptable

**Related Patterns:**
List any existing patterns that are similar or related.

**Additional Context:**
Add any other context, references, or documentation links.

**JSON Configuration (Optional):**
```json
{
  "name": "pattern_name",
  "pattern": "^regex_here",
  "description": "Description here",
  "severity": "high",
  "enabled": true,
  "examples": ["example 1", "example 2"]
}
```
