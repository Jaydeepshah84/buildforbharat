/**
 * SiGML generation for the CWASA 3D signing avatar.
 *
 * Pipeline:  narration text → gloss (LLM, routes/signLanguage.ts) → SiGML XML → CWASA.playSiGMLText()
 *
 * Honest scope: turning arbitrary text into linguistically correct ISL is an unsolved
 * research problem, so this module produces STRUCTURALLY VALID SiGML from three sources:
 *   1. A hand-authored dictionary of whole-word signs (approximate HamNoSys). Each one also
 *      carries a mouth picture so the avatar mouths the word — a big comprehension aid for
 *      deaf viewers when the manual sign itself is only approximate.
 *   2. Digits 0-9 and the operators + - = × ÷ (numbers are universal in the lesson narration).
 *   3. Fingerspelling (one manual-alphabet handshape per letter) for everything else, which
 *      gives universal coverage.
 * Only widely supported HamNoSys tags are used so the UEA Animgen server accepts every sign.
 * Sign accuracy is expandable by editing DICT / LETTERS below.
 *
 * References: University of East Anglia Virtual Humans (CWASA / JASigning),
 * University of Hamburg HamNoSys, SAMPA (for mouth pictures).
 */

type Pose = { shape: string[]; ext?: string; palm?: string; loc?: string; move?: string[] };

