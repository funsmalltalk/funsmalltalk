# Workflow: Daily Marketing Routine (15-20 min)

## Trigger
Run every morning or say "run daily marketing brief"

## Steps

### 1. Find Opportunities (5 min)
Run the Reddit/Quora agent to find today's best posts to engage with.
Target: 3-5 posts worth replying to.

### 2. Draft Comments (5 min)
For each opportunity found, draft a reply using the comment-drafting skill.
Save to `outputs/drafts/reddit-quora-[date].md`

### 3. Check DM Pipeline (2 min)
Review any open DM sequences. If a follow-up is due today, draft Message 2 or 3.

### 4. Queue One Piece of Content (5 min)
Either:
- Pull a ready draft from `outputs/drafts/` and mark it ready to post
- Or generate one new piece of content using the content-writer agent

### 5. Generate Brief
Output daily brief to `outputs/daily-brief-[date].md`

---

# Workflow: Weekly Content Batch (30 min)

## Trigger
Run on Sundays or say "create this week's content"

## Steps

1. Pick the weekly theme (or use the monthly theme rotation from content-calendar.md)
2. Generate 5-7 posts across platforms using content-writer agent
3. Save all to `outputs/drafts/weekly-batch-[date].md`
4. Omer reviews and approves before posting

---

# Workflow: Deep Engagement Sprint (1 hour)

## Trigger
"I have an hour for marketing"

## Steps

1. Run audience-research skill to find the best threads this week
2. Draft 10 high-quality Reddit/Quora replies
3. Draft 5-10 Instagram/TikTok comment responses
4. Draft 1 Quora long-form answer (300-600 words)
5. Generate one piece of original content
6. Save everything to `outputs/drafts/sprint-[date].md`
7. Output summary: total drafts created, estimated reach
