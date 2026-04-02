# Canvas LMS Skill

Pull course data from your Canvas account directly inside Claude Code sessions — assignments, grades, files, announcements, quizzes, and more.

## Setup

### 1. Generate a Canvas API Token

1. Log into your Canvas account
2. Go to **Account** (top-left avatar) → **Settings**
3. Scroll to **Approved Integrations**
4. Click **New Access Token**
5. Give it a name (e.g., "Claude Code") and optionally set an expiry
6. Copy the token — **you won't see it again**

### 2. Find Your School's Canvas URL

Your Canvas URL is the base domain your school uses — for example:
- `https://canvas.yourschool.edu`
- `https://yourschool.instructure.com`

It's the domain you see in your browser when you log in, without any path after it.

### 3. Add Environment Variables

Add both variables to your shell profile (`~/.zshrc` for zsh):

```bash
export CANVAS_API_TOKEN="your_token_here"
export CANVAS_BASE_URL="https://canvas.yourschool.edu"
```

Then reload your shell:

```bash
source ~/.zshrc
```

Verify they're set:

```bash
echo $CANVAS_API_TOKEN  # should print your token
echo $CANVAS_BASE_URL   # should print your school URL
```

## Usage

The skill triggers automatically when you ask Canvas-related questions in any Claude Code session.

### Example Prompts

**Deadlines & planning:**
- "What's due this week on Canvas?"
- "What do I have coming up in my courses?"
- "Check my canvas planner"

**Assignment help:**
- "Tell me about my HCE 1700 assignments"
- "What's the rubric for my philosophy paper?"
- "Help me understand this assignment"

**Grades:**
- "How am I doing in my courses?"
- "What's my current grade in HCE 1700?"
- "Did my last assignment get graded?"

**Files & materials:**
- "List the files in my HCE 1700 course"
- "Pull the syllabus from Canvas"
- "Download the rubric for my paper"

**Announcements & discussions:**
- "Any new announcements in my courses?"
- "What discussions are open this week?"

**Quizzes:**
- "Do I have any quizzes coming up?"
- "What did I get on my last quiz?"

## What Data Is Accessed

This skill is **read-only** — it never submits, posts, or modifies anything without your explicit confirmation. It accesses:

| Data | How It's Used |
|------|--------------|
| Course list | Identify which course you're asking about |
| Assignments | Show due dates, descriptions, rubrics |
| Submission status | Check if work is submitted and graded |
| Grades | Show current scores and course grades |
| Files | List and optionally download course materials |
| Planner/Calendar | Show what's upcoming across all courses |
| Announcements | Summarize instructor posts |
| Discussions | Show open discussion topics |
| Quizzes | Show upcoming quizzes and scores |

## Security Notes

- The API token is stored in your shell environment, not in any file in this repo
- The token is never printed to output by this skill
- The token only has access to your own Canvas account data
- You can revoke the token at any time in Canvas → Account → Settings → Approved Integrations

## Troubleshooting

**"MISSING: CANVAS_API_TOKEN"** — Run `source ~/.zshrc` to reload env vars, or add the export to your shell profile.

**401 Unauthorized** — Your token may have expired or been revoked. Generate a new one in Canvas.

**Empty results** — Your `CANVAS_BASE_URL` may be wrong. Try logging into Canvas and copying the domain from your browser's address bar.

**"New Quizzes" not showing** — Some schools use Canvas's newer quiz engine which has a separate API path. The skill will try to detect this automatically.
