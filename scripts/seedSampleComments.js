// seedSampleComments.js
// Adds diverse sample comments and upvotes to both builds and posts.
// Uses firebase-admin with robust service account resolution.
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function findServiceAccount() {
  const candidates = [
    path.resolve(__dirname, '../tttt-ed355-firebase-adminsdk-fbsvc-3946310111.json'),
    path.resolve(process.cwd(), 'tttt-ed355-firebase-adminsdk-fbsvc-3946310111.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        return json;
      }
    } catch {
      // continue
    }
  }

  // Last resort: scan project root for a likely admin key
  try {
    const root = process.cwd();
    const files = fs.readdirSync(root);
    const match = files.find((f) => /firebase-adminsdk.*\.json$/i.test(f));
    if (match) {
      const p = path.resolve(root, match);
      const json = JSON.parse(fs.readFileSync(p, 'utf8'));
      return json;
    }
  } catch {}

  throw new Error('Service account JSON not found. Set GOOGLE_APPLICATION_CREDENTIALS or place the JSON in project root.');
}

const serviceAccount = findServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://tttt-ed355-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const db = admin.database();

// Sample pool of users and messages (Vietnamese + short English variety)
const sampleUsers = [
  { id: 'seed-bot-1', email: 'linh.nguyen@example.com' },
  { id: 'seed-bot-2', email: 'minh.tran@example.com' },
  { id: 'seed-bot-3', email: 'hoa.le@example.com' },
  { id: 'seed-bot-4', email: 'khang.vo@example.com' },
  { id: 'seed-bot-5', email: 'anh.pham@example.com' },
  { id: 'seed-bot-6', email: 'thao.dang@example.com' },
  { id: 'seed-bot-7', email: 'tuan.do@example.com' },
];

const buildMessages = [
  'Build ngon đó! Giá này quá ổn 🔥',
  'Thử nâng cấp RAM lên 32GB xem, đa nhiệm mượt hơn.',
  'Nguồn 650W hơi đuối nếu sau này nâng GPU mạnh.',
  'Case nhìn xịn xò ghê, airflow ổn không?',
  'CPU/GPU balance đẹp, chơi game tầm cao ok.',
  'SSD 1TB là hợp lý, load app/phim nhanh cực.',
  'Nice setup! Cable management ổn áp 👌',
  'Maybe go with a better cooler for sustained boost.',
  'Màn 144Hz khá hợp build này đấy!',
  'Price/perf ratio quá ngon luôn.',
];

const postMessages = [
  'Bài chia sẻ hữu ích, cảm ơn bạn!',
  'Bạn cho xin benchmark game Apex không?',
  'Có thể gợi ý main khác tầm giá này không?',
  'Mình cũng dùng GPU này, rất ổn định.',
  'Ảnh build đẹp quá, chúc mừng nhé!',
  'Thử undervolt GPU sẽ mát hơn đó.',
  'Khá tối ưu cho nhu cầu đồ họa.',
  'This looks great! Any thermal issues?',
  'Solid choice for 1080p high settings.',
  'Mình quan tâm tiếng ồn, dùng fan nào vậy?',
];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

function makeComment(msgs) {
  const user = pick(sampleUsers);
  return {
    userId: user.id,
    userEmail: user.email,
    content: pick(msgs),
    createdAt: Date.now() - rand(1000 * 60 * 60 * 24 * 7), // within last 7 days
  };
}

async function seedBuildComments({ minPerBuild = 2, maxPerBuild = 4 } = {}) {
  const snap = await db.ref('builds').once('value');
  if (!snap.exists()) {
    console.log('No builds found, skip build comments.');
    return { touched: 0, added: 0 };
  }
  const builds = snap.val();
  let touched = 0;
  let added = 0;
  for (const [id, build] of Object.entries(builds)) {
    const existing = Array.isArray(build.comments) ? build.comments : [];
    const target = rand(maxPerBuild - minPerBuild + 1) + minPerBuild;
    if (existing.length >= target) continue; // already enough
    const toAdd = target - existing.length;
    const newComments = [...existing];
    for (let i = 0; i < toAdd; i++) {
      const c = makeComment(buildMessages);
      newComments.push({ id: String(Date.now() + i), ...c });
    }
    await db.ref(`builds/${id}/comments`).set(newComments);
    touched += 1;
    added += toAdd;
  }
  return { touched, added };
}

