// Known-skill vocabulary with aliases. Canonical name -> array of match variants.
const SKILL_ALIASES = {
  'JavaScript': ['javascript', 'js'],
  'TypeScript': ['typescript', 'ts'],
  'Python': ['python'],
  'Java': ['java'],
  'C++': ['c++'],
  'C#': ['c#', '.net', 'dotnet'],
  'Go': ['golang'],
  'Rust': ['rust'],
  'PHP': ['php'],
  'Ruby': ['ruby', 'rails'],
  'Swift': ['swift'],
  'Kotlin': ['kotlin'],
  'Node.js': ['node.js', 'nodejs', 'node'],
  'Express.js': ['express.js', 'expressjs', 'express'],
  'React': ['react', 'react.js', 'reactjs'],
  'Angular': ['angular'],
  'Vue': ['vue', 'vue.js', 'nuxt'],
  'Next.js': ['next.js', 'nextjs'],
  'Django': ['django'],
  'Flask': ['flask'],
  'FastAPI': ['fastapi'],
  'Spring': ['spring', 'spring boot'],
  'Laravel': ['laravel'],
  'HTML': ['html', 'html5'],
  'CSS': ['css', 'css3'],
  'Tailwind': ['tailwind'],
  'Bootstrap': ['bootstrap'],
  'SQL': ['sql'],
  'PostgreSQL': ['postgresql', 'postgres'],
  'MySQL': ['mysql'],
  'MongoDB': ['mongodb', 'mongo'],
  'Redis': ['redis'],
  'SQLite': ['sqlite'],
  'Git': ['git', 'github', 'gitlab'],
  'Docker': ['docker'],
  'Kubernetes': ['kubernetes', 'k8s'],
  'AWS': ['aws', 'amazon web services'],
  'Azure': ['azure'],
  'GCP': ['gcp', 'google cloud'],
  'REST': ['rest', 'rest api', 'restful'],
  'GraphQL': ['graphql'],
  'Selenium': ['selenium'],
  'Jest': ['jest'],
  'PyTest': ['pytest'],
  'TensorFlow': ['tensorflow'],
  'PyTorch': ['pytorch'],
  'Machine Learning': ['machine learning', 'ml'],
  'Pandas': ['pandas'],
  'NumPy': ['numpy'],
  'Linux': ['linux'],
  'Figma': ['figma'],
  'Excel': ['excel', 'ms excel'],
  'WordPress': ['wordpress'],
  'SEO': ['seo'],
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const lower = text.toLowerCase();
  const found = [];
  for (const [canonical, variants] of Object.entries(SKILL_ALIASES)) {
    const hit = variants.some((v) => {
      // short tokens (js, ts, ml, aws, sql...) need word boundaries to avoid false positives
      if (v.length <= 3 && !/[^a-z]/.test(v)) {
        return new RegExp(`(^|[^a-z])${escapeRegExp(v)}([^a-z]|$)`, 'i').test(lower);
      }
      return lower.includes(v);
    });
    if (hit) found.push(canonical);
  }
  return [...new Set(found)];
}

// Split a job's comma-separated skills string into normalized tokens.
function splitJobSkills(skills) {
  if (!skills) return [];
  return skills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// Score a job against a set of resume skills. Returns { score, matched }.
function scoreJob(resumeSkills, jobSkillsStr) {
  const jobTokens = splitJobSkills(jobSkillsStr);
  if (!jobTokens.length || !resumeSkills.length) return { score: 0, matched: [] };
  const normResume = resumeSkills.map((s) => s.toLowerCase());
  const matched = jobTokens.filter((tok) =>
    normResume.some((rs) => rs === tok || tok.includes(rs) || rs.includes(tok))
  );
  return { score: matched.length / jobTokens.length, matched };
}

module.exports = { extractSkills, splitJobSkills, scoreJob, SKILL_ALIASES };
