/**
 * Sarah's Comment Drafter
 * Takes Reddit posts JSON and drafts value-first replies using Gemini
 * Usage: node draft-comments.js /tmp/reddit-posts-xxx.json [max_drafts]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const POSTS_FILE = process.argv[2];
const MAX = parseInt(process.argv[3] || '5');

if (!POSTS_FILE || !fs.existsSync(POSTS_FILE)) {
  console.error('Usage: node draft-comments.js <posts-json-file> [max_drafts]');
  process.exit(1);
}

// Load env
fs.readFileSync('/Users/omerbiton/AI Agents/.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const SYSTEM_INSTRUCTION = `You are Sarah, an expert course marketing AI drafting Reddit comments for Omer Biton, creator of Fun Small Talk (funsmalltalk.com).

Fun Small Talk is an online social skills course: 3 modules (Social Mindset, Communication Mechanics, Influence & Connection), 342+ students, 98% satisfaction, 30-day guarantee.

COURSE MARKETING EXPERTISE:
You understand the Trust Ladder — strangers must become followers before they become buyers. Comments are top-of-funnel. Your job is to move people one rung up the ladder by being genuinely helpful, NOT to make a sale.

COMMENT RULES:
- Write as Omer: first person, warm, direct, real — not a marketer
- Follow the 3-value-first rule: empathy → insight → actionable tip → THEN maybe a soft mention
- 150-250 words. Complete sentences. Never cut off mid-thought.
- Mention Fun Small Talk only when it flows naturally after real value — one sentence max
- NO em dashes. No bullet points. Flowing paragraphs only.
- Match the poster's energy: struggling = be warm and human. Asking for tips = be direct and specific.
- The "Sparkle Method": respond to the SPECIFIC detail they shared, not the general topic
- Always end on a complete, encouraging note`;


function gemini(userPrompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.8 }
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
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const finishReason = parsed.candidates?.[0]?.finishReason || 'UNKNOWN';
          if (finishReason !== 'STOP') {
            console.warn(`   Warning: finishReason = ${finishReason}`);
          }
          resolve(text);
        } catch(e) { reject(new Error(`JSON parse failed: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  const posts = JSON.parse(fs.readFileSync(POSTS_FILE)).slice(0, MAX);
  const drafts = [];
  const date = new Date().toISOString().split('T')[0];

  console.log(`\nSarah drafting comments for ${posts.length} posts...\n`);

  for (const [i, post] of posts.entries()) {
    console.log(`[${i+1}/${posts.length}] ${post.title.slice(0, 60)}...`);

    const prompt = `POST TITLE: ${post.title}
POST TEXT: ${post.text || '(no body text)'}
SUBREDDIT: r/${post.sub}
UPVOTES: ${post.score} | COMMENTS: ${post.comments}
POST URL: ${post.url}

Draft a genuine, helpful Reddit comment reply to this post.`;

    try {
      const reply = await gemini(prompt);
      drafts.push({
        subreddit: `r/${post.sub}`,
        post_title: post.title,
        post_url: post.url,
        post_stats: `${post.score} upvotes | ${post.comments} comments | ${post.age_hours}h old`,
        draft: reply.trim()
      });
      console.log(`   Done (${reply.split(' ').length} words)\n`);
    } catch(e) {
      console.error(`   Error: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 800));
  }

  // Save markdown
  const outDir = path.join(__dirname, '../outputs/drafts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `reddit-${date}.md`);

  let md = `# Reddit Comment Drafts — ${date}\n\nGenerated ${drafts.length} drafts. Review before posting.\n\n---\n\n`;
  drafts.forEach((d, i) => {
    md += `## ${i+1}. ${d.post_title}\n\n`;
    md += `**Subreddit:** ${d.subreddit}  \n`;
    md += `**Stats:** ${d.post_stats}  \n`;
    md += `**URL:** ${d.post_url}\n\n`;
    md += `**DRAFT:**\n\n${d.draft}\n\n---\n\n`;
  });

  fs.writeFileSync(outFile, md);
  console.log(`Saved ${drafts.length} drafts to: ${outFile}`);
  process.stdout.write(`__DRAFTS_FILE__:${outFile}\n`);
})();
