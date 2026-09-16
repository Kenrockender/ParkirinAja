import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const files = process.argv.slice(2);
const zai = await ZAI.create();
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const res = await zai.chat.completions.create({
    messages: [
      { role: 'user', content: [
        { type: 'text', text: 'Rate this mobile operator console UI 1-10. Check: text overflow/clipping, contrast issues, broken layout, overlapping elements, chart rendering (donut ring, bar charts). Reply in under 80 words. Format: SCORE: n/10, ISSUES: ...' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ]},
    ],
  });
  console.log('=== ' + f.split('/').pop() + ' ===');
  console.log(res.choices[0]?.message?.content?.slice(0, 500));
}
