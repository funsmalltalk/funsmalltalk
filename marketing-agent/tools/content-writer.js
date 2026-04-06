/**
 * Sarah's Content Writer
 * Generates original social media content for Fun Small Talk
 * Usage: node content-writer.js
 * Output: outputs/drafts/content-[date].md
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

fs.readFileSync('/Users/omerbiton/AI Agents/.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const BRAND = `You are Sarah, an expert course marketing AI for Fun Small Talk (funsmalltalk.com) — an online social skills course by Omer Biton.

PRODUCT:
- Fun Small Talk teaches small talk, social confidence, and conversation skills
- 3 modules: Social Mindset, Communication Mechanics, Influence & Connection
- 342+ students, 98% satisfaction, 30-day money-back guarantee
- Pricing: $197 self-paced / $397 cohort / $997 VIP coaching

AUDIENCE:
- Young professionals 22-35, introverts, post-pandemic socially rusty people
- People who dread networking events, feel invisible in social situations
- "I know what to say in my head but the words don't come out right"

BRAND VOICE:
- Warm, direct, honest. Real person who figured it out, not a guru.
- Ali Abdaal-style: relatable, data-backed, no cringe motivation fluff.
- Tagline: Stop Fearing The Awkward Silence

COURSE MARKETING EXPERTISE:
- You understand the Trust Ladder: Stranger > Follower > Reader > Believer > Buyer
- Content job is to move people UP the ladder, not sell directly
- Best converting formats: "I used to struggle until...", myth-busting, named frameworks, transformation stories
- Give away the WHAT and WHY for free. Sell the HOW (structured implementation).
- Social proof > everything else. Use specifics: "342 students", "30-min conversation at a party"

WRITING RULES:
- No em dashes (use commas or periods)
- No cringe: no "unlock your potential", "manifest", "crush it", "game-changer"
- Short sentences. One idea per line for social posts.
- First person as Omer. Confident, human, never salesy.
- End with complete thoughts — no cutting off mid-sentence.
- Only soft-mention the course at the END and only if it fits naturally.`;

function gemini(systemInstruction, userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.9 }
    });
    const url = new URL(GEMINI_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '');
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Randomly pick from topic pools to keep content fresh
const RELATABLE_TOPICS = [
  "walking into a room where you don't know anyone",
  "running out of things to say mid-conversation",
  "that moment when there's an awkward silence and you panic",
  "watching someone else light up a room and wondering how they do it",
  "rehearsing what to say in your head but freezing when the moment comes",
  "dreading the 'so what do you do?' question at networking events",
  "feeling exhausted after social events even when they went fine"
];

const QUICKWIN_TOPICS = [
  "the one question that kills awkward silences instantly",
  "why you should stop trying to be interesting and do this instead",
  "the 3-second rule before entering any social situation",
  "how to exit a conversation gracefully without it being awkward",
  "the topic web: how to never run out of things to say",
  "why asking follow-up questions beats having good stories",
  "the spotlight effect: why people notice you far less than you think"
];

const MYTH_TOPICS = [
  "small talk is NOT about finding common ground",
  "being a good listener is NOT about staying quiet",
  "introversion does NOT mean you're bad at socializing",
  "confidence is NOT something you either have or you don't",
  "networking is NOT about collecting contacts"
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const PIECES = [
  {
    label: 'Instagram Caption 1 (Relatable Moment)',
    platform: 'Instagram',
    prompt: `Write an Instagram caption using the RELATABLE MOMENT format.
Topic: ${pick(RELATABLE_TOPICS)}

Format:
- Line 1: The hook (scroll-stopper, under 10 words, no period)
- Lines 2-5: Short punchy lines building the relatable feeling
- Last line: Soft question that invites comments ("Anyone else feel this? Drop a comment")
- New line: 3 relevant hashtags

Rules: No em dashes. Short sentences. One idea per line. Max 120 words in body.`
  },
  {
    label: 'Instagram Caption 2 (Myth-Bust or Quick Win)',
    platform: 'Instagram',
    prompt: `Write an Instagram caption using either MYTH-BUSTING or QUICK WIN format.
Topic: ${pick([...MYTH_TOPICS, ...QUICKWIN_TOPICS])}

If myth-busting: Start with the myth as the hook, then flip it with the real insight.
If quick win: Hook → 2-line setup → the tip → one-line payoff.

Rules: No em dashes. Max 130 words. 3 hashtags at end on new line.`
  },
  {
    label: 'TikTok Script 1 (Contrarian/Pattern Interrupt)',
    platform: 'TikTok',
    prompt: `Write a TikTok video script using the CONTRARIAN format.
Topic: ${pick(MYTH_TOPICS)}

Format:
HOOK (3 seconds, under 10 words — make it provocative or surprising):

BODY (30-45 seconds — explain why the conventional wisdom is wrong, give the real insight):

CTA (5 seconds — soft, natural):

Tone: Direct, confident, a little edgy. Not preachy.`
  },
  {
    label: 'TikTok Script 2 (Personal Story)',
    platform: 'TikTok',
    prompt: `Write a TikTok script using the PERSONAL STORY format.
Topic: A specific real moment from Omer's experience — walking into a room alone, bombed conversation, or breakthrough moment.

Format:
HOOK (3 seconds — start mid-story, something like "I was standing at a networking event..."):

BODY (40-50 seconds — tell the story: setup, what went wrong or right, what it taught you):

CTA (5 seconds):

Tone: Vulnerable, real, not polished. First person throughout.`
  },
  {
    label: 'LinkedIn Post (Professional ROI of Social Skills)',
    platform: 'LinkedIn',
    prompt: `Write a LinkedIn post for Omer Biton.
Topic: The business/career ROI of social skills — one specific angle like: deals closed through small talk, salary negotiations, getting promoted, or building a network that opens doors.

Format:
- Strong first line (no "I'm excited to share" or "Hot take:")
- 3-4 short paragraphs, each with one idea
- End with a genuine question to the reader
- Max 200 words

Tone: Professional but real. Not corporate, not self-help.`
  },
  {
    label: 'Reddit Value Post (r/socialskills or r/introvert)',
    platform: 'Reddit',
    prompt: `Write a Reddit post for Omer to post as himself.
Subreddit: r/socialskills or r/introvert (pick whichever fits better)
Topic: ${pick([...QUICKWIN_TOPICS, ...MYTH_TOPICS])}

Rules:
- Pure value. Zero mention of any course or product.
- Write as a person sharing something that worked for them, not an expert lecturing.
- Format: Conversational title + 2-3 paragraphs + open question to the community.
- Max 250 words total.`
  }
];

(async () => {
  const date = new Date().toISOString().split('T')[0];
  const outDir = path.join(__dirname, '../outputs/drafts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `content-${date}.md`);

  console.log('\nSarah generating this week\'s content...\n');

  let md = `# Content Drafts — ${date}\n\nReview before posting. All pieces are drafts — edit freely.\n\n---\n\n`;
  let count = 0;

  for (const piece of PIECES) {
    console.log(`Generating: ${piece.label}...`);
    try {
      const result = await gemini(BRAND, piece.prompt);
      md += `## ${piece.label}\n\n`;
      md += `**Platform:** ${piece.platform}\n\n`;
      md += `${result}\n\n---\n\n`;
      count++;
      console.log(`   Done (${result.split(' ').length} words)\n`);
    } catch(e) {
      console.error(`   Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  fs.writeFileSync(outFile, md);
  console.log(`\nSarah generated ${count} pieces of content.`);
  console.log(`Saved to: ${outFile}`);
  process.stdout.write(`__CONTENT_FILE__:${outFile}\n`);
})();
