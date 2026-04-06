/**
 * Sarah's Daily Brief — Full Pipeline Orchestrator
 * Run by Fred (Claude) to kick off Sarah's daily marketing work
 * Usage: node daily-brief.js [--content] [--quora] [--reddit] [--all]
 * Default (no flags): reddit + quora
 * --content: also generate weekly content batch
 * --all: run everything
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const RUN_CONTENT = args.includes('--content') || args.includes('--all');
const RUN_QUORA = !args.includes('--reddit') || args.includes('--all') || args.includes('--quora');
const RUN_REDDIT = !args.includes('--quora') || args.includes('--all') || args.includes('--reddit');
const NUM_DRAFTS = 5;

const TOOLS_DIR = __dirname;
const DRAFTS_DIR = path.join(__dirname, '../outputs/drafts');
const OUT_DIR = path.join(__dirname, '../outputs');
const date = new Date().toISOString().split('T')[0];
const isMonday = new Date().getDay() === 1;

if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });

function runTool(script, args = []) {
  return new Promise((resolve) => {
    const proc = spawn('node', [script, ...args], { cwd: TOOLS_DIR });
    let out = '';
    proc.stdout.on('data', d => { out += d; process.stdout.write(d); });
    proc.stderr.on('data', d => process.stderr.write(d));
    proc.on('close', () => resolve(out));
  });
}

function extractMarker(output, marker) {
  const match = output.match(new RegExp(`${marker}:(.+)`));
  return match ? match[1].trim() : null;
}

(async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  FUN SMALL TALK - SARAH'S DAILY BRIEF`);
  console.log(`  Orchestrated by Fred | ${date}`);
  console.log(`${'='.repeat(60)}\n`);

  const results = {};

  // --- REDDIT ---
  if (RUN_REDDIT) {
    console.log('--- REDDIT PIPELINE ---\n');
    const searchOut = await runTool('reddit-search.js', ['15']);
    const postsFile = extractMarker(searchOut, '__OUTPUT_FILE__');

    if (postsFile && fs.existsSync(postsFile)) {
      const posts = JSON.parse(fs.readFileSync(postsFile));
      results.reddit_posts = posts.length;
      results.reddit_top = posts.slice(0, 3);

      const draftsOut = await runTool('draft-comments.js', [postsFile, String(NUM_DRAFTS)]);
      results.reddit_drafts_file = extractMarker(draftsOut, '__DRAFTS_FILE__');
    }
  }

  // --- QUORA ---
  if (RUN_QUORA) {
    console.log('\n--- QUORA PIPELINE ---\n');
    const quoraOut = await runTool('quora-drafts.js');
    results.quora_file = extractMarker(quoraOut, '__QUORA_FILE__');
  }

  // --- CONTENT (Mondays or --content flag) ---
  if (RUN_CONTENT || isMonday) {
    console.log('\n--- WEEKLY CONTENT BATCH ---\n');
    const contentOut = await runTool('content-writer.js');
    results.content_file = extractMarker(contentOut, '__CONTENT_FILE__');
  }

  // --- BUILD BRIEF ---
  const briefFile = path.join(OUT_DIR, `daily-brief-${date}.md`);
  let brief = `# Sarah's Daily Brief - ${date}\n`;
  brief += `*Orchestrated by Fred*\n\n---\n\n`;

  if (results.reddit_top) {
    brief += `## Top Reddit Opportunities Today\n\n`;
    results.reddit_top.forEach((p, i) => {
      brief += `${i+1}. **[r/${p.sub}]** ${p.title}\n`;
      brief += `   ${p.score} upvotes | ${p.comments} comments | ${p.age_hours}h ago\n`;
      brief += `   ${p.url}\n\n`;
    });
    brief += `*Found ${results.reddit_posts} total posts. See all opportunities in the drafts file.*\n\n`;
  }

  brief += `## Today's Output Files\n\n`;
  if (results.reddit_drafts_file) brief += `- **Reddit drafts:** \`${path.basename(results.reddit_drafts_file)}\`\n`;
  if (results.quora_file) brief += `- **Quora answers:** \`${path.basename(results.quora_file)}\`\n`;
  if (results.content_file) brief += `- **Content batch:** \`${path.basename(results.content_file)}\`\n`;

  brief += `\n## Action Items\n\n`;
  brief += `- [ ] Review Reddit drafts and post the best 2-3\n`;
  brief += `- [ ] Review Quora answers and post 1-2 on Quora\n`;
  if (results.content_file || isMonday) brief += `- [ ] Review content batch, schedule for the week\n`;
  brief += `- [ ] Check DMs for follow-up opportunities\n`;

  const allDrafts = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
  brief += `\n## Queue Stats\n\n`;
  brief += `- Total draft files in queue: ${allDrafts.length}\n`;
  if (results.reddit_posts) brief += `- Reddit posts found today: ${results.reddit_posts}\n`;

  fs.writeFileSync(briefFile, brief);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Fred here. Sarah's daily brief is ready.`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nBrief:   ${briefFile}`);
  if (results.reddit_drafts_file) console.log(`Reddit:  ${results.reddit_drafts_file}`);
  if (results.quora_file) console.log(`Quora:   ${results.quora_file}`);
  if (results.content_file) console.log(`Content: ${results.content_file}\n`);
})();
