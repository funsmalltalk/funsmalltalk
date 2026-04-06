/**
 * Reddit Search Tool
 * Searches target subreddits for high-intent posts about social skills / small talk
 * Uses Reddit's public JSON API — no auth needed
 * Usage: node reddit-search.js [limit]
 */

const https = require('https');

const LIMIT = parseInt(process.argv[2] || '20');

const SEARCHES = [
  { sub: 'socialskills', query: 'small talk awkward' },
  { sub: 'socialskills', query: 'networking how to' },
  { sub: 'introvert', query: 'conversation tips' },
  { sub: 'socialanxiety', query: 'small talk work event' },
  { sub: 'careerguidance', query: 'networking awkward' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'FunSmallTalkResearch/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function score(post) {
  let s = 0;
  if (post.score > 10) s += 2;
  if (post.score > 50) s += 2;
  if (post.num_comments > 5) s += 1;
  if (post.num_comments < 20) s += 2; // less competition
  const age = (Date.now() / 1000) - post.created_utc;
  if (age < 86400) s += 3;      // < 1 day
  else if (age < 172800) s += 2; // < 2 days
  else if (age < 604800) s += 1; // < 1 week
  // Boost if title matches high-intent keywords
  const title = (post.title + ' ' + (post.selftext || '')).toLowerCase();
  const keywords = ['small talk', 'awkward', "don't know what to say", 'networking', 'invisible', 'introvert', 'anxious', 'conversation'];
  keywords.forEach(k => { if (title.includes(k)) s += 1; });
  return s;
}

(async () => {
  const results = [];

  for (const { sub, query } of SEARCHES) {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10&restrict_sr=1&t=week`;
      const data = await fetch(url);
      const posts = data?.data?.children?.map(c => c.data) || [];
      posts.forEach(p => {
        if (p.is_self && p.score >= 1) {
          results.push({
            sub: p.subreddit,
            title: p.title,
            text: (p.selftext || '').slice(0, 300),
            score: p.score,
            comments: p.num_comments,
            url: `https://reddit.com${p.permalink}`,
            age_hours: Math.round((Date.now() / 1000 - p.created_utc) / 3600),
            relevance: score(p)
          });
        }
      });
    } catch(e) {
      console.error(`Error fetching r/${sub}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500)); // be polite
  }

  // Also grab hot posts from key subs
  for (const sub of ['socialskills', 'introvert', 'socialanxiety']) {
    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=15`;
      const data = await fetch(url);
      const posts = data?.data?.children?.map(c => c.data) || [];
      posts.forEach(p => {
        if (p.is_self) {
          const title = (p.title + ' ' + (p.selftext || '')).toLowerCase();
          const keywords = ['small talk', 'awkward', "don't know", 'networking', 'conversation', 'introvert', 'social'];
          const relevant = keywords.some(k => title.includes(k));
          if (relevant) {
            results.push({
              sub: p.subreddit,
              title: p.title,
              text: (p.selftext || '').slice(0, 300),
              score: p.score,
              comments: p.num_comments,
              url: `https://reddit.com${p.permalink}`,
              age_hours: Math.round((Date.now() / 1000 - p.created_utc) / 3600),
              relevance: score(p)
            });
          }
        }
      });
    } catch(e) {
      console.error(`Error fetching r/${sub} hot: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Sort by relevance score
  unique.sort((a, b) => b.relevance - a.relevance);
  const top = unique.slice(0, LIMIT);

  console.log(`\nFound ${top.length} relevant posts:\n`);
  top.forEach((p, i) => {
    console.log(`${i + 1}. [r/${p.sub}] ${p.title}`);
    console.log(`   Score: ${p.score} | Comments: ${p.comments} | Age: ${p.age_hours}h | Relevance: ${p.relevance}`);
    if (p.text) console.log(`   "${p.text.slice(0, 120)}..."`);
    console.log(`   ${p.url}`);
    console.log('');
  });

  // Save JSON for draft-comments.js to consume
  const fs = require('fs');
  const out = `/tmp/reddit-posts-${Date.now()}.json`;
  fs.writeFileSync(out, JSON.stringify(top, null, 2));
  console.log(`Saved to: ${out}`);
  process.stdout.write(`__OUTPUT_FILE__:${out}\n`);
})();
