import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const dataPath = path.join(root, "sample-runs.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function bilingual(value, pathName) {
  assert(value && typeof value === "object", `${pathName}: bilingual object required`);
  assert(typeof value.ja === "string" && value.ja.length > 0, `${pathName}.ja required`);
  assert(typeof value.en === "string" && value.en.length > 0, `${pathName}.en required`);
}

assert(data.schemaVersion === "0.2.0", "schemaVersion must be 0.2.0");
assert(data.portfolioSafe === true, "portfolioSafe must be true");
assert(Array.isArray(data.workflowStages) && data.workflowStages.length >= 7, "workflowStages must have >= 7 stages");
assert(Array.isArray(data.proofCards) && data.proofCards.length >= 3, "proofCards must have >= 3 cards");
assert(Array.isArray(data.qa) && data.qa.length >= 3, "qa must have >= 3 items");

const ids = new Set();
for (const [index, stage] of data.workflowStages.entries()) {
  assert(stage.id && !ids.has(stage.id), `unique stage id required: ${stage.id}`);
  ids.add(stage.id);
  assert(stage.order === index + 1, `${stage.id}: order must be sequential`);
  bilingual(stage.title, `${stage.id}.title`);
  bilingual(stage.short, `${stage.id}.short`);
  bilingual(stage.output, `${stage.id}.output`);
  bilingual(stage.explain, `${stage.id}.explain`);
  bilingual(stage.proof, `${stage.id}.proof`);
  assert(Array.isArray(stage.tools) && stage.tools.length >= 2, `${stage.id}: tools must have >= 2 items`);
}

for (const card of data.proofCards) {
  assert(card.id, "proof card id required");
  bilingual(card.title, `${card.id}.title`);
  bilingual(card.body, `${card.id}.body`);
}

for (const [index, item] of data.qa.entries()) {
  bilingual(item.question, `qa[${index}].question`);
  bilingual(item.answer, `qa[${index}].answer`);
}

const publicJson = JSON.stringify(data).toLowerCase();
const bannedTerms = [
  "求人",
  "job-market",
  "salary band",
  "年収",
  "client name",
  "employer private",
  "contextを地図化",
  "evalをgate",
  "gateにする",
  "releaseとhandover",
  "公開safe",
  "tool実行",
];
for (const term of bannedTerms) {
  assert(!publicJson.includes(term.toLowerCase()), `public data must not include banned term: ${term}`);
}

console.log(`OK: ${data.workflowStages.length} workflow stages, ${data.proofCards.length} proof cards, ${data.qa.length} QA items`);
