// Predefined skill dictionary. Canonical name -> match variants (all lowercase).
// Multi-word and symbol skills use substring matching; short tokens use word boundaries.
const SKILL_ALIASES = {
  'JavaScript': ['javascript'],
  'TypeScript': ['typescript'],
  'Node.js': ['node.js', 'nodejs'],
  'Express.js': ['express.js', 'expressjs'],
  'React.js': ['react.js', 'reactjs', 'react'],
  'Angular': ['angular'],
  'Vue.js': ['vue.js', 'vuejs', 'vue', 'nuxt'],
  'Python': ['python'],
  'Django': ['django'],
  'Flask': ['flask'],
  'Java': ['java'],
  'Spring Boot': ['spring boot', 'spring'],
  'PHP': ['php'],
  'Laravel': ['laravel'],
  'C': ['c'],
  'C++': ['c++'],
  'SQL': ['sql'],
  'PostgreSQL': ['postgresql', 'postgres'],
  'MySQL': ['mysql'],
  'MongoDB': ['mongodb', 'mongo'],
  'HTML': ['html', 'html5'],
  'CSS': ['css', 'css3'],
  'Tailwind CSS': ['tailwind css', 'tailwind'],
  'Git': ['git'],
  'GitHub': ['github'],
  'Docker': ['docker'],
  'AWS': ['aws', 'amazon web services'],
  'Azure': ['azure'],
  'Cloudflare': ['cloudflare'],
  'REST API': ['rest api', 'restful api', 'restful'],
  'JWT': ['jwt', 'json web token'],
  'Machine Learning': ['machine learning'],
  'Data Science': ['data science'],
  'Next.js': ['next.js', 'nextjs'],
  'Kubernetes': ['kubernetes', 'k8s'],
  'GraphQL': ['graphql'],
  'Redis': ['redis'],
  'Linux': ['linux'],
  'Figma': ['figma'],
  'Go': ['golang'],
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Tokens that must match as standalone words (avoid "git" in "github", "c" in "react", "java" in "javascript").
const needsBoundary = (v) => /^[a-z#+]+$/.test(v) && (v.length <= 4 || v === 'github');

function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = ` ${text.toLowerCase()} `;
  const found = [];
  // Longest variants first so "C++" wins before "C", "github" before "git".
  const entries = Object.entries(SKILL_ALIASES).sort(
    (a, b) => Math.max(...b[1].map((v) => v.length)) - Math.max(...a[1].map((v) => v.length))
  );
  for (const [canonical, variants] of entries) {
    const hit = variants.some((v) => {
      if (canonical === 'C') return /\bc(?![+#\w])/.test(lower);
      if (needsBoundary(v)) return new RegExp(`(^|[^a-z#+])${escapeRegExp(v)}([^a-z+#]|$)`, 'i').test(lower);
      return lower.includes(v);
    });
    if (hit) found.push(canonical);
  }
  return [...new Set(found)];
}

// Normalize job skills stored as JSON array string, array, or legacy comma string.
function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills.map((s) => String(s).trim()).filter(Boolean);
  if (typeof skills === 'string') {
    const t = skills.trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
      } catch { /* fall through to comma split */ }
    }
    return t.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// Serialize a skills array (or comma string) for TEXT storage.
function serializeSkills(skills) {
  return JSON.stringify(normalizeSkills(skills));
}

// Score a job against resume skills.
// match_percentage = round(matching required skills / total required job skills * 100)
function scoreJob(resumeSkills, jobSkills) {
  const jobTokens = normalizeSkills(jobSkills);
  if (!jobTokens.length || !resumeSkills.length) return { match_percentage: 0, matched_skills: [] };
  const normResume = resumeSkills.map((s) => String(s).toLowerCase());
  const matched = [];
  for (const tok of jobTokens) {
    const low = tok.toLowerCase();
    const hit = normResume.find((rs) => rs === low || low.includes(rs) || rs.includes(low));
    if (hit) {
      const canonical = resumeSkills[normResume.indexOf(hit)];
      if (!matched.includes(canonical)) matched.push(canonical);
    }
  }
  return { match_percentage: Math.round((matched.length / jobTokens.length) * 100), matched_skills: matched };
}

module.exports = { extractSkills, normalizeSkills, serializeSkills, scoreJob, SKILL_ALIASES };
