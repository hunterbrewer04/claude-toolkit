# Stop Hook Python Example

A complete, production-ready Stop hook that verifies tests were run before allowing the agent to stop.

## Script: `.claude/hooks/verify-tests-ran.py`

```python
#!/usr/bin/env python3
"""Stop hook: Verify tests were run before allowing agent to stop."""
import json
import os
import sys
import time

def main():
    # Read all stdin (required)
    try:
        input_data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        # Malformed input — fail open
        sys.exit(0)

    cwd = input_data.get("cwd", os.getcwd())
    transcript_path = input_data.get("transcript_path", "")

    # Check if tests were run recently by looking at transcript
    tests_ran = False
    if transcript_path and os.path.exists(transcript_path):
        try:
            with open(transcript_path, "r") as f:
                transcript = f.read()
                # Look for common test commands in the transcript
                test_indicators = [
                    "npm test", "npm run test",
                    "pytest", "python -m pytest",
                    "go test", "cargo test",
                    "jest", "vitest", "mocha",
                    "rspec", "bundle exec rspec",
                ]
                tests_ran = any(indicator in transcript for indicator in test_indicators)
        except (IOError, PermissionError):
            # Can't read transcript — fail open
            sys.exit(0)

    if not tests_ran:
        # Block stopping — output structured JSON
        result = {
            "decision": "block",
            "reason": "No test execution detected in this session",
            "systemMessage": "Run the project's test suite before completing the task."
        }
        print(json.dumps(result))
        sys.exit(0)  # Exit 0 with JSON — not exit 2

    # Tests were run — approve stopping
    result = {
        "decision": "approve",
        "reason": "Tests were executed during this session"
    }
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    main()
```

## Configuration: `.claude/settings.json`

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/verify-tests-ran.py",
            "timeout": 30
          }
        ],
        "description": "Verify tests were run before allowing agent to stop"
      }
    ]
  }
}
```

## Testing

```bash
# Test: should block (no transcript or no tests in transcript)
echo '{"session_id":"test","cwd":"/tmp","hook_event_name":"Stop","transcript_path":"/nonexistent"}' | python3 .claude/hooks/verify-tests-ran.py
echo "Exit: $?"  # Should be 0, stdout should contain decision: block

# Test: malformed JSON (should fail open)
echo "not json" | python3 .claude/hooks/verify-tests-ran.py
echo "Exit: $?"  # Should be 0
```

## Key Patterns Demonstrated

1. **JSON stdin parsing** with try/except for malformed input
2. **Fail-open design** — any error results in exit 0 (allow)
3. **Structured JSON output** on stdout with `decision` field
4. **Exit 0 with JSON** — not exit 2 (JSON is ignored with exit 2)
5. **Transcript inspection** for detecting prior actions
6. **Defensive file I/O** with permission error handling