// ── One-handed manual alphabet (approximate, valid tags only) ─────────────────────────
const LETTERS: Record<string, Pose> = {
  a: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingeru", palm: "hampalml" },
  b: { shape: ["hamflathand", "hamthumbacrossmod"], ext: "hamextfingeru", palm: "hampalml" },
  c: { shape: ["hamceeall"], ext: "hamextfingeru", palm: "hampalml" },
  d: { shape: ["hamfinger2", "hamthumbopenmod"], ext: "hamextfingeru", palm: "hampalml" },
  e: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingeru", palm: "hampalmd" },
  f: { shape: ["hampinch12"], ext: "hamextfingeru", palm: "hampalml" },
  g: { shape: ["hamfinger2", "hamthumboutmod"], ext: "hamextfingero", palm: "hampalml" },
  h: { shape: ["hamfinger23"], ext: "hamextfingero", palm: "hampalml" },
  i: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingeru", palm: "hampalmr" },
  j: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingeru", palm: "hampalmr", move: ["hammoved", "hammovel"] },
  k: { shape: ["hamfinger23spread", "hamthumbopenmod"], ext: "hamextfingeru", palm: "hampalml" },
  l: { shape: ["hamfinger2", "hamthumbopenmod"], ext: "hamextfingeru", palm: "hampalml" },
  m: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingerd", palm: "hampalmd" },
  n: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingerd", palm: "hampalmd" },
  o: { shape: ["hampinchall"], ext: "hamextfingeru", palm: "hampalml" },
  p: { shape: ["hamfinger23spread", "hamthumbopenmod"], ext: "hamextfingerd", palm: "hampalmd" },
  q: { shape: ["hamfinger2", "hamthumboutmod"], ext: "hamextfingerd", palm: "hampalmd" },
  r: { shape: ["hamfinger23"], ext: "hamextfingeru", palm: "hampalml" },
  s: { shape: ["hamfist", "hamthumbacrossmod"], ext: "hamextfingeru", palm: "hampalml" },
  t: { shape: ["hamfist", "hamthumbopenmod"], ext: "hamextfingeru", palm: "hampalml" },
  u: { shape: ["hamfinger23"], ext: "hamextfingeru", palm: "hampalml" },
  v: { shape: ["hamfinger23spread"], ext: "hamextfingeru", palm: "hampalml" },
  w: { shape: ["hamfinger2345"], ext: "hamextfingeru", palm: "hampalml" },
  x: { shape: ["hamfinger2"], ext: "hamextfingeru", palm: "hampalml" },
  y: { shape: ["hamfist", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml" },
  z: { shape: ["hamfinger2"], ext: "hamextfingero", palm: "hampalmd", move: ["hammovel", "hammoved"] },
};

// ── Digits and operators ──────────────────────────────────────────────────────────────
const DIGITS: Record<string, { pose: Pose; mouth: string }> = {
  "0": { pose: { shape: ["hampinchall"], ext: "hamextfingeru", palm: "hampalml" }, mouth: "zI@r@U" },
  "1": { pose: { shape: ["hamfinger2"], ext: "hamextfingeru", palm: "hampalml" }, mouth: "wVn" },
  "2": { pose: { shape: ["hamfinger23spread"], ext: "hamextfingeru", palm: "hampalml" }, mouth: "tu:" },
  "3": { pose: { shape: ["hamfinger23spread", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml" }, mouth: "Tri:" },
  "4": { pose: { shape: ["hamfinger2345"], ext: "hamextfingeru", palm: "hampalml" }, mouth: "fO:" },
  "5": { pose: { shape: ["hamfinger2345", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml" }, mouth: "faIv" },
  "6": { pose: { shape: ["hamfinger2345", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml", move: ["hammovel"] }, mouth: "sIks" },
  "7": { pose: { shape: ["hamfinger2345", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml", move: ["hammoved"] }, mouth: "sEv@n" },
  "8": { pose: { shape: ["hamfinger2345", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml", move: ["hammover"] }, mouth: "eIt" },
  "9": { pose: { shape: ["hamfinger2345", "hamthumboutmod"], ext: "hamextfingeru", palm: "hampalml", move: ["hammoveu"] }, mouth: "naIn" },
};

const OPERATORS: Record<string, string> = { "+": "plus", "-": "minus", "−": "minus", "=": "equal", "×": "multiply", "x": "multiply", "*": "multiply", "÷": "divide", "/": "divide", "%": "percent", ">": "more", "<": "less" };

// ── Whole-word dictionary ─────────────────────────────────────────────────────────────
// Each entry: [handshape tags], extended-finger direction, palm orientation, location, [movement tags].
// A leading "hamsymmlr" makes the sign two-handed and symmetrical.
// These are APPROXIMATIONS chosen to be evocative and readable on the avatar; tune against the live avatar.
type Entry = [string[], string, string, string, string[]];
const S = "hamsymmlr";
const RAW: Record<string, Entry> = {
  // greetings / politeness
  hello: [["hamflathand"], "hamextfingeru", "hampalml", "hamforehead", ["hammover"]],
  hi: [["hamflathand"], "hamextfingeru", "hampalml", "hamforehead", ["hammover"]],
  namaste: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamchest", ["hamtouch"]],
  welcome: [["hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hammovei"]],
  yes: [["hamfist", "hamthumbacrossmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved", "hamrepeatfromstart"]],
  no: [["hamfinger23"], "hamextfingeru", "hampalml", "hamneutral", ["hamclose"]],
  not: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamchin", ["hammoveo"]],
  thanks: [["hamflathand"], "hamextfingeru", "hampalmu", "hamchin", ["hammoveo"]],
  thankyou: [["hamflathand"], "hamextfingeru", "hampalmu", "hamchin", ["hammoveo"]],
  please: [["hamflathand"], "hamextfingeru", "hampalml", "hamchest", ["hamcircleo"]],
  good: [["hamflathand"], "hamextfingeru", "hampalmu", "hamchin", ["hammoved"]],
  great: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamshoulders", ["hammoveo"]],
  bad: [["hamflathand"], "hamextfingeru", "hampalmu", "hamchin", ["hammoved", "hamreplace", "hampalmd"]],
  sorry: [["hamfist"], "hamextfingeru", "hampalml", "hamchest", ["hamcircleo"]],
  // people / pronouns
  i: [["hamfinger2", "hamthumbacrossmod"], "hamextfingeril", "hampalmr", "hamchest", ["hamtouch"]],
  me: [["hamfinger2", "hamthumbacrossmod"], "hamextfingeril", "hampalmr", "hamchest", ["hamtouch"]],
  you: [["hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", []],
  we: [["hamfinger2"], "hamextfingeru", "hampalml", "hamshoulders", ["hammover"]],
  they: [["hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hammover"]],
  it: [["hamfinger2"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  this: [["hamfinger2"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  that: [["hamfinger2"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  here: [[S, "hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hamcircleo"]],
  people: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved"]],
  person: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved"]],
  child: [["hamflathand"], "hamextfingero", "hampalmd", "hamstomach", ["hammoved", "hamrepeatfromstart"]],
  student: [["hamflathand"], "hamextfingeru", "hampalmu", "hamneutral", ["hammoveu", "hamclose"]],
  teacher: [[S, "hampinchall"], "hamextfingero", "hampalml", "hamforehead", ["hammoveo"]],
  teach: [[S, "hampinchall"], "hamextfingero", "hampalml", "hamforehead", ["hammoveo"]],
  friend: [[S, "hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch"]],
  family: [[S, "hampinch12"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  // learning / thinking
  learn: [["hamflathand"], "hamextfingeru", "hampalmu", "hamneutral", ["hammoveu"]],
  study: [["hamfinger2345"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved", "hamrepeatfromstart"]],
  know: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hamtouch"]],
  understand: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hammoveu"]],
  think: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hamcircleo"]],
  remember: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamforehead", ["hamtouch"]],
  idea: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamforehead", ["hammoveu"]],
  see: [["hamfinger23spread"], "hamextfingeru", "hampalml", "hameyes", ["hammoveo"]],
  look: [["hamfinger23spread"], "hamextfingeru", "hampalml", "hameyes", ["hammoveo"]],
  watch: [["hamfinger23spread"], "hamextfingeru", "hampalml", "hameyes", ["hammoveo"]],
  show: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  read: [["hamfinger23spread"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  write: [["hampinch12"], "hamextfingerl", "hampalmd", "hamneutral", ["hammover"]],
  book: [[S, "hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammovel"]],
  school: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  lesson: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammoved"]],
  question: [["hamfinger2"], "hamextfingero", "hampalml", "hamneutral", ["hamarcu", "hammoved"]],
  answer: [["hamfinger2"], "hamextfingeru", "hampalml", "hamlips", ["hammoveo"]],
  example: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  explain: [[S, "hampinch12"], "hamextfingero", "hampalml", "hamneutral", ["hammoveo", "hammovei", "hamrepeatfromstart"]],
  important: [[S, "hampinch12"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  help: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  practice: [["hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  // question words
  what: [[S, "hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  why: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hammoveo"]],
  how: [[S, "hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  when: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  where: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  who: [["hamfinger2"], "hamextfingeru", "hampalml", "hamchin", ["hamcircleo"]],
  which: [[S, "hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu", "hammoved", "hamrepeatfromstart"]],
  // core verbs
  make: [[S, "hamfist"], "hamextfingero", "hampalml", "hamneutral", ["hamcircleo"]],
  build: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hammoveu", "hamrepeatfromstart"]],
  use: [["hamfinger23"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  need: [["hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hammoved", "hamrepeatfromstart"]],
  want: [[S, "hamfinger2345"], "hamextfingero", "hampalmu", "hamneutral", ["hammovei"]],
  give: [[S, "hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hammoveo"]],
  get: [["hamceeall"], "hamextfingero", "hampalml", "hamneutral", ["hammovei", "hamclose"]],
  take: [["hamceeall"], "hamextfingero", "hampalml", "hamneutral", ["hammovei", "hamclose"]],
  go: [["hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hammoveo"]],
  come: [["hamfinger2"], "hamextfingero", "hampalmu", "hamneutral", ["hammovei"]],
  start: [["hamfinger2"], "hamextfingero", "hampalml", "hamneutral", ["hamcircleo"]],
  begin: [["hamfinger2"], "hamextfingero", "hampalml", "hamneutral", ["hamcircleo"]],
  stop: [["hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved"]],
  finish: [[S, "hamfinger2345"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel"]],
  end: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammoved"]],
  wait: [[S, "hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hammoveu", "hamrepeatfromstart"]],
  move: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hammover"]],
  change: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  become: [[S, "hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hamcircleo"]],
  grow: [["hampinchall"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  live: [[S, "hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamstomach", ["hammoveu"]],
  eat: [["hampinchall"], "hamextfingeru", "hampalml", "hamlips", ["hamtouch", "hamrepeatfromstart"]],
  drink: [["hamceeall"], "hamextfingeru", "hampalml", "hamlips", ["hamarcu"]],
  breathe: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamchest", ["hammoveo", "hammovei", "hamrepeatfromstart"]],
  push: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  pull: [[S, "hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hammovei"]],
  fall: [["hamfinger23spread"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  throw: [["hamfist"], "hamextfingero", "hampalmd", "hamshoulders", ["hammoveo"]],
  turn: [["hamfinger2"], "hamextfingerd", "hampalmd", "hamneutral", ["hamcircleo"]],
  mix: [[S, "hamfinger2345"], "hamextfingerd", "hampalmd", "hamneutral", ["hamcircleo"]],
  add: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammover"]],
  count: [["hampinch12"], "hamextfingero", "hampalmd", "hamneutral", ["hammover", "hamrepeatfromstart"]],
  measure: [[S, "hamfist", "hamthumboutmod"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  find: [["hampinch12"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoveu"]],
  say: [["hamfinger2"], "hamextfingeru", "hampalml", "hamlips", ["hamcircleo"]],
  call: [["hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved"]],
  mean: [["hamfinger23spread"], "hamextfingerd", "hampalmd", "hamneutral", ["hamtouch"]],
  happen: [[S, "hamfinger2"], "hamextfingero", "hampalmu", "hamneutral", ["hamcircleo"]],
  work: [[S, "hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  play: [[S, "hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  // math
  plus: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammover"]],
  minus: [["hamfinger2"], "hamextfingerl", "hampalmd", "hamneutral", ["hammover"]],
  equal: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch"]],
  equals: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch"]],
  multiply: [[S, "hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel"]],
  divide: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammoved"]],
  percent: [["hampinchall"], "hamextfingero", "hampalml", "hamneutral", ["hammover", "hammoved"]],
  number: [["hampinch12"], "hamextfingero", "hampalmd", "hamneutral", ["hammover", "hamrepeatfromstart"]],
  total: [[S, "hamfinger2345"], "hamextfingero", "hampalmu", "hamneutral", ["hammovei", "hamclose"]],
  result: [["hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hammoveo"]],
  half: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammoved"]],
  more: [[S, "hampinchall"], "hamextfingero", "hampalml", "hamneutral", ["hamtouch"]],
  less: [["hamflathand"], "hamextfingero", "hampalmd", "hamchest", ["hammoved"]],
  many: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  much: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  all: [["hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hamcircleo"]],
  some: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammovei"]],
  same: [[S, "hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hammover"]],
  different: [[S, "hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hammovel"]],
  big: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel"]],
  large: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel"]],
  small: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammover"]],
  long: [["hamfinger2"], "hamextfingerl", "hampalmd", "hamneutral", ["hammover"]],
  short: [["hamfinger23"], "hamextfingerl", "hampalmd", "hamneutral", ["hammovei", "hamrepeatfromstart"]],
  fast: [["hamfinger2"], "hamextfingero", "hampalml", "hamneutral", ["hammovei", "hamrepeatfromstart"]],
  slow: [["hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hammovei"]],
  up: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  down: [["hamfinger2"], "hamextfingerd", "hampalml", "hamneutral", ["hammoved"]],
  inside: [["hamflathand"], "hamextfingerd", "hampalml", "hamneutral", ["hammoved"]],
  outside: [["hampinchall"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  between: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  line: [[S, "hampinch12"], "hamextfingero", "hampalml", "hamneutral", ["hammovel"]],
  circle: [["hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  shape: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved"]],
  part: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammovel"]],
  whole: [["hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hamcircleo", "hammoved"]],
  first: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  next: [["hamflathand"], "hamextfingerl", "hampalmd", "hamneutral", ["hamarcu"]],
  then: [["hamfinger2"], "hamextfingero", "hampalml", "hamneutral", ["hammover"]],
  again: [["hamceeall"], "hamextfingerl", "hampalmu", "hamneutral", ["hamarcu", "hammoved"]],
  now: [[S, "hamceeall"], "hamextfingero", "hampalmu", "hamneutral", ["hammoved"]],
  new: [["hamflathand"], "hamextfingerl", "hampalmu", "hamneutral", ["hamarcu"]],
  old: [["hamceeall"], "hamextfingeru", "hampalml", "hamchin", ["hammoved"]],
  always: [["hamfinger2"], "hamextfingero", "hampalmu", "hamneutral", ["hamcircleo"]],
  never: [["hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved", "hammover"]],
  true: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  correct: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  right: [["hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  wrong: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamchin", ["hamtouch"]],
  false: [["hamfinger2"], "hamextfingeru", "hampalml", "hamnose", ["hammovel"]],
  easy: [["hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hammoveu", "hamrepeatfromstart"]],
  hard: [[S, "hamfinger23"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch"]],
  difficult: [[S, "hamfinger23"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch"]],
  because: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hammoveo", "hamclose"]],
  cause: [[S, "hamfist"], "hamextfingero", "hampalmu", "hamneutral", ["hammoveo"]],
  problem: [[S, "hamfinger2"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  // science / nature
  water: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamchin", ["hamtouch", "hamrepeatfromstart"]],
  sun: [["hamceeall"], "hamextfingeru", "hampalmd", "hamforehead", ["hammoveo"]],
  sunlight: [["hamceeall"], "hamextfingeru", "hampalmd", "hamforehead", ["hammoveo"]],
  moon: [["hamceeall"], "hamextfingeru", "hampalml", "hamhead", ["hammoveu"]],
  star: [[S, "hamfinger2"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu", "hamrepeatfromstart"]],
  earth: [["hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  world: [["hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  planet: [["hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  space: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamhead", ["hamarcu"]],
  light: [["hampinchall"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  dark: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hameyes", ["hammoved"]],
  air: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  wind: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  gas: [["hamfinger2345"], "hamextfingeru", "hampalmu", "hamneutral", ["hammoveu", "hamrepeatfromstart"]],
  fire: [[S, "hamfinger2345"], "hamextfingeru", "hampalmu", "hamneutral", ["hammoveu", "hamrepeatfromstart"]],
  heat: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamlips", ["hammoveo"]],
  hot: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamlips", ["hammoveo"]],
  cold: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamchest", ["hammovel", "hammover", "hamrepeatfromstart"]],
  ice: [[S, "hamfinger2345"], "hamextfingero", "hampalmd", "hamneutral", ["hamclose"]],
  rain: [[S, "hamfinger2345"], "hamextfingerd", "hampalmd", "hamhead", ["hammoved", "hamrepeatfromstart"]],
  cloud: [[S, "hamceeall"], "hamextfingeru", "hampalml", "hamhead", ["hamcircleo"]],
  sky: [["hamflathand"], "hamextfingeru", "hampalmd", "hamhead", ["hamarcu"]],
  weather: [[S, "hamfinger2345"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  rock: [["hamfist"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  soil: [["hampinchall"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  ground: [["hamflathand"], "hamextfingero", "hampalmd", "hamstomach", ["hammover"]],
  river: [["hamfinger2345"], "hamextfingero", "hampalmd", "hamneutral", ["hammover"]],
  sea: [[S, "hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hamarcu", "hammover"]],
  plant: [["hampinchall"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveu"]],
  tree: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamshoulders", ["hammovel", "hammover", "hamrepeatfromstart"]],
  leaf: [["hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover"]],
  root: [["hamfinger2345"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  seed: [["hampinch12"], "hamextfingerd", "hampalmd", "hamneutral", ["hammoved"]],
  flower: [["hampinchall"], "hamextfingeru", "hampalml", "hamnose", ["hamtouch"]],
  food: [["hampinchall"], "hamextfingeru", "hampalml", "hamlips", ["hamtouch", "hamrepeatfromstart"]],
  energy: [["hamfist"], "hamextfingeru", "hampalml", "hamshoulders", ["hammoved"]],
  power: [["hamfist"], "hamextfingeru", "hampalml", "hamshoulders", ["hammoved"]],
  force: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hammoveo"]],
  gravity: [["hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hammoved"]],
  speed: [["hamfinger2"], "hamextfingero", "hampalml", "hamneutral", ["hammovei", "hamrepeatfromstart"]],
  electricity: [[S, "hamfinger23"], "hamextfingeru", "hampalml", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  electric: [[S, "hamfinger23"], "hamextfingeru", "hampalml", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  current: [["hamfinger2345"], "hamextfingero", "hampalmd", "hamneutral", ["hammover"]],
  magnet: [[S, "hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hamtouch"]],
  sound: [["hamfinger2"], "hamextfingeru", "hampalml", "hamear", ["hamtouch"]],
  machine: [[S, "hamfinger2345"], "hamextfingero", "hampalml", "hamneutral", ["hammoved", "hamrepeatfromstart"]],
  computer: [["hamceeall"], "hamextfingeru", "hampalml", "hamshoulders", ["hammovel"]],
  atom: [["hampinchall"], "hamextfingero", "hampalml", "hamneutral", ["hamcircleo"]],
  cell: [[S, "hamceeall"], "hamextfingero", "hampalml", "hamneutral", ["hamclose"]],
  molecule: [[S, "hampinchall"], "hamextfingero", "hampalml", "hamneutral", ["hamtouch"]],
  chemical: [[S, "hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  science: [[S, "hamfist", "hamthumbacrossmod"], "hamextfingerd", "hampalml", "hamneutral", ["hamcircleo"]],
  math: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel"]],
  physics: [[S, "hamfinger23"], "hamextfingeru", "hampalml", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  chemistry: [[S, "hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  biology: [[S, "hamflathand", "hamthumbacrossmod"], "hamextfingeru", "hampalml", "hamneutral", ["hamcircleo"]],
  history: [["hamfinger23"], "hamextfingeru", "hampalml", "hamneutral", ["hammoved", "hamrepeatfromstart"]],
  language: [[S, "hamfinger2", "hamthumbopenmod"], "hamextfingerl", "hampalmd", "hamneutral", ["hammovel"]],
  word: [["hampinch12"], "hamextfingero", "hampalml", "hamneutral", ["hamtouch"]],
  story: [[S, "hampinchall"], "hamextfingero", "hampalml", "hamneutral", ["hammovel", "hamrepeatfromstart"]],
  picture: [["hamceeall"], "hamextfingeru", "hampalml", "hameyes", ["hammoved"]],
  // body / life
  body: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamchest", ["hamtouch", "hammoved"]],
  heart: [["hamfinger2"], "hamextfingerl", "hampalmd", "hamchest", ["hamtouch", "hamrepeatfromstart"]],
  blood: [["hamfinger2345"], "hamextfingerd", "hampalml", "hamchest", ["hammoved"]],
  brain: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hamtouch", "hamrepeatfromstart"]],
  mind: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hamtouch"]],
  eye: [["hamfinger2"], "hamextfingeru", "hampalml", "hameyes", ["hamtouch"]],
  hand: [["hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hamtouch"]],
  animal: [[S, "hamceeall"], "hamextfingeru", "hampalml", "hamchest", ["hammovei", "hammoveo", "hamrepeatfromstart"]],
  bird: [["hampinch12"], "hamextfingero", "hampalml", "hamlips", ["hamclose", "hamrepeatfromstart"]],
  fish: [["hamflathand"], "hamextfingero", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  insect: [["hamfinger2345"], "hamextfingero", "hampalml", "hamnose", ["hamtouch"]],
  human: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hammoved"]],
  life: [[S, "hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamstomach", ["hammoveu"]],
  health: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamchest", ["hammoved"]],
  sick: [["hamfinger2"], "hamextfingeru", "hampalml", "hamforehead", ["hamtouch"]],
  // time / place
  time: [["hamfinger2"], "hamextfingerl", "hampalmd", "hamneutral", ["hamtouch"]],
  day: [["hamfinger2"], "hamextfingeru", "hampalml", "hamshoulders", ["hammoved"]],
  night: [["hamceeall"], "hamextfingero", "hampalmd", "hamneutral", ["hammoved"]],
  year: [["hamfist"], "hamextfingero", "hampalml", "hamneutral", ["hamcircleo"]],
  today: [[S, "hamceeall"], "hamextfingero", "hampalmu", "hamneutral", ["hammoved"]],
  home: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamhead", ["hammoved"]],
  house: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamhead", ["hammoved"]],
  city: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  country: [["hamflathand"], "hamextfingero", "hampalmd", "hamneutral", ["hamcircleo"]],
  india: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamforehead", ["hamtouch"]],
  money: [["hamflathand"], "hamextfingero", "hampalmu", "hamneutral", ["hamtouch", "hamrepeatfromstart"]],
  // feelings
  happy: [[S, "hamflathand"], "hamextfingeru", "hampalml", "hamchest", ["hammoveu", "hamrepeatfromstart"]],
  sad: [[S, "hamfinger2345"], "hamextfingeru", "hampalml", "hameyes", ["hammoved"]],
  love: [[S, "hamfist"], "hamextfingeru", "hampalml", "hamchest", ["hamtouch"]],
  like: [["hampinch12"], "hamextfingeru", "hampalml", "hamchest", ["hammoveo"]],
  fun: [["hamfinger23"], "hamextfingeru", "hampalml", "hamnose", ["hammoved"]],
  // colours
  red: [["hamfinger2"], "hamextfingeru", "hampalml", "hamlips", ["hammoved"]],
  blue: [["hamflathand", "hamthumbacrossmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  green: [["hamfinger2", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  yellow: [["hamfist", "hamthumboutmod"], "hamextfingeru", "hampalml", "hamneutral", ["hammovel", "hammover", "hamrepeatfromstart"]],
  white: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamchest", ["hammoveo", "hamclose"]],
  black: [["hamfinger2"], "hamextfingerl", "hampalmd", "hamforehead", ["hammover"]],
  colour: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamchin", ["hamtouch", "hamrepeatfromstart"]],
  color: [["hamfinger2345"], "hamextfingeru", "hampalml", "hamchin", ["hamtouch", "hamrepeatfromstart"]],
};

// Common inflections map onto their base-word sign so glosses like "PLANTS" or "MOVING" still hit.
const ALIASES: Record<string, string> = {
  thankyou: "thanks", thank: "thanks", ok: "yes", okay: "yes", yeah: "yes", dont: "not", cannot: "not", cant: "not",
  learning: "learn", learns: "learn", learned: "learn", studies: "study", studying: "study", knows: "know", knew: "know",
  understands: "understand", understood: "understand", thinks: "think", thinking: "think", thought: "think",
  remembers: "remember", ideas: "idea", sees: "see", seeing: "see", saw: "see", looks: "look", looking: "look",
  shows: "show", showing: "show", shown: "show", reads: "read", reading: "read", writes: "write", writing: "write", written: "write",
  books: "book", questions: "question", answers: "answer", examples: "example", explains: "explain", explained: "explain",
  helps: "help", helping: "help", makes: "make", making: "make", made: "make", builds: "build", building: "build", built: "build",
  uses: "use", using: "use", used: "use", needs: "need", needed: "need", wants: "want", gives: "give", giving: "give", gave: "give",
  gets: "get", getting: "get", got: "get", takes: "take", taking: "take", took: "take", goes: "go", going: "go", went: "go",
  comes: "come", coming: "come", came: "come", starts: "start", started: "start", begins: "begin", beginning: "begin",
  stops: "stop", stopped: "stop", finished: "finish", ends: "end", ending: "end", moves: "move", moving: "move", moved: "move",
  changes: "change", changing: "change", changed: "change", becomes: "become", became: "become", grows: "grow", growing: "grow", grew: "grow",
  lives: "live", living: "live", eats: "eat", eating: "eat", ate: "eat", drinks: "drink", breathes: "breathe", breathing: "breathe",
  pushes: "push", pushing: "push", pushed: "push", pulls: "pull", pulling: "pull", pulled: "pull", falls: "fall", falling: "fall", fell: "fall",
  turns: "turn", turning: "turn", mixes: "mix", mixing: "mix", mixed: "mix", adds: "add", adding: "add", added: "add",
  counts: "count", counting: "count", finds: "find", found: "find", says: "say", said: "say", means: "mean", happens: "happen", happened: "happen",
  works: "work", working: "work", plays: "play", playing: "play", equal: "equal", numbers: "number", results: "result",
  bigger: "big", biggest: "big", larger: "large", smaller: "small", longer: "long", shorter: "short", faster: "fast", slower: "slow",
  lines: "line", circles: "circle", shapes: "shape", parts: "part", parted: "part", problems: "problem",
  plants: "plant", trees: "tree", leaves: "leaf", roots: "root", seeds: "seed", flowers: "flower", foods: "food",
  suns: "sun", stars: "star", planets: "planet", lights: "light", gases: "gas", fires: "fire", heated: "heat", clouds: "cloud", rocks: "rock",
  rivers: "river", seas: "sea", ocean: "sea", forces: "force", speeds: "speed", magnets: "magnet", sounds: "sound", machines: "machine",
  computers: "computer", atoms: "atom", cells: "cell", molecules: "molecule", chemicals: "chemical", words: "word", stories: "story", pictures: "picture",
  bodies: "body", hearts: "heart", brains: "brain", eyes: "eye", hands: "hand", animals: "animal", birds: "bird", fishes: "fish", insects: "insect",
  humans: "human", persons: "person", children: "child", kids: "child", kid: "child", students: "student", teachers: "teacher", friends: "friend", families: "family",
  times: "time", days: "day", nights: "night", years: "year", homes: "home", houses: "house", cities: "city", countries: "country",
  colours: "colour", colors: "color", waters: "water", energies: "energy", powers: "power", worlds: "world", ideas2: "idea",
};

// ── Mouth pictures (rough grapheme → SAMPA) ───────────────────────────────────────────
// The avatar mouths each dictionary word. This is a heuristic English letter-to-sound map using
// only SAMPA symbols the UEA examples use; it is not a pronunciation dictionary.
const G2P: [string, string][] = [
  ["tch", "tS"], ["igh", "aI"], ["ough", "Vf"], ["ch", "tS"], ["sh", "S"], ["th", "T"], ["ph", "f"], ["ng", "N"], ["ck", "k"], ["qu", "kw"], ["wh", "w"],
  ["ee", "i:"], ["ea", "i:"], ["oo", "u:"], ["ou", "aU"], ["ow", "aU"], ["ai", "eI"], ["ay", "eI"], ["oi", "OI"], ["oy", "OI"], ["ie", "aI"], ["ue", "u:"], ["ur", "3:"], ["er", "@"], ["or", "O:"], ["ar", "A:"], ["ir", "3:"],
  ["a", "{"], ["e", "E"], ["i", "I"], ["o", "Q"], ["u", "V"], ["y", "I"], ["c", "k"], ["q", "k"], ["x", "ks"], ["j", "dZ"],
  ["b", "b"], ["d", "d"], ["f", "f"], ["g", "g"], ["h", "h"], ["k", "k"], ["l", "l"], ["m", "m"], ["n", "n"], ["p", "p"], ["r", "r"], ["s", "s"], ["t", "t"], ["v", "v"], ["w", "w"], ["z", "z"],
];
const LONG_VOWEL: Record<string, string> = { a: "eI", e: "i:", i: "aI", o: "@U", u: "u:" };

export function mouthPicture(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  // Silent final e lengthens the previous vowel: make → meIk, use → ju:z
  let m = /^(.*?)([aeiou])([bcdfghklmnprstvz])e$/.exec(w);
  let forced: { at: number; sampa: string } | null = null;
  if (m && m[1].length + 1 >= 1 && !/[aeiou]$/.test(m[1])) {
    forced = { at: m[1].length, sampa: LONG_VOWEL[m[2]] };
    w = m[1] + m[2] + m[3];
  }
  let out = "";
  let i = 0;
  while (i < w.length) {
    if (forced && i === forced.at) { out += forced.sampa; i += 1; continue; }
    let hit = false;
    for (const [g, s] of G2P) {
      if (w.startsWith(g, i)) { out += s; i += g.length; hit = true; break; }
    }
    if (!hit) i += 1;
  }
  return out;
}

// ── Builders ──────────────────────────────────────────────────────────────────────────
function tags(...t: (string | undefined | string[])[]): string {
  return t.flat().filter(Boolean).map((s) => `<${s}/>`).join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Build one <hns_sign> from a manual pose (+ optional mouth picture). */
function manual(shape: string[], ext: string, palm: string, loc?: string, move?: string[], gloss = "sign", mouth?: string): string {
  const inner = tags(shape) + tags(ext, palm) + (loc ? tags(loc) : "") + (move && move.length ? tags(move) : "");
  const nonman = mouth ? `<hamnosys_nonmanual><hnm_mouthpicture picture="${esc(mouth)}"/></hamnosys_nonmanual>` : "";
  return `<hns_sign gloss="${esc(gloss)}">${nonman}<hamnosys_manual>${inner}</hamnosys_manual></hns_sign>`;
}

const DICT: Record<string, string> = Object.fromEntries(
  Object.entries(RAW).map(([word, [shape, ext, palm, loc, move]]) => [word, manual(shape, ext, palm, loc, move, word.toUpperCase(), mouthPicture(word))]),
);

function letterSign(letter: string): string {
  const p = LETTERS[letter] || LETTERS.a;
  return manual(p.shape, p.ext || "hamextfingeru", p.palm || "hampalml", p.loc, p.move, letter.toUpperCase());
}

function digitSign(d: string): string {
  const { pose, mouth } = DICTS_DIGIT(d);
  return manual(pose.shape, pose.ext || "hamextfingeru", pose.palm || "hampalml", pose.loc, pose.move, d, mouth);
}
function DICTS_DIGIT(d: string) { return DIGITS[d] || DIGITS["0"]; }

/** Fingerspell a single word (letters a–z only). */
export function fingerspell(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "").split("").map(letterSign).join("");
}

/** Resolve one gloss token to a dictionary word (with alias/inflection fallback), or null. */
function resolveWord(token: string): string | null {
  const key = token.toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return null;
  if (DICT[key]) return key;
  if (ALIASES[key] && DICT[ALIASES[key]]) return ALIASES[key];
  // Strip common suffixes as a last resort: -ing, -ed, -es, -s, -ly, -er
  for (const suf of ["ing", "ed", "es", "s", "ly", "er"]) {
    if (key.length > suf.length + 2 && key.endsWith(suf)) {
      const base = key.slice(0, -suf.length);
      if (DICT[base]) return base;
      if (DICT[base + "e"]) return base + "e";
    }
  }
  return null;
}

/** SiGML for one gloss token: dictionary word, digits, operator, or fingerspelling. */
function tokenToSigns(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (/^\d+$/.test(t)) return t.split("").map(digitSign).join("");
  if (OPERATORS[t] && DICT[OPERATORS[t]]) return DICT[OPERATORS[t]];
  // mixed like "2apples" or "x2": split digits and letters
  if (/\d/.test(t) && /[a-z]/i.test(t)) {
    return (t.match(/\d+|[a-z]+/gi) || []).map(tokenToSigns).join("");
  }
  const word = resolveWord(t);
  if (word) return DICT[word];
  const letters = t.toLowerCase().replace(/[^a-z]/g, "");
  return letters ? fingerspell(letters) : "";
}

/**
 * Convert a gloss string (space-separated tokens) into a full SiGML document.
 * Known words use the dictionary; digits/operators have their own signs; the rest are fingerspelled.
 */
export function glossToSiGML(gloss: string): string {
  const tokens = (gloss || "").trim().split(/\s+/).filter(Boolean);
  const signs = tokens.map(tokenToSigns).filter(Boolean).join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sigml>\n  ${signs}\n</sigml>`;
}

/** Number of <hns_sign> elements in a SiGML document. */
export function countSigns(sigml: string): number {
  return (sigml.match(/<hns_sign\b/g) || []).length;
}

/** Rough wall-clock estimate for the avatar to sign N signs (used for frontend timeouts). */
export function estimateSignMs(signCount: number): number {
  return Math.max(1500, signCount * 750 + 900);
}

/** Which gloss tokens are dictionary hits vs. fingerspelled — handy for tuning. */
export function analyseGloss(gloss: string): { known: string[]; spelled: string[] } {
  const known: string[] = [];
  const spelled: string[] = [];
  for (const t of (gloss || "").trim().split(/\s+/).filter(Boolean)) {
    if (/^\d+$/.test(t) || OPERATORS[t] || resolveWord(t)) known.push(t);
    else spelled.push(t);
  }
  return { known, spelled };
}

const STOPWORDS = new Set(("a an the and or but so of to in on at by for with from as is are was were be been being am do does did " +
  "have has had will would shall should can could may might must this that these those there here it its it's let lets let's now then " +
  "just very really also about into onto over under than too our your their his her my me we you they them us he she i im i'm we're you're " +
  "see how what when where which who whom why great okay ok well oh yes no not dont don't isnt isn't").split(/\s+/));

/** Gloss without an LLM: keep meaning-carrying words in order, drop filler, cap length. */
export function fallbackGloss(text: string, maxWords = 8): string {
  const clean = (text || "").replace(/[#*_`\[\]()>|]/g, " ").replace(/[’']/g, "'");
  const tokens = clean.split(/[^A-Za-z0-9+=×÷%'-]+/).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tokens) {
    const t = raw.replace(/'/g, "");
    const low = t.toLowerCase();
    if (!t || STOPWORDS.has(low)) continue;
    if (OPERATORS[t]) { out.push(t); continue; }
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(t.toUpperCase());
    if (out.length >= maxWords) break;
  }
  return out.join(" ");
}

export const KNOWN_WORDS = Object.keys(RAW);
