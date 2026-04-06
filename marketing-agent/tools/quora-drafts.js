/**
 * Sarah's Quora Answer Drafter
 * Finds relevant Quora questions via Perplexity and drafts expert answers using Gemini
 * Usage: node quora-drafts.js
 * Output: outputs/drafts/quora-[date].md
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

fs.readFileSync('/Users/omerbiton/AI Agents/.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

// High-value Quora question templates — real questions people ask
const QUORA_QUESTIONS = [
  "How do I get better at small talk? I always run out of things to say.",
  "Why does small talk feel so fake and forced to me? I'm an introvert.",
  "How can I stop being awkward at networking events?",
  "What are some good conversation starters that don't feel weird?",
  "How do introverts get better at socializing without pretending to be extroverts?",
  "I freeze up in social situations and forget what to say. How do I fix this?",
  "How do you keep a conversation going when there's an awkward silence?",
  "Is social anxiety something you can overcome, or do you just learn to live with it?"
];

function postRequest(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error(`Parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function findRecentQuoraQuestions() {
  if (!PERPLEXITY_KEY) {
    console.log('No Perplexity key — using curated question list.');
    return null;
  }
  try {
    const result = await postRequest(
      'api.perplexity.ai',
      '/chat/completions',
      { 'Authorization': `Bearer ${PERPLEXITY_KEY}`, 'Content-Type': 'application/json' },
      {
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'system', content: 'Return a JSON array of 5 real Quora question titles about small talk, social anxiety, networking, or social skills. Format: ["question1", "question2", ...]. Only the JSON array, nothing else.' },
          { role: 'user', content: 'Find 5 recent popular Quora questions about small talk, social anxiety at work, or how to get better at socializing.' }
        ],
        max_tokens: 400
      }
    );
    const text = result.choices?.[0]?.message?.content || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch(e) {
    console.log('Perplexity lookup failed, using curated list.');
  }
  return null;
}

async function draftAnswer(question) {
  const system = `You are Sarah, writing a Quora answer as Omer Biton — creator of Fun Small Talk (funsmalltalk.com), an online social skills course with 342+ students and 98% satisfaction.

COURSE MARKETING EXPERTISE:
Quora answers are middle-of-funnel content. The reader is already considering solutions — they're in research mode. Your job: become the most credible, helpful voice on this topic so they trust Omer and consider his course.

What converts on Quora:
- Specific insight (not generic "just practice more" advice)
- Named frameworks they can remember ("The Sparkle Method", "Topic Web")
- Personal credibility markers (MBA, businesses in 3 countries, built this course from lived experience)
- A soft CTA at the end — not a hard sell

WRITING RULES:
- 300-400 words. Expert-level depth.
- Lead with a direct, confident statement that establishes authority immediately
- Give one named framework or specific technique they won't find in generic articles
- Include a brief personal story or example
- Write in flowing paragraphs — no bullet lists
- No em dashes
- Mention Fun Small Talk naturally at the end, max one sentence
- Tone: smart friend who figured it out, not a life coach or professor`;

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: `Write a Quora answer to this question: "${question}"` }] }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.8 }
  });

  return new Promise((resolve, reject) => {
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

(async () => {
  const date = new Date().toISOString().split('T')[0];
  const outDir = path.join(__dirname, '../outputs/drafts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `quora-${date}.md`);

  console.log('\nSarah finding Quora questions...\n');

  // Try Perplexity for real questions, fall back to curated list
  let questions = await findRecentQuoraQuestions();
  if (!questions || !questions.length) {
    // Pick 3 random from curated list
    const shuffled = QUORA_QUESTIONS.sort(() => Math.random() - 0.5);
    questions = shuffled.slice(0, 3);
  } else {
    questions = questions.slice(0, 3);
  }

  console.log(`Drafting answers for ${questions.length} questions:\n`);
  questions.forEach((q, i) => console.log(`  ${i+1}. ${q}`));
  console.log('');

  let md = `# Quora Answer Drafts — ${date}\n\nReview and post manually on Quora. Edit freely.\n\n---\n\n`;
  let count = 0;

  for (const [i, question] of questions.entries()) {
    console.log(`[${i+1}/${questions.length}] Drafting answer...`);
    try {
      const answer = await draftAnswer(question);
      md += `## Q: ${question}\n\n`;
      md += `**DRAFT ANSWER:**\n\n${answer}\n\n---\n\n`;
      count++;
      console.log(`   Done (${answer.split(' ').length} words)\n`);
    } catch(e) {
      console.error(`   Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }

  fs.writeFileSync(outFile, md);
  console.log(`Sarah drafted ${count} Quora answers.`);
  console.log(`Saved to: ${outFile}`);
  process.stdout.write(`__QUORA_FILE__:${outFile}\n`);
})();