async function seedPostComments({ minPerPost = 2, maxPerPost = 5 } = {}) {
  const postsSnap = await db.ref('posts').once('value');
  if (!postsSnap.exists()) {
    console.log('No posts found, skip post comments.');
    return { touched: 0, added: 0 };
  }
  const posts = postsSnap.val();
  let touched = 0;
  let added = 0;
  for (const [postId, post] of Object.entries(posts)) {
    const commentsRef = db.ref(`comments/${postId}`);
    const cSnap = await commentsRef.once('value');
    const existing = cSnap.exists() ? cSnap.val() : null;
    const existingCount = existing ? Object.keys(existing).length : 0;
    const target = rand(maxPerPost - minPerPost + 1) + minPerPost;
    if (existingCount >= target) continue;
    const toAdd = target - existingCount;
    for (let i = 0; i < toAdd; i++) {
      const c = makeComment(postMessages);
      await commentsRef.push(c);
    }
    // Update post's commentCount
    const newCount = existingCount + toAdd;
    await db.ref(`posts/${postId}`).update({ commentCount: newCount });
    touched += 1;
    added += toAdd;
  }
  return { touched, added };
}

// Seed upvotes for builds by marking userVotes for seed users and updating votes count
async function seedBuildVotes({ minVotes = 3, maxVotes = 10 } = {}) {
  const snap = await db.ref('builds').once('value');
  if (!snap.exists()) {
    console.log('No builds found, skip build votes.');
    return { touched: 0, added: 0 };
  }
  const builds = snap.val();
  let touched = 0;
  let added = 0;
  for (const [id, build] of Object.entries(builds)) {
    const existingVotes = build.userVotes && typeof build.userVotes === 'object' ? build.userVotes : {};
    const currentCount = Object.values(existingVotes).filter(Boolean).length;
    const target = Math.max(currentCount, Math.min(maxVotes, Math.max(minVotes, currentCount + rand(4))));
    if (currentCount >= target) continue;
    const usersShuffled = [...sampleUsers].sort(() => Math.random() - 0.5);
    let addedHere = 0;
    for (const u of usersShuffled) {
      if (addedHere + currentCount >= target) break;
      if (!existingVotes[u.id]) {
        existingVotes[u.id] = true;
        addedHere++;
      }
    }
    const newCount = Object.values(existingVotes).filter(Boolean).length;
    await db.ref(`builds/${id}`).update({ userVotes: existingVotes, votes: newCount });
    touched += 1;
    added += addedHere;
  }
  return { touched, added };
}

// Seed upvotes for posts by setting votes map and voteCount
async function seedPostVotes({ minVotes = 2, maxVotes = 12 } = {}) {
  const snap = await db.ref('posts').once('value');
  if (!snap.exists()) {
    console.log('No posts found, skip post votes.');
    return { touched: 0, added: 0 };
  }
  const posts = snap.val();
  let touched = 0;
  let added = 0;
  for (const [id, post] of Object.entries(posts)) {
    const existingVotes = post.votes && typeof post.votes === 'object' ? post.votes : {};
    const currentCount = Object.keys(existingVotes).length;
    const target = Math.max(currentCount, Math.min(maxVotes, Math.max(minVotes, currentCount + rand(6))));
    if (currentCount >= target) continue;
    const usersShuffled = [...sampleUsers].sort(() => Math.random() - 0.5);
    let addedHere = 0;
    for (const u of usersShuffled) {
      if (currentCount + addedHere >= target) break;
      if (!existingVotes[u.id]) {
        existingVotes[u.id] = true;
        addedHere++;
      }
    }
    const newCount = Object.keys(existingVotes).length;
    await db.ref(`posts/${id}`).update({ votes: existingVotes, voteCount: newCount });
    touched += 1;
    added += addedHere;
  }
  return { touched, added };
}

async function main() {
  try {
    console.log('Seeding comments and votes...');
    const [buildComments, postComments, buildVotes, postVotes] = await Promise.all([
      seedBuildComments(),
      seedPostComments(),
      seedBuildVotes(),
      seedPostVotes(),
    ]);
    console.log(`Builds: comments+${buildComments.added} on ${buildComments.touched} builds; votes+${buildVotes.added} on ${buildVotes.touched} builds`);
    console.log(`Posts: comments+${postComments.added} on ${postComments.touched} posts; votes+${postVotes.added} on ${postVotes.touched} posts`);
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
