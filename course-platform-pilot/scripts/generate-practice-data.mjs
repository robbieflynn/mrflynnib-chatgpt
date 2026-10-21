import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const distDir = path.join(rootDir, "course-platform-pilot/dist");
const ibBankPath = path.join(rootDir, "public/question-bank/ib-bank.html");
const igcseBankPath = path.join(rootDir, "public/question-bank/igcse-bank.html");
const igcseLessonsPath = path.join(rootDir, "course-platform-pilot/igcse-lessons.json");
const outputPath = path.join(distDir, "practice-data.js");
const auditPath = path.join(rootDir, "course-platform-pilot/practice-audit.csv");
const authoredPracticePath = path.join(rootDir, "public/question-bank/authored-practice-data.js");

function authoredAiHlQuestion({ id, qnum, marks, difficulty, title, main = "Geometry and Trigonometry", sub, body, parts, markscheme }) {
  return {
    id,
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum,
    marks,
    authored: true,
    difficulty: { "AI HL": difficulty },
    title,
    topics: [{ main, sub }],
    body,
    parts,
    markscheme,
  };
}

function authoredIgcseQuestion({ id, qnum, marks, difficulty, title, sub, body, parts, markscheme }) {
  return {
    id,
    course: "IGCSE Higher",
    banks: ["IGCSE Higher"],
    paper: "Mr Flynn IGCSE Practice",
    paperNumber: "Practice",
    section: "A",
    qnum,
    marks,
    authored: true,
    difficulty: { "IGCSE Higher": difficulty },
    title,
    topics: [{ main: "IGCSE", sub }],
    body,
    parts,
    markscheme,
  };
}

function loadWindowValue(filePath, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), sandbox);
  return sandbox.window[key];
}

function parseSeed(html) {
  const marker = "var SEED = ";
  const markerAt = html.indexOf(marker);
  const start = html.indexOf("[", markerAt);
  if (markerAt < 0 || start < 0) throw new Error("Question-bank SEED was not found");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return JSON.parse(html.slice(start, index + 1));
  }
  throw new Error("Question-bank SEED is incomplete");
}

const library = loadWindowValue(path.join(distDir, "library-data.js"), "MR_FLYNN_LIBRARY");
const ibSeed = parseSeed(fs.readFileSync(ibBankPath, "utf8")).map((question) => ({ ...question, sourceBank: "ib" }));
const igcseSeed = parseSeed(fs.readFileSync(igcseBankPath, "utf8")).map((question) => ({ ...question, sourceBank: "igcse" }));
// A few AI HL syllabus skills have no clean standalone source in the verified
// archive. These short Mr Flynn practice questions fill those exact gaps
// without mislabelling them as past-paper questions or borrowing a later skill.
const authoredPractice = [
  {
    id: "MF_AAHL_T4_DISCRETE_MEDIAN",
    course: "AA HL",
    banks: ["AA HL"],
    paper: "Mr Flynn AA HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 1,
    marks: 3,
    authored: true,
    difficulty: { "AA HL": "Easy" },
    title: "Complete a discrete probability distribution and find its median",
    topics: [{ main: "Statistics and Probability", sub: "Discrete random variables" }],
    body: "The discrete random variable \\(X\\) has the following probability distribution. <table><tr><th>\\(x\\)</th><td>0</td><td>1</td><td>2</td><td>3</td></tr><tr><th>\\(P(X=x)\\)</th><td>0.15</td><td>0.25</td><td>\\(k\\)</td><td>0.20</td></tr></table>",
    parts: [
      ["a", "Find the value of \\(k\\).", 1],
      ["b", "Find the median of \\(X\\).", 2],
    ],
    markscheme: [
      ["a", [["\\(k=1-(0.15+0.25+0.20)=0.40\\)", "A1"]]],
      ["b", [["\\(P(X\\leq1)=0.40\\) and \\(P(X\\leq2)=0.80\\)", "M1"], ["median \\(=2\\)", "A1"]]],
    ],
  },
  {
    id: "MF_AIHL_T3_TRIG_GRAPH_TAN",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 1,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Medium" },
    title: "Sketch a tangent graph",
    topics: [{ main: "Geometry and Trigonometry", sub: "Trigonometric graphs" }],
    body: "Let \\(f(x)=2\\tan x\\), for \\(-\\dfrac{\\pi}{2}<x<\\dfrac{\\pi}{2}\\).",
    parts: [["", "Sketch the graph of \\(y=f(x)\\), clearly showing the intercept and the equations of any vertical asymptotes.", 4]],
    markscheme: [["", [["vertical asymptotes \\(x=-\\dfrac{\\pi}{2}\\) and \\(x=\\dfrac{\\pi}{2}\\)", "A1"], ["intercept \\((0,0)\\)", "A1"], ["correct increasing tangent shape", "A1"], ["correct vertical scale, for example passing through \\(\\left(\\dfrac{\\pi}{4},2\\right)\\)", "A1"]]]],
  },
  {
    id: "MF_AIHL_T3_TRIG_IDENTITY_1",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 2,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Easy" },
    title: "Use the two AI trigonometric identities",
    topics: [{ main: "Geometry and Trigonometry", sub: "Trigonometric identities" }],
    body: "The angle \\(\\theta\\) is acute and \\(\\sin\\theta=\\dfrac{5}{13}\\).",
    parts: [["a", "Use \\(\\sin^2\\theta+\\cos^2\\theta=1\\) to find \\(\\cos\\theta\\).", 2], ["b", "Hence use \\(\\tan\\theta=\\dfrac{\\sin\\theta}{\\cos\\theta}\\) to find \\(\\tan\\theta\\).", 2]],
    markscheme: [["a", [["\\(\\cos^2\\theta=1-\\left(\\dfrac5{13}\\right)^2=\\dfrac{144}{169}\\)", "M1"], ["\\(\\cos\\theta=\\dfrac{12}{13}\\)", "A1"]]], ["b", [["\\(\\tan\\theta=\\dfrac{5/13}{12/13}\\)", "M1"], ["\\(\\tan\\theta=\\dfrac5{12}\\)", "A1"]]]],
  },
  {
    id: "MF_AIHL_T3_TRIG_IDENTITY_2",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 3,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Medium" },
    title: "Simplify using the two AI trigonometric identities",
    topics: [{ main: "Geometry and Trigonometry", sub: "Trigonometric identities" }],
    body: "Let \\(0<\\theta<\\dfrac{\\pi}{2}\\).",
    parts: [["a", "Show that \\(\\dfrac{1-\\sin^2\\theta}{\\cos\\theta}=\\cos\\theta\\).", 2], ["b", "Hence simplify \\(\\dfrac{1-\\sin^2\\theta}{\\sin\\theta\\cos\\theta}\\).", 2]],
    markscheme: [["a", [["\\(1-\\sin^2\\theta=\\cos^2\\theta\\)", "M1"], ["\\(\\dfrac{\\cos^2\\theta}{\\cos\\theta}=\\cos\\theta\\)", "A1"]]], ["b", [["\\(\\dfrac{\\cos^2\\theta}{\\sin\\theta\\cos\\theta}=\\dfrac{\\cos\\theta}{\\sin\\theta}\\)", "M1"], ["\\(\\dfrac1{\\tan\\theta}\\)", "A1"]]]],
  },
  {
    id: "MF_AIHL_T3_MATRIX_STRETCH",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 4,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Easy" },
    title: "Apply a horizontal stretch matrix",
    topics: [{ main: "Geometry and Trigonometry", sub: "Matrix transformations" }],
    body: "The matrix \\(S=\\begin{pmatrix}3&0\\\\0&1\\end{pmatrix}\\) represents a transformation of the plane.",
    parts: [["a", "Describe the transformation represented by \\(S\\).", 2], ["b", "Find the image of the point \\(P(-2,5)\\) under this transformation.", 2]],
    markscheme: [["a", [["horizontal stretch", "A1"], ["scale factor 3, centre the origin", "A1"]]], ["b", [["\\(S\\begin{pmatrix}-2\\\\5\\end{pmatrix}=\\begin{pmatrix}-6\\\\5\\end{pmatrix}\\)", "M1A1"]]]],
  },
  {
    id: "MF_AIHL_T3_MATRIX_TRANSLATION",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 5,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Easy" },
    title: "Apply a translation vector",
    topics: [{ main: "Geometry and Trigonometry", sub: "Matrix transformations" }],
    body: "A translation maps a point with position vector \\(r\\) to \\(r'=r+\\begin{pmatrix}-4\\\\3\\end{pmatrix}\\).",
    parts: [["a", "Find the image of the point \\(A(6,-1)\\).", 2], ["b", "The point \\(B'(-3,8)\\) is the image of \\(B\\). Find the coordinates of \\(B\\).", 2]],
    markscheme: [["a", [["\\(\\begin{pmatrix}6\\\\-1\\end{pmatrix}+\\begin{pmatrix}-4\\\\3\\end{pmatrix}=\\begin{pmatrix}2\\\\2\\end{pmatrix}\\)", "M1A1"]]], ["b", [["\\(\\begin{pmatrix}-3\\\\8\\end{pmatrix}-\\begin{pmatrix}-4\\\\3\\end{pmatrix}=\\begin{pmatrix}1\\\\5\\end{pmatrix}\\)", "M1A1"]]]],
  },
  {
    id: "MF_AIHL_T3_MATRIX_ENLARGEMENT",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 6,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Medium" },
    title: "Find and apply an enlargement matrix",
    topics: [{ main: "Geometry and Trigonometry", sub: "Matrix transformations" }],
    body: "An enlargement with centre the origin maps \\(P(6,-9)\\) to \\(P'(2,-3)\\).",
    parts: [["a", "Find the scale factor of the enlargement.", 1], ["b", "Write down the matrix representing the enlargement.", 1], ["c", "Find the image of \\(Q(-12,15)\\).", 2]],
    markscheme: [["a", [["scale factor \\(\\dfrac13\\)", "A1"]]], ["b", [["\\(\\begin{pmatrix}\\frac13&0\\\\0&\\frac13\\end{pmatrix}\\)", "A1"]]], ["c", [["matrix multiplication or multiplying both coordinates by \\(\\dfrac13\\)", "M1"], ["\\(Q'(-4,5)\\)", "A1"]]]],
  },
  {
    id: "MF_AIHL_T3_MATRIX_REFLECTION",
    course: "AI HL",
    banks: ["AI HL"],
    paper: "Mr Flynn AI HL Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 7,
    marks: 4,
    authored: true,
    difficulty: { "AI HL": "Medium" },
    title: "Use the general reflection matrix",
    topics: [{ main: "Geometry and Trigonometry", sub: "Matrix transformations" }],
    body: "The matrix \\(R=\\begin{pmatrix}\\cos 2\\theta&\\sin 2\\theta\\\\\\sin 2\\theta&-\\cos 2\\theta\\end{pmatrix}\\) represents reflection in the line \\(y=(\\tan\\theta)x\\).",
    parts: [["a", "Write down the matrix for reflection in the line \\(y=\\sqrt3x\\).", 2], ["b", "Hence find the image of \\(P(2,0)\\).", 2]],
    markscheme: [["a", [["\\(\\theta=\\dfrac{\\pi}{3}\\)", "M1"], ["\\(R=\\begin{pmatrix}-\\frac12&\\frac{\\sqrt3}{2}\\\\\\frac{\\sqrt3}{2}&\\frac12\\end{pmatrix}\\)", "A1"]]], ["b", [["matrix multiplication", "M1"], ["\\(P'(-1,\\sqrt3)\\)", "A1"]]]],
  },
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_UNIT_VECTOR",
    qnum: 8,
    marks: 4,
    difficulty: "Medium",
    title: "Find a unit vector in three dimensions",
    sub: "Vectors",
    body: "The vector \\(\\boldsymbol{a}=\\begin{pmatrix}4\\\\-4\\\\7\\end{pmatrix}\\).",
    parts: [["a", "Find \\(\\lvert\\boldsymbol{a}\\rvert\\).", 1], ["b", "Find the unit vector in the direction opposite to \\(\\boldsymbol{a}\\).", 3]],
    markscheme: [["a", [["\\(\\lvert\\boldsymbol{a}\\rvert=\\sqrt{4^2+(-4)^2+7^2}=9\\)", "A1"]]], ["b", [["uses \\(-\\boldsymbol{a}/\\lvert\\boldsymbol{a}\\rvert\\)", "M1"], ["\\(\\begin{pmatrix}-4/9\\\\4/9\\\\-7/9\\end{pmatrix}\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_VECTOR_LINE_3D_POINTS",
    qnum: 9,
    marks: 4,
    difficulty: "Easy",
    title: "Find a vector equation of a line in three dimensions",
    sub: "Vector equations of lines",
    body: "The line \\(L\\) passes through \\(A(2,-1,4)\\) and \\(B(5,3,-2)\\).",
    parts: [["", "Find a vector equation of \\(L\\).", 4]],
    markscheme: [["", [["\\(\\overrightarrow{AB}=\\begin{pmatrix}3\\\\4\\\\-6\\end{pmatrix}\\)", "M1A1"], ["\\(\\boldsymbol r=\\begin{pmatrix}2\\\\-1\\\\4\\end{pmatrix}+t\\begin{pmatrix}3\\\\4\\\\-6\\end{pmatrix},\\ t\\in\\mathbb R\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_VECTOR_LINE_3D_DIRECTION",
    qnum: 10,
    marks: 4,
    difficulty: "Medium",
    title: "Find a second vector equation in three dimensions",
    sub: "Vector equations of lines",
    body: "A line \\(M\\) passes through \\(P(-1,2,5)\\) and is parallel to the line joining \\(Q(2,0,-1)\\) to \\(R(5,4,1)\\).",
    parts: [["", "Find a vector equation of \\(M\\).", 4]],
    markscheme: [["", [["\\(\\overrightarrow{QR}=\\begin{pmatrix}3\\\\4\\\\2\\end{pmatrix}\\)", "M1A1"], ["\\(\\boldsymbol r=\\begin{pmatrix}-1\\\\2\\\\5\\end{pmatrix}+t\\begin{pmatrix}3\\\\4\\\\2\\end{pmatrix},\\ t\\in\\mathbb R\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_VECTOR_KINEMATICS_3D",
    qnum: 11,
    marks: 6,
    difficulty: "Easy",
    title: "Use a three-dimensional position vector",
    sub: "Vector kinematics",
    body: "The position vector of a particle at time \\(t\\) seconds is \\(\\boldsymbol r(t)=\\begin{pmatrix}2t+1\\\\t^2-3\\\\6-t\\end{pmatrix}\\) metres.",
    parts: [["a", "Find the velocity vector at time \\(t\\).", 2], ["b", "Find the speed of the particle when \\(t=2\\).", 2], ["c", "Find the position of the particle when \\(t=2\\).", 2]],
    markscheme: [["a", [["\\(\\boldsymbol v(t)=\\begin{pmatrix}2\\\\2t\\\\-1\\end{pmatrix}\\)", "A2"]]], ["b", [["\\(\\lvert\\boldsymbol v(2)\\rvert=\\sqrt{2^2+4^2+(-1)^2}=\\sqrt{21}\\)", "M1A1"]]], ["c", [["\\(\\boldsymbol r(2)=\\begin{pmatrix}5\\\\1\\\\4\\end{pmatrix}\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_VECTOR_KINEMATICS_MEETING",
    qnum: 12,
    marks: 6,
    difficulty: "Medium",
    title: "Determine whether two moving objects meet",
    sub: "Vector kinematics",
    body: "Two drones have position vectors \\(\\boldsymbol r_A(t)=\\begin{pmatrix}1+2t\\\\4-t\\\\3+t\\end{pmatrix}\\) and \\(\\boldsymbol r_B(t)=\\begin{pmatrix}7-t\\\\1+\\tfrac12t\\\\9-2t\\end{pmatrix}\\), where distances are in kilometres and \\(t\\) is in hours.",
    parts: [["a", "Write down the velocity vector of each drone.", 2], ["b", "Determine whether the drones meet. Justify your answer.", 4]],
    markscheme: [["a", [["\\(\\boldsymbol v_A=\\begin{pmatrix}2\\\\-1\\\\1\\end{pmatrix}\\), \\(\\boldsymbol v_B=\\begin{pmatrix}-1\\\\1/2\\\\-2\\end{pmatrix}\\)", "A2"]]], ["b", [["equating first coordinates gives \\(t=2\\)", "M1"], ["second coordinates are both \\(2\\) at \\(t=2\\)", "A1"], ["third coordinates are \\(5\\) and \\(5\\)", "A1"], ["the drones meet at \\(t=2\\), at \\((5,2,5)\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_VECTOR_PRODUCT",
    qnum: 14,
    marks: 4,
    difficulty: "Medium",
    title: "Calculate a vector product",
    sub: "Vector product",
    body: "Let \\(\\boldsymbol p=\\begin{pmatrix}1\\\\2\\\\-1\\end{pmatrix}\\) and \\(\\boldsymbol q=\\begin{pmatrix}3\\\\0\\\\4\\end{pmatrix}\\).",
    parts: [["a", "Find \\(\\boldsymbol p\\times\\boldsymbol q\\).", 3], ["b", "Verify that your answer is perpendicular to \\(\\boldsymbol p\\).", 1]],
    markscheme: [["a", [["correct determinant or component method", "M1"], ["\\(\\boldsymbol p\\times\\boldsymbol q=\\begin{pmatrix}8\\\\-7\\\\-6\\end{pmatrix}\\)", "A2"]]], ["b", [["\\(\\begin{pmatrix}8\\\\-7\\\\-6\\end{pmatrix}\\cdot\\begin{pmatrix}1\\\\2\\\\-1\\end{pmatrix}=0\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_VECTOR_COMPONENT",
    qnum: 15,
    marks: 5,
    difficulty: "Medium",
    title: "Resolve a vector into parallel and perpendicular components",
    sub: "Components of vectors",
    body: "The vector \\(\\boldsymbol a=\\begin{pmatrix}5\\\\1\\\\4\\end{pmatrix}\\) is resolved into a component parallel to \\(\\boldsymbol b=\\begin{pmatrix}2\\\\-1\\\\2\\end{pmatrix}\\) and a component perpendicular to \\(\\boldsymbol b\\).",
    parts: [["a", "Find the vector component of \\(\\boldsymbol a\\) parallel to \\(\\boldsymbol b\\).", 3], ["b", "Hence find the component perpendicular to \\(\\boldsymbol b\\).", 2]],
    markscheme: [["a", [["uses \\(\\operatorname{proj}_{\\boldsymbol b}\\boldsymbol a=\\dfrac{\\boldsymbol a\\cdot\\boldsymbol b}{\\boldsymbol b\\cdot\\boldsymbol b}\\boldsymbol b\\)", "M1"], ["coefficient \\(17/9\\)", "A1"], ["\\(\\begin{pmatrix}34/9\\\\-17/9\\\\34/9\\end{pmatrix}\\)", "A1"]]], ["b", [["subtracts the parallel component from \\(\\boldsymbol a\\)", "M1"], ["\\(\\begin{pmatrix}11/9\\\\26/9\\\\2/9\\end{pmatrix}\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_WEIGHTED_ADJACENCY",
    qnum: 16,
    marks: 5,
    difficulty: "Medium",
    title: "Complete a weighted adjacency table",
    sub: "Graph theory",
    body: "An undirected weighted graph has vertices \\(A,B,C,D\\) and edges \\(AB=7\\), \\(AC=4\\), \\(BC=6\\), \\(BD=3\\) and \\(CD=5\\). There is no edge joining \\(A\\) to \\(D\\).",
    parts: [["", "Construct the weighted adjacency table for the graph, using a dash for a missing edge.", 5]],
    markscheme: [["", [["symmetric table with zero or blank diagonal", "M1"], ["correct entries \\(AB=7, AC=4, BC=6, BD=3, CD=5\\)", "A3"], ["no \\(AD\\) edge shown", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_PRIM_GRAPH",
    qnum: 17,
    marks: 5,
    difficulty: "Medium",
    title: "Apply Prim's algorithm to a weighted graph",
    sub: "Graph algorithms",
    body: "A connected weighted graph has edges \\(AB=3\\), \\(AC=6\\), \\(BC=2\\), \\(BD=5\\), \\(CD=4\\), \\(CE=7\\) and \\(DE=1\\).",
    parts: [["a", "Starting at \\(A\\), list the edges selected by Prim's algorithm, in order.", 3], ["b", "Find the total weight of the minimum spanning tree.", 2]],
    markscheme: [["a", [["selects \\(AB\\), then \\(BC\\)", "A1"], ["then \\(CD\\)", "A1"], ["then \\(DE\\)", "A1"]]], ["b", [["\\(3+2+4+1\\)", "M1"], ["total weight \\(10\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_EULERIAN",
    qnum: 18,
    marks: 4,
    difficulty: "Medium",
    title: "Classify an Eulerian graph",
    sub: "Graph routes",
    body: "A connected graph has vertices \\(P,Q,R,S,T\\) with degrees \\(3,2,4,3,2\\), respectively.",
    parts: [["a", "Determine whether the graph has an Eulerian circuit, an Eulerian trail but no circuit, or neither.", 2], ["b", "State the possible starting and finishing vertices of an Eulerian trail.", 2]],
    markscheme: [["a", [["exactly two vertices have odd degree", "R1"], ["Eulerian trail but no Eulerian circuit", "A1"]]], ["b", [["the trail must start at one of \\(P,S\\) and finish at the other", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_CHINESE_POSTMAN",
    qnum: 19,
    marks: 6,
    difficulty: "Medium",
    title: "Solve a Chinese postman problem",
    sub: "Route inspection",
    body: "A connected network has total edge weight \\(46\\). Its only odd vertices are \\(A,B,C,D\\). The shortest-path weights are \\(AB=6\\), \\(AC=5\\), \\(AD=9\\), \\(BC=7\\), \\(BD=4\\) and \\(CD=8\\).",
    parts: [["a", "Find the minimum total weight of paths that must be repeated.", 4], ["b", "Hence find the length of a shortest closed route that traverses every edge.", 2]],
    markscheme: [["a", [["compares pairings: \\(AB+CD=14\\), \\(AC+BD=9\\), \\(AD+BC=16\\)", "M2A1"], ["minimum repeated weight \\(9\\)", "A1"]]], ["b", [["\\(46+9\\)", "M1"], ["\\(55\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_HAMILTONIAN",
    qnum: 20,
    marks: 4,
    difficulty: "Easy",
    title: "Find a Hamiltonian cycle",
    sub: "Hamiltonian graphs",
    body: "A graph has vertices \\(A,B,C,D,E\\). Its edges are \\(AB,AC,BC,BD,CE,DE,EA\\).",
    parts: [["a", "Write down a Hamiltonian cycle that starts and ends at \\(A\\).", 2], ["b", "Explain why \\(A-B-C-A\\) is not a Hamiltonian cycle of this graph.", 2]],
    markscheme: [["a", [["for example \\(A-B-D-E-C-A\\)", "A2"]]], ["b", [["it does not visit every vertex", "R1"], ["vertices \\(D\\) and \\(E\\) are omitted", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_TSP_BOUNDS",
    qnum: 21,
    marks: 6,
    difficulty: "Medium",
    title: "Find bounds for a travelling-salesman route",
    sub: "Travelling salesman problem",
    body: "For a complete weighted graph, a nearest-neighbour tour has weight \\(64\\). Deleting vertex \\(C\\) gives a minimum spanning tree of weight \\(39\\); the two least incident edges at \\(C\\) have weights \\(7\\) and \\(9\\).",
    parts: [["a", "State an upper bound for the optimal travelling-salesman tour.", 1], ["b", "Use the deleted-vertex method to find a lower bound.", 3], ["c", "Hence state an interval containing the optimal tour weight.", 2]],
    markscheme: [["a", [["upper bound \\(64\\)", "A1"]]], ["b", [["\\(39+7+9\\)", "M1A1"], ["lower bound \\(55\\)", "A1"]]], ["c", [["\\(55\\leq W\\leq64\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_TSP_PRACTICAL",
    qnum: 22,
    marks: 5,
    difficulty: "Medium",
    title: "Interpret travelling-salesman bounds in context",
    sub: "Travelling salesman problem",
    body: "A maintenance engineer must leave a depot, visit each of six pumping stations exactly once, and return to the depot. A heuristic produces a route of \\(128\\) km, while a lower-bound calculation gives \\(119\\) km.",
    parts: [["a", "Explain why \\(128\\) km is an upper bound and \\(119\\) km is a lower bound for the shortest route.", 3], ["b", "Find the greatest possible amount by which the heuristic route exceeds the optimal route.", 2]],
    markscheme: [["a", [["the \\(128\\) km route is feasible, so the optimum cannot be longer", "R1"], ["no valid tour can be shorter than the proven lower bound", "R1"], ["correct contextual interpretation", "A1"]]], ["b", [["\\(128-119\\)", "M1"], ["\\(9\\) km", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_NEAREST_NEIGHBOUR_1",
    qnum: 23,
    marks: 5,
    difficulty: "Easy",
    title: "Apply the nearest-neighbour algorithm",
    sub: "Graph algorithms",
    body: "In a complete weighted graph on vertices \\(A,B,C,D\\), the edge weights are \\(AB=4\\), \\(AC=7\\), \\(AD=6\\), \\(BC=5\\), \\(BD=8\\) and \\(CD=3\\).",
    parts: [["a", "Starting at \\(A\\), use the nearest-neighbour algorithm to find a tour.", 3], ["b", "Find the weight of this tour.", 2]],
    markscheme: [["a", [["\\(A\\to B\\to C\\to D\\to A\\)", "A3"]]], ["b", [["\\(4+5+3+6\\)", "M1"], ["\\(18\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T3_NEAREST_NEIGHBOUR_2",
    qnum: 24,
    marks: 6,
    difficulty: "Medium",
    title: "Compare nearest-neighbour tours",
    sub: "Graph algorithms",
    body: "A complete weighted graph has vertices \\(P,Q,R,S\\) and edge weights \\(PQ=5\\), \\(PR=4\\), \\(PS=9\\), \\(QR=7\\), \\(QS=3\\) and \\(RS=6\\).",
    parts: [["a", "Use the nearest-neighbour algorithm starting at \\(P\\) to find a tour and its weight.", 3], ["b", "Repeat the algorithm starting at \\(Q\\).", 3]],
    markscheme: [["a", [["\\(P\\to R\\to S\\to Q\\to P\\)", "A2"], ["weight \\(18\\)", "A1"]]], ["b", [["\\(Q\\to S\\to R\\to P\\to Q\\)", "A2"], ["weight \\(18\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T4_CHI_SQUARED_DF",
    qnum: 25,
    marks: 3,
    difficulty: "Medium",
    title: "Degrees of freedom after estimating normal parameters",
    main: "Statistics and Probability",
    sub: "Chi-squared test – Goodness of fit",
    body: "A chi-squared goodness-of-fit test compares observed data with a normal distribution. After any necessary grouping, there are five categories. Both the population mean and the population standard deviation are estimated from the sample.",
    parts: [["a", "State the number of parameters estimated from the sample.", 1], ["b", "Hence find the number of degrees of freedom for the test.", 2]],
    markscheme: [["a", [["two parameters", "A1"]]], ["b", [["\\(5-1-2\\)", "M1"], ["\\(2\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T4_ONE_SAMPLE_T_TEST",
    qnum: 26,
    marks: 6,
    difficulty: "Medium",
    title: "A one-sample t-test for a population mean",
    main: "Statistics and Probability",
    sub: "T-test and Z-test",
    body: "A manufacturer claims that the mean lifetime of a rechargeable battery is \\(500\\) charging cycles. A random sample of \\(12\\) batteries has mean lifetime \\(487\\) cycles and sample standard deviation \\(s_{n-1}=22\\) cycles. Battery lifetimes may be assumed to be normally distributed.",
    parts: [["a", "State suitable hypotheses to test whether the population mean lifetime is less than the manufacturer's claim.", 2], ["b", "Carry out the test at the \\(5\\%\\) significance level and state your conclusion in context.", 4]],
    markscheme: [["a", [["\\(H_0:\\mu=500\\)", "A1"], ["\\(H_1:\\mu<500\\)", "A1"]]], ["b", [["uses a one-sample \\(t\\)-test", "M1"], ["\\(t=-2.05\\) and \\(p\\approx0.0326\\)", "A1A1"], ["reject \\(H_0\\); there is evidence that the population mean lifetime is less than \\(500\\) cycles", "R1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T4_NORMAL_GOF_DF",
    qnum: 42,
    marks: 5,
    difficulty: "Medium",
    title: "Normal goodness of fit with two estimated parameters",
    main: "Statistics and Probability",
    sub: "Chi-squared test – Goodness of fit",
    body: "A chi-squared goodness-of-fit test is used to test whether a data set can be modelled by a normal distribution. After combining categories with small expected frequencies, there are seven categories. The mean and standard deviation of the normal distribution are both estimated from the sample. The test statistic is \\(\\chi^2=10.4\\).",
    parts: [["a", "Find the number of degrees of freedom for the test.", 2], ["b", "Find the p-value and state the conclusion at the \\(5\\%\\) significance level.", 3]],
    markscheme: [["a", [["\\(7-1-2\\)", "M1"], ["\\(4\\) degrees of freedom", "A1"]]], ["b", [["\\(p=P(\\chi_4^2\\geq10.4)\\approx0.0342\\)", "M1A1"], ["reject the null hypothesis; there is evidence that the normal model is not a good fit", "R1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T4_COEFFICIENT_DETERMINATION",
    qnum: 43,
    marks: 4,
    difficulty: "Easy",
    title: "Calculate and interpret a coefficient of determination",
    main: "Statistics and Probability",
    sub: "Sum of square residuals and R²",
    body: "For a set of paired data, the product moment correlation coefficient is \\(r=-0.92\\).",
    parts: [["a", "Calculate the coefficient of determination.", 2], ["b", "Interpret your answer in the context of a linear model.", 2]],
    markscheme: [["a", [["\\(r^2=(-0.92)^2\\)", "M1"], ["\\(r^2=0.8464\\)", "A1"]]], ["b", [["about \\(84.6\\%\\) of the variation in the dependent variable", "A1"], ["is explained by its linear relationship with the independent variable", "R1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T4_LONG_TERM_PROBABILITY",
    qnum: 44,
    marks: 5,
    difficulty: "Medium",
    title: "Find a long-term probability from a transition matrix",
    main: "Statistics and Probability",
    sub: "Markov chains and transition matrices",
    body: "Each day a student travels to school by bus, \\(B\\), or by car, \\(C\\). The transition matrix is \\(T=\\begin{pmatrix}0.7&0.4\\\\0.3&0.6\\end{pmatrix}\\), where the state vector is ordered \\(B,C\\).",
    parts: [["a", "Find the steady-state probability vector.", 3], ["b", "Hence state the long-term probability that the student travels by bus.", 2]],
    markscheme: [["a", [["solves \\(T\\begin{pmatrix}b\\\\c\\end{pmatrix}=\\begin{pmatrix}b\\\\c\\end{pmatrix}\\) together with \\(b+c=1\\)", "M1"], ["\\(0.3b=0.4c\\)", "A1"], ["\\(\\begin{pmatrix}4/7\\\\3/7\\end{pmatrix}\\)", "A1"]]], ["b", [["the long-term probability is the bus component of the steady-state vector", "R1"], ["\\(4/7\\approx0.571\\)", "A1"]]]],
  }),
  {
    id: "MF_AI_T5_POWER_RULE_INTEGRATION",
    course: "AI SL",
    banks: ["AI SL", "AI HL"],
    paper: "Mr Flynn AI Practice",
    paperNumber: "Practice",
    section: "A",
    qnum: 45,
    marks: 4,
    authored: true,
    difficulty: { "AI SL": "Easy", "AI HL": "Easy" },
    title: "Integrate a polynomial using the power rule",
    topics: [{ main: "Calculus", sub: "Integration rules" }],
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int(4x^3-6x^2+5)\\,dx\\).", 4]],
    markscheme: [["", [["integrates each term using the power rule", "M1"], ["\\(x^4-2x^3+5x+C\\)", "A3"]]]],
  },
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_BASIC_DERIVATIVES_1",
    qnum: 27,
    marks: 4,
    difficulty: "Easy",
    title: "Differentiate sine, cosine, exponential and logarithmic terms",
    main: "Calculus",
    sub: "Differentiation - basic rules",
    body: "Let \\(f(x)=3\\sin x-2\\cos x+4e^x+5\\ln x\\), where \\(x>0\\).",
    parts: [["", "Find \\(f'(x)\\).", 4]],
    markscheme: [["", [["\\(f'(x)=3\\cos x+2\\sin x+4e^x+\\dfrac5x\\)", "A4"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_BASIC_DERIVATIVES_2",
    qnum: 28,
    marks: 4,
    difficulty: "Easy",
    title: "Find a gradient using the basic transcendental derivatives",
    main: "Calculus",
    sub: "Differentiation - basic rules",
    body: "The curve \\(C\\) has equation \\(y=2e^x+3\\ln x-\\sin x\\), where \\(x>0\\).",
    parts: [["a", "Find \\(\\dfrac{dy}{dx}\\).", 3], ["b", "Find the gradient of \\(C\\) when \\(x=1\\).", 1]],
    markscheme: [["a", [["\\(\\dfrac{dy}{dx}=2e^x+\\dfrac3x-\\cos x\\)", "A3"]]], ["b", [["\\(2e+3-\\cos1\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_RATIONAL_DERIVATIVES_1",
    qnum: 29,
    marks: 4,
    difficulty: "Easy",
    title: "Differentiate rational powers",
    main: "Calculus",
    sub: "Differentiation - basic rules",
    body: "Let \\(f(x)=4x^{\\frac12}-3x^{-\\frac12}\\), where \\(x>0\\).",
    parts: [["", "Find \\(f'(x)\\).", 4]],
    markscheme: [["", [["\\(f'(x)=2x^{-\\frac12}+\\dfrac32x^{-\\frac32}\\)", "A4"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_RATIONAL_DERIVATIVES_2",
    qnum: 30,
    marks: 5,
    difficulty: "Medium",
    title: "Differentiate positive and negative fractional powers",
    main: "Calculus",
    sub: "Differentiation - basic rules",
    body: "The function \\(g\\) is defined by \\(g(x)=6x^{\\frac23}+2x^{-\\frac32}\\), where \\(x>0\\).",
    parts: [["a", "Find \\(g'(x)\\).", 4], ["b", "Find \\(g'(8)\\).", 1]],
    markscheme: [["a", [["\\(g'(x)=4x^{-\\frac13}-3x^{-\\frac52}\\)", "A4"]]], ["b", [["\\(2-\\dfrac{3}{64\\sqrt8}\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_CHAIN_RULE",
    qnum: 31,
    marks: 4,
    difficulty: "Easy",
    title: "Use the chain rule",
    main: "Calculus",
    sub: "Differentiation - product, quotient and chain rule",
    body: "Let \\(f(x)=e^{3x+1}+\\sin(2x)\\).",
    parts: [["", "Find \\(f'(x)\\).", 4]],
    markscheme: [["", [["\\(f'(x)=3e^{3x+1}+2\\cos(2x)\\)", "A4"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_RATIONAL_POWER_INTEGRATION",
    qnum: 32,
    marks: 4,
    difficulty: "Easy",
    title: "Integrate rational powers",
    main: "Calculus",
    sub: "Integration rules",
    body: "Let \\(x>0\\).",
    parts: [["", "Find \\(\\displaystyle\\int\\left(3x^{1/2}-2x^{-1/2}\\right)\\,dx\\).", 4]],
    markscheme: [["", [["\\(2x^{3/2}-4x^{1/2}+C\\)", "A4"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_SIN_COS_INTEGRATION_1",
    qnum: 33,
    marks: 4,
    difficulty: "Easy",
    title: "Integrate sine and cosine directly",
    main: "Calculus",
    sub: "Integration rules",
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int(4\\sin x-3\\cos x)\\,dx\\).", 4]],
    markscheme: [["", [["\\(-4\\cos x-3\\sin x+C\\)", "A4"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_SIN_COS_INTEGRATION_2",
    qnum: 34,
    marks: 4,
    difficulty: "Medium",
    title: "Evaluate a definite sine and cosine integral",
    main: "Calculus",
    sub: "Integration rules",
    body: "",
    parts: [["", "Evaluate \\(\\displaystyle\\int_0^{\\pi/2}(3\\sin x+2\\cos x)\\,dx\\).", 4]],
    markscheme: [["", [["antiderivative \\(-3\\cos x+2\\sin x\\)", "M1A1"], ["value \\(5\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_DIRECT_EXP_INTEGRATION",
    qnum: 46,
    marks: 4,
    difficulty: "Easy",
    title: "Integrate an exponential term directly",
    main: "Calculus",
    sub: "Integration rules",
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int(3e^x+4)\\,dx\\).", 4]],
    markscheme: [["", [["integrates \\(e^x\\) directly", "M1"], ["\\(3e^x+4x+C\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_DIRECT_LOG_INTEGRATION",
    qnum: 47,
    marks: 4,
    difficulty: "Easy",
    title: "Integrate a reciprocal term directly",
    main: "Calculus",
    sub: "Integration rules",
    body: "Let \\(x>0\\).",
    parts: [["", "Find \\(\\displaystyle\\int\\left(\\frac5x-2\\right)\\,dx\\).", 4]],
    markscheme: [["", [["uses \\(\\int \\frac1x\\,dx=\\ln x\\)", "M1"], ["\\(5\\ln x-2x+C\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_INVERSE_CHAIN_EXP",
    qnum: 48,
    marks: 4,
    difficulty: "Easy",
    title: "Use the inverse chain rule with an exponential",
    main: "Calculus",
    sub: "Integration rules",
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int 6e^{3x}\\,dx\\).", 4]],
    markscheme: [["", [["accounts for the inner derivative \\(3\\)", "M1"], ["\\(2e^{3x}+C\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_INVERSE_CHAIN_TRIG",
    qnum: 49,
    marks: 4,
    difficulty: "Medium",
    title: "Use the inverse chain rule with cosine",
    main: "Calculus",
    sub: "Integration rules",
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int 4\\cos(2x-1)\\,dx\\).", 4]],
    markscheme: [["", [["accounts for the inner derivative \\(2\\)", "M1"], ["\\(2\\sin(2x-1)+C\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_SUBSTITUTION_1",
    qnum: 35,
    marks: 4,
    difficulty: "Easy",
    title: "Integrate a function of a function",
    main: "Calculus",
    sub: "Integration by substitution",
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int 2x(x^2+1)^4\\,dx\\).", 4]],
    markscheme: [["", [["uses \\(u=x^2+1\\), so \\(du=2x\\,dx\\)", "M1"], ["\\(\\dfrac{(x^2+1)^5}{5}+C\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_SUBSTITUTION_2",
    qnum: 36,
    marks: 5,
    difficulty: "Medium",
    title: "Use substitution in a definite integral",
    main: "Calculus",
    sub: "Integration by substitution",
    body: "",
    parts: [["", "Evaluate \\(\\displaystyle\\int_0^2 3x^2\\sqrt{x^3+1}\\,dx\\).", 5]],
    markscheme: [["", [["uses \\(u=x^3+1\\), so \\(du=3x^2\\,dx\\)", "M1"], ["changes the limits to \\(1\\) and \\(9\\)", "A1"], ["\\(\\left[\\dfrac23u^{3/2}\\right]_1^9=\\dfrac{52}{3}\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_SUBSTITUTION_LOG",
    qnum: 50,
    marks: 5,
    difficulty: "Medium",
    title: "Use substitution to obtain a logarithm",
    main: "Calculus",
    sub: "Integration by substitution",
    body: "",
    parts: [["", "Find \\(\\displaystyle\\int\\frac{2x}{x^2+5}\\,dx\\).", 5]],
    markscheme: [["", [["uses \\(u=x^2+5\\), so \\(du=2x\\,dx\\)", "M1"], ["obtains \\(\\int\\frac1u\\,du\\)", "M1"], ["\\(\\ln(x^2+5)+C\\)", "A3"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_AREA_Y_AXIS",
    qnum: 51,
    marks: 4,
    difficulty: "Easy",
    title: "Find an area between a curve and the y-axis",
    main: "Calculus",
    sub: "Area and volume",
    body: "The region \\(R\\) is bounded by the curve \\(x=y^2\\), the \\(y\\)-axis, and the lines \\(y=0\\) and \\(y=2\\).",
    parts: [["", "Find the area of \\(R\\).", 4]],
    markscheme: [["", [["uses \\(\\displaystyle\\int_0^2 y^2\\,dy\\)", "M2"], ["\\(\\left[\\frac{y^3}{3}\\right]_0^2=\\frac83\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_KINEMATICS_2",
    qnum: 37,
    marks: 5,
    difficulty: "Medium",
    title: "Acceleration from a velocity-displacement model",
    main: "Calculus",
    sub: "Kinematics",
    body: "A particle moves in a straight line. Its velocity \\(v\\text{ m s}^{-1}\\) is related to its displacement \\(s\\text{ m}\\) by \\(v=s^2+2s\\), where \\(s>0\\).",
    parts: [["a", "Using \\(a=v\\dfrac{dv}{ds}\\), find the acceleration in terms of \\(s\\).", 3], ["b", "Find the acceleration when \\(s=1\\).", 2]],
    markscheme: [["a", [["\\(\\dfrac{dv}{ds}=2s+2\\)", "A1"], ["\\(a=(s^2+2s)(2s+2)\\)", "M1A1"]]], ["b", [["\\(a=3\\times4=12\\text{ m s}^{-2}\\)", "M1A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_FORM_DIFFERENTIAL_EQUATION",
    qnum: 38,
    marks: 4,
    difficulty: "Easy",
    title: "Form a differential equation from a cooling model",
    main: "Calculus",
    sub: "Differential equations",
    body: "The temperature \\(T\\ ^\\circ\\text{C}\\) of a drink \\(t\\) minutes after it is poured changes at a rate proportional to the difference between \\(T\\) and the room temperature of \\(20^\\circ\\text{C}\\). The drink is cooling.",
    parts: [["a", "Write down a differential equation for this model, using a positive constant \\(k\\).", 2], ["b", "State the sign of \\(\\dfrac{dT}{dt}\\) while \\(T>20\\), and explain why it is consistent with your equation.", 2]],
    markscheme: [["a", [["\\(\\dfrac{dT}{dt}=-k(T-20)\\), \\(k>0\\)", "A2"]]], ["b", [["negative", "A1"], ["both \\(k\\) and \\(T-20\\) are positive, so the leading minus sign makes the rate negative", "R1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_SEPARATION",
    qnum: 39,
    marks: 5,
    difficulty: "Easy",
    title: "Solve a differential equation by separating variables",
    main: "Calculus",
    sub: "Differential equations",
    body: "The variables \\(x\\) and \\(y\\) satisfy \\(\\dfrac{dy}{dx}=\\dfrac{3x^2}{y}\\), where \\(y>0\\), and \\(y=2\\) when \\(x=0\\).",
    parts: [["", "Find \\(y\\) in terms of \\(x\\).", 5]],
    markscheme: [["", [["\\(y\\,dy=3x^2\\,dx\\)", "M1"], ["\\(\\dfrac12y^2=x^3+C\\)", "A1"], ["\\(C=2\\)", "A1"], ["\\(y=\\sqrt{2x^3+4}\\)", "A2"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_COUPLED_EXACT_1",
    qnum: 52,
    marks: 6,
    difficulty: "Medium",
    title: "Solve a coupled system using eigenvectors",
    main: "Calculus",
    sub: "Coupled differential equations",
    body: "A coupled system has eigenvalues \\(\\lambda_1=2\\), \\(\\lambda_2=-1\\), with corresponding eigenvectors \\(\\mathbf p_1=\\begin{pmatrix}1\\\\1\\end{pmatrix}\\) and \\(\\mathbf p_2=\\begin{pmatrix}1\\\\-2\\end{pmatrix}\\). Initially, \\(\\mathbf x(0)=\\begin{pmatrix}4\\\\1\\end{pmatrix}\\).",
    parts: [["a", "Write down the general solution in the form \\(\\mathbf x=Ae^{\\lambda_1t}\\mathbf p_1+Be^{\\lambda_2t}\\mathbf p_2\\).", 2], ["b", "Find \\(A\\) and \\(B\\), and hence find the exact solution.", 4]],
    markscheme: [["a", [["\\(\\mathbf x=Ae^{2t}\\begin{pmatrix}1\\\\1\\end{pmatrix}+Be^{-t}\\begin{pmatrix}1\\\\-2\\end{pmatrix}\\)", "A2"]]], ["b", [["uses \\(A+B=4\\) and \\(A-2B=1\\)", "M1A1"], ["\\(A=3\\), \\(B=1\\)", "A1"], ["\\(\\mathbf x=3e^{2t}\\begin{pmatrix}1\\\\1\\end{pmatrix}+e^{-t}\\begin{pmatrix}1\\\\-2\\end{pmatrix}\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_COUPLED_EXACT_2",
    qnum: 53,
    marks: 6,
    difficulty: "Medium",
    title: "Find an exact eigenvector-form solution",
    main: "Calculus",
    sub: "Coupled differential equations",
    body: "A coupled system has eigenvalues \\(\\lambda_1=-2\\), \\(\\lambda_2=-4\\), with corresponding eigenvectors \\(\\mathbf p_1=\\begin{pmatrix}1\\\\2\\end{pmatrix}\\) and \\(\\mathbf p_2=\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\). Initially, \\(\\mathbf x(0)=\\begin{pmatrix}5\\\\4\\end{pmatrix}\\).",
    parts: [["a", "Write down the general solution in the form \\(\\mathbf x=Ae^{\\lambda_1t}\\mathbf p_1+Be^{\\lambda_2t}\\mathbf p_2\\).", 2], ["b", "Use the initial condition to find the exact solution.", 4]],
    markscheme: [["a", [["\\(\\mathbf x=Ae^{-2t}\\begin{pmatrix}1\\\\2\\end{pmatrix}+Be^{-4t}\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\)", "A2"]]], ["b", [["uses \\(A+B=5\\) and \\(2A-B=4\\)", "M1A1"], ["\\(A=3\\), \\(B=2\\)", "A1"], ["\\(\\mathbf x=3e^{-2t}\\begin{pmatrix}1\\\\2\\end{pmatrix}+2e^{-4t}\\begin{pmatrix}1\\\\-1\\end{pmatrix}\\)", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_PHASE_SOURCE",
    qnum: 40,
    marks: 5,
    difficulty: "Medium",
    title: "Sketch a source phase portrait",
    main: "Calculus",
    sub: "Phase portraits",
    body: "Consider the coupled system \\(\\dfrac{dx}{dt}=2x\\), \\(\\dfrac{dy}{dt}=y\\).",
    parts: [["a", "State the two eigenvalues and classify the equilibrium point at the origin.", 2], ["b", "Sketch the phase portrait, showing the direction of motion.", 3]],
    markscheme: [["a", [["eigenvalues \\(2\\) and \\(1\\)", "A1"], ["the origin is a source", "A1"]]], ["b", [["correct outward direction", "A1"], ["eigenvector axes shown as straight-line solutions", "A1"], ["representative curved trajectories drawn", "A1"]]]],
  }),
  authoredAiHlQuestion({
    id: "MF_AIHL_T5_PHASE_CENTRE",
    qnum: 41,
    marks: 5,
    difficulty: "Medium",
    title: "Sketch a centre phase portrait",
    main: "Calculus",
    sub: "Phase portraits",
    body: "Consider the coupled system \\(\\dfrac{dx}{dt}=-y\\), \\(\\dfrac{dy}{dt}=x\\).",
    parts: [["a", "Find the eigenvalues and classify the equilibrium point at the origin.", 2], ["b", "Sketch the phase portrait, showing the direction of motion.", 3]],
    markscheme: [["a", [["eigenvalues \\(\\pm i\\)", "A1"], ["the origin is a centre", "A1"]]], ["b", [["closed trajectories centred at the origin", "A1"], ["counterclockwise direction, for example from \\((1,0)\\) the velocity is upward", "A2"]]]],
  }),
  authoredIgcseQuestion({
    id: "MF_IGCSE_T2_FACTORISE_SOLVE_NON_MONIC",
    qnum: 101,
    marks: 4,
    difficulty: "Medium",
    title: "Factorise and solve a non-monic quadratic",
    sub: "Quadratic equations",
    body: "",
    parts: [["a", "Factorise \\(6x^2+x-2\\).", 2], ["b", "Hence solve \\(6x^2+x-2=0\\).", 2]],
    markscheme: [["a", [["\\((3x+2)(2x-1)\\)", "A2"]]], ["b", [["\\(x=-\\dfrac23\\) or \\(x=\\dfrac12\\)", "A2"]]]],
  }),
  authoredIgcseQuestion({
    id: "MF_IGCSE_T3_DISTANCE",
    qnum: 102,
    marks: 4,
    difficulty: "Medium",
    title: "Calculate the distance between two points",
    sub: "Coordinate geometry",
    body: "The points \\(A(-3,4)\\) and \\(B(5,-2)\\) lie on a coordinate grid.",
    parts: [["", "Calculate the distance \\(AB\\). Give your answer in exact form.", 4]],
    markscheme: [["", [["\\(AB=\\sqrt{(5+3)^2+(-2-4)^2}\\)", "M2"], ["\\(AB=10\\)", "A2"]]]],
  }),
  authoredIgcseQuestion({
    id: "MF_IGCSE_T4_COSINE_RULE_SIDE",
    qnum: 103,
    marks: 3,
    difficulty: "Easy",
    title: "Find a side using the cosine rule",
    sub: "Trigonometry",
    body: "In triangle \\(ABC\\), \\(AB=8\\text{ cm}\\), \\(AC=11\\text{ cm}\\) and \\(\\angle BAC=60^\\circ\\).",
    parts: [["", "Calculate the length of \\(BC\\). Give your answer correct to three significant figures.", 3]],
    markscheme: [["", [["\\(BC^2=8^2+11^2-2(8)(11)\\cos60^\\circ\\)", "M1"], ["\\(BC=\\sqrt{97}=9.85\\text{ cm}\\) to three significant figures", "A2"]]]],
  }),
  authoredIgcseQuestion({
    id: "MF_IGCSE_T1_EXPAND_SURDS",
    qnum: 104,
    marks: 3,
    difficulty: "Easy",
    title: "Expand and simplify surd brackets",
    sub: "Surds",
    body: "",
    parts: [["", "Expand and simplify \\( (2+\\sqrt3)(5-\\sqrt3) \\).", 3]],
    markscheme: [["", [["\\(10-2\\sqrt3+5\\sqrt3-3\\)", "M1"], ["\\(7+3\\sqrt3\\)", "A2"]]]],
  }),
  authoredIgcseQuestion({
    id: "MF_IGCSE_T3_INVERSE_NOTATION",
    qnum: 105,
    marks: 3,
    difficulty: "Easy",
    title: "Interpret inverse-function notation",
    sub: "Functions",
    body: "The function \\(f\\) is defined by \\(f(x)=3x-5\\).",
    parts: [["", "Find \\(f^{-1}(7)\\) without first finding a formula for \\(f^{-1}(x)\\).", 3]],
    markscheme: [["", [["solves \\(3x-5=7\\)", "M1"], ["\\(f^{-1}(7)=4\\)", "A2"]]]],
  }),
];
const seed = [...ibSeed, ...igcseSeed, ...authoredPractice.map((question) => ({ ...question, sourceBank: "authored" }))];
fs.writeFileSync(
  authoredPracticePath,
  `window.MR_FLYNN_AUTHORED_PRACTICE = ${JSON.stringify(authoredPractice, null, 2)};\n`,
);
const igcseLessons = JSON.parse(fs.readFileSync(igcseLessonsPath, "utf8"));

const verifiedOverrides = {
  // The second question previously used here was about indices, not standard
  // form. Keep the one exact match visible while a second is researched.
  "95399e03-4f3d-47dd-8a88-41c986b50d91": ["A_M21TZ1SL_P1_Q2", "N20TZ0AISL_P1_Q1"],
  // IGCSE lessons with a single or small set of exact existing-bank matches.
  // Plain numerical fractions only. Algebraic fractions belong to lesson 2.2.5.
  "c7eaa0b3-db8e-4105-b9c4-f29003650c63": ["4MA1_2019J_1HR_Q1", "4MA1_2018M_2H_Q4"],
  // Simplifying surds only. Each mixed source is cropped to part (a), so no
  // rationalising-the-denominator work appears before the dedicated lesson.
  "24b7805f-537b-4b08-962c-92d7de9fa038": ["4MA1_2023J_2H_Q17", "4MA1_2024N_1H_Q17"],
  "cbc83cb9-d117-46ea-ac62-bb7ac362394d": ["4MA1_2022J_2HR_Q13"],
  // Keep the broader surds practice distinct from the simplifying lesson:
  // no source question is repeated between the two lessons.
  "4651759a-7060-41fe-aa6b-944408e39dc3": ["4MA1_2020J_2H_Q20", "4MA1_2023M_2H_Q23"],
  // Sets without Venn diagrams. The following Venn-diagram lesson retains
  // its already approved pair unchanged.
  "de764a82-d18a-4259-8042-26a3a4a87486": ["4MA1_2020J_1HR_Q4", "4MA1_2019M_1HR_Q3"],
  "668c4b07-12c3-4a7c-8504-9bff96be7291": ["4MA1_2018M_1H_Q4", "4MA1_2019M_1HR_Q13"],
  // Both sources contain one direct percentage-change calculation followed
  // by a different skill. Only the percentage-change part is displayed.
  "62baae37-e03d-4e49-ae83-a9c5114e54cd": ["4MA1_2022J_2H_Q8", "4MA1_2020N_1HR_Q5"],
  // Ratio introduction must not borrow a sharing question from lesson 1.7.2.
  "5f20375a-ea2a-43fd-a74c-8bfaba28a66b": ["4MA1_2021M_1H_Q4", "4MA1_2019M_1HR_Q11"],
  // Bounds progress from direct endpoint recall to a product of two rounded
  // values. Only part (a) of the second source is shown.
  "fbd320cc-1282-4830-a9ba-15241df8dd87": ["4MA1_2020N_2HR_Q5", "4MA1_2019J_2HR_Q17"],
  // IGCSE Topic 2 algebra correction pass. Keep each lesson on its exact
  // named operation and crop mixed source questions to the relevant part.
  "133c4249-51e3-404b-b1da-d02e97ac254b": ["4MA1_2019J_1H_Q1", "4MA1_2021J_1H_Q5"],
  "a517d3ce-4597-4559-bb22-f7a591d92bb3": ["4MA1_2023M_1H_Q14", "4MA1_2025M_2HR_Q13"],
  "19a71d14-30c0-4bec-9be1-a1e978c703d9": ["4MA1_2019M_2HR_Q5", "4MA1_2024M_1H_Q12"],
  "0cdedfbf-26ea-489e-b9ce-f8166c7ddbbc": ["4MA1_2019J_1H_Q11", "4MA1_2018M_2HR_Q22"],
  "b262d7f9-4cba-4080-8aee-588b2b1b5569": ["4MA1_2018M_2H_Q1", "4MA1_2025M_2HR_Q17"],
  "cbc83cb9-d117-46ea-ac62-bb7ac362394d": ["MF_IGCSE_T1_EXPAND_SURDS", "4MA1_2022J_2HR_Q13"],
  "2933b84a-2edd-4f9e-a768-e79a27aeeae7": ["4MA1_2019M_1HR_Q4", "4MA1_2023J_2H_Q13"],
  // The verified bank has no non-monic factorise-then-solve prompt. Keep the
  // approved direct example alone rather than substituting factorisation only.
  "7e85609d-7df5-4a52-a399-17b82dd85721": ["4MA1_2021M_2H_Q9", "MF_IGCSE_T2_FACTORISE_SOLVE_NON_MONIC"],
  // One exact source writes a quadratic in completed-square form and then
  // uses that form to solve. The previous two sources did not solve at all.
  "79235cf6-1de4-4626-930e-42e9ca9ecd2d": ["4MA1_2018M_2HR_Q24"],
  // Direct and contextual quadratic-formula practice, both ending in a
  // rounded numerical answer.
  "1394e37c-0c0e-4f7c-856f-aacff695cbda": ["4MA1_2018M_1H_Q11", "4MA1_2018M_1HR_Q16"],
  // IGCSE Topic 3 review. Keep sequences distinct from series, keep the
  // function introduction to direct substitution, and separate interpreting
  // inverse notation from deriving an inverse-function formula.
  "d0b8c40e-aef7-4945-bd5c-6045c5074475": ["4MA1_2021M_1H_Q2", "4MA1_2019J_2HR_Q3"],
  "737ba3b2-f984-48ba-a0c0-2a6947f22e2c": ["4MA1_2019M_1H_Q16", "4MA1_2020J_2H_Q25"],
  "ae16b3bf-a089-42b8-97c6-23e995688cc3": ["4MA1_2018M_1H_Q14", "4MA1_2019M_2H_Q24"],
  "d084246b-aa0a-4a8b-a962-db8032c3bbcf": ["4MA1_2025M_2HR_Q19", "4MA1_2023M_1H_Q17", "4MA1_2020J_1HR_Q17"],
  "fb79ddd5-ef05-48a7-a489-311620a88c6b": ["MF_IGCSE_T3_INVERSE_NOTATION", "4MA1_2019J_1HR_Q23"],
  "a99a4255-6920-4e01-9d11-9a0ce6d2f491": ["4MA1_2024M_1H_Q15", "4MA1_2021J_1H_Q22"],
  "d2fd015e-ce64-4e43-b528-d9f2da7e5a82": ["4MA1_2023M_1H_Q21", "4MA1_2019J_1H_Q18"],
  "576bcefb-105f-44c2-ace1-ab9537aed17b": ["4MA1_2019M_1HR_Q16", "4MA1_2019M_1H_Q24"],
  "c9936059-0955-4a3d-981e-64c4ca741e51": ["4MA1_2018M_1H_Q17", "4MA1_2020N_2H_Q19"],
  "1ec9f03e-2faf-4349-b0ee-96686806c30b": ["4MA1_2020N_2H_Q6", "4MA1_2019M_1H_Q23"],
  // There is only one clean standalone coordinate-distance source in the
  // verified archive. Do not pad it with the rejected triangle/trigonometry
  // question or with a later tangent/simultaneous-equations problem.
  "c03ceb67-bb68-4fe8-a30e-922281449d50": ["4MA1_2022M_1H_Q10", "MF_IGCSE_T3_DISTANCE"],
  // Direct power-rule differentiation only, cropped before each source moves
  // on to negative gradients. The next lesson then applies differentiation
  // to locate points having a specified gradient.
  "498da047-40c6-4199-b592-da279e244583": ["4MA1_2018M_2H_Q17", "4MA1_2019J_1H_Q12"],
  "d7be6548-9fb0-4b63-9658-870c96841260": ["4MA1_2020N_1HR_Q13", "4MA1_2023M_1H_Q11"],
  // IGCSE Topic 4 geometry review. Keep one accessible pressure calculation
  // then progress to comparing the greatest and least possible face pressure.
  // Elevation/depression deliberately contains one example of each.
  "d539bea7-bed1-4aca-a743-1d6698a310bf": ["4MA1_2018M_2HR_Q2", "4MA1_2019M_1HR_Q12"],
  "4b8eb48d-283b-46bf-8938-bc964e29c1f4": ["4MA1_2021J_2HR_Q13", "4MA1_2021N_1H_Q12"],
  // Separate sine-rule and cosine-rule practice precisely. The area lesson
  // includes a direct request to calculate an area, not two inverse uses of
  // an area already supplied in the prompt.
  "04d5888d-ec67-4dc2-9b59-1a4ffa18a286": ["4MA1_2021N_1H_Q13", "4MA1_2022J_1HR_Q22"],
  "ad2901e0-2e0e-4037-85d4-7eae92f2f194": ["MF_IGCSE_T4_COSINE_RULE_SIDE", "4MA1_2018M_1HR_Q18"],
  "bc1ded39-4c6f-44cc-aa12-9685d8b20bc4": ["4MA1_2024M_2HR_Q15", "4MA1_2024M_1HR_Q15"],
  // Pair one prism with one cylinder in surface-area practice, and vary the
  // similar-solids work with a difference-between-volumes problem.
  "45daaeca-eaab-4a30-aca8-b5c7b6dc9788": ["4MA1_2023J_1HR_Q2", "4MA1_2020N_2H_Q9"],
  "19336094-e325-4a14-8c2a-dfd3b0529d65": ["4MA1_2019J_2H_Q16", "4MA1_2022J_1H_Q17"],
  // IGCSE Topic 6 close-out. Keep ordinary frequency tables separate from
  // grouped estimates, then add the requested easy-to-hard probability
  // progression without repeating a source in another lesson.
  "20b25248-b2b7-4f5b-b270-d68567b564d7": ["4MA1_2019J_2H_Q13"],
  "2d8c3008-d9cc-456e-a1a7-05999fc917ed": ["4MA1_2018M_1HR_Q2", "4MA1_2020J_2HR_Q2", "4MA1_2019M_2H_Q1"],
  "1a51ff2e-8cdc-4a3d-9f0b-85cf3f65e853": ["4MA1_2024M_2HR_Q14", "4MA1_2021N_2H_Q16", "4MA1_2022M_2HR_Q14"],
  "949eaf81-334d-4578-a811-551fc53c7e3d": ["4MA1_2020N_2HR_Q1", "4MA1_2019M_2HR_Q6", "4MA1_2023M_1HR_Q12"],
  "aa04feb7-a185-4620-88e0-500455ab7d9e": ["4MA1_2023M_1HR_Q13", "4MA1_2019M_2H_Q23"],
  "e533a89a-2e12-47b6-a54c-534a461dcb04": ["N09TZ0HL_P1_Q11X1", "M10TZ2HL_P2_Q1"],
  // Both cards visibly use finite sigma notation. Keep sum-to-infinity work
  // in the later 1.8.1 lesson.
  "73d396dd-da8e-46da-8548-2ae1cf533440": ["M14TZ2HL_P2_Q1", "W_M24TZ2AIHL_P2_Q6"],
  // Finite geometric-sequence/series work only; neither card uses S_infinity.
  "6c582652-bd66-470e-9511-48be5574a322": ["N08TZ0HL_P2_Q2", "N13TZ0HL_P1_Q7"],
  "e6cca689-8f8c-4d4d-8566-7dff6e20a096": ["A_M22TZ1SL_P2_Q1", "A_SPECSL_P2_Q3"],
  "b3abcb64-544d-4926-bdc3-3861a2725078": ["A_M23TZ1SL_P2_Q2", "A_M24TZ1SL_P2_Q2"],
  "7096456c-bd06-4c4f-9ac3-f2314a2fa334": ["M10TZ1HL_P1_Q4", "A_N21TZ0SL_P2_Q2"],
  "9f18b254-9055-436f-bbc8-4761ca34d5b7": ["M13TZ2SL_P1_Q3", "N08TZ0HL_P1_Q2"],
  // Pure fractional-index and exponent work only. These are verified bank
  // questions, replacing two stale supplementary IDs that rendered no cards.
  "4e377a7a-be35-4b76-bcbc-3684974dfaf9": ["A_M22TZ1SL_P1_Q2", "A_N21TZ0SL_P1_Q8"],
  "111f8aa4-20e2-41a1-8665-a1252556f0a0": ["A_M21TZ2HL_P1_Q1", "A_N24TZ0HL_P1_Q3"],
  // Keep Rob's approved first card and replace the change-of-base-style
  // second card with a direct application of the logarithm laws.
  "cf573eb5-7cdc-4534-a90b-faa307f6e5ff": ["M16TZ2SL_P1_Q3", "M17TZ1HL_P1_Q1"],
  // Keep the shared AA lesson distinct from AI HL 1.9.2 so no question is
  // repeated across two different lesson videos. Both questions must remain
  // pure logarithm/change-of-base work: the rejected specimen question turned
  // its second part into a trigonometric equation.
  "64faaf0b-493f-4916-bbde-7ef666e2e7b4": ["A_N21TZ0HL_P1_Q3", "A_N25TZ3HL_P1_Q4"],
  "b492d0cc-b491-46aa-ba1e-48cf199ff207": ["M08TZ2HL_P1_Q12X1", "M12TZ1HL_P1_Q1"],
  // Full-expansion practice only. The neighbouring 1.9.2 lesson already
  // covers finding a particular term or coefficient.
  "f2db55ba-d9f3-48b2-976e-4d6fc8a35031": ["M09TZ2HL_P1_Q12X2", "N10TZ0HL_P1_Q3"],
  // Generalized binomial theorem only: these use a fractional exponent and a
  // negative fractional exponent. Positive-integer term questions belong in
  // the preceding binomial lessons.
  "044da60a-f4cd-46c6-a71f-95b0087e3bb5": ["A_BINQ_P1_Q1", "A_BINQ_P1_Q2"],
  // Display only the direct decomposition parts. No integration or
  // differential-equation prompt is exposed in this lesson.
  "636981ff-833c-4f52-8c70-23ab18592831": ["A2_M24TZ1HL_P1_Q11", "M15TZ1HL_P1_Q6"],
  // Keep this lesson on Cartesian arithmetic and equating real/imaginary
  // parts. Modulus-argument form and Argand geometry are taught later.
  "3aef226f-98dc-4ddd-8ad2-8d1bb8402444": ["M11TZ1HL_P1_Q2", "M12TZ2HL_P1_Q6"],
  // Rob approved the existing second card as the sole introductory example.
  "b3fee6ec-1511-47bf-9c1b-222d719357f4": ["M17TZ2HL_P1_Q5"],
  // Same approved Euler-form pair, reordered from accessible to harder.
  "bdd9d434-97b2-498c-9c44-0cf0da40134b": ["W_N23TZ0AIHL_P1_Q8", "A_M25TZ3HL_P1_Q8"],
  // Geometric meaning of complex multiplication: first multiplication by i,
  // then interpreting a power as a rotation on the Argand diagram.
  "6deba641-23f1-40d0-ae72-a3a41880b1a6": ["W_N24TZ0AIHL_P1_Q9", "A_M23TZ1HL_P2_Q6"],
  // Both questions explicitly require complex conjugates: first proving a
  // conjugate identity, then solving an equation containing z*.
  "c3a6691b-3913-41ee-a041-c85daac52f12": ["M12TZ2HL_P1_Q12", "N20TZ0HL_P1_Q4"],
  // Direct complex-root equations only. Polynomial roots and roots of unity
  // are taught in the neighbouring lessons.
  "921a99b5-a673-423c-aeed-402fec0952e0": ["N08TZ0HL_P1_Q13", "N15TZ0HL_P1_Q11"],
  // Roots of unity only: listing the seventh roots of z^7 = 1, followed by
  // the standard omega^3 = 1 and 1 + omega + omega^2 = 0 identities.
  "bbe01c0e-9af6-47fc-845c-f2259ff05024": ["M16TZ2HL_P1_Q12", "M10TZ2HL_P1_Q13"],
  // Keep the four mathematical-induction lessons in separate skill lanes.
  // Series identities must not borrow inequality, divisibility or derivative
  // proofs, and the same separation applies in the other three directions.
  "bed60b96-c57b-4275-a68a-a2ebce000861": ["N18TZ0HL_P1_Q6", "M18TZ1HL_P1_Q6"],
  "d64c1739-a831-456a-89de-118b14b8a694": ["N11TZ0HL_P1_Q6", "N15TZ0HL_P1_Q8"],
  "dd4b59f8-91ac-4b8e-ba57-9d8abc2c3e8d": ["M14TZ1HL_P2_Q7", "A_N23TZ2HL_P1_Q6"],
  // Start with the familiar 2^(n+1) > n^2 proof (including its short setup),
  // then retain the more sophisticated logarithmic induction proof second.
  "6c4d43e7-0781-4903-bdbf-d005aebf62d2": ["M19TZ1HL_P2_Q8", "A_M25TZ1HL_P1_Q8"],
  // The bank contains one exact source part proving De Moivre's theorem by
  // induction. Publish that part alone rather than padding the lesson with
  // ordinary De Moivre calculations.
  "d5c720d9-4540-4c45-b822-a0c84764b619": ["M14TZ2HL_P2_Q13"],
  // Begin with the approved books-on-a-shelf arrangement, then add a second
  // factorial arrangement while excluding its later combinations part.
  "8c904f89-d4d6-4859-8403-9b64187f211b": ["M10TZ1HL_P2_Q7", "M12TZ2HL_P2_Q4"],
  // Introductory product/counting rule: appoint three named roles, then fill
  // the remaining team places.
  "1f072e71-5da3-475f-9b54-e809a68a893d": ["A_N22TZ0HL_P1_Q11"],
  // Ordinary applications of De Moivre's theorem; the proof by induction is
  // retained separately at 1.15.5.
  "06ed664b-cac7-4315-a715-6232e8170d41": ["M11TZ1HL_P1_Q13", "M15TZ1HL_P2_Q12"],
  "127d3689-f30e-47ea-bbe3-98c8dccf4967": ["M08TZ2SL_P2_Q2", "M10TZ2SL_P2_Q4"],
  "24e9be00-6958-4b90-a7a3-5ba5ad8c16f9": ["A_M21TZ1SL_P1_Q3", "M16TZ1HL_P1_Q1"],
  // AA Topic 2 final review. The two introductory function lessons display
  // only direct substitution/evaluation parts: no inverse or composite work.
  "17cbf90f-7617-48fa-855d-dc6b1013a2d4": ["N18TZ0SL_P1_Q2", "M16TZ1SL_P1_Q1"],
  "f4b4002a-6087-473d-991e-559ff2b54108": ["N16TZ0SL_P2_Q1", "M18TZ1SL_P1_Q1"],
  // Preserve Rob's approved first inverse-introduction question and move the
  // graph-reading inverse question here from 2.5.2, where it was too indirect.
  "e62cb90d-32c9-4dc7-b508-15e458124e56": ["W_SPECAIHL_P1_Q2", "M18TZ1SL_P1_Q3"],
  // Direct graph sketching only. Keep the approved second question and use a
  // non-quadratic exponential graph first; omit its later gradient part.
  "eeb308ea-e4a0-44da-8932-705b5cb24c2f": ["M08TZ2SL_P2_Q3", "N17TZ0SL_P2_Q2"],
  // Features must be identified from graphs, including range and labelled
  // local extrema. The second source is displayed only as its sketching part.
  "4be6b3ed-84bd-4d5c-a9d3-67362859ef39": ["A_M25TZ2HL_P1_Q1", "A_M23TZ1SL_P2_Q3"],
  // Two ordinary composite-function questions with no inverse-function work.
  "b56f0294-fa11-4d42-b07f-2888907509c7": ["N14TZ0SL_P2_Q1", "A_N23TZ1SL_P1_Q2"],
  // Start with a normal algebraic inverse, then retain Rob's approved harder
  // inverse question as question 2.
  "48b621fa-d972-43fd-8d91-5ace017b5d48": ["N15TZ0SL_P1_Q5", "N16TZ0HL_P2_Q10X2"],
  // Rob approved both vertex-form questions and both direct quadratic-solving
  // questions. Pin them so later matching cannot reshuffle the reviewed pair.
  "f6cfdfea-d917-4385-aa62-7604bad73e59": ["M14TZ1SL_P1_Q1", "M16TZ2SL_P1_Q1"],
  // Connect factorised form, intercepts/graph features and completed-square
  // form. The second is the longer multi-stage question Rob recalled.
  "c985a287-ffe1-4d77-a163-30d4d61621f5": ["A_N21TZ0SL_P1_Q1", "A_M21TZ1SL_P1_Q7"],
  // Keep the first systems lesson as straightforward calculator solving. The
  // second then develops the distinct parameter/non-unique-solution skill.
  // No source question is shared between the two lessons.
  "8a506d7d-a1aa-4133-87cd-1f6099c2a544": ["N15TZ0HL_P2_Q2", "N18TZ0HL_P1_Q4"],
  "b8e1f841-d49c-4325-8d04-a78b335eb89b": ["M13TZ1HL_P2_Q2", "M14TZ1HL_P2_Q4"],
  // Two approved factor/remainder-theorem questions, reordered exactly as
  // requested so the easier reviewed card appears first.
  "6468821a-a955-4837-b591-7e8bdf3705ca": ["N17TZ0HL_P1_Q3", "M10TZ1HL_P1_Q1"],
  // AA Topic 3 review. Approved pairs are pinned; rejected cards are replaced
  // by the exact displayed parts below so later generation cannot reshuffle
  // them. Shared AA SL/HL videos deliberately use the same locked questions.
  "457f6445-3b12-478f-a33c-4ee18d21f1f4": ["M18TZ1AISL_P1_Q5", "M14TZ1AISL_P1_Q9"],
  // Retain Rob's approved midpoint-then-distance question, then use only the
  // direct distance part of a coordinate-kite question.
  "03d4a492-8fd9-4ab0-ab11-383f62d354d6": ["N16TZ0AISL_P2_Q3", "N14TZ0AISL_P1_Q2"],
  "55df295f-1796-4d4c-ae4e-81db5af14b86": ["A_M25TZ3SL_P2_Q1", "W_N21TZ0AIHL_P2_Q1"],
  "df52c2e1-4c6c-431c-a58c-a4febe7cb661": ["W_N22TZ0AIHL_P1_Q3", "V_M25TZ3AISL_P1_Q1"],
  // Keep the approved first question, then show only a normal two-mark
  // Pythagoras calculation from the replacement source.
  "0e6af994-0fb9-417e-a642-c90363b0ca1f": ["M16TZ2HL_P2_Q1", "N13TZ0AISL_P1_Q5"],
  // Keep the approved first sine-rule card. The replacement second card uses
  // the sine rule immediately and stops before its later area calculation.
  "40ed3424-3856-4e10-9202-06ee73c4d10e": ["M15TZ2SL_P2_Q1", "N17TZ0SL_P2_Q1"],
  "e6560ee5-07fb-4933-8b76-0526087ff441": ["W_N24TZ0AIHL_P1_Q1", "N17TZ0SL_P1_Q4"],
  // Start the area lesson with a direct two-mark use of 1/2 ab sin C, then
  // retain the cleaner of Rob's two approved harder exact-area questions.
  "96c1a533-e89a-4f3e-8fd5-e769d94087e3": ["M15TZ2HL_P2_Q1", "A_N23TZ2HL_P1_Q4"],
  "f9a4c2c4-94f2-4e33-8df8-77da36b42839": ["V_N23TZ2AISL_P1_Q5", "V_M23TZ1AISL_P1_Q13"],
  "93e82273-cbdf-4c22-903f-d23a531ca019": ["W_M22TZ2AIHL_P1_Q2", "N17TZ0HL_P2_Q5"],
  "588719f5-78e2-44da-9132-970cf1ce2ebe": ["N16TZ0SL_P2_Q3", "N17TZ0HL_P2_Q3"],
  // Exact special-angle triangles: preserve the approved 30°/45° question,
  // then use the 30° right-triangle calculation only (no percentage error).
  "a71764ed-7e1e-4316-aa1c-b70aacab2437": ["M17TZ1SL_P1_Q3", "M15TZ2AISL_P1_Q2"],
  "82710e65-5b95-4aca-bf72-c37ff08f1380": ["M15TZ2SL_P1_Q2", "M10TZ1HL_P2_Q1"],
  "d5e2d2ef-dd8a-41a2-8d2b-5846523f4ff8": ["N17TZ0SL_P1_Q5", "M15TZ1SL_P2_Q4"],
  "84a0811a-9a01-4f18-ab5f-bf7d28f0ca9c": ["M16TZ2AISL_P1_Q8", "N13TZ0AISL_P1_Q10"],
  // Function features only. Keep the first approved source and replace the
  // repeated sketching source with a distinct graph-features question.
  "c3c9cf1a-a9bc-4064-855b-9d526eed986d": ["N20TZ0AISL_P1_Q4", "N11TZ0AISL_P2_Q4"],
  // Keep the two estimator examples focused on estimation only. The first
  // source's later paired-test part is displayed separately in 4.18.4.
  "cf3e3632-d731-4df7-a800-ac8be01cdd5a": ["H_M15TZ0HL_P3S_Q2", "H_N18TZ0HL_P3S_Q2"],
  // One-sample mean Z-tests use a known population standard deviation.
  // Keep them separate from the neighbouring unknown-variance T-tests.
  "c19965b9-5b04-4711-b5ff-b440ca6eba03": ["H_M19TZ0HL_P3S_Q3", "H_N14TZ0HL_P3S_Q5"],
  "36efc894-0227-4bab-99f6-2f85cd8c9706": ["H_M18TZ0HL_P3S_Q3"],
  // Matched pairs must compare repeated measurements from the same people.
  // Display only the paired-test parts, not the neighbouring regression work.
  "a05dc6dd-60a5-4987-9191-16ba898b9cca": ["H_M15TZ0HL_P3S_Q2", "H_N16TZ0HL_P3S_Q1X1"],
  // Population-proportion testing is an exact binomial hypothesis test here.
  // Use two direct, self-contained tests rather than Type I/II errors or a
  // mixed chi-squared question.
  "44d7af59-b287-482e-a04f-99fc8faaffeb": ["W_M21TZ1AIHL_P1_Q11", "W_N23TZ0AIHL_P2_Q7"],
  // AI HL calculus precision pass. Direct-rule lessons stay empty when the
  // archive has no clean unused source, instead of borrowing later chain-rule
  // or substitution work. Each remaining lesson is mapped to the precise
  // assessed skill and, where necessary, only the relevant subpart is shown.
  "4100b350-f26f-44e3-bb90-7a03158e7b95": ["H_M18TZ1HL_P1_Q2"],
  "b1ffb4f0-65d2-4031-aec4-acbdb5f97b7a": ["H_N10TZ0SL_P1_Q2", "M19TZ1SL_P2_Q3"],
  "c6d7188a-fc5c-4552-a901-11ee186d96c1": ["W_M23TZ2AIHL_P1_Q12", "M11TZ2HL_P2_Q9"],
  "a490ac5c-828a-4b25-a5e0-3cde3293071c": ["W_N21TZ0AIHL_P1_Q8", "M12TZ2HL_P1_Q7"],
  "91d05699-bfeb-4a89-9666-ab1c9e0223cb": ["N09TZ0SL_P1_Q9", "M10TZ2SL_P1_Q8"],
  "442602d9-44ec-4d6b-b6f8-1ae775349771": ["M08TZ2HL_P2_Q6", "M11TZ1SL_P2_Q9"],
  "97665ecc-2be3-414c-9944-564bf6fa8645": ["N18TZ0HL_P2_Q2"],
  "918840eb-bf55-4e83-8939-40af339f1d94": ["H_M15TZ1SL_P1_Q7"],
  "d9d11f09-511a-436a-9792-f66fc8ceeac5": ["M13TZ1SL_P1_Q6"],
  "99a7ab79-f157-4f85-83f1-52b8368acc0f": ["M11TZ2SL_P2_Q7"],
  "baf50754-d084-4bea-84e4-6d755bc624c6": ["M08TZ2HL_P2_Q3", "M10TZ2SL_P2_Q6"],
  "0c4f3b43-0879-4243-9e14-d8322f9f011c": ["H_N15TZ0HL_P2_Q5", "V_SPECAISL_P1_Q10"],
  // Retain the approved first kinematics question. The second uses only the
  // speed, position and distance parts of the Paper 2 toy-airplane problem;
  // its later angle-between-flight-paths part is deliberately omitted.
  "f9b565e2-2c78-4c12-a55a-827d39233645": ["N08TZ0SL_P1_Q2", "M10TZ2SL_P2_Q9"],
  // AI HL vector foundations. Keep the introduction empty, use only direct
  // vector arithmetic in 3.10.2, and separate magnitude/unit-vector work from
  // scalar products and angles. Variable-velocity practice must contain an
  // actual time-dependent velocity vector.
  "d852b265-6804-4467-99e9-953af805fb72": ["M13TZ1SL_P1_Q1", "M11TZ2SL_P1_Q3"],
  "babb8fbc-b24b-44e2-b524-908650017797": ["N17TZ0SL_P2_Q3", "MF_AIHL_T3_UNIT_VECTOR"],
  "d7e6581c-56fa-4955-b789-d8af2a4fa05f": ["MF_AIHL_T3_VECTOR_LINE_3D_POINTS", "MF_AIHL_T3_VECTOR_LINE_3D_DIRECTION"],
  "1a185d48-f767-4296-99b1-17ef882d64f4": ["MF_AIHL_T3_VECTOR_KINEMATICS_3D", "MF_AIHL_T3_VECTOR_KINEMATICS_MEETING"],
  "ec7a9d6b-aacf-40ee-a175-9ff973312441": ["W_N22TZ0AIHL_P2_Q7", "W_M25TZ3AIHL_P1_Q14"],
  // The vector-product lesson shows the product calculation only. The two
  // separate area sources prevent the same shade-sail question appearing in
  // both adjacent lessons.
  "1855d971-48f6-4e25-9790-e4671cd9748e": ["W_SPECAIHL_P1_Q11", "MF_AIHL_T3_VECTOR_PRODUCT"],
  "3f7dbc9d-77f5-4aa4-85f3-5eccf69f41c6": ["W_M23TZ1AIHL_P1_Q7", "W_M24TZ2AIHL_P1_Q8"],
  "c699f91b-43d0-4d3f-af5b-05a042516032": ["MF_AIHL_T3_VECTOR_COMPONENT"],

  // AA HL trigonometry and vectors correction pass. Each mapping respects the
  // precise lesson boundary and avoids borrowing a later vector skill.
  "2242b24b-b800-4f2c-bb5a-16bd04201870": ["M16TZ1HL_P1_Q5", "M10TZ2HL_P1_Q6"],
  // The two geometric vector-language questions introduce the notation. The
  // following lesson then starts with the moved component-equation question
  // and a clean vector-addition calculation.
  "8ba412e0-db90-424c-a2c4-eb6c9ce59794": ["N13TZ0SL_P1_Q1", "N15TZ0SL_P1_Q2"],
  "646c6ce7-f4cb-47fb-b4c6-2a28e5029596": ["M10TZ2HL_P1_Q3", "M13TZ1SL_P1_Q1"],
  // Keep the approved unit-vector question and replace the dot-product source
  // with a direct unit-vector calculation only.
  "5a64332d-45ba-4535-bb8e-2a1fd52289e2": ["M10TZ2SL_P1_Q2", "M16TZ2SL_P1_Q7"],
  // Question 2 is explicitly about the angle between two vectors, not lines.
  "d59efdcc-103a-44e4-b2c9-827c1a7ef6f7": ["M18TZ2HL_P1_Q1", "N08TZ0HL_P2_Q4"],
  "352a19bb-f72d-42ef-a85e-c45467041f8e": ["M15TZ2SL_P2_Q2", "M17TZ1SL_P2_Q2"],
  "b70c2e32-c750-4851-a572-8587162396f0": ["M10TZ1HL_P1_Q6", "M10TZ2HL_P1_Q12"],
  "1847f7c2-9f5a-48f5-a40e-12ef76b0cc9e": ["M18TZ2SL_P1_Q1", "N16TZ0SL_P1_Q4"],
  "51cbc187-e8a5-442d-9784-731d2fd7d4b7": ["A_M25TZ2HL_P1_Q2", "M09TZ1HL_P2_Q5"],
  // The former second question belongs under angle between vectors. Rob chose
  // to keep this lesson as one exact line-angle question.
  "ed2cce38-614a-4256-b943-ab8c4856fa14": ["M11TZ2SL_P2_Q8"],
  "f9b565e2-2c78-4c12-a55a-827d39233645": ["N08TZ0SL_P1_Q2", "M10TZ2SL_P2_Q9"],
  "7d370dfd-aa5f-4827-b5dc-876de8a11ab3": ["N16TZ0HL_P1_Q8", "A_M25TZ1HL_P1_Q6"],

  // AA HL vectors: shortest-distance, cross-product and plane work must stay
  // within the exact operation named by the lesson. Broadly related vector
  // questions are not substitutes for the required calculation.
  // Keep the approved calculator example, then add a Paper 1 closest-point
  // problem whose fixed point is not the origin.
  "f25aaf3c-7579-43af-9f0c-c82485651278": ["N13TZ0HL_P2_Q9", "W_N23TZ0AIHL_P1_Q14"],
  // Keep Rob's approved first example and make the second a direct product
  // calculation only; its triangle-area follow-up belongs in 3.16.3.
  "b67a9adf-10a0-466a-b35f-41187f507502": ["W_M21TZ1AIHL_P1_Q5", "M16TZ1HL_P2_Q1"],
  // Properties use proof/identity work rather than routine component
  // calculation or area applications.
  "0785ff34-a49a-4abd-8c2a-d11d0719370c": ["A_M21TZ2HL_P1_Q5", "A_M24TZ1HL_P2_Q12"],
  "853c9429-eeeb-4c4b-b74d-a1d35c67171c": ["M13TZ1HL_P1_Q2", "A_N23TZ2HL_P2_Q8"],
  // This is the one suitable source currently in the verified bank that
  // actually asks for a plane in vector form. One exact question is better
  // than padding the lesson with Cartesian-plane work.
  "35a8aee0-4d48-4084-883f-fc23b5be9039": ["A_N25TZ1HL_P2_Q12"],
  // Rob approved both existing Cartesian-plane questions; pin them so the
  // newly freed sources above cannot make the automatic selector reshuffle
  // this neighbouring lesson.
  "504e0150-4027-4a1b-890d-ad172dae61a7": ["M17TZ1HL_P2_Q7", "M15TZ2HL_P2_Q5"],
  "f6528144-7204-4fd1-8a4b-cb91ed5a16b7": ["M08TZ1HL_P2_Q3", "N10TZ0HL_P1_Q7"],
  // Both selected parts ask for the line in which two Cartesian planes meet.
  // Angle-between-planes questions belong in 3.18.5.
  "f6806af5-6f99-4c11-856b-e678d5fe533a": ["N11TZ0HL_P2_Q13", "A_M22TZ1HL_P1_Q11"],
  // Both questions explicitly use three planes and find their common line;
  // two-plane intersection questions belong in 3.18.2.
  "9282b2e6-3873-4ca7-9556-99f00cd43a0d": ["M14TZ2HL_P1_Q3", "M08TZ1HL_P2_Q5"],
  // Keep Rob's approved first source, relabel its displayed (d) as (b), then
  // add a second direct calculation of the angle between a line and a plane.
  "40c21470-dbef-42f5-acfb-ba9658d8f02e": ["M10TZ1HL_P2_Q11", "M12TZ2HL_P2_Q11"],
  // Keep the approved first question and replace the scalar-product identity
  // with a direct angle-between-two-planes calculation.
  "0766515e-903e-4598-9f61-215b9c8cb925": ["M10TZ1HL_P1_Q3", "N14TZ0HL_P2_Q1"],

  // AA Topic 4 correction pass. Preserve the questions Rob approved, isolate
  // only the relevant subparts from longer sources, and keep every source
  // unique across the course.
  "26a92a94-1132-4e90-9b26-63b98ffffc26": ["W_SPECAIHL_P1_Q1", "A_M25TZ3HL_P2_Q3"],
  "45a2dc30-ca7b-47a2-a2b1-a1c2ef8d15c8": ["M12TZ1SL_P2_Q8", "M12TZ2SL_P1_Q1"],
  // The fish source now belongs to the AI interpreting lesson. Keep this AA
  // lesson on two distinct non-outlier box-plot tasks.
  "8ea2af96-360e-4ae0-a160-43a031e64cba": ["M12TZ1HL_P2_Q5", "N12TZ0SL_P1_Q8"],
  "be563c56-3e2f-437f-8e41-0fd0d83dc7c0": ["N15TZ0SL_P1_Q1", "A_M24TZ1SL_P2_Q1"],
  // Keep the approved first question, then use raw marks rather than a
  // frequency table for the second averages-and-spread example.
  "160cf57c-42a3-457c-877f-923a11a0b623": ["M14TZ1HL_P1_Q2", "M19TZ1HL_P2_Q3"],
  "5dceb9a5-425e-4698-bd9b-67f54caf1ee9": ["M18TZ2SL_P1_Q3", "M16TZ2SL_P1_Q2"],
  // Retain the approved beam question. The second question now includes an
  // interpretation of a model parameter in context before finding the
  // least-squares regression line and correlation coefficient.
  "125a9218-3aed-48c9-b96b-3cf08968de9c": ["A_M23TZ2SL_P2_Q1", "W_M23TZ1AIHL_P2_Q1"],
  "ca2285a6-c9cc-4eac-adc1-8c6479e9b21e": ["A_SPECTZ0HL_P1_Q1", "A_N23TZ2HL_P1_Q2", "A_N24TZ0HL_P1_Q2"],
  "f924ec98-3f94-4b6e-b485-50d9a7cb0959": ["M08TZ1SL_P2_Q6", "M15TZ1HL_P2_Q3", "M18TZ2HL_P2_Q8"],
  // Keep the approved specimen example. Replace the quadratic-model source
  // with a second question that genuinely requires the regression of x on y.
  "7cc0076e-c776-4fe4-8a63-43da44f92820": ["A_M24TZ1SL_P2_Q6", "A_SPECTZ0HL_P2_Q4"],

  // AA HL Topic 4 probability-distribution correction pass. These choices
  // follow the mathematical skill Rob specified for each individual video,
  // rather than treating every question with a broad statistics label as
  // interchangeable.
  // Retain the approved standard-deviation question, then add an example in
  // which both the mean and standard deviation must be recovered.
  "3fd87e0f-1d17-4b5a-a0fd-4b8dd9a75aed": ["M10TZ2HL_P2_Q3", "M11TZ1HL_P2_Q12"],
  // Bayes' theorem (4.13) was explicitly approved and is intentionally left
  // on its existing two questions.
  "2153e754-5338-4e7e-aca4-6f0e2090c038": ["A_M25TZ2HL_P2_Q8", "M10TZ1HL_P1_Q10"],
  "200f6314-6efb-426a-8767-c91323c22db3": ["M10TZ2HL_P2_Q2", "N16TZ0HL_P2_Q1"],
  "4fa5e51a-f4dd-477e-b393-54f1be7266ec": ["M10TZ2HL_P1_Q1", "A_M22TZ1HL_P1_Q7"],
  // Keep the approved first mean question. The second now uses two distinct
  // non-zero pieces of one probability density function.
  "76e8e8b2-11d1-4c5f-919c-8d18c85df672": ["M12TZ2HL_P2_Q7", "A_N24TZ0HL_P2_Q6"],
  // Keep the approved probability-table mode question, then use a short,
  // clearly labelled practice question that also gives a probability table
  // and asks directly for the median of the discrete random variable.
  "2f5766d2-e280-4aff-ac80-36b91b5218b7": ["A_M25TZ3HL_P2_Q3", "MF_AAHL_T4_DISCRETE_MEDIAN"],
  // 4.14.6 was explicitly approved and therefore remains untouched.
  // Keep the approved first example. The second is a direct variance
  // calculation for a two-piece density, with earlier established constants
  // restated below so the cropped card is self-contained.
  "a2a7b4c3-adc2-4ae1-9263-e50c671da0dd": ["M17TZ2HL_P2_Q10", "M15TZ1HL_P2_Q11"],
  "23301c56-b9aa-4101-ade8-1e2c41b65e54": ["A_N25TZ3HL_P1_Q7", "A_SPECTZ0HL_P2_Q6"],

  // Deep-review pass: each pair below was checked against the specific lesson
  // skill, not only the bank's broader subtopic label.
  // A_N21TZ0SL_P1_Q1 belongs to the three-forms lesson above. Keep this
  // neighbouring lesson on factorisation itself; show only part (a) of the
  // first source so its later binomial-expansion work is not included.
  "46e2372a-66cb-477e-96c7-fba7ae61c41d": ["N08TZ0SL_P2_Q1", "M13TZ1AISL_P1_Q9"],
  // Straight equation solving first: display only the part solved by graph or
  // quadratic formula. Retain the second source because it can also be solved
  // with the quadratic formula without teaching sum/product of roots.
  "88162068-c195-41a3-ae20-004900917331": ["N14TZ0SL_P1_Q1", "N17TZ0HL_P2_Q7"],
  // Use only the direct inequality in part (a); the unrelated triangle is
  // omitted. One exact question is better than padding the lesson with logs,
  // inverse functions or other mixed topics.
  "908747f1-8799-4ca2-8f63-ba376beff0ab": ["M17TZ2HL_P2_Q4"],
  // Preserve the approved first discriminant question and replace the
  // calculus-based second item with a direct no-real-roots condition.
  "7041af84-c272-4165-8680-f53bf1b92554": ["M15TZ1SL_P1_Q6", "N20TZ0SL_P1_Q5"],
  // A conventional linear-over-linear sketch comes before the approved
  // second rational-function question; no inverse-function work is included.
  "bd083b0d-a7b1-44cc-9980-47cce4046c0d": ["A_M24TZ1SL_P1_Q8", "A_M22TZ2SL_P1_Q4"],
  // Pin the modelling and substitution lessons Rob approved.
  "ffb4c343-0db5-45dd-b9b5-5289dba0484b": ["W_N24TZ0AIHL_P1_Q2", "W_M21TZ1AIHL_P1_Q4"],
  "0ab637d2-648c-4ff8-a5da-b78b5971d4e1": ["W_M25TZ3AIHL_P1_Q2", "N20TZ0SL_P1_Q4"],
  "c8ce5b5c-f78f-40a9-a8aa-2c5065925d0f": ["A_M23TZ1SL_P1_Q5", "A_M24TZ2HL_P1_Q2"],
  // Keep the approved first GDC equation and replace the trigonometric source
  // with a numerical polynomial intersection.
  "ac5e0aa4-64bb-4cbb-86aa-8d7f9315c0ac": ["M16TZ1SL_P2_Q2", "M15TZ2SL_P2_Q8X1"],
  // Single transformations only: one reflection in the x-axis and one in the
  // y-axis. Their later multi-step parts are deliberately hidden.
  "885f3694-d90b-4734-becb-dc9360b09ec7": ["M08TZ2SL_P1_Q5", "M12TZ2SL_P1_Q5"],
  // Move the two previously displayed multi-step questions into the composite
  // lesson, ordering the easier source first.
  "2a607da2-7e6a-4dc8-b483-2819907798e0": ["N09TZ0SL_P1_Q4", "M14TZ2HL_P1_Q8S"],
  // Factorise first and then sketch the polynomial. The later horizontal-line
  // extension is omitted so the task stays on polynomial graphs.
  "916aa44f-5240-4926-9cb6-12800d012e0c": ["M17TZ2HL_P2_Q11"],
  // Both sum/product questions were approved; medium precedes difficult.
  "5776410f-820d-49e1-97f0-5261d9bb438d": ["M15TZ1HL_P1_Q7", "A_M21TZ2HL_P1_Q7"],
  // Keep the two neighbouring rational-function lessons algebraically exact
  // and completely separate. The denominator lesson now uses only clean
  // graph work with a genuine quadratic denominator. Add a third explicit
  // linear-over-quadratic example, displaying only its graph-features part.
  // The numerator lesson uses two quadratic-over-linear questions and hides
  // the later integration.
  "f8918c12-e985-4e26-bea3-c93f245655f1": ["A_M22TZ2HL_P1_Q11", "N10TZ0HL_P2_Q8", "N19TZ0HL_P1_Q10"],
  "54f53e20-a14f-447a-a43f-c865e7eb424e": ["A_N23TZ1HL_P2_Q11", "A_N21TZ0HL_P2_Q10"],
  // Rob approved both even/odd questions during the final Topic 2 pass.
  "1ca31836-1394-43f7-8a9a-42198705f209": ["M15TZ1HL_P1_Q5", "A_M22TZ1HL_P2_Q6"],
  // Start with the difficult Paper 2 rational inequality Rob requested,
  // showing only its self-contained second part, then retain the approved
  // restricted-domain calculator inequality.
  "5079b16d-57c4-40bb-bf1b-2aba1e1695fc": ["M15TZ1HL_P2_Q10", "M10TZ1HL_P2_Q9"],
  // Two strong modulus-graph questions: a direct trigonometric modulus graph,
  // then both f(|x|) and |f(x)| from a supplied function graph.
  "990b6aba-3d06-489d-81e6-70a683d4f23a": ["M08TZ1HL_P2_Q2", "A_N25TZ3HL_P1_Q5"],
  // Keep the approved direct modulus inequality first. The second question
  // now sketches a genuine modulus graph together with a line and then solves
  // their intersections exactly, with no trigonometry.
  "5c188648-60b0-48f6-83a1-9d5c18235dac": ["N10TZ0HL_P1_Q1", "M16TZ1HL_P1_Q7"],
  // Rob approved both reciprocal-transformation questions unchanged.
  "75958ce6-0c3e-4c88-82e8-3db6f8392e1f": ["A2_M25TZ3HL_P1_Q6", "A3_M25TZ3HL_P1_Q6"],
  "c8ce5b5c-f78f-40a9-a8aa-2c5065925d0f": ["A_M23TZ1SL_P1_Q5", "A_M24TZ2HL_P1_Q2"],
  // Both questions require the cosine rule in a non-right-angled triangle.
  // Keep the shared identities lesson on manipulation and proof only. Solving
  // equations belongs in 3.8, and calculus/volume work is excluded entirely.
  // Rob approved both ambiguous-case questions unchanged.
  "57d96684-963a-444c-a9fd-440ea8547e6a": ["N11TZ0SL_P2_Q4", "N08TZ0HL_P2_Q1"],
  "c5f358f0-e49c-4fc1-a20a-296f64992376": ["M19TZ1HL_P1_Q9S", "N08TZ0SL_P1_Q7"],
  // Rob approved both sinusoidal graph and both modelling questions unchanged.
  "20f0c2aa-2e23-4888-a50d-6c248e8bb3ee": ["A_M25TZ1HL_P2_Q2", "M08TZ1SL_P1_Q4"],
  "b49b3fd5-a955-4ba5-a569-77ec56466fe8": ["W_N22TZ0AIHL_P1_Q6", "A_M21TZ1SL_P2_Q4"],
  // Retain the approved direct tangent equation first. The replacement second
  // card now asks students to solve a trigonometric equation, rather than only
  // verify that a supplied value works.
  "e92f65c0-af14-4e82-90de-28a2f004b677": ["A_M24TZ2HL_P1_Q1", "M13TZ2HL_P2_Q6"],
  // Both questions explicitly require an identity to rewrite a trigonometric
  // equation and then solve it. They are distinct from the direct equation
  // sources used in 3.8.1 and from the identity-only work in 3.6.
  "a3b2933d-3e55-4244-b150-e467cf161e11": ["A_M21TZ2SL_P1_Q3", "A_M23TZ1SL_P1_Q4"],
  // Rob approved both reciprocal-identity questions. In the following lesson,
  // keep the approved first card and replace the derivative proof with a clean
  // arctan/arcsin equation containing no differentiation.
  "0e58ea85-617a-4737-a56c-14f499dfa30f": ["A_M21TZ1HL_P1_Q6", "M11TZ1HL_P1_Q5"],
  "241d1270-d8fd-4d87-8e6c-b6e1a1d79a30": ["M09TZ2HL_P2_Q3", "N11TZ0HL_P2_Q4"],
  "0afbd775-a826-4a73-9c51-bd57c458c850": ["N15TZ0HL_P1_Q1", "M15TZ1SL_P1_Q2"],
  "ff814b89-cfb0-4cc9-be09-fc3a9e6bb0e8": ["M18TZ1SL_P1_Q2", "A_M22TZ2SL_P2_Q5"],
  // AA SL/HL introductory calculus pass. Keep each lesson on the first skill
  // it teaches and avoid stationary points, optimisation or mixed rules until
  // their later dedicated lessons.
  "03a83b7a-4df5-4d2c-a669-cfcf7b50787e": ["N20TZ0AISL_P1_Q11", "N17TZ0AISL_P2_Q5"],
  // Begin with the approved x^4 derivative, then introduce a reciprocal term
  // so students also practise rewriting and differentiating a negative power.
  "4ec4c4a2-a2de-4e61-9903-55f280bf9ab6": ["M14TZ1AISL_P1_Q10", "V_N23TZ2AISL_P1_Q3"],
  "db4f51b7-b4c5-41ad-bb94-b0bd53f9bee3": ["N12TZ0SL_P1_Q4", "M18TZ2AISL_P1_Q14"],
  // The first source uses only the power rule before forming a tangent. The
  // approved square-root normal remains second; no product rule appears.
  "e884d9fa-1e59-4ccc-a67d-2c63d5140908": ["N18TZ0AISL_P1_Q11", "N09TZ0SL_P1_Q10X1"],
  "f4aa813d-a3e2-480a-9f8d-49d2b31a7a04": ["A_M21TZ1SL_P2_Q1", "N13TZ0SL_P2_Q3"],
  // Definite integration stays on the power rule: first a linear integrand,
  // then a surd quotient that rewrites as a negative fractional power.
  "76f62a43-8fbd-46d5-aff6-c74b0488675a": ["A_M22TZ1HL_P1_Q1", "N13TZ0SL_P1_Q4"],
  // Keep the approved calculator area first. The replacement second card is
  // a direct area between one curve and the x-axis, not between two curves.
  "20b8ec75-0605-426a-abec-066ca4c4f9d2": ["A_N22TZ0SL_P2_Q3", "W_N23TZ0AIHL_P1_Q11"],
  // Only the approved clean upper-limit question remains. A second source is
  // withheld rather than introducing integration rules taught later.
  "d336ee8b-277b-4f7d-90f8-c309a50d1d4c": ["M14TZ1SL_P1_Q6"],
  // Direct applications of the new derivatives: logarithm first, then an
  // exponential. Neither selected prompt needs product or chain rule.
  "16efb219-7953-40cb-b8ca-8b0e956f9e39": ["N16TZ0SL_P1_Q10X1", "M18TZ1SL_P2_Q1", "M15TZ1HL_P2_Q6"],
  // Replace the composite-function table with an actual chain-rule
  // derivative; keep the approved square-root question second.
  "9d0fc44f-c26e-4a61-9d6a-9d84d022c372": ["M19TZ2SL_P1_Q10", "M16TZ1SL_P1_Q10"],
  "2ece54f8-dd4e-445e-8f8a-23858053df10": ["N08TZ0SL_P1_Q6", "M10TZ2SL_P1_Q7"],
  // Non-calculator sketching uses the Paper 1 graph-only prompt. The two
  // Paper 2 derivative sketches move to the following GDC lesson.
  "7c1d0df9-3f50-4bfb-ae45-b669c1405895": ["M14TZ2SL_P1_Q6"],
  "c4802e2e-45bf-4825-a2af-9aaa7724cd53": ["A_N21TZ0SL_P1_Q2", "M19TZ1SL_P1_Q5"],
  // Both questions finish by sketching a derivative. The previous pair only
  // interpreted derivative graphs and therefore belongs in 5.7.1 instead.
  "3dc1e1bd-8ead-4e5a-b489-9f02f48d7892": ["M10TZ1SL_P2_Q3", "M12TZ2SL_P2_Q2"],
  // Keep Rob's approved first question, then explicitly prove that the second
  // stationary point is a maximum by using the second derivative.
  "92c1b8b1-b956-4724-bd03-de85fb5d4f09": ["M11TZ1HL_P1_Q12X1", "N13TZ0HL_P1_Q10X1"],
  // Same approved pair, reordered from the more direct quartic calculation
  // to the less routine conceptual inflexion question.
  "7e8ea035-b815-464f-b498-ed4116f2e6b0": ["M16TZ1HL_P2_Q11X1", "N10TZ0SL_P2_Q7"],
  // A substantial three-dimensional cuboid problem first, followed by the
  // approved fencing-cost optimization problem.
  "0922ca4f-d53f-4299-b9c9-eafe6d17caf1": ["M16TZ2SL_P1_Q9", "N09TZ0SL_P2_Q7"],
  // One displacement model and one velocity model. Both are SL-accessible;
  // the second is calculator practice and neither needs integration by parts.
  "350494a1-e44b-4ddb-86db-72e19e69d525": ["M12TZ2SL_P2_Q5", "M16TZ1HL_P2_Q3"],
  // Direct exponential integration paired with the approved logarithmic
  // integral. Integration by parts is not part of this SL lesson.
  "6d504905-61e3-40cb-972c-13ff1691ffbd": ["N20TZ0SL_P1_Q6", "A_M22TZ2SL_P2_Q2"],
  // Retain the approved direct sine-area calculation. The rejected kinematics
  // card is removed; the only other clean direct source is already locked in
  // Finding f(x), so do not duplicate it or auto-fill a later-rule question.
  "5c83085a-0fc2-4199-89b3-34ce0cf5539b": ["M10TZ2SL_P1_Q10"],
  // Reverse-chain work here is limited to a linear inner function. Nonlinear
  // substitutions belong in the next lesson.
  "190dd207-d2d9-4de5-b374-aaa9e4f951de": ["N10TZ0SL_P1_Q6", "M14TZ2SL_P1_Q5"],
  // SL substitution only: first an exponential composite, then a rational
  // integrand whose numerator is the derivative of the denominator and whose
  // antiderivative is logarithmic.
  "924417ae-de6f-4e30-9f97-46ac0d001d4a": ["M17TZ1SL_P1_Q5", "N20TZ0SL_P2_Q10"],
  "4fde506e-3b33-485d-9259-284f5f86bcd3": ["M09TZ2HL_P2_Q8", "M17TZ1HL_P1_Q4"],
  "c4db88f7-5d17-4e3e-acf2-8b714152fe0f": ["A_SPECHL_P1_Q3", "N18TZ0HL_P2_Q8"],

  // AA HL Topic 5 final correction pass. Preserve every question Rob
  // approved and replace only the rejected example in each lesson.
  "7b6a362e-aa9a-44a8-a765-a5f4c282b7f1": ["M15TZ1HL_P1_Q4", "N18TZ0HL_P2_Q5"],
  // Higher derivatives only: the second question now asks for successive and
  // nineteenth derivatives, with no proof by induction.
  "134931eb-dd12-49c0-847c-973b34aebd07": ["M15TZ2SL_P1_Q5", "N16TZ0SL_P1_Q10"],
  "500bbe23-0129-4b7a-be4e-415d5ecf972b": ["A_M21TZ1HL_P1_Q8", "A_M24TZ2HL_P1_Q8"],
  "068bee2e-fece-4b97-b0e8-8f244222a8c2": ["M17TZ1HL_P2_Q2", "M08TZ1HL_P2_Q6"],
  // Keep the approved cone question and add a moving helicopter whose angle
  // of elevation changes explicitly.
  "5637bf1d-3809-4388-bce0-6c903c2c779b": ["M14TZ2HL_P2_Q9", "M09TZ2HL_P2_Q10"],
  // Formula-booklet HL rules: retain the approved arcsine derivative, then
  // use arccos for variety rather than repeating a second arcsine example.
  "dd3009b8-25ed-4425-b4a5-611cc3ba1665": ["N08TZ0HL_P2_Q12", "M18TZ1HL_P1_Q7"],
  "57c2580c-3193-417f-be6c-0332c78845ca": ["M15TZ1HL_P1_Q3", "M16TZ2HL_P1_Q3"],
  // Keep the approved first example, then add a second source that explicitly
  // establishes a partial-fractions decomposition and uses it to integrate.
  "d10601dc-f866-4925-93d7-dc05b9316429": ["M09TZ2HL_P1_Q4", "M17TZ1HL_P1_Q11"],
  // A trigonometric substitution provides the requested trick substitution;
  // retain the approved arctangent substitution second, then restore one of
  // the harder substitutions moved out of the SL substitution lesson.
  "c243c099-8009-4c45-b936-7ba9a05ef501": ["M15TZ1HL_P1_Q8", "M09TZ2HL_P2_Q9", "N12TZ0HL_P2_Q8"],
  "2cf30a58-a31b-47c7-a9c2-fd9bd7a49ca8": ["N15TZ0HL_P1_Q2", "M19TZ1HL_P2_Q5"],
  // Both questions genuinely require integration by parts twice; the first
  // is the requested exponential-times-sine example whose integral is moved
  // to the other side.
  "eb3a2412-6da8-4727-b13e-ca95e9dca23d": ["M11TZ2HL_P2_Q13B", "N18TZ0HL_P1_Q10"],
  // The first area is explicitly bounded by the y-axis. Retain Rob's approved
  // exact logarithmic area as the second question.
  "feb99f1f-879d-4a54-a584-3978511b3cf1": ["N19TZ0HL_P2_Q11", "W_M24TZ1AIHL_P1_Q9"],
  // Calculator then non-calculator volume-about-the-x-axis practice.
  "1768c593-44ef-481a-a01b-5ad58562ce78": ["M15TZ1HL_P2_Q1", "M10TZ1SL_P1_Q6"],
  // Both examples genuinely rotate a region about the y-axis. The earlier
  // x-axis volume has been removed from this lesson.
  "02f1bcd1-ff23-446b-974b-fcda8bf55cad": ["M13TZ1HL_P2_Q4", "A_N25TZ3HL_P2_Q5"],
  // Retain the approved first question; the second now finds the intersection
  // of two curves and uses their enclosed region for a volume of revolution.
  "79541e13-1ab3-4f25-84fd-e42aab742b4c": ["A_N25TZ1HL_P2_Q8", "W_M23TZ2AIHL_P1_Q16"],
  // Two direct and comparatively short separation-of-variables examples.
  "f0fa4dc1-59c1-46c4-a077-8e442d0522e4": ["N12TZ0HL_P3_Q1", "N08TZ0HL_P3_Q4"],
  "564111cf-c10c-41d3-92be-41c09f86ccdd": ["N12TZ0HL_P3_Q2", "A_M25TZ1HL_P2_Q9"],
  "437f626f-c449-4b63-9278-9a5f5288b4cf": ["M10TZ0HL_P3_Q1", "M11TZ0HL_P3_Q2"],
  "95f0cf3e-cd3b-40e6-af87-87bf8520df45": ["A_M25TZ1HL_P1_Q9", "M10TZ0HL_P3_Q3"],
  // Replace the modelling-heavy first question with a direct first-order
  // linear equation, while preserving the approved second example.
  "cfd3b26c-a041-4b6a-bc7f-eb8d33f09fcb": ["A_M24TZ1HL_P2_Q7", "N17TZ0HL_P3_Q2"],
  // Direct formula-based Maclaurin calculations.
  "3b73bfe5-13de-4fa2-a29b-6e4e6f822481": ["N19TZ0HL_P3_Q3", "M11TZ0HL_P3_Q1"],
  // One substitution series and one composed/product series.
  "c379f1fc-7f63-4fa1-98dc-a7d4aff4d8e9": ["N20TZ0HL_P3_Q4", "A_M24TZ1HL_P1_Q8"],
  "ceb60ab0-0098-4c17-9ad7-2615f30e8eb7": ["A_M21TZ2HL_P2_Q9", "A_N25TZ1HL_P1_Q5"],
  // Term-by-term integration in both examples. The former DE-based source is
  // moved into the dedicated differential-equations lesson below.
  "44cf2485-5dd6-45d4-866b-1c187d67f198": ["N10TZ0HL_P3_Q3", "A_M22TZ1HL_P1_Q12"],
  // Genuine Maclaurin sigma notation, not arithmetic/geometric-series work.
  "67e6f294-1736-4781-b3d3-ebfaa24282c4": ["N12TZ0HL_P3_Q4", "N13TZ0HL_P3_Q4"],
  // Both questions derive a Maclaurin series from a differential equation.
  "091d13b9-cc8e-45ab-a0d0-8b81d01ed3ce": ["M18TZ0HL_P3_Q4", "N15TZ0HL_P3_Q2"],

  // AI SL + HL Topic 1 review. Sigma notation stays finite and both cards
  // visibly use summation notation. Inflation uses two real-value finance
  // questions. Exponent laws remain algebraic rather than becoming modelling.
  // Quadratic modelling must remain modelling: retain the approved golf-ball
  // context and replace the completed-square exercise with a water-rocket
  // model that asks students to interpret and use the quadratic.
  "00344a26-55c4-47cb-8a6f-6ce16079c81a": ["V_N22TZ0AISL_P1_Q3", "V_M23TZ2AISL_P1_Q10"],
  "88b1a2a9-329c-473f-9f4e-f1ca55c8d057": ["W_M22TZ2AIHL_P2_Q1", "V_M22TZ2AISL_P2_Q2"],
  "abf38c68-e758-43ec-955d-624ad834d69a": ["W_SPECAIHL_P2_Q3", "V_M22TZ2AISL_P1_Q13"],
  "7038e65e-6cf6-4f3e-b9d5-666683bb9f97": ["M15TZ1SL_P1_Q3", "N16TZ0HL_P1_Q7"],
  "8cb13923-f306-4a16-bbc5-93a1f15caa63": ["V_N21TZ0AISL_P1_Q3"],
  "5e60b54a-6bf2-4cf5-be78-4f13509448fd": ["N16TZ0AISL_P1_Q1"],
  // Keep the single approved AI HL change-of-base lesson. Its first question
  // comes from the original 1.9.2 card; its second comes from the removed
  // duplicate 1.7.3 card, exactly as Rob requested.
  "67f3ebf1-fabb-4fc0-88f1-e50ef5d000ee": ["A_M25TZ3HL_P1_Q1", "M16TZ1HL_P1_Q6"],

  // AI HL Topic 1 correction pass. Keep every lesson inside its exact skill
  // boundary; use selected source parts when a longer exam question continues
  // into a neighbouring topic.
  "e0ae88fb-c9b0-4df3-94e5-0a6880f03068": ["M11TZ2SL_P1_Q5", "W_M25TZ1AIHL_P1_Q10"],
  "9c656814-2fbe-4d15-a9ca-c05d1317ee37": ["H_M13TZ2HL_P1_Q9", "M14TZ2HL_P1_Q2"],
  "f4f5804f-1998-41e3-8b43-5ba7d7ca2b40": ["H_M18TZ2HL_P2_Q1", "W_M21TZ1AIHL_P1_Q9"],
  "0d899f02-1cb7-4081-9ece-616f4d0c9efd": ["M09TZ1HL_P2_Q2", "A_N23TZ2HL_P1_Q7"],
  "316a9cc6-d140-4513-8713-266476d64627": ["W_N21TZ0AIHL_P2_Q5", "W_M21TZ2AIHL_P1_Q12"],
  // Both selected questions show the geometric effect of complex
  // multiplication on an Argand diagram.
  "eba4dbd1-cfe5-4f48-8656-cdeceafce0c7": ["W_M24TZ2AIHL_P1_Q15", "W_SPECAIHL_P1_Q15"],
  // No clean standalone determinant/inverse question exists in the current
  // archive. Do not substitute matrix-transformation questions here.
  // Eigenvalues are kept as direct matrix work; powers keeps the two examples
  // Rob identified, without transition-matrix padding.
  "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f": ["W_M22TZ1AIHL_P1_Q11", "W_M22TZ2AIHL_P2_Q5"],
  // This is the simultaneous-equations part Rob identified in the former
  // composite-transformation card. Keep only that part in the matrix systems
  // lesson; the determinant and general transformation follow-ups stay out.
  "795817a0-1f56-45f4-b103-3b8936c00858": ["W_M21TZ2AIHL_P1_Q14"],
  "79bbc962-e946-49f0-a89e-5bd386389248": ["W_N24TZ0AIHL_P1_Q11", "W_M21TZ1AIHL_P2_Q5"],
  // Move the two phase-portrait questions out of eigenvalue/eigenvector
  // practice and into the phase-portrait lessons where they belong.
  "522e01c2-0046-41ec-b4cd-1b9a7e89e70b": ["W_N22TZ0AIHL_P1_Q12", "W_SPECAIHL_P1_Q15X1"],
  // Free the explicit D^n question for Powers of matrices and keep the steady
  // state lesson focused on solving for and interpreting a long-run state.
  "aacabb23-fe64-4316-bbf5-d1737b8fbad8": ["W_M23TZ2AIHL_P2_Q5", "MF_AIHL_T4_LONG_TERM_PROBABILITY"],

  "120456b0-8e18-4d3b-9fcc-9765286afe78": ["N13TZ0AISL_P1_Q13", "V_M25TZ3AISL_P1_Q11"],
  "35b51817-4a71-4b1b-9c57-056e58fe4a94": ["V_M24TZ1AISL_P1_Q5", "V_N24TZ1AISL_P1_Q10"],
  // The opening straight-line lessons are coordinate geometry, not linear
  // modelling. Use direct gradient and equation work, leaving contextual
  // models for 2.5.1 Linear modelling.
  "f5f90981-cc11-4c17-a3bd-1361bcc350ac": ["M17TZ2AISL_P1_Q4", "M15TZ2AISL_P1_Q3"],
  "0c2d1242-eb4f-4dfe-9d0c-9fe06effad62": ["M11TZ2AISL_P1_Q5", "M11TZ1AISL_P1_Q10"],
  // Keep the approved parallel-lines question, then use a direct
  // perpendicular-line calculation with no diagram.
  "27660280-9a9e-4cb2-a00e-710c9722cca0": ["N12TZ0AISL_P1_Q8", "M16TZ1AISL_P1_Q7"],
  // Shared AI SL/HL function foundations must not use composite functions.
  // Composite-function practice belongs only in the later AI HL lesson.
  "bddfca14-6aee-440f-8b2c-0cb50d8d21f5": ["V_M25TZ2AISL_P1_Q9", "V_SPECAISL_P1_Q4"],
  "a067432b-da49-4081-877b-d31f4161c517": ["M17TZ1AISL_P2_Q3", "M11TZ1AISL_P2_Q3"],
  // AI Topic 2 modelling and function distinctions. Cubic modelling uses
  // contextual cubic models with no displayed tangent or calculus work.
  // Parameter fitting solves simultaneous equations for unknown polynomial
  // coefficients. Composite functions and composite graph transformations
  // remain separate skills. Semi-log practice logs only the dependent axis.
  "87739b31-e9ec-48da-b45d-23f1265de2be": ["M18TZ2AISL_P1_Q11", "M12TZ2AISL_P1_Q12"],
  "ae67a312-31d7-4658-9ece-e427fd0eab34": ["V_M22TZ2AISL_P1_Q9", "W_M22TZ2AIHL_P1_Q5"],
  // The second sinusoidal-model question is the parameter-fitting section of
  // a Ferris-wheel context. Later geometry follow-ups are deliberately hidden.
  "3c314627-da30-4ce3-b16f-c80816aaec14": ["M13TZ1AISL_P1_Q13", "N11TZ0AISL_P2_Q5"],
  "4ddbe716-9ced-46ce-9569-b54880c76cfe": ["V_N23TZ1AISL_P1_Q7", "V_N25TZ1AISL_P2_Q4"],
  "ac21b892-10cf-4fcc-b343-061386c5f8d5": ["N10TZ0SL_P1_Q9", "W_M25TZ1AIHL_P1_Q6"],
  "cb268ace-1b45-47b1-b745-aaa2bc0fad62": ["N12TZ0SL_P2_Q9", "M08TZ1SL_P1_Q9"],
  "10f9809d-0a3e-4e5c-83ea-738988915052": ["M19TZ2SL_P2_Q5", "W_N24TZ0AIHL_P1_Q13"],
  "72a5f616-843a-4be5-875c-6e57afe3d730": ["W_N24TZ0AIHL_P1_Q6", "W_N23TZ0AIHL_P1_Q2"],
  "97dfa2ea-0da3-4f3e-a95f-1841d36df813": ["W_N22TZ0AIHL_P1_Q13", "W_M22TZ2AIHL_P2_Q4"],
  "90c27b46-f7e6-4c9e-90b6-1b781189a4a0": ["V_M21TZ1AISL_P1_Q2", "M19TZ1AISL_P1_Q2"],
  "9631b700-3bd6-464c-a695-04888981de48": ["N11TZ0SL_P1_Q4A", "V_M25TZ3AISL_P1_Q9"],
  // Keep the accessible rectangle example and replace the unusually demanding
  // carton problem with a short cylinder whose objective is quadratic in r.
  "1b02b32e-6598-4c7b-bb24-396fd7c373c7": ["N17TZ0SL_P1_Q6A", "M19TZ1AISL_P1_Q15"],
  // AI SL/HL introductory calculus. Keep the two introductory videos blank,
  // then separate each assessed skill cleanly: monotonicity, the power rule,
  // gradient at a point, tangents/normals, power-rule integration and direct
  // local maximum/minimum work. No HL-only derivative-graph questions appear.
  "e98579d2-83b7-4dab-ab62-427fd2e8165e": ["V_N23TZ1AISL_P1_Q3", "V_M25TZ1AISL_P1_Q8"],
  "741c0b0c-17ef-46e5-894c-c62447c47172": ["N12TZ0AISL_P1_Q15", "M13TZ1AISL_P1_Q15"],
  "f06c971e-bbd7-4cb2-8db5-e3abbe338077": ["V_N24TZ2AISL_P1_Q12", "V_M22TZ2AISL_P1_Q11"],
  "97a1a371-61a6-4585-971e-9fa6c167f39c": ["V_N24TZ1AISL_P1_Q12", "V_M23TZ1AISL_P1_Q5"],
  "b31ff22b-38f1-489b-a9ce-209fa91d73e6": ["MF_AI_T5_POWER_RULE_INTEGRATION", "V_M24TZ2AISL_P2_Q3"],
  "0512477b-d893-4805-9d2e-2f597b8c8673": ["N13TZ0AISL_P1_Q9", "M14TZ1AISL_P1_Q15"],
  "0f9fa92d-3b9f-4348-8368-4940114b9592": ["M11TZ2AISL_P1_Q14", "N11TZ0SL_P2_Q6"],
  // AI Topic 3 precision pass. These use only the prompt parts that assess
  // the named lesson; later skills and unrelated follow-up work are hidden.
  "41d1e966-9bb1-4436-976e-d02187f32932": ["V_M21TZ2AISL_P1_Q6"],
  "657e5ac0-f7a7-4e5b-9940-b0999e263643": ["M12TZ1AISL_P1_Q2", "M15TZ2AISL_P1_Q1"],
  "74b278eb-4d1f-4ff7-b35a-0bf29c49fb62": ["M15TZ2AISL_P1_Q12", "N19TZ0SL_P2_Q6D"],
  "1900d762-9513-4e7c-9549-f40a2adf084d": ["N13TZ0AISL_P1_Q5", "M11TZ1AISL_P1_Q7"],
  "9d6631de-db03-4cfa-a0f3-e35edc3c8bf5": ["M16TZ1AISL_P1_Q2", "V_N24TZ1AISL_P1_Q1"],
  "4c20491d-5660-48b6-80eb-943004d1f8b0": ["V_N21TZ0AISL_P1_Q2", "M14TZ1SL_P2_Q1"],
  "7d695de0-122e-4717-93d9-c147c6ecf959": ["M12TZ2SL_P2_Q1", "M18TZ2AISL_P1_Q8"],
  "fc7bb062-c872-4524-9e57-e3a60793c557": ["V_M23TZ1AISL_P1_Q2", "V_N24TZ2AISL_P1_Q1"],
  // Radians itself is now conceptual and blank. Move its two applications
  // beside the existing radians arc/sector question, as Rob requested.
  "ced2a712-ba39-44f5-a7dc-ef76f9c8a6ae": ["N15TZ0SL_P2_Q1", "N14TZ0SL_P2_Q3", "M13TZ1HL_P2_Q5"],
  // Direct graph-reading/sketching practice for sine, cosine and tangent.
  // The tangent item is explicitly authored and labelled as Mr Flynn practice
  // because the archive has no clean standalone tangent-graph source.
  "b4268179-f1d2-41ac-8573-6fd93c172880": ["N15TZ0SL_P1_Q4", "M10TZ1AISL_P1_Q11", "MF_AIHL_T3_TRIG_GRAPH_TAN"],
  // AI HL contains only sin²θ + cos²θ = 1 and tanθ = sinθ/cosθ here.
  "f9f1e45b-75b0-42ea-8228-b4f06345c516": ["MF_AIHL_T3_TRIG_IDENTITY_1", "MF_AIHL_T3_TRIG_IDENTITY_2"],
  // Replace the sine-rule/double-angle source with a direct graphical trig
  // equation that contains no vectors or out-of-syllabus identities.
  "0e81f809-f846-4459-bcca-fb84c32fb263": ["M08TZ1SL_P2_Q4"],
  // AI SL/HL Topic 4 descriptive-statistics correction pass. Sampling now
  // has two direct identification tasks, and the grouped-data lesson pairs a
  // real histogram with a cumulative-frequency curve. Box-plot construction
  // and reading stay free of outlier work. Interpreting uses only the
  // fundraising comparison part and the two fish box plots.
  "ae20100b-d4f8-47b7-94cb-274153bd96da": ["V_SPECAISL_P1_Q3", "V_M21TZ1AISL_P2_Q1"],
  "4a1e0269-f69a-4d10-b6ca-ed2005103063": ["M17TZ1AISL_P1_Q1", "M19TZ2AISL_P1_Q12"],
  "ceae5e0d-9738-456a-89e4-0312f721d52d": ["M19TZ1SL_P2_Q1", "M19TZ2AISL_P1_Q6"],
  "aae0e405-1bd3-4357-a328-727f097360e4": ["V_M22TZ2AISL_P1_Q7", "M11TZ2SL_P1_Q6"],

  // Matrix-transformation lessons use exact operation-specific sources. The
  // authored cards are clearly labelled Mr Flynn practice and fill skills for
  // which the archive has no clean standalone question.
  "562cf78f-2adf-4021-abac-bb7b80049618": ["MF_AIHL_T3_MATRIX_STRETCH"],
  "4f023b2b-b628-425a-a005-e96d992f7a32": ["MF_AIHL_T3_MATRIX_TRANSLATION"],
  "cfa1dc1e-f80b-4e63-8275-6269cbe7f12b": ["W_M22TZ1AIHL_P2_Q7", "MF_AIHL_T3_MATRIX_ENLARGEMENT"],
  "7cb7f42a-7cfc-4b3d-95ba-cbb1297c215b": ["W_M25TZ1AIHL_P1_Q13", "W_N21TZ0AIHL_P2_Q4"],
  "4ba2895d-48f5-439d-b0df-57c25ae1c824": ["W_N23TZ0AIHL_P2_Q6", "MF_AIHL_T3_MATRIX_REFLECTION"],
  "80522e92-56ee-4aa2-ae07-9e105b2efdf0": ["W_N24TZ0AIHL_P2_Q6", "W_M23TZ2AIHL_P1_Q13"],
  "3047e664-8bf6-4140-8c0c-cabd97cd06b5": ["W_M22TZ2AIHL_P1_Q15", "W_N22TZ0AIHL_P1_Q9"],
  // AI HL graph theory: each source is used in only one lesson, and each
  // algorithm is kept distinct. Kruskal, Prim, nearest neighbour, route
  // inspection and deleted vertex are not interchangeable merely because the
  // source question is tagged broadly as graph theory.
  "d889f97c-0abb-4fa0-8bd3-eee6927e5b7b": ["W_N22TZ0AIHL_P2_Q4", "MF_AIHL_T3_WEIGHTED_ADJACENCY"],
  "4ca8f2d8-76d2-4e10-a48e-04d8a8d4eca3": ["W_M21TZ2AIHL_P1_Q11"],
  "4a729d86-d2a5-475e-8194-1c24c98aa196": ["W_M22TZ2AIHL_P3_Q2", "W_M23TZ2AIHL_P2_Q4"],
  "265ad472-09ff-46ba-bfba-1ee1ebe11cf5": ["W_M21TZ1AIHL_P1_Q10", "MF_AIHL_T3_PRIM_GRAPH"],
  "3cffb57c-653d-45a2-9983-68b1016b23e4": ["W_M25TZ2AIHL_P2_Q4"],
  "4ea42a07-b2d6-46c6-bd79-0987f8c97236": ["W_M23TZ1AIHL_P2_Q4", "MF_AIHL_T3_EULERIAN"],
  "a90ee76e-0a72-4a15-bf3d-1a3094677f44": ["W_M24TZ1AIHL_P1_Q8", "MF_AIHL_T3_CHINESE_POSTMAN"],
  "06dade6e-621a-4427-ad7c-1aa749bb8fa0": ["W_N21TZ0AIHL_P3_Q1", "MF_AIHL_T3_HAMILTONIAN"],
  "c693e0c1-aeb5-4651-bc41-6791b5024408": ["W_N24TZ0AIHL_P3_Q1", "MF_AIHL_T3_TSP_BOUNDS"],
  "e64a4cac-d435-4860-a028-f9f0b8266165": ["W_M24TZ2AIHL_P2_Q4", "MF_AIHL_T3_TSP_PRACTICAL"],
  // Nearest-neighbour here means the graph-theory tour algorithm, not the
  // nearest-site rule used with Voronoi diagrams.
  "9252d878-0d2c-4c3a-9bc8-985d928387fb": ["MF_AIHL_T3_NEAREST_NEIGHBOUR_1", "MF_AIHL_T3_NEAREST_NEIGHBOUR_2"],
  "0a593676-5299-4966-95ee-c58e7e4ccba9": ["W_M25TZ3AIHL_P2_Q4", "W_SPECAIHL_P2_Q5"],

  // AI Topic 4 correction pass. Each source below was checked at part level
  // against the exact skill Rob named; broad statistics labels are not enough.
  // The first outliers question now asks the student to test an actual value,
  // rather than only finding the greatest value that would not be an outlier.
  "639dc690-35bc-4a84-b7fb-89844ecaf252": ["V_M23TZ2AISL_P1_Q3", "M18TZ1SL_P1_Q2"],
  // Direct use of P(A ∪ B) and P(A ∩ B), without padding this lesson
  // with a context question whose probability formula is only incidental.
  "a9ba5e52-d70c-45b8-822c-f80312ea5c9a": ["M11TZ1HL_P1_Q1", "M14TZ2HL_P1_Q1"],
  // Keep the contextual cooling model first, then use a full regression task
  // in which students calculate r, find the regression line and predict.
  "6280cb5e-91bd-4761-b655-6b88addc1345": ["M17TZ1SL_P1_Q4", "N14TZ0SL_P2_Q2"],
  // Use a chi-squared test in which categories are explicitly combined; the
  // previous source was a Poisson test rather than the skill taught here.
  "8d2b60b3-ccaa-41cf-afa7-f6415e4ea05d": ["W_N22TZ0AIHL_P3_Q1"],
  "53bbfe46-4d98-4159-b2df-eeea60362499": ["MF_AIHL_T4_CHI_SQUARED_DF", "MF_AIHL_T4_NORMAL_GOF_DF"],
  // These two current mappings already satisfy Rob's newer feedback: the
  // second regression is a power model, and the second residual question
  // calculates and compares SSR for two models. Pin them to prevent reshuffle.
  "5da6d7d3-b205-4517-84f0-ab24321a3be3": ["W_N22TZ0AIHL_P1_Q11", "W_N23TZ0AIHL_P1_Q10"],
  "876ad43a-c778-48f2-8c79-8a3d409cfd41": ["W_SPECAIHL_P1_Q12", "W_M23TZ1AIHL_P1_Q16"],
  "5f9a2474-cb2a-40b8-b8a4-77bd1b8189fb": ["MF_AIHL_T4_COEFFICIENT_DETERMINATION", "W_M23TZ2AIHL_P1_Q9"],
  // Keep transformations of one variable separate from combinations of
  // several independent variables.
  "bb113001-688d-4876-91d0-208f1fdaa532": ["W_M24TZ1AIHL_P1_Q3", "M19TZ2SL_P1_Q8A"],
  "45a38dec-e9f7-48db-b7ff-a998107ada10": ["H_N18TZ0HL_P3S_Q1", "W_M23TZ1AIHL_P1_Q11"],
  // Keep Rob-approved Question 1. Replace the mixed Poisson source with the
  // self-contained sample-mean part of an unused normal-distribution question.
  "cde690c1-93a1-4385-b6cd-a31e4a885a7f": ["H_M17TZ0HL_P3S_Q2X1", "W_M22TZ1AIHL_P1_Q9"],
  // Keep the central-limit calculation but stop before the later hypothesis-
  // testing errors part.
  "ff885118-b462-40ee-aeb4-e522eee399a8": ["H_N19TZ0HL_P3S_Q3", "W_M24TZ1AIHL_P2_Q6"],
  // Keep the two confidence-interval methods separate. Known variance uses a
  // stated population standard deviation; unknown variance estimates it from
  // the sample before forming the interval.
  "1b5161c6-1227-4018-84fc-ab50132be01b": ["H_N15TZ0HL_P3S_Q1X1", "H_M15TZ0HL_P3S_Q3"],
  "860ba46c-0af6-4351-a3fd-6ea5fd09c3b4": ["W_SPECAIHL_P1_Q9", "W_M23TZ2AIHL_P1_Q15"],
  // AI HL hypothesis-testing and Markov-chain close-out. Poisson-mean
  // practice must be an actual hypothesis test, correlation tests must state
  // hypotheses in terms of rho, and the three error lessons stay separated
  // by distribution. Preserve the approved transition-matrix questions and
  // replace the repeated long-run example without changing Question 2.
  "9675baa1-851f-4710-bceb-15dd0c01fdad": ["W_N21TZ0AIHL_P2_Q7", "W_M21TZ2AIHL_P1_Q15"],
  "7cda7fca-b390-4c4e-87bd-93f53f721caa": ["MF_AIHL_T4_ONE_SAMPLE_T_TEST", "W_N24TZ0AIHL_P1_Q9X1"],
  "54fe02b9-8323-484e-af4e-b3b32efceeb8": ["H_N14TZ0HL_P3S_Q3X1", "W_M23TZ1AIHL_P1_Q8"],
  "73e1e90c-6be8-463a-bc7b-bc43361419d6": ["W_M22TZ2AIHL_P1_Q12", "H_N16TZ0HL_P3S_Q2"],
  "d68a3166-c653-4016-aa50-424a21748ac7": ["W_SPECAIHL_P1_Q16", "W_M22TZ1AIHL_P1_Q15"],
  "fb36af72-faa4-4e66-bf8d-099bc54e766a": ["W_N22TZ0AIHL_P1_Q16"],
  "d7181ae2-5583-4193-b704-31f78be6c565": ["W_N21TZ0AIHL_P1_Q9", "W_N23TZ0AIHL_P1_Q15"],
  // AI HL Topic 5 close-out. Keep introductory kinematics scalar and direct;
  // reserve the chain-rule identity a = v dv/ds for Kinematics 2. The first
  // differential-equation card asks only for the model to be formed, while
  // separation shows only actual separation work and omits slope fields.
  "326ef6f4-cdc3-461c-b121-527fef739c83": ["M08TZ1SL_P1_Q6", "H_M17TZ2HL_P1_Q4"],
  "40507693-613d-4de0-9c6a-f1c4f620cb50": ["MF_AIHL_T5_BASIC_DERIVATIVES_1", "MF_AIHL_T5_BASIC_DERIVATIVES_2"],
  "a78266c3-8c07-4517-b09a-c67ae8c4345e": ["MF_AIHL_T5_RATIONAL_DERIVATIVES_1", "MF_AIHL_T5_RATIONAL_DERIVATIVES_2"],
  "4100b350-f26f-44e3-bb90-7a03158e7b95": ["MF_AIHL_T5_CHAIN_RULE", "H_M18TZ1HL_P1_Q2"],
  "442602d9-44ec-4d6b-b6f8-1ae775349771": ["M11TZ1SL_P2_Q9", "M08TZ2HL_P2_Q6"],
  "97665ecc-2be3-414c-9944-564bf6fa8645": ["MF_AIHL_T5_RATIONAL_POWER_INTEGRATION", "N18TZ0HL_P2_Q2"],
  "918840eb-bf55-4e83-8939-40af339f1d94": ["MF_AIHL_T5_SIN_COS_INTEGRATION_1", "MF_AIHL_T5_SIN_COS_INTEGRATION_2"],
  "d9d11f09-511a-436a-9792-f66fc8ceeac5": ["MF_AIHL_T5_DIRECT_EXP_INTEGRATION", "MF_AIHL_T5_DIRECT_LOG_INTEGRATION"],
  "99a7ab79-f157-4f85-83f1-52b8368acc0f": ["MF_AIHL_T5_INVERSE_CHAIN_EXP", "M11TZ2SL_P2_Q7", "MF_AIHL_T5_INVERSE_CHAIN_TRIG"],
  "f9365360-bc13-4c36-bd90-a494ae34a5ad": ["MF_AIHL_T5_SUBSTITUTION_1", "MF_AIHL_T5_SUBSTITUTION_2", "MF_AIHL_T5_SUBSTITUTION_LOG"],
  "0c4f3b43-0879-4243-9e14-d8322f9f011c": ["MF_AIHL_T5_AREA_Y_AXIS", "H_N15TZ0HL_P2_Q5"],
  "0c3a7c7b-1b80-4833-a1b1-bc8aeb38cce4": ["W_N22TZ0AIHL_P2_Q5", "M12TZ1HL_P2_Q8"],
  "54333f98-7d7a-4d6a-b3cf-347122e184bc": ["MF_AIHL_T5_KINEMATICS_2", "H_M14TZ1HL_P1_Q8"],
  "9af63d1a-407b-4f90-ae78-30c8291fcd59": ["MF_AIHL_T5_FORM_DIFFERENTIAL_EQUATION", "W_M25TZ2AIHL_P1_Q12"],
  "660e272a-8a71-4422-8450-61a7ea1d58cf": ["MF_AIHL_T5_SEPARATION", "W_M24TZ1AIHL_P2_Q5"],
  // The conceptual Euler lesson stays blank; its two worked examples live in
  // the following lesson. Coupled Euler practice is limited to the numerical
  // Euler calculation, not the later interpretation or eigenvalue work.
  "49e6c7ea-110b-4ab4-a0d5-97a2c9fe4b11": ["W_M24TZ1AIHL_P1_Q4", "W_M24TZ2AIHL_P1_Q7"],
  "1310ef79-c234-4d20-9054-53eb85ef7749": ["W_M25TZ3AIHL_P1_Q11", "W_N24TZ0AIHL_P1_Q17"],
  "a916a502-98ff-4105-8574-80aac522eda7": ["W_N21TZ0AIHL_P2_Q6", "MF_AIHL_T5_COUPLED_EXACT_1"],
  "ed654692-df93-4fbf-8bc5-a998e0897920": ["W_M23TZ2AIHL_P2_Q7", "MF_AIHL_T5_COUPLED_EXACT_2"],
  // Exact phase-type examples. Source and centre remain blank until the bank
  // contains clean unused examples with the required eigenvalue structures.
  "de2388f1-fbf3-49c0-883b-1eff70b9cf7f": ["W_M21TZ2AIHL_P2_Q7"],
  "f40d55e2-0669-40a7-b7d9-fcc477ef23d4": ["W_N24TZ0AIHL_P2_Q7"],
  "6194b7ab-4cd6-4c43-9a54-288397647d66": ["W_M23TZ1AIHL_P2_Q6"],
  "d477bd69-e3be-4201-b8f0-2ba436cc3f6e": ["MF_AIHL_T5_PHASE_SOURCE"],
  "e8505773-3b8b-41cc-84b3-d2e106e5533f": ["MF_AIHL_T5_PHASE_CENTRE"],
  // The first source explicitly requests the eigenvector-form solution Rob
  // named; the second is the approved exact second-order solution.
  "ceabfc5c-e18c-45d3-9ccd-2e3dcdf6ac5f": ["W_M23TZ2AIHL_P2_Q7", "W_M22TZ2AIHL_P2_Q7"],
};

// Lessons are held here only when no precise bank or authored question is
// ready to display. The formerly missing source and centre phase portraits
// now have focused Mr Flynn practice, so this set is currently empty.
const needsManualQuestionReview = new Set([]);

// Rob has explicitly decided that this short conceptual lesson does not need
// attached exam practice. Keep both pathway copies intentionally blank so the
// shared SL/HL views remain consistent and the audit does not treat them as
// accidental gaps.
const intentionallyWithoutPractice = new Set([
  // The current archive has no clean question whose assessed skill is simply
  // rounding a number to significant figures. Bounds and later calculations
  // that merely request a rounded answer do not belong in this lesson.
  "ad4a018c-8fbc-4876-8d5c-185faa0a4054", // IGCSE: Significant Figures
  "e568bd0c-1738-4d97-b72e-0b1d2d0d9eea", // AA SL + AA HL: Introduction to differentiation/calculus
  "d5e2d2ef-dd8a-41a2-8d2b-5846523f4ff8", // AA SL + AA HL: Introduction to limits
  "35488928-8daf-4e41-9e34-60c9153b0b8c", // AA SL + AA HL: The number e
  "fa1451ac-3210-497e-880b-debeadc19909", // AA SL + AA HL: Discrete v continuous data
  "eb522dd3-1eb3-4ee0-9e63-824dccc4ea9c", // AA SL + AA HL: Variance and standard deviation by hand
  "24e9be00-6958-4b90-a7a3-5ba5ad8c16f9", // AA SL + AA HL: System of linear equations
  "6d2ca245-7a2a-45ec-ae5c-5e6b7ac692eb", // AA SL + AA HL: Roots of a polynomial
  "f304a68a-2b24-482f-b9c7-91a2a7c8eb64", // AA SL + AA HL: SOHCAHTOA
  "0afbd775-a826-4a73-9c51-bd57c458c850", // AA SL + AA HL: Radians
  "058018d6-9bc1-4e12-9dac-71d3f40251dc", // AA SL + AA HL: Unit circle
  "7844ace7-4914-49c1-a289-a3ec0f68d04e", // AA SL + AA HL: CAST diagram
  "8a070f53-2a65-41ca-bd23-3feb183f79ab", // AA HL: Algebra of factorials
  "00c950c1-60b5-4ff0-904d-b8c3f226c7f5", // AA HL: Proof by contradiction (infinite primes)
  "ed461415-103f-4b7c-a993-691440c18e53", // AA HL: Use of counter example
  "8bf9bb39-798f-4d37-aed8-fa1a2da85e61", // AA HL: Continuous functions
  "0b4fe42d-e0c8-419b-a8bc-10d6b71359c7", // AA HL: Differentiable functions
  "20867969-afe8-4c4f-8594-32ab84af1c17", // AA HL: Differential equations introduction
  "44ad6968-438e-4f55-bb2e-6f97a1a44b69", // AA HL: Maclaurin series introduction
  "46c63018-b709-4eab-a3ed-851044ddae8a", // AA HL: Euler's identity
  "f004ff36-17a1-4061-bc14-1520f48f7bb7", // AI SL + AI HL: Roots of a polynomial
  "26b43b60-35b9-45bf-94fc-90939a61e58c", // AI HL: Complex numbers introduction
  "11cf3ed5-0f7e-436b-9817-4c4e5386982a", // AI HL: Introduction to matrices (no clean standalone source)
  "ea54bb0f-76bc-47a6-9220-190faf9677c1", // AI HL: Algebra of matrices (no clean standalone source)
  "35b31ab2-691d-480d-8664-e77d13f2b7cc", // AI HL: Multiplication of matrices (no clean standalone source)
  "8f3c2a60-3f50-484f-a867-7a7efeb61959", // AI HL: Identity matrix (no clean standalone source)
  "d1156dcb-e3cc-4bdd-8985-b4729eacc0c0", // AI HL: Properties of matrices
  "e9c828e5-d1fc-4459-8e16-4f893814d04e", // AI HL: Determinant and inverse (transformation sources rejected)
  "1dab411c-5ce9-4532-9461-94d1b7817a7e", // AI HL: Radians (applications moved to arcs and sectors with radians)
  "deba74b6-f5bc-4bf7-ad18-5918b6302196", // AI HL: Mr. Flynn's exact triangles
  "890be651-35da-4ac2-ae19-017b48ecb19e", // AI HL: Unit circle
  "4bd0bcf2-4678-47bb-b0b2-44b6477227e1", // AI HL: CAST diagram
  "58df1bd7-1084-430e-8512-ebfe2fdb1bb3", // AI HL: Vectors introduction
  "347ec5b7-ccd1-4cee-a7f7-39315f5cb273", // AI HL: Introduction to graph theory
  "c80a9dab-081b-418e-b719-31a425da82d8", // AI HL: Type I and Type II errors introduction
  "e1998a7f-9388-4b70-9633-1863a15fb1ff", // AI HL: Markov chains introduction
  "4344b991-0a6f-49c3-b858-32b177e746d6", // AI SL + AI HL: Variance and standard deviation by hand
  "f90e3723-409e-4424-ad98-4684075dc4c5", // AI SL + AI HL: Chi-squared introduction
  "8a686732-f574-43ed-891e-8e2fe01e29a5", // AI SL + AI HL: Introduction to differentiation
  "1411cdc4-fc40-4c0c-8994-99b37500f165", // AI SL + AI HL: Introduction to limits
  "9099c37b-0a4f-4e00-a57d-77702f80a974", // IGCSE: Differentiation introduction
  "c140dbc4-5bd3-48a7-834e-dfb032927422", // AI HL: relationship between graphs and derivatives
  "eaa9adcd-5d3d-4fac-8b59-173980d36047", // AI HL: Euler's method (examples belong in the following lesson)
  "1532c139-e18e-4daf-a429-15a50f300444", // AI HL: Sketching phase portraits introduction
  "522e01c2-0046-41ec-b4cd-1b9a7e89e70b", // AI HL: Phase portraits introduction
  "f5321b22-6b45-40ca-a705-57ee519bba5a", // AI HL: Surveys and questionnaires
  "b5304489-6978-49c9-af8b-059e251c5754", // AI HL: Reliability versus validity
]);

// These are deliberate one-question lessons approved by Rob. They should not
// reappear in the unresolved-gap audit merely because the general house style
// uses two questions elsewhere.
const intentionallySinglePractice = new Set([
  "1f072e71-5da3-475f-9b54-e809a68a893d", // AA HL: Counting principles (one approved product-rule question)
  "b3fee6ec-1511-47bf-9c1b-222d719357f4", // AA HL: Complex numbers introduction
  "d5c720d9-4540-4c45-b822-a0c84764b619", // AA HL: Prove De Moivre by induction
  "35a8aee0-4d48-4084-883f-fc23b5be9039", // AA HL: Vector equation of a plane
  "ed2cce38-614a-4256-b943-ab8c4856fa14", // AA HL: Angle between two lines
  "908747f1-8799-4ca2-8f63-ba376beff0ab", // AA SL + AA HL: direct quadratic inequality only
  "916aa44f-5240-4926-9cb6-12800d012e0c", // AA HL: one coherent polynomial factorise-and-sketch task
  "795817a0-1f56-45f4-b103-3b8936c00858", // AI HL: System of linear equations (Rob approved question 1 only)
  "8cb13923-f306-4a16-bbc5-93a1f15caa63", // AI SL + AI HL: The number e
  "5e60b54a-6bf2-4cf5-be78-4f13509448fd", // AI SL + AI HL: Rounding
  "de2388f1-fbf3-49c0-883b-1eff70b9cf7f", // AI HL: Phase portrait sink
  "f40d55e2-0669-40a7-b7d9-fcc477ef23d4", // AI HL: Phase portrait spiral sink
  "6194b7ab-4cd6-4c43-9a54-288397647d66", // AI HL: Phase portrait spiral source
  "0e81f809-f846-4459-bcca-fb84c32fb263", // AI HL: one direct non-vector trig-equation source
  "4ca8f2d8-76d2-4e10-a48e-04d8a8d4eca3", // AI HL: Graph routes
  "3cffb57c-653d-45a2-9983-68b1016b23e4", // AI HL: Prim's algorithm with adjacency table
  "8d2b60b3-ccaa-41cf-afa7-f6415e4ea05d", // AI HL: Chi-squared categorising data
  "36efc894-0227-4bab-99f6-2f85cd8c9706", // AI HL: Z-test two tailed (one exact known-variance source)
  "fb36af72-faa4-4e66-bf8d-099bc54e766a", // AI HL: Binomial errors (one source containing both error types)
  "d477bd69-e3be-4201-b8f0-2ba436cc3f6e", // AI HL: Phase portrait source
  "e8505773-3b8b-41cc-84b3-d2e106e5533f", // AI HL: Phase portrait centre
  "d336ee8b-277b-4f7d-90f8-c309a50d1d4c", // AA SL + AA HL: Finding a limit (one clean pre-later-rules source)
  "7c1d0df9-3f50-4bfb-ae45-b669c1405895", // AA SL + AA HL: non-calculator derivative sketch
  "20b25248-b2b7-4f5b-b270-d68567b564d7", // IGCSE: ordinary frequency tables
  "79235cf6-1de4-4626-930e-42e9ca9ecd2d", // IGCSE: completing the square and solving (one coherent source)
]);

// These lessons currently have one exact verified source, but Rob has not
// approved them as permanent one-question exceptions. Show the good question,
// do not auto-fill a wrong second one, and keep the audit status as needs-review.
const incompleteSinglePractice = new Set([
  "5c83085a-0fc2-4199-89b3-34ce0cf5539b", // AA SL + AA HL: direct sin/cos integration (second non-repeated source still needed)
  "41d1e966-9bb1-4436-976e-d02187f32932", // AI SL + AI HL: exact perpendicular-bisector equation
  "562cf78f-2adf-4021-abac-bb7b80049618", // AI HL: horizontal stretch matrix
  "4f023b2b-b628-425a-a005-e96d992f7a32", // AI HL: translation by vector addition
]);

// Rob explicitly approved three-question progressions for these two Topic 4
// lessons. The probability lesson receives an additional harder formula
// question, and binomial distribution is ordered easy, medium, then hard.
const intentionallyTriplePractice = new Set([
  "ca2285a6-c9cc-4eac-adc1-8c6479e9b21e", // AA SL + AA HL: Probability formulae
  "f924ec98-3f94-4b6e-b485-50d9a7cb0959", // AA SL + AA HL: Binomial distribution
  "16efb219-7953-40cb-b8ca-8b0e956f9e39", // AA SL + AA HL: direct sin/cos, ln and exponential derivatives
  "c243c099-8009-4c45-b936-7ba9a05ef501", // AA HL: HL-only substitution progression
  "f8918c12-e985-4e26-bea3-c93f245655f1", // AA HL: rational functions with quadratic denominators
  "d084246b-aa0a-4a8b-a962-db8032c3bbcf", // IGCSE: Domain and Range
  "2d8c3008-d9cc-456e-a1a7-05999fc917ed", // IGCSE: Grouped Data
  "1a51ff2e-8cdc-4a3d-9f0b-85cf3f65e853", // IGCSE: Probability And/Or Rules
  "949eaf81-334d-4578-a811-551fc53c7e3d", // IGCSE: Relative Frequency
  "ced2a712-ba39-44f5-a7dc-ef76f9c8a6ae", // AI HL: Arcs and sectors with radians
  "b4268179-f1d2-41ac-8573-6fd93c172880", // AI HL: Graphs of sin, cos and tan
  "99a7ab79-f157-4f85-83f1-52b8368acc0f", // AI HL: Inverse chain rule progression
  "f9365360-bc13-4c36-bd90-a494ae34a5ad", // AI HL: Substitution progression including logarithmic form
]);

const practicePartOverrides = {
  "5079b16d-57c4-40bb-bf1b-2aba1e1695fc": {
    "M15TZ1HL_P2_Q10": ["b"],
  },
  "41d1e966-9bb1-4436-976e-d02187f32932": {
    "V_M21TZ2AISL_P1_Q6": ["a"],
  },
  "fbd320cc-1282-4830-a9ba-15241df8dd87": {
    "4MA1_2019J_2HR_Q17": ["a"],
  },
  "133c4249-51e3-404b-b1da-d02e97ac254b": {
    "4MA1_2019J_1H_Q1": ["a"],
    "4MA1_2021J_1H_Q5": ["a"],
  },
  "a517d3ce-4597-4559-bb22-f7a591d92bb3": {
    "4MA1_2025M_2HR_Q13": ["a"],
  },
  "19a71d14-30c0-4bec-9be1-a1e978c703d9": {
    "4MA1_2024M_1H_Q12": ["a"],
  },
  "b262d7f9-4cba-4080-8aee-588b2b1b5569": {
    "4MA1_2018M_2H_Q1": ["a"],
  },
  "79235cf6-1de4-4626-930e-42e9ca9ecd2d": {
    "4MA1_2018M_2HR_Q24": ["a", "b"],
  },
  "1394e37c-0c0e-4f7c-856f-aacff695cbda": {
    "4MA1_2018M_1H_Q11": ["b"],
    "4MA1_2018M_1HR_Q16": ["a", "b"],
  },
  "ae16b3bf-a089-42b8-97c6-23e995688cc3": {
    "4MA1_2018M_1H_Q14": ["a"],
    "4MA1_2019M_2H_Q24": ["a"],
  },
  "d084246b-aa0a-4a8b-a962-db8032c3bbcf": {
    "4MA1_2025M_2HR_Q19": ["a"],
    "4MA1_2023M_1H_Q17": ["a"],
    "4MA1_2020J_1HR_Q17": ["b"],
  },
  "fb79ddd5-ef05-48a7-a489-311620a88c6b": {
    "4MA1_2019J_1HR_Q23": ["a"],
  },
  "a99a4255-6920-4e01-9d11-9a0ce6d2f491": {
    "4MA1_2024M_1H_Q15": ["b"],
  },
  "c03ceb67-bb68-4fe8-a30e-922281449d50": {
    "4MA1_2022M_1H_Q10": ["a"],
  },
  "498da047-40c6-4199-b592-da279e244583": {
    "4MA1_2018M_2H_Q17": ["a"],
    "4MA1_2019J_1H_Q12": ["a"],
  },
  "24b7805f-537b-4b08-962c-92d7de9fa038": {
    "4MA1_2023J_2H_Q17": ["a"],
    "4MA1_2024N_1H_Q17": ["a"],
  },
  "62baae37-e03d-4e49-ae83-a9c5114e54cd": {
    "4MA1_2022J_2H_Q8": ["a"],
    "4MA1_2020N_1HR_Q5": ["a"],
  },
  "4100b350-f26f-44e3-bb90-7a03158e7b95": {
    "H_M18TZ1HL_P1_Q2": ["a"],
  },
  "b1ffb4f0-65d2-4031-aec4-acbdb5f97b7a": {
    "M19TZ1SL_P2_Q3": ["a"],
  },
  "a490ac5c-828a-4b25-a5e0-3cde3293071c": {
    "W_N21TZ0AIHL_P1_Q8": ["b"],
    "M12TZ2HL_P1_Q7": ["b"],
  },
  "91d05699-bfeb-4a89-9666-ab1c9e0223cb": {
    "N09TZ0SL_P1_Q9": ["b"],
    "M10TZ2SL_P1_Q8": ["a"],
  },
  "442602d9-44ec-4d6b-b6f8-1ae775349771": {
    "M11TZ1SL_P2_Q9": ["c", "d"],
  },
  "baf50754-d084-4bea-84e4-6d755bc624c6": {
    "M10TZ2SL_P2_Q6": ["c"],
  },
  "0c4f3b43-0879-4243-9e14-d8322f9f011c": {
    "H_N15TZ0HL_P2_Q5": ["a"],
    "V_SPECAISL_P1_Q10": ["a", "b"],
  },
  "cf3e3632-d731-4df7-a800-ac8be01cdd5a": {
    "H_M15TZ0HL_P3S_Q2": ["a"],
    "H_N18TZ0HL_P3S_Q2": ["a"],
  },
  "c19965b9-5b04-4711-b5ff-b440ca6eba03": {
    "H_M19TZ0HL_P3S_Q3": ["e"],
    "H_N14TZ0HL_P3S_Q5": ["a"],
  },
  "36efc894-0227-4bab-99f6-2f85cd8c9706": {
    "H_M18TZ0HL_P3S_Q3": ["a", "b"],
  },
  "a05dc6dd-60a5-4987-9191-16ba898b9cca": {
    "H_M15TZ0HL_P3S_Q2": ["b"],
    "H_N16TZ0HL_P3S_Q1X1": ["d"],
  },
  "44d7af59-b287-482e-a04f-99fc8faaffeb": {
    "W_M21TZ1AIHL_P1_Q11": ["b", "c", "d"],
    "W_N23TZ0AIHL_P2_Q7": ["d"],
  },
  "9675baa1-851f-4710-bceb-15dd0c01fdad": {
    "W_N21TZ0AIHL_P2_Q7": ["a"],
    "W_M21TZ2AIHL_P1_Q15": ["a", "c"],
  },
  "73e1e90c-6be8-463a-bc7b-bc43361419d6": {
    "W_M22TZ2AIHL_P1_Q12": ["a", "b"],
    "H_N16TZ0HL_P3S_Q2": ["d"],
  },
  "d852b265-6804-4467-99e9-953af805fb72": {
    "M13TZ1SL_P1_Q1": ["b"],
    "M11TZ2SL_P1_Q3": ["a"],
  },
  "babb8fbc-b24b-44e2-b524-908650017797": {
    "N17TZ0SL_P2_Q3": ["a"],
    "M10TZ2SL_P1_Q2": ["b"],
  },
  "ec7a9d6b-aacf-40ee-a175-9ff973312441": {
    "W_N22TZ0AIHL_P2_Q7": ["a"],
    "W_M25TZ3AIHL_P1_Q14": ["a"],
  },
  "1855d971-48f6-4e25-9790-e4671cd9748e": {
    "W_SPECAIHL_P1_Q11": ["b"],
  },
  "3f7dbc9d-77f5-4aa4-85f3-5eccf69f41c6": {
    "W_M23TZ1AIHL_P1_Q7": ["a", "b"],
    "W_M24TZ2AIHL_P1_Q8": ["b"],
  },
  "d889f97c-0abb-4fa0-8bd3-eee6927e5b7b": {
    "W_N22TZ0AIHL_P2_Q4": ["c"],
  },
  "4a729d86-d2a5-475e-8194-1c24c98aa196": {
    "W_M22TZ2AIHL_P3_Q2": ["d"],
    "W_M23TZ2AIHL_P2_Q4": ["b"],
  },
  "265ad472-09ff-46ba-bfba-1ee1ebe11cf5": {
    "W_M21TZ1AIHL_P1_Q10": ["a"],
  },
  "3cffb57c-653d-45a2-9983-68b1016b23e4": {
    "W_M25TZ2AIHL_P2_Q4": ["a"],
  },
  "4ea42a07-b2d6-46c6-bd79-0987f8c97236": {
    "W_M23TZ1AIHL_P2_Q4": ["a"],
  },
  "a90ee76e-0a72-4a15-bf3d-1a3094677f44": {
    "W_N23TZ0AIHL_P2_Q5": ["d"],
  },
  "06dade6e-621a-4427-ad7c-1aa749bb8fa0": {
    "W_N21TZ0AIHL_P3_Q1": ["a"],
  },
  "c693e0c1-aeb5-4651-bc41-6791b5024408": {
    "W_N24TZ0AIHL_P3_Q1": ["a", "b"],
  },
  "e64a4cac-d435-4860-a028-f9f0b8266165": {
    "W_M24TZ2AIHL_P2_Q4": ["a", "b", "c"],
  },
  "0a593676-5299-4966-95ee-c58e7e4ccba9": {
    "W_M25TZ3AIHL_P2_Q4": ["e"],
    "W_SPECAIHL_P2_Q5": ["g"],
  },
  "657e5ac0-f7a7-4e5b-9940-b0999e263643": {
    "M15TZ2AISL_P1_Q1": ["a"],
  },
  "1900d762-9513-4e7c-9549-f40a2adf084d": {
    "N13TZ0AISL_P1_Q5": ["a"],
    "M11TZ1AISL_P1_Q7": ["a", "b"],
  },
  "9d6631de-db03-4cfa-a0f3-e35edc3c8bf5": {
    "M16TZ1AISL_P1_Q2": ["a"],
    "V_N24TZ1AISL_P1_Q1": ["b"],
  },
  "4c20491d-5660-48b6-80eb-943004d1f8b0": {
    "V_N21TZ0AISL_P1_Q2": ["a"],
    "M14TZ1SL_P2_Q1": ["a"],
  },
  "7d695de0-122e-4717-93d9-c147c6ecf959": {
    "M18TZ2AISL_P1_Q8": ["b"],
  },
  "fc7bb062-c872-4524-9e57-e3a60793c557": {
    "V_N24TZ2AISL_P1_Q1": ["a", "b"],
  },
  "b4268179-f1d2-41ac-8573-6fd93c172880": {
    "M10TZ1AISL_P1_Q11": ["a", "b", "c"],
  },
  "0e81f809-f846-4459-bcca-fb84c32fb263": {
    "M08TZ1SL_P2_Q4": ["b"],
  },
  "795817a0-1f56-45f4-b103-3b8936c00858": {
    "W_M21TZ2AIHL_P1_Q14": ["b"],
  },
  "cfa1dc1e-f80b-4e63-8275-6269cbe7f12b": {
    "W_M22TZ1AIHL_P2_Q7": ["b"],
  },
  "4ba2895d-48f5-439d-b0df-57c25ae1c824": {
    "W_N23TZ0AIHL_P2_Q6": ["d"],
  },
  "80522e92-56ee-4aa2-ae07-9e105b2efdf0": {
    "W_N24TZ0AIHL_P2_Q6": ["d"],
    "W_M23TZ2AIHL_P1_Q13": ["a"],
  },
  "3047e664-8bf6-4140-8c0c-cabd97cd06b5": {
    "W_M22TZ2AIHL_P1_Q15": ["b"],
    "W_N22TZ0AIHL_P1_Q9": ["a"],
  },
  "f5f90981-cc11-4c17-a3bd-1361bcc350ac": {
    "M17TZ2AISL_P1_Q4": ["a"],
    "M15TZ2AISL_P1_Q3": ["a"],
  },
  "0c2d1242-eb4f-4dfe-9d0c-9fe06effad62": {
    "M11TZ1AISL_P1_Q10": ["a"],
  },
  "bddfca14-6aee-440f-8b2c-0cb50d8d21f5": {
    "V_M25TZ2AISL_P1_Q9": ["a", "b"],
    "V_SPECAISL_P1_Q4": ["a", "b"],
  },
  "a067432b-da49-4081-877b-d31f4161c517": {
    "M17TZ1AISL_P2_Q3": ["a"],
    "M11TZ1AISL_P2_Q3": ["a"],
  },
  "c3c9cf1a-a9bc-4064-855b-9d526eed986d": {
    "N20TZ0AISL_P1_Q4": ["a"],
    "N11TZ0AISL_P2_Q4": ["a"],
  },
  "ae67a312-31d7-4658-9ece-e427fd0eab34": {
    "W_M22TZ2AIHL_P1_Q5": ["a", "b", "c"],
  },
  "3c314627-da30-4ce3-b16f-c80816aaec14": {
    "N11TZ0AISL_P2_Q5": ["d"],
  },
  "4ddbe716-9ced-46ce-9569-b54880c76cfe": {
    "V_N23TZ1AISL_P1_Q7": ["a", "b"],
    "V_N25TZ1AISL_P2_Q4": ["a", "b"],
  },
  "ac21b892-10cf-4fcc-b343-061386c5f8d5": {
    "N10TZ0SL_P1_Q9": ["a"],
  },
  "cb268ace-1b45-47b1-b745-aaa2bc0fad62": {
    "N12TZ0SL_P2_Q9": ["c"],
    "M08TZ1SL_P1_Q9": ["d"],
  },
  "97dfa2ea-0da3-4f3e-a95f-1841d36df813": {
    "W_N22TZ0AIHL_P1_Q13": ["a"],
    "W_M22TZ2AIHL_P2_Q4": ["c", "d", "e"],
  },
  "72a5f616-843a-4be5-875c-6e57afe3d730": {
    "W_N23TZ0AIHL_P1_Q2": ["a"],
  },
  "88b1a2a9-329c-473f-9f4e-f1ca55c8d057": {
    "W_M22TZ2AIHL_P2_Q1": ["d"],
    "V_M22TZ2AISL_P2_Q2": ["d"],
  },
  "abf38c68-e758-43ec-955d-624ad834d69a": {
    "W_SPECAIHL_P2_Q3": ["d"],
  },
  "03a83b7a-4df5-4d2c-a669-cfcf7b50787e": {
    "N20TZ0AISL_P1_Q11": ["c"],
    "N17TZ0AISL_P2_Q5": ["b", "c"],
  },
  "4ec4c4a2-a2de-4e61-9903-55f280bf9ab6": {
    "M14TZ1AISL_P1_Q10": ["a"],
    "V_N23TZ2AISL_P1_Q3": ["b"],
  },
  "db4f51b7-b4c5-41ad-bb94-b0bd53f9bee3": {
    "M18TZ2AISL_P1_Q14": ["a", "b"],
  },
  "e884d9fa-1e59-4ccc-a67d-2c63d5140908": {
    "N18TZ0AISL_P1_Q11": ["a", "b", "c"],
    "N09TZ0SL_P1_Q10X1": ["a"],
  },
  "f4aa813d-a3e2-480a-9f8d-49d2b31a7a04": {
    "N13TZ0SL_P2_Q3": ["b"],
  },
  "20b8ec75-0605-426a-abec-066ca4c4f9d2": {
    "A_N22TZ0SL_P2_Q3": ["c"],
    "W_N23TZ0AIHL_P1_Q11": ["a"],
  },
  "16efb219-7953-40cb-b8ca-8b0e956f9e39": {
    "M18TZ1SL_P2_Q1": ["a", "b"],
  },
  "9d0fc44f-c26e-4a61-9d6a-9d84d022c372": {
    "M19TZ2SL_P1_Q10": ["a"],
    "M16TZ1SL_P1_Q10": ["a"],
  },
  "7c1d0df9-3f50-4bfb-ae45-b669c1405895": {
    "M14TZ2SL_P1_Q6": ["a"],
  },
  "3dc1e1bd-8ead-4e5a-b489-9f02f48d7892": {
    "M10TZ1SL_P2_Q3": ["a", "b"],
    "M12TZ2SL_P2_Q2": ["a", "b"],
  },
  "92c1b8b1-b956-4724-bd03-de85fb5d4f09": {
    "N13TZ0HL_P1_Q10X1": ["a", "b"],
  },
  "5c83085a-0fc2-4199-89b3-34ce0cf5539b": {
    "M10TZ2SL_P1_Q10": ["c"],
  },
  "924417ae-de6f-4e30-9f97-46ac0d001d4a": {
    "M17TZ1SL_P1_Q5": ["a"],
    "N20TZ0SL_P2_Q10": ["c"],
  },
  "3fd87e0f-1d17-4b5a-a0fd-4b8dd9a75aed": {
    "M10TZ2HL_P2_Q3": ["a"],
    "M11TZ1HL_P2_Q12": ["a"],
  },
  "4fa5e51a-f4dd-477e-b393-54f1be7266ec": {
    "M10TZ2HL_P1_Q1": ["a"],
    "A_M22TZ1HL_P1_Q7": ["a"],
  },
  "2f5766d2-e280-4aff-ac80-36b91b5218b7": {
    "A_M25TZ3HL_P2_Q3": ["a"],
  },
  "76e8e8b2-11d1-4c5f-919c-8d18c85df672": {
    "A_N24TZ0HL_P2_Q6": ["a"],
  },
  "a2a7b4c3-adc2-4ae1-9263-e50c671da0dd": {
    "M17TZ2HL_P2_Q10": ["b", "c"],
    "M15TZ1HL_P2_Q11": ["f"],
  },
  "23301c56-b9aa-4101-ade8-1e2c41b65e54": {
    "A_N25TZ3HL_P1_Q7": ["b"],
  },
  "26a92a94-1132-4e90-9b26-63b98ffffc26": {
    "A_M25TZ3HL_P2_Q3": ["c"],
  },
  "45a2dc30-ca7b-47a2-a2b1-a1c2ef8d15c8": {
    "M12TZ1SL_P2_Q8": ["a"],
  },
  "8ea2af96-360e-4ae0-a160-43a031e64cba": {
    "N12TZ0SL_P1_Q8": ["b"],
  },
  "be563c56-3e2f-437f-8e41-0fd0d83dc7c0": {
    "A_M24TZ1SL_P2_Q1": ["a", "b"],
  },
  "639dc690-35bc-4a84-b7fb-89844ecaf252": {
    "V_M23TZ2AISL_P1_Q3": ["a", "b"],
  },
  "a9ba5e52-d70c-45b8-822c-f80312ea5c9a": {
    "M11TZ1HL_P1_Q1": ["a"],
    "M14TZ2HL_P1_Q1": ["a", "b"],
  },
  "8d2b60b3-ccaa-41cf-afa7-f6415e4ea05d": {
    "W_N22TZ0AIHL_P3_Q1": ["d"],
  },
  "5f9a2474-cb2a-40b8-b8a4-77bd1b8189fb": {
    "W_M23TZ2AIHL_P1_Q9": ["e"],
  },
  "ff885118-b462-40ee-aeb4-e522eee399a8": {
    "H_N19TZ0HL_P3S_Q3": ["a", "b"],
  },
  "bb113001-688d-4876-91d0-208f1fdaa532": {
    "W_M24TZ1AIHL_P1_Q3": ["b"],
    "M19TZ2SL_P1_Q8A": ["e"],
  },
  "45a38dec-e9f7-48db-b7ff-a998107ada10": {
    "H_N18TZ0HL_P3S_Q1": ["a", "b"],
  },
  "ae20100b-d4f8-47b7-94cb-274153bd96da": {
    "V_SPECAISL_P1_Q3": ["c"],
    "V_M21TZ1AISL_P2_Q1": ["a"],
  },
  "ceae5e0d-9738-456a-89e4-0312f721d52d": {
    "M19TZ1SL_P2_Q1": ["b", "c"],
  },
  "aae0e405-1bd3-4357-a328-727f097360e4": {
    "V_M22TZ2AISL_P1_Q7": ["b"],
  },
  "160cf57c-42a3-457c-877f-923a11a0b623": {
    "M19TZ1HL_P2_Q3": ["a"],
  },
  "125a9218-3aed-48c9-b96b-3cf08968de9c": {
    "W_M23TZ1AIHL_P2_Q1": ["a", "b", "e"],
  },
  "7cc0076e-c776-4fe4-8a63-43da44f92820": {
    "A_M24TZ1SL_P2_Q6": ["c"],
  },
  "2242b24b-b800-4f2c-bb5a-16bd04201870": {
    "M16TZ1HL_P1_Q5": ["b"],
  },
  "646c6ce7-f4cb-47fb-b4c6-2a28e5029596": {
    "M13TZ1SL_P1_Q1": ["b"],
  },
  "5a64332d-45ba-4535-bb8e-2a1fd52289e2": {
    "M10TZ2SL_P1_Q2": ["b"],
  },
  "b70c2e32-c750-4851-a572-8587162396f0": {
    "M10TZ2HL_P1_Q12": ["b"],
  },
  "1847f7c2-9f5a-48f5-a40e-12ef76b0cc9e": {
    "N16TZ0SL_P1_Q4": ["a"],
  },
  "ed2cce38-614a-4256-b943-ab8c4856fa14": {
    "M11TZ2SL_P2_Q8": ["a", "b", "c"],
  },
  "f9b565e2-2c78-4c12-a55a-827d39233645": {
    "M10TZ2SL_P2_Q9": ["a", "b"],
  },
  "1a185d48-f767-4296-99b1-17ef882d64f4": {
    "H_M14TZ2SL_P1_Q9": ["a", "b"],
  },
  "03d4a492-8fd9-4ab0-ab11-383f62d354d6": {
    "N16TZ0AISL_P2_Q3": ["b", "c"],
    "N14TZ0AISL_P1_Q2": ["a"],
  },
  "0e6af994-0fb9-417e-a642-c90363b0ca1f": {
    "N13TZ0AISL_P1_Q5": ["a"],
  },
  "40ed3424-3856-4e10-9202-06ee73c4d10e": {
    "N17TZ0SL_P2_Q1": ["a"],
  },
  "96c1a533-e89a-4f3e-8fd5-e769d94087e3": {
    "M15TZ2HL_P2_Q1": ["a"],
  },
  "a71764ed-7e1e-4316-aa1c-b70aacab2437": {
    "M15TZ2AISL_P1_Q2": ["b"],
  },
  "c5f358f0-e49c-4fc1-a20a-296f64992376": {
    "N08TZ0SL_P1_Q7": ["a"],
  },
  "e92f65c0-af14-4e82-90de-28a2f004b677": {
    "M13TZ2HL_P2_Q6": ["a"],
  },
  "17cbf90f-7617-48fa-855d-dc6b1013a2d4": {
    "N18TZ0SL_P1_Q2": ["a"],
    "M16TZ1SL_P1_Q1": ["a"],
  },
  "f4b4002a-6087-473d-991e-559ff2b54108": {
    "N16TZ0SL_P2_Q1": ["a"],
    "M18TZ1SL_P1_Q1": ["a"],
  },
  "eeb308ea-e4a0-44da-8932-705b5cb24c2f": {
    "M08TZ2SL_P2_Q3": ["a", "b"],
  },
  "4be6b3ed-84bd-4d5c-a9d3-67362859ef39": {
    "A_M23TZ1SL_P2_Q3": ["b"],
  },
  "48b621fa-d972-43fd-8d91-5ace017b5d48": {
    "N15TZ0SL_P1_Q5": ["a"],
  },
  "46e2372a-66cb-477e-96c7-fba7ae61c41d": {
    "N08TZ0SL_P2_Q1": ["c"],
  },
  "88162068-c195-41a3-ae20-004900917331": {
    "N14TZ0SL_P1_Q1": ["b"],
  },
  "ac5e0aa4-64bb-4cbb-86aa-8d7f9315c0ac": {
    "M16TZ1SL_P2_Q2": ["a"],
    "M15TZ2SL_P2_Q8X1": ["a"],
  },
  "bd083b0d-a7b1-44cc-9980-47cce4046c0d": {
    "A_M24TZ1SL_P1_Q8": ["a"],
  },
  "908747f1-8799-4ca2-8f63-ba376beff0ab": {
    "M17TZ2HL_P2_Q4": ["a"],
  },
  "885f3694-d90b-4734-becb-dc9360b09ec7": {
    "M08TZ2SL_P1_Q5": ["a"],
    "M12TZ2SL_P1_Q5": ["a"],
  },
  "916aa44f-5240-4926-9cb6-12800d012e0c": {
    "M17TZ2HL_P2_Q11": ["a", "b", "c"],
  },
  "f8918c12-e985-4e26-bea3-c93f245655f1": {
    "A_M22TZ2HL_P1_Q11": ["a"],
    "N19TZ0HL_P1_Q10": ["b"],
  },
  "54f53e20-a14f-447a-a43f-c865e7eb424e": {
    "A_N23TZ1HL_P2_Q11": ["a", "b", "c", "d"],
    "A_N21TZ0HL_P2_Q10": ["a", "b", "c", "d"],
  },
  "990b6aba-3d06-489d-81e6-70a683d4f23a": {
    "M08TZ1HL_P2_Q2": ["a"],
    "A_N25TZ3HL_P1_Q5": ["a"],
  },
  "73d396dd-da8e-46da-8548-2ae1cf533440": {
    "M14TZ2HL_P2_Q1": ["a"],
    "W_M24TZ2AIHL_P2_Q6": ["a"],
  },
  "7096456c-bd06-4c4f-9ac3-f2314a2fa334": {
    "A_N21TZ0SL_P2_Q2": ["a"],
  },
  "4e377a7a-be35-4b76-bcbc-3684974dfaf9": {
    "A_M22TZ1SL_P1_Q2": ["a"],
    "A_N21TZ0SL_P1_Q8": ["a"],
  },
  "8c904f89-d4d6-4859-8403-9b64187f211b": {
    "M12TZ2HL_P2_Q4": ["a"],
  },
  "1f072e71-5da3-475f-9b54-e809a68a893d": {
    "A_N22TZ0HL_P1_Q11": ["a"],
  },
  "636981ff-833c-4f52-8c70-23ab18592831": {
    "A2_M24TZ1HL_P1_Q11": ["a"],
    "M15TZ1HL_P1_Q6": ["b"],
  },
  "3aef226f-98dc-4ddd-8ad2-8d1bb8402444": {
    "M12TZ2HL_P1_Q6": ["a"],
  },
  "06ed664b-cac7-4315-a715-6232e8170d41": {
    "M11TZ1HL_P1_Q13": ["a", "b", "c"],
    "M15TZ1HL_P2_Q12": ["a"],
  },
  "c4db88f7-5d17-4e3e-acf2-8b714152fe0f": {
    "N18TZ0HL_P2_Q8": ["a"],
  },
  "6deba641-23f1-40d0-ae72-a3a41880b1a6": {
    "W_N24TZ0AIHL_P1_Q9": ["c", "d"],
  },
  "c3a6691b-3913-41ee-a041-c85daac52f12": {
    "M12TZ2HL_P1_Q12": ["c"],
  },
  "921a99b5-a673-423c-aeed-402fec0952e0": {
    "N08TZ0HL_P1_Q13": ["a"],
    "N15TZ0HL_P1_Q11": ["a"],
  },
  "bbe01c0e-9af6-47fc-845c-f2259ff05024": {
    "M16TZ2HL_P1_Q12": ["c"],
    "M10TZ2HL_P1_Q13": ["a"],
  },
  "d5c720d9-4540-4c45-b822-a0c84764b619": {
    "M14TZ2HL_P2_Q13": ["a"],
  },
  "f25aaf3c-7579-43af-9f0c-c82485651278": {
    "N13TZ0HL_P2_Q9": ["b"],
    "W_N23TZ0AIHL_P1_Q14": ["a"],
  },
  "b67a9adf-10a0-466a-b35f-41187f507502": {
    "M16TZ1HL_P2_Q1": ["a"],
  },
  "0785ff34-a49a-4abd-8c2a-d11d0719370c": {
    "A_M24TZ1HL_P2_Q12": ["a"],
  },
  "35a8aee0-4d48-4084-883f-fc23b5be9039": {
    "A_N25TZ1HL_P2_Q12": ["b"],
  },
  "f6806af5-6f99-4c11-856b-e678d5fe533a": {
    "N11TZ0HL_P2_Q13": ["a"],
    "A_M22TZ1HL_P1_Q11": ["b"],
  },
  "40c21470-dbef-42f5-acfb-ba9658d8f02e": {
    "M10TZ1HL_P2_Q11": ["a", "d"],
    "M12TZ2HL_P2_Q11": ["e"],
  },
  "134931eb-dd12-49c0-847c-973b34aebd07": {
    "N16TZ0SL_P1_Q10": ["a"],
  },
  "dd3009b8-25ed-4425-b4a5-611cc3ba1665": {
    "N08TZ0HL_P2_Q12": ["c"],
    "M18TZ1HL_P1_Q7": ["a"],
  },
  "d10601dc-f866-4925-93d7-dc05b9316429": {
    "M17TZ1HL_P1_Q11": ["d"],
  },
  "57c2580c-3193-417f-be6c-0332c78845ca": {
    "M16TZ2HL_P1_Q3": ["a", "b"],
  },
  "eb3a2412-6da8-4727-b13e-ca95e9dca23d": {
    "M11TZ2HL_P2_Q13B": ["a"],
    "N18TZ0HL_P1_Q10": ["a"],
  },
  "feb99f1f-879d-4a54-a584-3978511b3cf1": {
    "N19TZ0HL_P2_Q11": ["b"],
    "W_M24TZ1AIHL_P1_Q9": ["a", "b"],
  },
  "f0fa4dc1-59c1-46c4-a077-8e442d0522e4": {
    "N12TZ0HL_P3_Q1": ["a"],
    "N08TZ0HL_P3_Q4": ["a"],
  },
  "3b73bfe5-13de-4fa2-a29b-6e4e6f822481": {
    "N19TZ0HL_P3_Q3": ["a"],
    "M11TZ0HL_P3_Q1": ["a"],
  },
  "44cf2485-5dd6-45d4-866b-1c187d67f198": {
    "N10TZ0HL_P3_Q3": ["a", "b"],
    "A_M22TZ1HL_P1_Q12": ["a", "b"],
  },
  "67e6f294-1736-4781-b3d3-ebfaa24282c4": {
    "N12TZ0HL_P3_Q4": ["a"],
    "N13TZ0HL_P3_Q4": ["b"],
  },
  "e0ae88fb-c9b0-4df3-94e5-0a6880f03068": {
    "M11TZ2SL_P1_Q5": ["a"],
    "W_M25TZ1AIHL_P1_Q10": ["a"],
  },
  "f4f5804f-1998-41e3-8b43-5ba7d7ca2b40": {
    "W_M21TZ1AIHL_P1_Q9": ["a"],
    "H_M18TZ2HL_P2_Q1": ["a"],
  },
  "316a9cc6-d140-4513-8713-266476d64627": {
    "W_N21TZ0AIHL_P2_Q5": ["a"],
    "W_M21TZ2AIHL_P1_Q12": ["a"],
  },
  "eba4dbd1-cfe5-4f48-8656-cdeceafce0c7": {
    "W_M24TZ2AIHL_P1_Q15": ["b"],
    "W_SPECAIHL_P1_Q15": ["a"],
  },
  "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f": {
    "W_M22TZ1AIHL_P1_Q11": ["a"],
    "W_M22TZ2AIHL_P2_Q5": ["b", "c"],
  },
  "79bbc962-e946-49f0-a89e-5bd386389248": {
    "W_M21TZ1AIHL_P2_Q5": ["c", "d"],
  },
  "54333f98-7d7a-4d6a-b3cf-347122e184bc": {
    "W_N23TZ0AIHL_P3_Q1": ["a"],
  },
  "9af63d1a-407b-4f90-ae78-30c8291fcd59": {
    "W_M25TZ2AIHL_P1_Q12": ["a"],
  },
  "660e272a-8a71-4422-8450-61a7ea1d58cf": {
    "H_M13TZ2HL_P2_Q12": ["a"],
    "W_M24TZ1AIHL_P2_Q5": ["b", "c", "d"],
  },
  "1310ef79-c234-4d20-9054-53eb85ef7749": {
    "W_N24TZ0AIHL_P1_Q17": ["a"],
    "W_M25TZ3AIHL_P1_Q11": ["b"],
  },
  "a916a502-98ff-4105-8574-80aac522eda7": {
    "W_N21TZ0AIHL_P2_Q6": ["c", "d"],
  },
  "ed654692-df93-4fbf-8bc5-a998e0897920": {
    "W_M23TZ2AIHL_P2_Q7": ["a", "b", "c"],
  },
  "de2388f1-fbf3-49c0-883b-1eff70b9cf7f": {
    "W_M21TZ2AIHL_P2_Q7": ["b", "c", "d", "f"],
  },
  "f40d55e2-0669-40a7-b7d9-fcc477ef23d4": {
    "W_N24TZ0AIHL_P2_Q7": ["d"],
  },
  "6194b7ab-4cd6-4c43-9a54-288397647d66": {
    "W_M23TZ1AIHL_P2_Q6": ["a", "b", "c", "d"],
  },
  "ceabfc5c-e18c-45d3-9ccd-2e3dcdf6ac5f": {
    "W_M23TZ2AIHL_P2_Q7": ["a", "b", "c"],
    "W_M22TZ2AIHL_P2_Q7": ["b", "c"],
  },
  "aacabb23-fe64-4316-bbf5-d1737b8fbad8": {
    "W_M23TZ2AIHL_P2_Q5": ["c", "d"],
  },
  "cde690c1-93a1-4385-b6cd-a31e4a885a7f": {
    "W_M22TZ1AIHL_P1_Q9": ["b"],
  },
  "1b5161c6-1227-4018-84fc-ab50132be01b": {
    "H_M15TZ0HL_P3S_Q3": ["a"],
  },
  "e98579d2-83b7-4dab-ab62-427fd2e8165e": {
    "V_N23TZ1AISL_P1_Q3": ["b", "c"],
  },
  "741c0b0c-17ef-46e5-894c-c62447c47172": {
    "N12TZ0AISL_P1_Q15": ["a"],
    "M13TZ1AISL_P1_Q15": ["a"],
  },
  "f06c971e-bbd7-4cb2-8db5-e3abbe338077": {
    "V_M22TZ2AISL_P1_Q11": ["a", "b"],
    "V_N24TZ2AISL_P1_Q12": ["a", "b"],
  },
  "b31ff22b-38f1-489b-a9ce-209fa91d73e6": {
    "V_M24TZ2AISL_P2_Q3": ["b"],
  },
};

// Preserve the original source labels for filtering and markscheme matching,
// then make extracted non-consecutive parts read naturally in course practice.
const practicePartLabelOverrides = {
  "5079b16d-57c4-40bb-bf1b-2aba1e1695fc": {
    "M15TZ1HL_P2_Q10": { b: "" },
  },
  "f8918c12-e985-4e26-bea3-c93f245655f1": {
    "N19TZ0HL_P1_Q10": { b: "" },
  },
  "88b1a2a9-329c-473f-9f4e-f1ca55c8d057": {
    "W_M22TZ2AIHL_P2_Q1": { d: "" },
    "V_M22TZ2AISL_P2_Q2": { d: "" },
  },
  "abf38c68-e758-43ec-955d-624ad834d69a": {
    "W_SPECAIHL_P2_Q3": { d: "" },
  },
  "f4f5804f-1998-41e3-8b43-5ba7d7ca2b40": {
    "W_M21TZ1AIHL_P1_Q9": { a: "" },
    "H_M18TZ2HL_P2_Q1": { a: "" },
  },
  "316a9cc6-d140-4513-8713-266476d64627": {
    "W_N21TZ0AIHL_P2_Q5": { a: "" },
    "W_M21TZ2AIHL_P1_Q12": { a: "" },
  },
  "eba4dbd1-cfe5-4f48-8656-cdeceafce0c7": {
    "W_M24TZ2AIHL_P1_Q15": { b: "" },
    "W_SPECAIHL_P1_Q15": { a: "" },
  },
  "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f": {
    "W_M22TZ1AIHL_P1_Q11": { a: "" },
    "W_M22TZ2AIHL_P2_Q5": { b: "a", c: "b" },
  },
  "79bbc962-e946-49f0-a89e-5bd386389248": {
    "W_M21TZ1AIHL_P2_Q5": { c: "a", d: "b" },
  },
  "40c21470-dbef-42f5-acfb-ba9658d8f02e": {
    "M10TZ1HL_P2_Q11": { a: "a", d: "b" },
  },
  "125a9218-3aed-48c9-b96b-3cf08968de9c": {
    "W_M23TZ1AIHL_P2_Q1": { a: "a", b: "b", e: "c" },
  },
  "d10601dc-f866-4925-93d7-dc05b9316429": {
    "M17TZ1HL_P1_Q11": { d: "" },
  },
  "3c314627-da30-4ce3-b16f-c80816aaec14": {
    "N11TZ0AISL_P2_Q5": { d: "" },
  },
  "72a5f616-843a-4be5-875c-6e57afe3d730": {
    "W_N23TZ0AIHL_P1_Q2": { a: "" },
  },
  "97dfa2ea-0da3-4f3e-a95f-1841d36df813": {
    "W_M22TZ2AIHL_P2_Q4": { c: "a", d: "b", e: "c" },
  },
  "0e81f809-f846-4459-bcca-fb84c32fb263": {
    "M08TZ1SL_P2_Q4": { b: "" },
  },
  "41d1e966-9bb1-4436-976e-d02187f32932": {
    "V_M21TZ2AISL_P1_Q6": { a: "" },
  },
  "795817a0-1f56-45f4-b103-3b8936c00858": {
    "W_M21TZ2AIHL_P1_Q14": { b: "" },
  },
  "80522e92-56ee-4aa2-ae07-9e105b2efdf0": {
    "W_N24TZ0AIHL_P2_Q6": { d: "" },
    "W_M23TZ2AIHL_P1_Q13": { a: "" },
  },
};

// Some useful standalone extracts still refer to their original position in a
// longer question (for example, "part (d)(i)"). Replace only the displayed
// wording; the original source labels are retained for markscheme matching.
const practicePartTextOverrides = {
  "88b1a2a9-329c-473f-9f4e-f1ca55c8d057": {
    "W_M22TZ2AIHL_P2_Q1": {
      d: "(i) Calculate the value of \\(\\displaystyle\\sum_{n=1}^{12}\\left(425\\times1.095^{\\,n-1}\\right)\\).<br>(ii) Describe what your answer represents in this context.",
    },
    "V_M22TZ2AISL_P2_Q2": {
      d: "(i) Calculate the value of \\(\\displaystyle\\sum_{n=1}^{12}\\left(340\\times1.058^{\\,n-1}\\right)\\).<br>(ii) Interpret your answer in this context.",
    },
  },
  "a490ac5c-828a-4b25-a5e0-3cde3293071c": {
    "M12TZ2HL_P1_Q7": {
      b: "On the coordinate axes below, sketch the graph of the derivative \\(y=f'(x)\\), clearly showing the coordinates of the images of the points A and D, labelling them \\(A''\\) and \\(D''\\) respectively.<div aria-label=\"Blank coordinate axes for sketching the derivative\" style=\"position:relative;width:100%;max-width:440px;height:230px;margin:16px auto 4px;border:1px solid #cbd5e1;border-radius:8px;background-color:#fff;background-image:linear-gradient(#e5e7eb 1px,transparent 1px),linear-gradient(90deg,#e5e7eb 1px,transparent 1px);background-size:23px 23px;background-position:center center;\"><div style=\"position:absolute;left:0;right:0;top:50%;border-top:2px solid #334155;\"></div><div style=\"position:absolute;top:0;bottom:0;left:50%;border-left:2px solid #334155;\"></div><span style=\"position:absolute;right:8px;top:calc(50% + 6px);font-weight:700;color:#334155;\">x</span><span style=\"position:absolute;left:calc(50% + 8px);top:6px;font-weight:700;color:#334155;\">y</span></div>",
    },
  },
  "7c1d0df9-3f50-4bfb-ae45-b669c1405895": {
    "M14TZ2SL_P1_Q6": {
      a: "On the coordinate axes below, sketch the graph of \\(y=f'(x)\\).<div aria-label=\"Blank coordinate axes for sketching the derivative\" style=\"position:relative;width:100%;max-width:440px;height:230px;margin:16px auto 4px;overflow:hidden;border:1px solid #cbd5e1;border-radius:8px;background-color:#fff;background-image:linear-gradient(transparent 9px,#e5e7eb 9px,#e5e7eb 10px,transparent 10px),linear-gradient(90deg,transparent 9px,#e5e7eb 9px,#e5e7eb 10px,transparent 10px);background-size:20px 20px;background-position:center center;\"><div aria-hidden=\"true\" style=\"position:absolute;left:12px;right:12px;top:50%;height:2px;margin-top:-1px;background:#334155;\"></div><div aria-hidden=\"true\" style=\"position:absolute;top:12px;bottom:12px;left:50%;width:2px;margin-left:-1px;background:#334155;\"></div><div aria-hidden=\"true\" style=\"position:absolute;right:8px;top:50%;width:0;height:0;margin-top:-7px;border-top:7px solid transparent;border-bottom:7px solid transparent;border-left:12px solid #334155;\"></div><div aria-hidden=\"true\" style=\"position:absolute;left:50%;top:8px;width:0;height:0;margin-left:-7px;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid #334155;\"></div><span style=\"position:absolute;right:10px;top:50%;margin-top:9px;font-weight:700;color:#334155;\">x</span><span style=\"position:absolute;left:50%;top:10px;margin-left:13px;font-weight:700;color:#334155;\">y</span></div>",
    },
  },
  "d10601dc-f866-4925-93d7-dc05b9316429": {
    "M17TZ1HL_P1_Q11": {
      d: "Find the value of \\(p\\) if \\(\\displaystyle\\int_0^1 f(x)\\,dx=\\ln(p)\\).",
    },
  },
};

// Some cropped practice extracts retain a source diagram that belongs only
// to omitted parts. Hide that diagram in the course preview without changing
// the complete question in the question bank.
const practiceHiddenDiagrams = {
  "20b8ec75-0605-426a-abec-066ca4c4f9d2": ["A_N22TZ0SL_P2_Q3"],
};

const practicePartTitles = {
  "d10601dc-f866-4925-93d7-dc05b9316429": {
    "M17TZ1HL_P1_Q11": "Find p by integrating using partial fractions",
  },
  "fbd320cc-1282-4830-a9ba-15241df8dd87": {
    "4MA1_2019J_2HR_Q17": "Find a lower bound for a product",
  },
  "133c4249-51e3-404b-b1da-d02e97ac254b": {
    "4MA1_2019J_1H_Q1": "Factorise by taking out a common factor",
    "4MA1_2021J_1H_Q5": "Factorise fully using the common factor",
  },
  "a517d3ce-4597-4559-bb22-f7a591d92bb3": {
    "4MA1_2025M_2HR_Q13": "Factorise a difference of two squares",
  },
  "19a71d14-30c0-4bec-9be1-a1e978c703d9": {
    "4MA1_2024M_1H_Q12": "Factorise a non-monic quadratic",
  },
  "b262d7f9-4cba-4080-8aee-588b2b1b5569": {
    "4MA1_2018M_2H_Q1": "Make a the subject of a formula",
  },
  "79235cf6-1de4-4626-930e-42e9ca9ecd2d": {
    "4MA1_2018M_2HR_Q24": "Complete the square and use it to solve",
  },
  "1394e37c-0c0e-4f7c-856f-aacff695cbda": {
    "4MA1_2018M_1H_Q11": "Solve a quadratic to three significant figures",
    "4MA1_2018M_1HR_Q16": "Use a quadratic equation to find a length",
  },
  "ae16b3bf-a089-42b8-97c6-23e995688cc3": {
    "4MA1_2018M_1H_Q14": "Evaluate f at a given input",
    "4MA1_2019M_2H_Q24": "Substitute a value into a function",
  },
  "d084246b-aa0a-4a8b-a962-db8032c3bbcf": {
    "4MA1_2025M_2HR_Q19": "Exclude a value from the domain",
    "4MA1_2023M_1H_Q17": "Find the excluded domain value",
    "4MA1_2020J_1HR_Q17": "State the range of a function",
  },
  "fb79ddd5-ef05-48a7-a489-311620a88c6b": {
    "4MA1_2019J_1HR_Q23": "Interpret inverse-function notation",
  },
  "a99a4255-6920-4e01-9d11-9a0ce6d2f491": {
    "4MA1_2024M_1H_Q15": "Find an inverse function",
  },
  "c03ceb67-bb68-4fe8-a30e-922281449d50": {
    "4MA1_2022M_1H_Q10": "Calculate the distance between two coordinate points",
  },
  "498da047-40c6-4199-b592-da279e244583": {
    "4MA1_2018M_2H_Q17": "Differentiate a cubic function",
    "4MA1_2019J_1H_Q12": "Find the derivative of a cubic function",
  },
  "d7be6548-9fb0-4b63-9658-870c96841260": {
    "4MA1_2020N_1HR_Q13": "Use differentiation to find points with gradient 2",
    "4MA1_2023M_1H_Q11": "Use differentiation to find points with gradient 4",
  },
  "24b7805f-537b-4b08-962c-92d7de9fa038": {
    "4MA1_2023J_2H_Q17": "Simplify a surd expression",
    "4MA1_2024N_1H_Q17": "Express one surd as a multiple of another",
  },
  "62baae37-e03d-4e49-ae83-a9c5114e54cd": {
    "4MA1_2022J_2H_Q8": "Find a percentage increase from two values",
    "4MA1_2020N_1HR_Q5": "Find a population percentage increase",
  },
  "4100b350-f26f-44e3-bb90-7a03158e7b95": {
    "H_M18TZ1HL_P1_Q2": "Differentiate sin²θ using the chain rule",
  },
  "b1ffb4f0-65d2-4031-aec4-acbdb5f97b7a": {
    "M19TZ1SL_P2_Q3": "Differentiate x²e³ˣ using the product rule",
  },
  "a490ac5c-828a-4b25-a5e0-3cde3293071c": {
    "W_N21TZ0AIHL_P1_Q8": "Sketch a function from the graph of its derivative",
    "M12TZ2HL_P1_Q7": "Sketch f′ from the graph of f",
  },
  "91d05699-bfeb-4a89-9666-ab1c9e0223cb": {
    "N09TZ0SL_P1_Q9": "Use f″ to justify a local maximum",
    "M10TZ2SL_P1_Q8": "Use the second derivative to classify a maximum",
  },
  "442602d9-44ec-4d6b-b6f8-1ae775349771": {
    "M11TZ1SL_P2_Q9": "Find and justify points of inflexion",
  },
  "baf50754-d084-4bea-84e4-6d755bc624c6": {
    "M10TZ2SL_P2_Q6": "Explain why a signed integral is not the geometric area",
  },
  "0c4f3b43-0879-4243-9e14-d8322f9f011c": {
    "H_N15TZ0HL_P2_Q5": "Find an area bounded by the y-axis by integrating with respect to y",
    "V_SPECAISL_P1_Q10": "Find the area bounded by a parabola and the coordinate axes",
  },
  "cf3e3632-d731-4df7-a800-ac8be01cdd5a": {
    "H_M15TZ0HL_P3S_Q2": "Find unbiased estimates from examination-mark differences",
    "H_N18TZ0HL_P3S_Q2": "Find unbiased estimates from travel-time summary statistics",
  },
  "c19965b9-5b04-4711-b5ff-b440ca6eba03": {
    "H_M19TZ0HL_P3S_Q3": "Carry out a one-tailed Z-test for a population mean",
    "H_N14TZ0HL_P3S_Q5": "Find the critical region for a one-tailed Z-test",
  },
  "36efc894-0227-4bab-99f6-2f85cd8c9706": {
    "H_M18TZ0HL_P3S_Q3": "Set up and carry out a two-tailed Z-test",
  },
  "a05dc6dd-60a5-4987-9191-16ba898b9cca": {
    "H_M15TZ0HL_P3S_Q2": "Test whether extra tuition improved the same students' marks",
    "H_N16TZ0HL_P3S_Q1X1": "Test the paired differences between two exams",
  },
  "44d7af59-b287-482e-a04f-99fc8faaffeb": {
    "W_M21TZ1AIHL_P1_Q11": "Test a manufacturer's claimed fault proportion",
    "W_N23TZ0AIHL_P2_Q7": "Test a supplier's claimed refrigerated-crate proportion",
  },
  "9675baa1-851f-4710-bceb-15dd0c01fdad": {
    "W_N21TZ0AIHL_P2_Q7": "Test whether the Poisson mean exceeds two bikes per minute",
    "W_M21TZ2AIHL_P1_Q15": "Test whether online booking increased the prescription rate",
  },
  "73e1e90c-6be8-463a-bc7b-bc43361419d6": {
    "W_M22TZ2AIHL_P1_Q12": "Find Type I and Type II errors for two normal models",
    "H_N16TZ0HL_P3S_Q2": "Find a Type II error using a normal approximation",
  },
  "646c6ce7-f4cb-47fb-b4c6-2a28e5029596": {
    "M10TZ2HL_P1_Q3": "Solve a vector equation using components",
    "M13TZ1SL_P1_Q1": "Use vector addition to find an unknown vector",
  },
  "5a64332d-45ba-4535-bb8e-2a1fd52289e2": {
    "M10TZ2SL_P1_Q2": "Find a unit vector in a given direction",
  },
  "d59efdcc-103a-44e4-b2c9-827c1a7ef6f7": {
    "M18TZ2HL_P1_Q1": "Find the angle between two vectors",
    "N08TZ0HL_P2_Q4": "Use the angle between two vectors to find a parameter",
  },
  "d852b265-6804-4467-99e9-953af805fb72": {
    "M13TZ1SL_P1_Q1": "Use vector addition to find an unknown vector",
    "M11TZ2SL_P1_Q3": "Subtract two position vectors",
  },
  "babb8fbc-b24b-44e2-b524-908650017797": {
    "N17TZ0SL_P2_Q3": "Find the magnitude of a vector",
    "M10TZ2SL_P1_Q2": "Find a unit vector in a given direction",
  },
  "ec7a9d6b-aacf-40ee-a175-9ff973312441": {
    "W_N22TZ0AIHL_P2_Q7": "Find a time-dependent velocity vector",
    "W_M25TZ3AIHL_P1_Q14": "Differentiate a position vector to find velocity",
  },
  "1855d971-48f6-4e25-9790-e4671cd9748e": {
    "W_SPECAIHL_P1_Q11": "Calculate and use a vector product",
  },
  "3f7dbc9d-77f5-4aa4-85f3-5eccf69f41c6": {
    "W_M23TZ1AIHL_P1_Q7": "Use a vector product to find a triangle's area",
    "W_M24TZ2AIHL_P1_Q8": "Find a triangle's area in three dimensions",
  },
  "d889f97c-0abb-4fa0-8bd3-eee6927e5b7b": {
    "W_N22TZ0AIHL_P2_Q4": "Complete a weighted adjacency table",
  },
  "4a729d86-d2a5-475e-8194-1c24c98aa196": {
    "W_M22TZ2AIHL_P3_Q2": "Apply Kruskal's algorithm to a weighted graph",
    "W_M23TZ2AIHL_P2_Q4": "Build a minimum spanning tree using Kruskal's algorithm",
  },
  "265ad472-09ff-46ba-bfba-1ee1ebe11cf5": {
    "W_M21TZ1AIHL_P1_Q10": "Use Prim's algorithm to find a minimum spanning tree",
  },
  "3cffb57c-653d-45a2-9983-68b1016b23e4": {
    "W_M25TZ2AIHL_P2_Q4": "Use Prim's algorithm on a distance table",
  },
  "4ea42a07-b2d6-46c6-bd79-0987f8c97236": {
    "W_M23TZ1AIHL_P2_Q4": "Determine whether an Eulerian trail exists",
  },
  "a90ee76e-0a72-4a15-bf3d-1a3094677f44": {
    "W_N23TZ0AIHL_P2_Q5": "Solve a route-inspection problem",
  },
  "06dade6e-621a-4427-ad7c-1aa749bb8fa0": {
    "W_N21TZ0AIHL_P3_Q1": "Write down a Hamiltonian cycle",
  },
  "c693e0c1-aeb5-4651-bc41-6791b5024408": {
    "W_N24TZ0AIHL_P3_Q1": "Find upper and lower bounds for a travelling-salesman route",
  },
  "e64a4cac-d435-4860-a028-f9f0b8266165": {
    "W_M24TZ2AIHL_P2_Q4": "Apply travelling-salesman bounds to a mobile-library route",
  },
  "0a593676-5299-4966-95ee-c58e7e4ccba9": {
    "W_M25TZ3AIHL_P2_Q4": "Use the deleted-vertex algorithm to find a lower bound",
    "W_SPECAIHL_P2_Q5": "Find a second lower bound by deleting a vertex",
  },
  "657e5ac0-f7a7-4e5b-9940-b0999e263643": {
    "M15TZ2AISL_P1_Q1": "Calculate the distance between two coordinate points",
  },
  "1900d762-9513-4e7c-9549-f40a2adf084d": {
    "N13TZ0AISL_P1_Q5": "Find a missing side using Pythagoras' theorem",
    "M11TZ1AISL_P1_Q7": "Use Pythagoras' theorem to find two diagonals",
  },
  "9d6631de-db03-4cfa-a0f3-e35edc3c8bf5": {
    "M16TZ1AISL_P1_Q2": "Use a trigonometric ratio to find a missing side",
    "V_N24TZ1AISL_P1_Q1": "Use a trigonometric ratio to find a horizontal distance",
  },
  "4c20491d-5660-48b6-80eb-943004d1f8b0": {
    "V_N21TZ0AISL_P1_Q2": "Use the cosine rule to find an angle",
    "M14TZ1SL_P2_Q1": "Use the cosine rule to find a side",
  },
  "7d695de0-122e-4717-93d9-c147c6ecf959": {
    "M18TZ2AISL_P1_Q8": "Find the area of a triangle using ½ab sin C",
  },
  "fc7bb062-c872-4524-9e57-e3a60793c557": {
    "V_N24TZ2AISL_P1_Q1": "Angle of elevation: find the vertical rise",
  },
  "0e81f809-f846-4459-bcca-fb84c32fb263": {
    "M08TZ1SL_P2_Q4": "Solve a trigonometric equation from its graph",
  },
  "41d1e966-9bb1-4436-976e-d02187f32932": {
    "V_M21TZ2AISL_P1_Q6": "Find the exact equation of a perpendicular bisector",
  },
  "795817a0-1f56-45f4-b103-3b8936c00858": {
    "W_M21TZ2AIHL_P1_Q14": "Form and solve a pair of simultaneous equations",
  },
  "cfa1dc1e-f80b-4e63-8275-6269cbe7f12b": {
    "W_M22TZ1AIHL_P2_Q7": "Write the matrix for an enlargement with a given scale factor",
  },
  "4ba2895d-48f5-439d-b0df-57c25ae1c824": {
    "W_N23TZ0AIHL_P2_Q6": "Write the general matrix for a reflection in y = (tan α)x",
  },
  "80522e92-56ee-4aa2-ae07-9e105b2efdf0": {
    "W_N24TZ0AIHL_P2_Q6": "Combine a rotation and enlargement into one matrix",
    "W_M23TZ2AIHL_P1_Q13": "Undo two successive matrix transformations",
  },
  "3047e664-8bf6-4140-8c0c-cabd97cd06b5": {
    "W_M22TZ2AIHL_P1_Q15": "Calculate the determinant of a transformation matrix",
    "W_N22TZ0AIHL_P1_Q9": "Use a determinant to find the area of a transformed shape",
  },
  "f5f90981-cc11-4c17-a3bd-1361bcc350ac": {
    "M17TZ2AISL_P1_Q4": "Find the gradient of a straight line",
    "M15TZ2AISL_P1_Q3": "Read the gradient and intercept of a straight line",
  },
  "0c2d1242-eb4f-4dfe-9d0c-9fe06effad62": {
    "M11TZ1AISL_P1_Q10": "Find the equation of a straight line from its graph",
  },
  "bddfca14-6aee-440f-8b2c-0cb50d8d21f5": {
    "V_M25TZ2AISL_P1_Q9": "Read and solve a function defined by a table",
    "V_SPECAISL_P1_Q4": "Use function notation and identify a range",
  },
  "a067432b-da49-4081-877b-d31f4161c517": {
    "M17TZ1AISL_P2_Q3": "Evaluate a function at x = 1",
    "M11TZ1AISL_P2_Q3": "Evaluate a function at x = 2",
  },
  "c3c9cf1a-a9bc-4064-855b-9d526eed986d": {
    "N20TZ0AISL_P1_Q4": "Identify a zero and a local minimum",
    "N11TZ0AISL_P2_Q4": "Identify an asymptote, a zero and a local minimum",
  },
  "ae67a312-31d7-4658-9ece-e427fd0eab34": {
    "W_M22TZ2AIHL_P1_Q5": "Fit and use a cubic savings model",
  },
  "3c314627-da30-4ce3-b16f-c80816aaec14": {
    "N11TZ0AISL_P2_Q5": "Find the parameters of a Ferris-wheel model",
  },
  "4ddbe716-9ced-46ce-9569-b54880c76cfe": {
    "V_N23TZ1AISL_P1_Q7": "Find a quadratic water-jet model from three points",
    "V_N25TZ1AISL_P2_Q4": "Find a quadratic walkway model from three conditions",
  },
  "ac21b892-10cf-4fcc-b343-061386c5f8d5": {
    "N10TZ0SL_P1_Q9": "Form a composite quadratic function",
    "W_M25TZ1AIHL_P1_Q6": "Compare two composite discount functions",
  },
  "cb268ace-1b45-47b1-b745-aaa2bc0fad62": {
    "N12TZ0SL_P2_Q9": "Reflect and then translate a quadratic graph",
    "M08TZ1SL_P1_Q9": "Stretch and then translate a quadratic graph",
  },
  "97dfa2ea-0da3-4f3e-a95f-1841d36df813": {
    "W_N22TZ0AIHL_P1_Q13": "Recover an exponential relationship from a semi-log graph",
    "W_M22TZ2AIHL_P2_Q4": "Use a semi-log graph to estimate model parameters",
  },
  "72a5f616-843a-4be5-875c-6e57afe3d730": {
    "W_N23TZ0AIHL_P1_Q2": "Evaluate a piecewise function from its graph",
  },
  "88b1a2a9-329c-473f-9f4e-f1ca55c8d057": {
    "W_M22TZ2AIHL_P2_Q1": "Evaluate and interpret a finite sum in sigma notation",
    "V_M22TZ2AISL_P2_Q2": "Evaluate and interpret a finite sum in sigma notation",
  },
  "abf38c68-e758-43ec-955d-624ad834d69a": {
    "W_SPECAIHL_P2_Q3": "Calculate the real value after allowing for inflation",
  },
  "03a83b7a-4df5-4d2c-a669-cfcf7b50787e": {
    "N20TZ0AISL_P1_Q11": "Read where a function is decreasing from its graph",
    "N17TZ0AISL_P2_Q5": "Use the derivative to find where a function is increasing",
  },
  "4ec4c4a2-a2de-4e61-9903-55f280bf9ab6": {
    "M14TZ1AISL_P1_Q10": "Differentiate x⁴ using the power rule",
    "V_N23TZ2AISL_P1_Q3": "Differentiate a function containing a negative power",
  },
  "db4f51b7-b4c5-41ad-bb94-b0bd53f9bee3": {
    "M18TZ2AISL_P1_Q14": "Differentiate and find the gradient at a point",
  },
  "e884d9fa-1e59-4ccc-a67d-2c63d5140908": {
    "N18TZ0AISL_P1_Q11": "Find the equation of a tangent using the power rule",
    "N09TZ0SL_P1_Q10X1": "Find the equation of the normal to y = √x",
  },
  "f4aa813d-a3e2-480a-9f8d-49d2b31a7a04": {
    "N13TZ0SL_P2_Q3": "Integrate a fractional power using the power rule",
  },
  "76f62a43-8fbd-46d5-aff6-c74b0488675a": {
    "A_M22TZ1HL_P1_Q1": "Evaluate a definite integral containing a fractional power",
    "N13TZ0SL_P1_Q4": "Use the properties of a definite integral",
  },
  "20b8ec75-0605-426a-abec-066ca4c4f9d2": {
    "A_N22TZ0SL_P2_Q3": "Find the total area between a graph and the x-axis",
    "W_N23TZ0AIHL_P1_Q11": "Find the area between a cubic curve and the x-axis",
  },
  "16efb219-7953-40cb-b8ca-8b0e956f9e39": {
    "N16TZ0SL_P1_Q10X1": "Differentiate cos x repeatedly to see the sine-cosine cycle",
    "M18TZ1SL_P2_Q1": "Differentiate a function containing ln x",
    "M15TZ1HL_P2_Q6": "Differentiate a polynomial and eˣ",
  },
  "9d0fc44f-c26e-4a61-9d6a-9d84d022c372": {
    "M19TZ2SL_P1_Q10": "Differentiate a composite power using the chain rule",
    "M16TZ1SL_P1_Q10": "Use the chain rule to find a derivative at a point",
  },
  "2ece54f8-dd4e-445e-8f8a-23858053df10": {
    "N08TZ0SL_P1_Q6": "Read extrema and inflexion from the graph of f′",
  },
  "7c1d0df9-3f50-4bfb-ae45-b669c1405895": {
    "M14TZ2SL_P1_Q6": "Sketch f′ from the graph of f without a calculator",
  },
  "3dc1e1bd-8ead-4e5a-b489-9f02f48d7892": {
    "M10TZ1SL_P2_Q3": "Differentiate a function and sketch its derivative with a GDC",
    "M12TZ2SL_P2_Q2": "Differentiate cos(eˣ) and sketch f′ using a GDC",
  },
  "92c1b8b1-b956-4724-bd03-de85fb5d4f09": {
    "N13TZ0HL_P1_Q10X1": "Find a stationary point and prove that it is a maximum",
  },
  "0922ca4f-d53f-4299-b9c9-eafe6d17caf1": {
    "M16TZ2SL_P1_Q9": "Optimize the dimensions of an open cuboid container",
    "N09TZ0SL_P2_Q7": "Minimize the cost of a rectangular enclosure",
  },
  "350494a1-e44b-4ddb-86db-72e19e69d525": {
    "M16TZ1HL_P2_Q3": "Find velocity and acceleration from a displacement model",
    "M12TZ2SL_P2_Q5": "Use a velocity model to find acceleration and displacement",
  },
  "6d504905-61e3-40cb-972c-13ff1691ffbd": {
    "N20TZ0SL_P1_Q6": "Integrate an exponential function",
    "A_M22TZ2SL_P2_Q2": "Integrate a function containing 1/x",
  },
  "5c83085a-0fc2-4199-89b3-34ce0cf5539b": {
    "M10TZ2SL_P1_Q10": "Integrate 6 + 6sin x to find an area",
  },
  "190dd207-d2d9-4de5-b374-aaa9e4f951de": {
    "N10TZ0SL_P1_Q6": "Integrate sin(2x − 3) by the inverse chain rule",
    "M14TZ2SL_P1_Q5": "Integrate 4cos(2x) by the inverse chain rule",
  },
  "924417ae-de6f-4e30-9f97-46ac0d001d4a": {
    "M17TZ1SL_P1_Q5": "Integrate xe^(x² − 1) using substitution",
    "N20TZ0SL_P2_Q10": "Use substitution to obtain a logarithmic antiderivative",
  },
  "3fd87e0f-1d17-4b5a-a0fd-4b8dd9a75aed": {
    "M10TZ2HL_P2_Q3": "Use z = (x − μ)/σ to find the standard deviation",
    "M11TZ1HL_P2_Q12": "Find the mean and standard deviation from two percentiles",
  },
  "4fa5e51a-f4dd-477e-b393-54f1be7266ec": {
    "M10TZ2HL_P1_Q1": "Normalise a continuous probability density",
    "A_M22TZ1HL_P1_Q7": "Find the normalising constant of a continuous density",
  },
  "2f5766d2-e280-4aff-ac80-36b91b5218b7": {
    "A_M25TZ3HL_P2_Q3": "Complete a discrete distribution and identify its mode",
    "MF_AAHL_T4_DISCRETE_MEDIAN": "Complete a discrete probability distribution and find its median",
  },
  "76e8e8b2-11d1-4c5f-919c-8d18c85df672": {
    "A_N24TZ0HL_P2_Q6": "Find the mean of a two-piece continuous distribution",
  },
  "a2a7b4c3-adc2-4ae1-9263-e50c671da0dd": {
    "M17TZ2HL_P2_Q10": "Find the mean and variance of a continuous random variable",
    "M15TZ1HL_P2_Q11": "Find the variance of a two-piece continuous distribution",
  },
  "23301c56-b9aa-4101-ade8-1e2c41b65e54": {
    "A_N25TZ3HL_P1_Q7": "Find the variance of a linear transformation",
  },
  "26a92a94-1132-4e90-9b26-63b98ffffc26": {
    "A_M25TZ3HL_P2_Q3": "Identify systematic sampling",
  },
  "45a2dc30-ca7b-47a2-a2b1-a1c2ef8d15c8": {
    "M12TZ1SL_P2_Q8": "Read frequencies and the median class from a histogram",
  },
  "8ea2af96-360e-4ae0-a160-43a031e64cba": {
    "N12TZ0SL_P1_Q8": "Read values from a box-and-whisker plot",
  },
  "be563c56-3e2f-437f-8e41-0fd0d83dc7c0": {
    "A_M24TZ1SL_P2_Q1": "Compare the centre and spread of two box plots",
  },
  "639dc690-35bc-4a84-b7fb-89844ecaf252": {
    "V_M23TZ2AISL_P1_Q3": "Use the IQR rule to identify an actual outlier",
  },
  "a9ba5e52-d70c-45b8-822c-f80312ea5c9a": {
    "M11TZ1HL_P1_Q1": "Use the union formula for mutually exclusive and independent events",
    "M14TZ2HL_P1_Q1": "Calculate an intersection and a union",
  },
  "8d2b60b3-ccaa-41cf-afa7-f6415e4ea05d": {
    "W_N22TZ0AIHL_P3_Q1": "Carry out a chi-squared goodness-of-fit test after combining categories",
  },
  "5f9a2474-cb2a-40b8-b8a4-77bd1b8189fb": {
    "W_M23TZ2AIHL_P1_Q9": "Calculate and interpret the coefficient of determination",
  },
  "bb113001-688d-4876-91d0-208f1fdaa532": {
    "W_M24TZ1AIHL_P1_Q3": "Transform a mean and standard deviation",
    "M19TZ2SL_P1_Q8A": "Transform a mean and variance after halving every value",
  },
  "45a38dec-e9f7-48db-b7ff-a998107ada10": {
    "H_N18TZ0HL_P3S_Q1": "Find the expectation and variance of linear combinations",
  },
  "ae20100b-d4f8-47b7-94cb-274153bd96da": {
    "V_SPECAISL_P1_Q3": "Identify systematic sampling",
    "V_M21TZ1AISL_P2_Q1": "Identify systematic or quota sampling",
  },
  "ceae5e0d-9738-456a-89e4-0312f721d52d": {
    "M19TZ1SL_P2_Q1": "Read a box plot and find its interquartile range",
  },
  "aae0e405-1bd3-4357-a328-727f097360e4": {
    "V_M22TZ2AISL_P1_Q7": "Compare the centre and spread of two box plots",
  },
  "160cf57c-42a3-457c-877f-923a11a0b623": {
    "M19TZ1HL_P2_Q3": "Find the mean and standard deviation of raw data",
  },
  "125a9218-3aed-48c9-b96b-3cf08968de9c": {
    "W_M23TZ1AIHL_P2_Q1": "Interpret a model gradient, then find a regression line and correlation",
  },
  "7cc0076e-c776-4fe4-8a63-43da44f92820": {
    "A_M24TZ1SL_P2_Q6": "Use the regression line of x on y",
  },
  "2242b24b-b800-4f2c-bb5a-16bd04201870": {
    "M16TZ1HL_P1_Q5": "Use cos(60° − 45°) to find cos 15° exactly",
  },
  "b70c2e32-c750-4851-a572-8587162396f0": {
    "M10TZ2HL_P1_Q12": "Expand scalar products involving p + q",
  },
  "1847f7c2-9f5a-48f5-a40e-12ef76b0cc9e": {
    "N16TZ0SL_P1_Q4": "Vector equation of a line through two points in 3D",
  },
  "ed2cce38-614a-4256-b943-ab8c4856fa14": {
    "M11TZ2SL_P2_Q8": "Form two lines in 3D and find the angle between them",
  },
  "f9b565e2-2c78-4c12-a55a-827d39233645": {
    "M10TZ2SL_P2_Q9": "Airplane position, speed and distance travelled",
  },
  "1a185d48-f767-4296-99b1-17ef882d64f4": {
    "H_M14TZ2SL_P1_Q9": "Airplane speed and height after two seconds",
  },
  "03d4a492-8fd9-4ab0-ab11-383f62d354d6": {
    "N16TZ0AISL_P2_Q3": "Find the midpoint and then the distance AC",
    "N14TZ0AISL_P1_Q2": "Calculate the distance between two coordinate points",
  },
  "0e6af994-0fb9-417e-a642-c90363b0ca1f": {
    "N13TZ0AISL_P1_Q5": "Use Pythagoras' theorem to find a missing side",
  },
  "40ed3424-3856-4e10-9202-06ee73c4d10e": {
    "N17TZ0SL_P2_Q1": "Use the sine rule to find a missing side",
  },
  "96c1a533-e89a-4f3e-8fd5-e769d94087e3": {
    "M15TZ2HL_P2_Q1": "Find an area using 1/2 ab sin C",
  },
  "a71764ed-7e1e-4316-aa1c-b70aacab2437": {
    "M15TZ2AISL_P1_Q2": "Use an exact 30° triangle to find a distance",
  },
  "c5f358f0-e49c-4fc1-a20a-296f64992376": {
    "N08TZ0SL_P1_Q7": "Simplify a trigonometric expression to sin x",
  },
  "e92f65c0-af14-4e82-90de-28a2f004b677": {
    "M13TZ2HL_P2_Q6": "Solve 3cos²x − 8cos x + 4 = 0",
  },
  "6468821a-a955-4837-b591-7e8bdf3705ca": {
    "M10TZ1HL_P1_Q1": "Use polynomial factors to find two coefficients",
  },
  "17cbf90f-7617-48fa-855d-dc6b1013a2d4": {
    "N18TZ0SL_P1_Q2": "Read a function value from a table",
    "M16TZ1SL_P1_Q1": "Evaluate g(2)",
  },
  "f4b4002a-6087-473d-991e-559ff2b54108": {
    "N16TZ0SL_P2_Q1": "Evaluate f(8)",
    "M18TZ1SL_P1_Q1": "Evaluate f(14)",
  },
  "eeb308ea-e4a0-44da-8932-705b5cb24c2f": {
    "M08TZ2SL_P2_Q3": "Find intercepts and sketch a non-quadratic function",
  },
  "4be6b3ed-84bd-4d5c-a9d3-67362859ef39": {
    "A_M23TZ1SL_P2_Q3": "Sketch a graph and label its local maximum and minimum",
  },
  "48b621fa-d972-43fd-8d91-5ace017b5d48": {
    "N15TZ0SL_P1_Q5": "Find the inverse of a cubic function",
  },
  "46e2372a-66cb-477e-96c7-fba7ae61c41d": {
    "N08TZ0SL_P2_Q1": "Factorise a non-monic quadratic",
  },
  "88162068-c195-41a3-ae20-004900917331": {
    "N14TZ0SL_P1_Q1": "Solve x² + x − 6 = 0",
  },
  "ac5e0aa4-64bb-4cbb-86aa-8d7f9315c0ac": {
    "M16TZ1SL_P2_Q2": "Use a GDC to solve x² = 3 ln(x + 1)",
    "M15TZ2SL_P2_Q8X1": "Use a GDC to find where two graphs intersect",
  },
  "bd083b0d-a7b1-44cc-9980-47cce4046c0d": {
    "A_M24TZ1SL_P1_Q8": "Sketch a rational function with its intercepts and asymptotes",
  },
  "908747f1-8799-4ca2-8f63-ba376beff0ab": {
    "M17TZ2HL_P2_Q4": "Solve k² − k − 12 < 0",
  },
  "885f3694-d90b-4734-becb-dc9360b09ec7": {
    "M08TZ2SL_P1_Q5": "Reflect a graph in the x-axis",
    "M12TZ2SL_P1_Q5": "Reflect a graph in the y-axis",
  },
  "2a607da2-7e6a-4dc8-b483-2819907798e0": {
    "M09TZ1SL_P1_Q5": "Vertical stretch followed by a horizontal translation",
  },
  "916aa44f-5240-4926-9cb6-12800d012e0c": {
    "M17TZ2HL_P2_Q11": "Factorise and sketch a polynomial graph",
  },
  "f8918c12-e985-4e26-bea3-c93f245655f1": {
    "A_M22TZ2HL_P1_Q11": "Sketch the reciprocal of a quadratic",
    "N10TZ0HL_P2_Q8": "Sketch a line divided by a quadratic",
    "N19TZ0HL_P1_Q10": "Sketch a linear-over-quadratic function",
  },
  "54f53e20-a14f-447a-a43f-c865e7eb424e": {
    "A_N23TZ1HL_P2_Q11": "Asymptotes, intercepts and sketch of a quadratic-over-linear function",
    "A_N21TZ0HL_P2_Q10": "Sketch a second quadratic-over-linear function",
  },
  "5079b16d-57c4-40bb-bf1b-2aba1e1695fc": {
    "M15TZ1HL_P2_Q10": "Solve a difficult rational inequality",
    "M10TZ1HL_P2_Q9": "Solve a rational inequality with a restricted domain",
  },
  "990b6aba-3d06-489d-81e6-70a683d4f23a": {
    "M08TZ1HL_P2_Q2": "Sketch a trigonometric modulus function",
    "A_N25TZ3HL_P1_Q5": "Sketch f(|x|) and |f(x)|",
  },
  "5c188648-60b0-48f6-83a1-9d5c18235dac": {
    "N10TZ0HL_P1_Q1": "Solve |x − 1| > |2x − 1|",
    "M16TZ1HL_P1_Q7": "Sketch a modulus graph and solve its intersections",
  },
  "c4db88f7-5d17-4e3e-acf2-8b714152fe0f": {
    "A_SPECHL_P1_Q3": "Sketch y = (f(x))² + 1 from the graph of f",
    "N18TZ0HL_P2_Q8": "Recover the possible graphs of f from the graph of (f(x))²",
  },
  "6deba641-23f1-40d0-ae72-a3a41880b1a6": {
    "W_N24TZ0AIHL_P1_Q9": "Multiplication by i as a rotation",
  },
  "c3a6691b-3913-41ee-a041-c85daac52f12": {
    "M12TZ2HL_P1_Q12": "A property of complex conjugates",
  },
  "bbe01c0e-9af6-47fc-845c-f2259ff05024": {
    "M16TZ2HL_P1_Q12": "The seven roots of z⁷ = 1",
    "M10TZ2HL_P1_Q13": "Cube roots of unity using ω",
  },
  "d5c720d9-4540-4c45-b822-a0c84764b619": {
    "M14TZ2HL_P2_Q13": "Prove De Moivre's theorem by induction",
  },
  "f25aaf3c-7579-43af-9f0c-c82485651278": {
    "N13TZ0HL_P2_Q9": "Shortest distance from the origin to a line",
    "W_N23TZ0AIHL_P1_Q14": "Find the closest point on a line to a given point",
  },
  "b67a9adf-10a0-466a-b35f-41187f507502": {
    "M16TZ1HL_P2_Q1": "Calculate a vector product in component form",
  },
  "0785ff34-a49a-4abd-8c2a-d11d0719370c": {
    "A_M24TZ1HL_P2_Q12": "Prove the identity linking scalar and vector products",
  },
  "35a8aee0-4d48-4084-883f-fc23b5be9039": {
    "A_N25TZ1HL_P2_Q12": "State the vector equation of a plane containing two lines",
  },
  "f6806af5-6f99-4c11-856b-e678d5fe533a": {
    "N11TZ0HL_P2_Q13": "Find the vector equation of the line where two planes intersect",
    "A_M22TZ1HL_P1_Q11": "Determine the line of intersection of two planes",
  },
  "9282b2e6-3873-4ca7-9556-99f00cd43a0d": {
    "M14TZ2HL_P1_Q3": "Find the line of intersection of three planes",
    "M08TZ1HL_P2_Q5": "Find a vector equation for the line where three planes intersect",
  },
  "40c21470-dbef-42f5-acfb-ba9658d8f02e": {
    "M10TZ1HL_P2_Q11": "Find the angle between a plane and the x-axis",
    "M12TZ2HL_P2_Q11": "Find the angle between a line and a plane",
  },
  "0766515e-903e-4598-9f61-215b9c8cb925": {
    "N14TZ0HL_P2_Q1": "Find the angle between two planes",
  },
  "134931eb-dd12-49c0-847c-973b34aebd07": {
    "N16TZ0SL_P1_Q10": "Find successive and higher derivatives",
  },
  "dd3009b8-25ed-4425-b4a5-611cc3ba1665": {
    "N08TZ0HL_P2_Q12": "Differentiate an expression containing arcsin",
    "M18TZ1HL_P1_Q7": "Differentiate an arccos function",
  },
  "57c2580c-3193-417f-be6c-0332c78845ca": {
    "M16TZ2HL_P1_Q3": "Use the arctangent integration formula",
  },
  "eb3a2412-6da8-4727-b13e-ca95e9dca23d": {
    "M11TZ2HL_P2_Q13B": "Integrate e²ˣ sin x by repeated integration by parts",
    "N18TZ0HL_P1_Q10": "Integrate eˣ cos 2x by repeated integration by parts",
  },
  "feb99f1f-879d-4a54-a584-3978511b3cf1": {
    "N19TZ0HL_P2_Q11": "Find an area bounded by a curve and the y-axis",
    "W_M24TZ1AIHL_P1_Q9": "Find an exact logarithmic area",
  },
  "f0fa4dc1-59c1-46c4-a077-8e442d0522e4": {
    "N12TZ0HL_P3_Q1": "Solve a differential equation by separating variables",
    "N08TZ0HL_P3_Q4": "Solve a separable trigonometric differential equation",
  },
  "3b73bfe5-13de-4fa2-a29b-6e4e6f822481": {
    "N19TZ0HL_P3_Q3": "Find a Maclaurin series by differentiating",
    "M11TZ0HL_P3_Q1": "Find the first three Maclaurin terms",
  },
  "44cf2485-5dd6-45d4-866b-1c187d67f198": {
    "N10TZ0HL_P3_Q3": "Integrate a Maclaurin series term by term",
    "A_M22TZ1HL_P1_Q12": "Use and integrate a Maclaurin series",
  },
  "67e6f294-1736-4781-b3d3-ebfaa24282c4": {
    "N12TZ0HL_P3_Q4": "Write a Maclaurin series in sigma notation",
    "N13TZ0HL_P3_Q4": "Derive a Maclaurin series in sigma notation",
  },
  "e0ae88fb-c9b0-4df3-94e5-0a6880f03068": {
    "M11TZ2SL_P1_Q5": "Apply a logarithm law to simplify an expression",
    "W_M25TZ1AIHL_P1_Q10": "Combine logarithms into a single logarithm",
  },
  "f4f5804f-1998-41e3-8b43-5ba7d7ca2b40": {
    "W_M21TZ1AIHL_P1_Q9": "Evaluate a simple complex-number expression",
    "H_M18TZ2HL_P2_Q1": "Divide complex numbers in Cartesian form",
  },
  "316a9cc6-d140-4513-8713-266476d64627": {
    "W_N21TZ0AIHL_P2_Q5": "Write a complex number in Euler form",
    "W_M21TZ2AIHL_P1_Q12": "Calculate with complex numbers in Euler form",
  },
  "eba4dbd1-cfe5-4f48-8656-cdeceafce0c7": {
    "W_M24TZ2AIHL_P1_Q15": "Interpret complex multiplication as rotation and enlargement",
    "W_SPECAIHL_P1_Q15": "Plot successive powers on an Argand diagram",
  },
  "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f": {
    "W_M22TZ1AIHL_P1_Q11": "Find an eigenvector for a given eigenvalue",
    "W_M22TZ2AIHL_P2_Q5": "Find the eigenvalues and eigenvectors of a 2 × 2 matrix",
  },
  "79bbc962-e946-49f0-a89e-5bd386389248": {
    "W_M21TZ1AIHL_P2_Q5": "Use diagonalisation to find a long-run matrix power",
  },
  "326ef6f4-cdc3-461c-b121-527fef739c83": {
    "M08TZ1SL_P1_Q6": "Find displacement from a velocity function",
    "H_M17TZ2HL_P1_Q4": "Use a displacement function to find when a particle is at rest",
  },
  "54333f98-7d7a-4d6a-b3cf-347122e184bc": {
    "H_M14TZ1HL_P1_Q8": "Use a = v dv/ds to find acceleration",
    "W_N23TZ0AIHL_P3_Q1": "Use a = v dv/ds in a falling-capsule model",
  },
  "9af63d1a-407b-4f90-ae78-30c8291fcd59": {
    "W_M25TZ2AIHL_P1_Q12": "Form a differential equation from a proportional-rate model",
  },
  "660e272a-8a71-4422-8450-61a7ea1d58cf": {
    "H_M13TZ2HL_P2_Q12": "Solve y dy/dx = cos 2x by separation",
    "W_M24TZ1AIHL_P2_Q5": "Solve a separable differential equation with an initial condition",
  },
  "49e6c7ea-110b-4ab4-a0d5-97a2c9fe4b11": {
    "W_M24TZ1AIHL_P1_Q4": "Apply Euler's method to a first-order differential equation",
    "W_M24TZ2AIHL_P1_Q7": "Apply Euler's method to approximate a solution",
  },
  "1310ef79-c234-4d20-9054-53eb85ef7749": {
    "W_N24TZ0AIHL_P1_Q17": "Apply Euler's method to a coupled predator-prey system",
    "W_M25TZ3AIHL_P1_Q11": "Apply Euler's method to a coupled linear system",
  },
  "a916a502-98ff-4105-8574-80aac522eda7": {
    "W_N21TZ0AIHL_P2_Q6": "Solve a coupled system using eigenvalues and eigenvectors",
  },
  "de2388f1-fbf3-49c0-883b-1eff70b9cf7f": {
    "W_M21TZ2AIHL_P2_Q7": "Sketch a sink from two negative real eigenvalues",
  },
  "f40d55e2-0669-40a7-b7d9-fcc477ef23d4": {
    "W_N24TZ0AIHL_P2_Q7": "Sketch a spiral sink from eigenvalues -2 ± 6i",
  },
  "6194b7ab-4cd6-4c43-9a54-288397647d66": {
    "W_M23TZ1AIHL_P2_Q6": "Sketch a spiral source from eigenvalues 0.08 ± 0.4i",
  },
  "ceabfc5c-e18c-45d3-9ccd-2e3dcdf6ac5f": {
    "W_M23TZ2AIHL_P2_Q7": "Find an exact coupled-system solution in eigenvector form",
    "W_M22TZ2AIHL_P2_Q7": "Find an exact second-order solution from its eigenvalues",
  },
  "aacabb23-fe64-4316-bbf5-d1737b8fbad8": {
    "W_M23TZ2AIHL_P2_Q5": "Find and interpret a steady-state population vector",
  },
  "cde690c1-93a1-4385-b6cd-a31e4a885a7f": {
    "W_M22TZ1AIHL_P1_Q9": "Find a probability involving the mean of a normal sample",
  },
  "1b5161c6-1227-4018-84fc-ab50132be01b": {
    "H_M15TZ0HL_P3S_Q3": "Calculate a confidence interval with known standard deviation",
  },
  "860ba46c-0af6-4351-a3fd-6ea5fd09c3b4": {
    "W_M23TZ2AIHL_P1_Q15": "Calculate a confidence interval for an unknown variance from raw sample data",
  },
  "e98579d2-83b7-4dab-ab62-427fd2e8165e": {
    "V_N23TZ1AISL_P1_Q3": "Find where a function is increasing",
    "V_M25TZ1AISL_P1_Q8": "Show that a cost function is decreasing",
  },
  "741c0b0c-17ef-46e5-894c-c62447c47172": {
    "N12TZ0AISL_P1_Q15": "Differentiate a cubic using the power rule",
    "M13TZ1AISL_P1_Q15": "Differentiate a polynomial using the power rule",
  },
  "f06c971e-bbd7-4cb2-8db5-e3abbe338077": {
    "V_M22TZ2AISL_P1_Q11": "Find the gradient of a curve at a point",
    "V_N24TZ2AISL_P1_Q12": "Differentiate and find the gradient at x = 1",
  },
  "97a1a371-61a6-4585-971e-9fa6c167f39c": {
    "V_N24TZ1AISL_P1_Q12": "Find the normal to a curve at a point",
    "V_M23TZ1AISL_P1_Q5": "Find a tangent and test a proposed normal",
  },
  "b31ff22b-38f1-489b-a9ce-209fa91d73e6": {
    "V_M24TZ2AISL_P2_Q3": "Integrate a quadratic using the power rule",
  },
  "0512477b-d893-4805-9d2e-2f597b8c8673": {
    "M14TZ1AISL_P1_Q15": "Find a local minimum",
    "N13TZ0AISL_P1_Q9": "Find the local minimum of a polynomial",
  },
  "73d396dd-da8e-46da-8548-2ae1cf533440": {
    "M14TZ2HL_P2_Q1": "Write a finite arithmetic sum using sigma notation",
    "W_M24TZ2AIHL_P2_Q6": "Evaluate a triangle number written in sigma notation",
  },
  "7096456c-bd06-4c4f-9ac3-f2314a2fa334": {
    "A_N21TZ0SL_P2_Q2": "Solve an exponential equation",
  },
  "4e377a7a-be35-4b76-bcbc-3684974dfaf9": {
    "A_M22TZ1SL_P1_Q2": "Rewrite a cube-root quotient using a fractional index",
    "A_N21TZ0SL_P1_Q8": "Find an exponential base from a fractional index",
  },
  "8c904f89-d4d6-4859-8403-9b64187f211b": {
    "M12TZ2HL_P2_Q4": "Arrange boys and girls in two groups",
  },
  "1f072e71-5da3-475f-9b54-e809a68a893d": {
    "A_N22TZ0HL_P1_Q11": "Count possible three-digit settings using the product rule",
  },
  "636981ff-833c-4f52-8c70-23ab18592831": {
    "A2_M24TZ1HL_P1_Q11": "Decompose a rational expression into partial fractions",
    "M15TZ1HL_P1_Q6": "Find the constants in a partial-fractions decomposition",
  },
  "3aef226f-98dc-4ddd-8ad2-8d1bb8402444": {
    "M12TZ2HL_P1_Q6": "Equate real and imaginary parts",
  },
  "06ed664b-cac7-4315-a715-6232e8170d41": {
    "M11TZ1HL_P1_Q13": "Use De Moivre's theorem to derive multiple-angle identities",
    "M15TZ1HL_P2_Q12": "Apply De Moivre's theorem to a fifth power",
  },
  "921a99b5-a673-423c-aeed-402fec0952e0": {
    "N08TZ0HL_P1_Q13": "Solve z⁴ = 1 − i",
    "N15TZ0HL_P1_Q11": "Solve z³ = 8i in polar and Cartesian form",
  },
};

// A selected subpart sometimes contains every word the student needs while
// the source stem describes unrelated earlier work. Blank only those stems so
// the practice card really shows "part C only" rather than carrying a stray
// table from the original multi-part question.
const practiceBodyOverrides = {
  // Only the selected integration part is used from the source question, so
  // keep its function and interval without the unrelated graphing preamble.
  "20b8ec75-0605-426a-abec-066ca4c4f9d2": {
    "A_N22TZ0SL_P2_Q3": "Consider the function \\(g(x)=8\\ln(x+1)-x^3\\), for \\(0\\leq x\\leq 3\\).",
  },
  // Part (c) asks for f' but the definition of f appeared in part (a) of the
  // source. Restate it so the extracted derivative question is complete.
  "dd3009b8-25ed-4425-b4a5-611cc3ba1665": {
    "N08TZ0HL_P2_Q12": "The function \\(f\\) is defined by \\(f(x)=x\\sqrt{9-x^2}+2\\arcsin\\left(\\dfrac{x}{3}\\right)\\).",
  },
  // Parts (c) and (d) form a coherent partial-fractions integration task once
  // the rational function from the earlier graphing part is stated here.
  "d10601dc-f866-4925-93d7-dc05b9316429": {
    "M17TZ1HL_P1_Q11": "Let \\(f(x)=\\dfrac{1}{x^2+3x+2}\\), where \\(x\\ne-2,-1\\).",
  },
  // Part (e) is the exact known-sigma mean Z-test. Restate the sample mean
  // established earlier in the source while omitting unrelated estimation.
  "c19965b9-5b04-4711-b5ff-b440ca6eba03": {
    "H_M19TZ0HL_P3S_Q3": "The weights of hens in a large population are normally distributed. A random sample of 100 hens has mean \\(\\overline{x}=1.998\\text{ kg}\\).",
  },
  // Part (d) is self-contained. Suppress the unrelated normal-distribution
  // crate-mass stem so this card reads only as a population-proportion test.
  "44d7af59-b287-482e-a04f-99fc8faaffeb": {
    "W_N23TZ0AIHL_P2_Q7": "",
  },
  "cde690c1-93a1-4385-b6cd-a31e4a885a7f": {
    "W_M22TZ1AIHL_P1_Q9": "The volumes of bottles of juice are normally distributed with mean \\(750\\text{ ml}\\) and standard deviation \\(20\\text{ ml}\\). Five bottles are chosen at random and independently of one another.",
  },
  // Part (d) depends on the amount and annual rate introduced immediately
  // before it. Restate that information while omitting the unrelated earlier
  // arithmetic-sequence work from the source question.
  "88b1a2a9-329c-473f-9f4e-f1ca55c8d057": {
    "W_M22TZ2AIHL_P2_Q1": "In 2022 Amara spent \\(\\$425\\) on wood pellets. She expects that amount to increase at an annual rate of \\(9.5\\,\\%\\). In the sum below, \\(n=1\\) corresponds to 2022.",
    "V_M22TZ2AISL_P2_Q2": "In 2022 Marek spent \\(\\$340\\) on chicken feed. He expects that amount to increase at an annual rate of \\(5.8\\,\\%\\).",
  },
  "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f": {
    "W_M22TZ2AIHL_P2_Q5": "Let \\(M=\\begin{pmatrix}0.76&0.16\\\\0.24&0.84\\end{pmatrix}\\).",
  },
  // Parts (b) and (c) are a clean, self-contained mean-and-variance exercise
  // once the constants established in part (a) are stated in the stem.
  "a2a7b4c3-adc2-4ae1-9263-e50c671da0dd": {
    "M17TZ2HL_P2_Q10": "A continuous random variable \\(X\\) has probability density function \\(f\\) given by \\[f(x)=\\begin{cases}\\dfrac{x^2}{32}+\\dfrac{1}{12}, & 0\\le x\\le4,\\\\[5pt]0, & \\text{otherwise.}\\end{cases}\\]",
    "M15TZ1HL_P2_Q11": "A continuous random variable \\(X\\) has probability density function \\[f(x)=\\begin{cases}\\dfrac{\\sin x}{4}, & 0\\le x\\le\\pi,\\\\[5pt]\\dfrac{x-\\pi}{\\pi^2}, & \\pi<x\\le2\\pi,\\\\[5pt]0, & \\text{otherwise.}\\end{cases}\\] Its mean is \\(\\mathrm{E}(X)=\\dfrac{13\\pi}{12}\\).",
  },
  "26a92a94-1132-4e90-9b26-63b98ffffc26": {
    "A_M25TZ3HL_P2_Q3": "",
  },
  // Isolate the exact matrix operation from the longer source question so the
  // student sees a self-contained reflection or composite-matrix prompt.
  "4ba2895d-48f5-439d-b0df-57c25ae1c824": {
    "W_N23TZ0AIHL_P2_Q6": "The matrix \\(R\\) represents reflection in the line \\(y=(\\tan\\alpha)x\\), where \\(0\\le\\alpha<\\pi\\).",
  },
  "80522e92-56ee-4aa2-ae07-9e105b2efdf0": {
    "W_N24TZ0AIHL_P2_Q6": "The matrix \\(A=\\begin{pmatrix}\\cos24^\\circ&-\\sin24^\\circ\\\\[3pt]\\sin24^\\circ&\\cos24^\\circ\\end{pmatrix}\\) represents a rotation about the origin. The matrix \\(B=\\begin{pmatrix}1.04&0\\\\0&1.04\\end{pmatrix}\\) represents an enlargement about the origin. Nia creates a composite transformation using \\(C=AB\\).",
  },
  "3047e664-8bf6-4140-8c0c-cabd97cd06b5": {
    "W_M22TZ2AIHL_P1_Q15": "",
  },
  // Part (e) only needs the plane equation established earlier in the source.
  // Restate it so this displayed extract is a self-contained line-plane angle.
  "40c21470-dbef-42f5-acfb-ba9658d8f02e": {
    "M12TZ2HL_P2_Q11": "The plane \\(\\Pi\\) has Cartesian equation \\(16x+24y-11z=64\\).",
  },
  // Part (d) is the exact spiral-sink task. Restate the Spring 2 system and
  // initial point so it remains self-contained after the Spring 1 parts are
  // deliberately removed from the practice card.
  "f40d55e2-0669-40a7-b7d9-fcc477ef23d4": {
    "W_N24TZ0AIHL_P2_Q7": "Spring 2 is modelled by \\(\\dfrac{dx}{dt}=y\\) and \\(\\dfrac{dy}{dt}=-40x-4y\\). Its eigenvalues are \\(-2\\pm6i\\). At \\(t=0\\), \\(x=4\\) and \\(y=3\\).",
  },
};

// These presentation-only grades apply to the cropped lesson extract, not to
// the complete source question in the question bank. Part (c) of this source
// is a one-mark sampling-method identification, so the course card should be
// green even though later source parts are harder.
const practiceDifficultyOverrides = {
  "26a92a94-1132-4e90-9b26-63b98ffffc26": {
    "A_M25TZ3HL_P2_Q3": "Easy",
  },
  "068bee2e-fece-4b97-b0e8-8f244222a8c2": {
    "M17TZ1HL_P2_Q2": "Medium",
  },
};

function selectedContentSignature(lessonId, questionId) {
  const question = seed.find((candidate) => candidate.id === questionId);
  if (!question) return "";
  const labels = practicePartOverrides[lessonId]?.[questionId];
  const wanted = labels?.length ? new Set(labels.map(String)) : null;
  const parts = (question.parts || []).filter((part) => !wanted || wanted.has(String(part[0])));
  const bodyOverrides = practiceBodyOverrides[lessonId] || {};
  const body = Object.prototype.hasOwnProperty.call(bodyOverrides, questionId)
    ? bodyOverrides[questionId]
    : question.body || "";
  return [body, ...parts.map((part) => part[1] || "")]
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const aaRules = {
  1: [
    [/scientific notation/, "Exponents and logarithms"],
    [/proof by contradiction/, "Proof by contradiction"],
    [/proof by induction/, "Proof by induction"],
    [/counter example|deductive proof/, "Simple deductive proof"],
    [/counting|factorial|arrangement|combination|permutation|keeping objects/, "Counting principles"],
    [/partial fractions/, "Partial fractions"],
    [/complex|modulus.argument|euler form|de moivre|roots of unity|conjugate/, "Complex numbers"],
    [/system of linear equations/, "System of linear equations"],
    [/binomial/, "Binomial expansion (n ∈ ℤ⁺)"],
    [/arithmetic|sigma notation/, "Arithmetic sequences"],
    [/geometric|infinite geometric/, "Geometric sequences"],
    [/interest|depreciation|inflation/, "Finance"],
    [/exponent|log|number e|change of base/, "Exponents and logarithms"],
    [/roots of a polynomial/, "Polynomial functions"],
  ],
  2: [
    [/functions introduction|evaluating functions/, "Composite functions"],
    [/solving equations using substitution|solving equations with gdc/, "Quadratics"],
    [/gradient|straight line|parallel and perpendicular/, "Coordinate geometry"],
    [/composite functions/, "Composite functions"],
    [/inverse functions/, "Inverse functions"],
    [/rational functions.*quadratic|quadratic in (the )?(denominator|numerator)/, "Rational functions with quadratics"],
    [/rational functions|asymptotes/, "Rational functions"],
    [/modulus|reciprocal transformations|graphs of y/, "Modulus and further transformations"],
    [/even and odd/, "Odd and even functions"],
    [/polynomial|factor and remainder|dividing polynomials|sum and product of roots/, "Polynomial functions"],
    [/quadratic|discriminant|vertex form/, "Quadratics"],
    [/inequalities/, "Inequalities"],
    [/exponential|logarithmic/, "Exponential and logarithmic functions"],
    [/transformations|sketching functions|features of graphs/, "Transformations"],
  ],
  3: [
    [/midpoint|distance between 2 points/, "Coordinate geometry"],
    [/volume and surface area|trigonometry in 3d|elevation and depression/, "3D geometry"],
    [/pythagoras|soh cah toa|sine rule|cosine rule|area of a triangle/, "Triangles"],
    [/bearings/, "Bearings"],
    [/radians|arcs and sectors/, "Arcs and sectors"],
    [/inverse trigonometric/, "Inverse trig functions"],
    [/trig identities|reciprocal trig|compound angle/, "Trig identities"],
    [/solving trig/, "Trig equations"],
    [/exact triangles|unit circle|cast diagram|graphs of sin|sinusoidal/, "Sinusoidal functions"],
    [/vector product|areas using vector product/, "Vectors: planes and cross product"],
    [/plane|cross product/, "Vectors: planes and cross product"],
    [/vector|scalar product|parametric form|angle between two lines|intersecting lines|point and a line/, "Vectors: lines and dot product"],
  ],
  4: [
    [/testing for independence/, "Probability"],
    [/histogram|cumulative frequency/, "Histograms and cumulative frequency curves"],
    [/box|outliers/, "Box and whisker diagrams and outliers"],
    [/regression|correlation/, "Linear regression"],
    [/venn/, "Venn diagrams"],
    [/tree/, "Tree diagrams"],
    [/binomial distribution/, "Binomial distribution"],
    [/normal distribution/, "Normal distribution"],
    [/continuous random variable|linear transformations of x/, "Continuous random variables"],
    [/discrete random variable/, "Discrete random variables"],
    [/probability|bayes/, "Probability"],
    [/data|sampling|average|spread|frequency table|constant changes|variance|standard deviation/, "Descriptive statistics"],
  ],
  5: [
    [/maclaurin|euler.s identity/, "Maclaurin series"],
    [/differential equation|separation of variables|euler.s method|homogenous|integrating factor/, "Differential equations"],
    [/volume of revolution/, "Volume of revolution"],
    [/integration by parts/, "Integration by parts"],
    [/integration by substitution/, "Integration by substitution"],
    [/implicit differentiation/, "Implicit differentiation"],
    [/related rates/, "Related rates of change"],
    [/inverse chain rule/, "Integration rules"],
    [/l.hopital|first principles|introduction to limits|finding a limit|continuous functions|differentiable functions/, "Limits, L'Hopital and first principles"],
    [/graph.*derivative|sketching derivatives/, "Graphs of derivatives"],
    [/stationary|inflexion|increasing and decreasing/, "Stationary points and points of inflexion"],
    [/tangent|normal/, "Tangents and normals"],
    [/optimization/, "Optimization"],
    [/kinematics/, "Kinematics"],
    [/area under|area between|curve and y.axis/, "Area under the curve"],
    [/integration|integrating|finding f|definite/, "Integration rules"],
    [/differentiat|derivative|chain rule|product rule|quotient rule|higher derivatives/, "Differentiation rules"],
  ],
};

const aiRules = {
  1: [
    [/scientific notation/, "Standard form"],
    [/arithmetic|sigma notation/, "Arithmetic sequences"],
    [/complex|modulus.argument|euler form|operations and geometric/, "Complex numbers"],
    [/geometric|infinite geometric/, "Geometric sequences"],
    [/interest|depreciation|inflation|loan|annuit/, "Finance"],
    [/percentage error/, "Percentage error"],
    [/rounding/, "Rounding and bounds"],
    [/bound/, "Rounding and bounds"],
    [/frequency and phase|adding sinusoidal/, "Frequency and phase"],
    [/eigen/, "Eigenvalues and eigenvectors"],
    [/matri|powers of matrices/, "Matrices and powers of matrices"],
    [/system of linear equations/, "System of linear equations"],
    [/exponent|log|number e|change of base/, "Exponents and logarithms"],
  ],
  2: [
    [/finding the parameters of a model/, "Polynomial modelling"],
    [/gradient|straight line|parallel and perpendicular/, "Coordinate geometry"],
    [/linear modelling/, "Linear modelling"],
    [/composite functions|inverse functions|functions introduction|evaluating functions|piecewise/, "Functions and inverse functions"],
    [/quadratic/, "Quadratics"],
    [/cubic/, "Cubic modelling"],
    [/direct and inverse/, "Direct and inverse variation"],
    [/log log|scaling with logs/, "Semi-log and log-log graphs"],
    [/logistic/, "Logistic modelling"],
    [/exponential|logarithmic|half life/, "Exponential and logarithmic modelling"],
    [/sinusoidal/, "Sinusoidal modelling"],
    [/transform|sketching functions|features of graphs|asymptotes/, "Transformations"],
  ],
  3: [
    [/angle between two lines/, "Vector lines"],
    [/tsp practical problems/, "Graph theory"],
    [/midpoint|distance between 2 points|perpendicular bisector/, "Coordinate geometry"],
    [/trigonometry in 3d/, "3D trigonometry"],
    [/volume and surface area/, "Three-dimensional geometry"],
    [/elevation and depression/, "Angles of elevation and depression"],
    [/pythagoras|soh cah toa|sine rule|cosine rule|area of a triangle/, "Sine rule, cosine rule and area of a triangle"],
    [/bearings/, "Bearings"],
    [/arcs and sectors|radians/, "Arcs and sectors"],
    [/voronoi/, "Voronoi diagrams"],
    [/matrix transformation|translations|enlargements|rotations|reflections|determinant of a transformation/, "Matrix transformations"],
    [/trig|exact triangles|unit circle|cast diagram|graphs of sin/, "Trig equations and identities"],
    [/vector equation of a line/, "Vector lines"],
    [/vector.*kinematics|motion with variable velocity/, "Vector kinematics"],
    [/vector product|areas using vector product/, "Vector product and area"],
    [/vector|scalar product|components/, "Vectors"],
    [/graph|adjacency|walks|routes|kruskal|prim|eulerian|postman|hamiltonian|travelling salesman|nearest neighbour|deleted vertex/, "Graph theory"],
  ],
  4: [
    [/histogram|cumulative frequency/, "Histograms and cumulative frequency curves"],
    [/box|outliers/, "Box and whisker diagrams"],
    [/spearman/, "Linear regression – Spearman"],
    [/non linear regression/, "Non-linear regression"],
    [/square residual|coefficient of determination/, "Sum of square residuals and R²"],
    [/regression|correlation/, "Linear regression – Pearson"],
    [/venn/, "Venn diagrams"],
    [/tree/, "Tree diagrams"],
    [/binomial distribution/, "Binomial distribution"],
    [/normal distribution sampling|central limit/, "Central limit theorem"],
    [/normal distribution/, "Normal distribution"],
    [/discrete random variable/, "Discrete random variables"],
    [/chi squared.*goodness/, "Chi-squared test – Goodness of fit"],
    [/chi squared/, "Chi-squared test – Independence"],
    [/confidence interval/, "Confidence intervals"],
    [/poisson distribution/, "Poisson distribution"],
    [/matched pair/, "Matched-pairs t-test"],
    [/two.sample/, "Two-sample t-test"],
    [/z.test|t.test/, "T-test and Z-test"],
    [/population proportion/, "Binomial test"],
    [/mean using poisson/, "Poisson test"],
    [/testing for correlation/, "Correlation test"],
    [/type i|errors/, "Type I and Type II errors"],
    [/markov|transition matr|steady state/, "Markov chains and transition matrices"],
    [/linear transformation|linear combination/, "Transformations and combinations of random variables"],
    [/unbiased/, "Unbiased estimators"],
    [/probability/, "Probability"],
    [/data|sampling|survey|reliability|average|spread|frequency table|constant changes|variance|standard deviation/, "Descriptive statistics"],
  ],
  5: [
    [/introduction to limits/, "Differentiation rules"],
    [/phase portrait/, "Phase portraits"],
    [/coupled differential|coupled systems/, "Coupled differential equations"],
    [/second order/, "Second order differential equations"],
    [/slope field/, "Slope fields"],
    [/euler.s method/, "Euler's method"],
    [/differential equation|separation of variables/, "Differential equations"],
    [/volume of revolution/, "Volume of revolution"],
    [/integration by substitution/, "Integration by substitution"],
    [/related rates/, "Related rates of change"],
    [/inverse chain rule/, "Integration rules"],
    [/graph.*derivative|sketching derivatives/, "Graphs of derivatives"],
    [/stationary|inflexion|increasing and decreasing/, "Stationary points and points of inflexion"],
    [/tangent|normal/, "Tangents and normals"],
    [/optimization/, "Optimization"],
    [/kinematics/, "Kinematics"],
    [/trapezoidal/, "Trapezoidal rule"],
    [/area under|area between|curve and y.axis/, "Area under the curve"],
    [/integration|integrating|finding f/, "Integration rules"],
    [/product|quotient|chain rule/, "Differentiation - product, quotient and chain rule"],
    [/differentiat|derivative/, "Differentiation - basic rules"],
  ],
};

const placements = new Map();
for (const [course, lessons] of Object.entries(library.courses)) {
  for (const lesson of lessons) {
    if (!placements.has(lesson.id)) placements.set(lesson.id, { lesson, courses: [] });
    placements.get(lesson.id).courses.push(course);
  }
}

for (const lesson of igcseLessons) {
  placements.set(lesson.id, {
    lesson: {
      id: lesson.id,
      topic: lesson.topic,
      code: lesson.code,
      title: lesson.title,
      seconds: lesson.bunnyLengthSeconds,
      curriculum: "IGCSE",
    },
    courses: ["IGCSE Higher"],
  });
}

// Reserve every explicitly curated source for the first distinct lesson that
// claims it. This prevents an earlier automatic match from consuming a
// carefully reviewed source, while also ensuring that a duplicated override
// is replaced for the later lesson rather than displayed twice.
const reservedQuestionOwners = new Map();
const reservedContentOwners = new Map();
for (const lessonId of placements.keys()) {
  for (const questionId of verifiedOverrides[lessonId] || []) {
    if (!reservedQuestionOwners.has(questionId)) reservedQuestionOwners.set(questionId, lessonId);
    const signature = selectedContentSignature(lessonId, questionId);
    if (signature && !reservedContentOwners.has(signature)) reservedContentOwners.set(signature, lessonId);
  }
}
// H_N15TZ0HL_P1_Q5 is an AI HL adaptation of the exact underlying
// N15TZ0HL_P1_Q5 source. Reserve the original alias to the same lesson so the
// generator cannot display that question again under its AA identifier.
reservedQuestionOwners.set("N15TZ0HL_P1_Q5", "99a7ab79-f157-4f85-83f1-52b8368acc0f");
// This source is an integration and volume-of-revolution question. It was
// incorrectly auto-filled into Counting Principles and must not migrate into
// another unrelated lesson when that reviewed slot is reduced to one card.
reservedQuestionOwners.set("M14TZ1SL_P1_Q3", "__withheld_unrelated_integration_source__");

function canonicalCourse(courses) {
  if (courses.includes("IGCSE Higher")) return "IGCSE Higher";
  if (courses.includes("AA SL")) return "AA SL";
  if (courses.includes("AI SL")) return "AI SL";
  if (courses.includes("AA HL")) return "AA HL";
  return "AI HL";
}

function ruleFor(lesson, course) {
  const normalized = normalize(lesson.title);
  if (course === "IGCSE Higher") return igcseSubtopic(normalized);
  if (course === "AA HL" && /binomial theorem extension/.test(normalized)) return "Binomial expansion (n ∈ ℚ)";
  if (course === "AA SL" && /roots of a polynomial/.test(normalized)) return "Quadratics";
  if (course === "AA SL" && /system of linear equations/.test(normalized)) return "System of linear equations";
  if (course === "AA SL" && /introduction to limits|finding a limit/.test(normalized)) return "Differentiation rules";
  if (course === "AI SL") {
    if (/roots of a polynomial/.test(normalized)) return "Quadratics";
    if (/t test/.test(normalized)) return "T-test";
    if (/differentiat|derivative|stationary|increasing and decreasing/.test(normalized)) return "Differentiation rules";
    if (/sketching functions|features of graphs|asymptotes/.test(normalized)) return "Functions and inverse functions";
  }
  if (course === "AI HL" && /relationship between graphs and derivatives|sketching derivatives/.test(normalized)) return "Differentiation - basic rules";
  const rules = course.startsWith("AA") ? aaRules : aiRules;
  for (const [pattern, subtopic] of rules[lesson.topic] || []) {
    if (pattern.test(normalized)) return subtopic;
  }
  return null;
}

function igcseSubtopic(title) {
  const rules = [
    [/algebraic fractions/, "Algebraic fractions"], [/fraction/, "Fractions"], [/recurring decimal/, "Recurring decimals"], [/prime factor|hcf|lcm/, "HCF and LCM"],
    [/surd/, "Surds"], [/laws? of indices/, "Indices"], [/venn diagram/, "Sets and Venn diagrams"], [/^sets?$/, "Sets and Venn diagrams"],
    [/percentage/, "Percentages"], [/direct.*inverse proportion/, "Direct and inverse proportion"], [/ratio/, "Ratio and proportion"], [/significant figures|upper.*lower bound/, "Upper and lower bounds"],
    [/standard form/, "Standard form"], [/expanding 3 brackets/, "Expanding three brackets"], [/factorising common|difference of 2 squares/, "Basic algebra"],
    [/factorising quadratics|quadratics.*factorising/, "Factorising quadratics"], [/completing the square/, "Completing the square"],
    [/vector proofs/, "Vectors"], [/proof/, "Algebraic proof"], [/changing the subject|changing subject/, "Changing the subject"], [/linear equations/, "Linear equations"],
    [/simultaneous equations.*non linear|simultaneous non linear/, "Simultaneous equations - non-linear"], [/simultaneous equations/, "Simultaneous equations - linear"],
    [/quadratic formula|quadratics factorising|completing square solving/, "Quadratic equations"], [/shading inequalities|linear inequalities/, "Linear inequalities"],
    [/quadratic inequalities/, "Quadratic inequalities"], [/arithmetic sequences|arithmetic series/, "Arithmetic sequences"],
    [/functions introduction|domain.*range|composite functions|inverse functions|finding inverses/, "Functions"],
    [/differentiation introduction|differentiation rule|diff intro|diff rule|finding the gradient|stationary points/, "Calculus - differentiation"],
    [/midpoint|gradient of a line|parallel.*perpendicular|equation.*straight line|distance|difficult straight line/, "Coordinate geometry"],
    // A lesson about transforming sine/cosine graphs belongs in the trig-graph
    // bank. Test this before the generic graph-transformation rule so it cannot
    // inherit questions about an unrelated function f(x).
    [/trig graphs|transform.*sin.*cos/, "Trig graphs"], [/transform.*graph/, "Transformations of graphs"],
    [/optimisation/, "Calculus - optimisation"], [/kinematics/, "Calculus - kinematics"],
    [/density|pressure/, "Compound measures"], [/^speed$/, "Speed, distance, time"], [/circle theorem/, "Circle properties"],
    [/pythagoras.*3d|trig.*3d|elevation.*depression/, "3D trigonometry"], [/soh cah toa|pythagoras.*theorem|pythagoras$/, "Right-angled trigonometry"],
    [/sine rule|cosine rule|area of a triangle|area triangle/, "Non-right-angled trigonometry"], [/parallelograms|trapezia/, "Trapezia and parallelograms"],
    [/circles.*arcs.*sectors/, "Circles, arcs and sectors"], [/surface area|volume of prisms|volume prisms|spheres.*cones|convert.*units.*area.*volume|unit conversions area.*volume/, "Volume and surface area"],
    [/similar/, "Similar shapes"], [/vector/, "Vectors"], [/cumulative frequency/, "Cumulative frequency graphs"], [/histogram/, "Histograms"],
    [/discrete data stats|frequency tables|grouped data/, "Statistical measures"], [/probability and.*or/, "Probability"], [/relative frequency/, "Relative frequency"], [/tree diagrams/, "Tree diagrams"],
  ];
  return rules.find(([pattern]) => pattern.test(title))?.[1] || null;
}

function banksOf(question) {
  return question.banks || [question.course].filter(Boolean);
}

function topicsOf(question, course) {
  return question.topicsFor?.[course] || question.topics || [];
}

function difficultyOf(question, course) {
  return question.difficulty?.[course] || question.difficulty?.[question.course] || "Medium";
}

function displayDifficultyOverrides(course, questionIds, explicitOverrides = {}) {
  const overrides = {};
  if (/ HL$/.test(course)) {
    for (const questionId of questionIds) {
      const question = seed.find((candidate) => candidate.id === questionId);
      if (!question || question.difficulty?.[course]) continue;
      // A difficult SL question is a medium step in the corresponding HL
      // pathway. This keeps the same source question while grading the card
      // relative to the course in which the student sees it.
      if (/ SL$/.test(question.course || "") && difficultyOf(question, question.course) === "Difficult") {
        overrides[questionId] = "Medium";
      }
    }
  }
  Object.assign(overrides, explicitOverrides);
  return Object.keys(overrides).length ? overrides : undefined;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/\\[a-z]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const stopWords = new Set(["a", "an", "and", "by", "combined", "example", "examples", "finding", "for", "from", "full", "intro", "introduction", "more", "of", "part", "the", "to", "using", "with"]);

function tokenSet(value) {
  const tokens = normalize(value).split(" ").filter((token) => token.length > 2 && !stopWords.has(token));
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (/^matri/.test(token)) expanded.add("matrix");
    if (/^differen|^deriv/.test(token)) expanded.add("derivative");
    if (/^integr/.test(token)) expanded.add("integral");
    if (/^log|^ln$/.test(token)) expanded.add("logarithm");
    if (/^exponent|^power/.test(token)) expanded.add("exponent");
    if (/^trig|^sin$|^sine$|^cos$|^cosine$|^tan$|^tangent$/.test(token)) expanded.add("trig");
    if (/^geometr/.test(token)) expanded.add("geometric");
    if (/^arithmet/.test(token)) expanded.add("arithmetic");
    if (/^transform/.test(token)) expanded.add("transform");
    if (/^polynom/.test(token)) expanded.add("polynomial");
    if (/^permut|^combin|^arrang|^factorial/.test(token)) expanded.add("counting");
    if (/^probab/.test(token)) expanded.add("probability");
    if (/^regress|^correlat/.test(token)) expanded.add("regression");
    if (/^standard$|^scientific$/.test(token)) expanded.add("standardform");
    if (/^simultaneous$|^system$/.test(token)) expanded.add("simultaneous");
    if (/^midpoint$/.test(token)) expanded.add("midpoint");
    if (/^distance$/.test(token)) expanded.add("distance");
    if (/^rationalis/.test(token)) expanded.add("rationalise");
    if (/^optimis|^optimiz/.test(token)) expanded.add("optimization");
  }
  return expanded;
}

function questionText(question) {
  // Rob has approved using a relevant subpart of a larger exam question. Search
  // the authored title and the actual prompts, while still using the title for
  // exclusion checks that guard boundaries such as fractions/algebraic fractions.
  return [
    question.title,
    question.body,
    ...(question.parts || []).map((part) => Array.isArray(part) ? part[1] : part.prompt),
  ].filter(Boolean).join(" ");
}

function passesCourseBoundary(question, course) {
  // Sum/product-of-roots work is not part of either AI pathway. Keep those
  // records available to AA, but never select them for an AI lesson even when
  // broad bank metadata happens to include AI.
  if (/^AI (?:SL|HL)$/.test(course)
    && /sum (?:and|&) product of roots|sum of (?:the )?roots.*product of (?:the )?roots|product of (?:the )?roots.*sum of (?:the )?roots/.test(normalize(questionText(question)))) {
    return false;
  }
  // Composite functions are an AI HL-only skill. Shared foundation lessons
  // are selected against the AI SL boundary, so any source containing a
  // composition is withheld there even if another part looks usable.
  if (course === "AI SL"
    && /[fgh]\s*\\circ|\\circ\s*[fgh]|composite function|composition|\bf\s*\(\s*g\s*\(|\bg\s*\(\s*f\s*\(/i.test(questionText(question))) {
    return false;
  }
  // Reciprocal trig functions and compound-angle identities are not part of
  // either AI pathway. Do not let broad trigonometry metadata pull them into
  // an AI practice set. This also protects automatic fallback selections.
  if (/^AI (?:SL|HL)$/.test(course)
    && /\\(?:sec|csc|cot)\b|\b(?:cosec|cosecant|cotangent)\b|\bsec(?:ant)?\s*(?:x|theta|\(|\^)|compound angle|addition identity|subtraction identity/i.test(questionText(question))) {
    return false;
  }
  return true;
}

function paperNumberOf(question, course) {
  return question.paperNumberFor?.[course] || question.paperNumber || "";
}

function calculatorLabel(question, course) {
  const paper = paperNumberOf(question, course);
  if (course === "IGCSE Higher") return "";
  if (course === "AI HL") return "Calculator";
  if (!course.startsWith("AA")) return paper;
  if (paper === "Paper 1") return "Paper 1 · Non-calculator";
  if (paper === "Paper 2") return "Paper 2 · Calculator";
  return paper;
}

function selectedQuestionMeta(lessonId, questionId) {
  const question = seed.find((candidate) => candidate.id === questionId);
  const labels = practicePartOverrides[lessonId]?.[questionId];
  if (!question || !labels?.length) return { title: question?.title || "", marks: question?.marks || "" };
  const wanted = new Set(labels.map(String));
  const parts = (question.parts || []).filter((part) => wanted.has(String(part[0])));
  return {
    title: practicePartTitles[lessonId]?.[questionId] || question.title,
    marks: parts.reduce((total, part) => total + (Number(part[2]) || 0), 0),
  };
}

const lessonSpecificRules = [
  // Fine-grained distinctions that share a broad syllabus subtopic. The first
  // matching rule wins. These checks apply to curated overrides as well as to
  // generated candidates so a manual ID cannot bypass lesson relevance.
  { lesson: /binomial theorem extension/, any: [/cube root|fractional power|negative fractional|non.?integer|range of validity/], none: [/single term|constant term|positive integer/] },
  { lesson: /^partial fractions$/, any: [/express.*partial fractions|split.*partial fractions|partial fractions.*form|express.*in the form/] },
  { lesson: /operations with complex numbers/, any: [/complex numbers.*find|real.*imaginary|solve.*z/], none: [/modulus.argument|argand|de moivre|triangle|roots?/] },
  { lesson: /complex operations and geometric interpretation/, any: [/rotation|geometric transformation|argand diagram/] },
  { lesson: /properties of complex conjugates/, any: [/conjugate|complex number.*show that|solve.*3.*z/] },
  { lesson: /roots of complex numbers/, any: [/cube roots? of|fourth roots? of|fifth roots? of|sixth roots? of|find.*roots.*complex/], none: [/roots? of unity|polynomial|quadratic/] },
  { lesson: /roots of unity/, any: [/roots? of unity|omega|z.*1/] },
  { lesson: /binomial expansion.*intro.*full expansion/, any: [/expand/], none: [/coefficient|term independent|term in|finding.*term|find.*term/] },
  { lesson: /factorials and arrangements/, any: [/arrang|factorial/], none: [/induction/] },
  { lesson: /scientific notation|standard form/, any: [/standard form/, /scientific notation/] },
  { lesson: /sigma notation/, any: [/sigma|summation|sum.*notation|write.*sum/] },
  { lesson: /inflation/, any: [/inflation|consumer price|price index|purchasing power/] },
  { lesson: /laws of exponents/, any: [/law.*exponent|law.*indices|indices|powers? of|exponential equation/], none: [/model|growth|decay|population|bacteria|vitamin|compound interest/] },
  { lesson: /simple deductive proofs/, any: [/proof|prove|deduc/] },
  { lesson: /simultaneous equations.*non ?linear/, all: [/simultaneous equation/, /non ?linear|quadratic|circle|curve/] },
  { lesson: /system of linear equations|simultaneous equations/, any: [/simultaneous equation/, /system of (?:two |three |linear )?equations?/, /system.*matrix|matrix form|three planes|point of intersection.*planes?|boxes of mixed fruit/] },
  { lesson: /roots of a polynomial/, any: [/polynomial.*root|roots?.*polynomial|sum and product.*roots|factor theorem/] },
  { lesson: /dividing polynomials/, any: [/polynomial division|divide.*polynomial|factor.*cubic|product of.*linear factors?|factor theorem/] },
  { lesson: /inverse functions introduction/, any: [/inverse function|finding.*inverse|inverse of/] },
  { lesson: /functions introduction/, any: [/function notation|mapping diagram|domain.*range|evaluat.*function|evaluat.*\bf\b|function.*table|reading a function|\bf\s+\d/], none: [/composite|composition|chain rule|product rule|quotient rule|differentiat|derivative|integral/] },
  { lesson: /evaluating functions/, any: [/evaluat|calculate.*\bf\s*\(|calculate.*\bg\s*\(|value of.*function|function value|\bf\s+\d/], none: [/composite|composition|chain rule|product rule|quotient rule|differentiat|derivative|integral/] },
  { lesson: /^sketching functions$/, all: [/function|curve|f x|g x|h x/], any: [/sketch|graph|vertex.*complete.*square|complete.*square.*vertex/], none: [/transform|translat|reflect|stretch|image of|mapping|derivative|gradient/] },
  { lesson: /^composite transformations$/, any: [/sequence of transformations|using two transformations|followed by.*translat|followed by.*reflect|followed by.*stretch|one after the other/] },
  { lesson: /features of graphs/, any: [/intercept|asymptote|maximum|minimum|turning point|domain|range|feature.*graph/] },
  { lesson: /quadratics 3 forms/, all: [/quadratic|parabola/, /factoris|factoriz/, /complete.*square|vertex/, /graph|intercept|vertex/] },
  { lesson: /quadratic modelling/, all: [/quadratic|parabola|x 2|t 2/, /model|height|trajectory|projectile|rocket|ball/], none: [/complete.*square|vertex form/] },
  { lesson: /cubic modelling/, all: [/cubic|x 3|t 3/, /model|volume|savings|reservoir|context/] },
  { lesson: /finding the parameters of a model/, all: [/model|function|polynomial|quadratic|cubic/, /equation|point|coefficient|parameter|value of/] },
  { lesson: /^composite functions$/, any: [/composite|f circ g|g circ f/] },
  { lesson: /logistic modelling/, any: [/logistic|carrying capacity/] },
  { lesson: /piecewise functions/, any: [/piecewise|cases|piece wise/] },
  { lesson: /scaling with logs/, any: [/semi log|log 10.*y axis|logarithmic scale.*y axis|p on the x axis.*log 10 q/] },
  { lesson: /logarithmic functions/, any: [/logarith|log model|logarithmic model/] },
  { lesson: /solving equations using substitution/, all: [/equation|solve/, /substitut|quadratic.*disguise|hidden quadratic|quadratic in a power|let.*equal|change.*variable/], none: [/integrat|derivative/] },
  { lesson: /solving equations with gdc/, any: [/graphical.*sol|solve.*graph|intersection|using.*graph/] },
  { lesson: /finding inverse functions/, any: [/inverse of|find.*inverse|inverse function/], none: [/derivative of an inverse/] },
  { lesson: /solving quadratic equations/, any: [/solve.*quadratic|quadratic equation|roots?.*quadratic|factoris.*quadratic|factoriz.*quadratic|solve.*equation|solve.*f x/] },
  { lesson: /vectors and kinematics|vector.*kinematics/, all: [/vector/, /velocity|speed|position|particle|motion|displacement/] },
  { lesson: /distance between (2|two) points|^distance$/, any: [/distance.*point|point.*distance|find the distance|calculate the distance|distance from|distance between|find the length of [a-z]{2}|length of [a-z]{2}|mid point and distance|coordinates.*distance/], none: [/tangent|line curve intersection/] },
  { lesson: /midpoint/, any: [/midpoint|mid point/] },
  { lesson: /^gradient$/, any: [/gradient/] },
  { lesson: /parallel.*perpendicular/, any: [/parallel|perpendicular/] },
  { lesson: /equation.*straight line/, any: [/equation.*line|line.*equation|line through|gradient.*intercept/] },
  { lesson: /trig.*3d|pythagoras 3d/, all: [/prism|cuboid|pyramid|cube|three dimensional|3d/, /trig|angle|pythagoras|length|distance|edge|diagonal/] },
  { lesson: /pythagoras.*theorem/, any: [/pythagoras|right.?angled triangle|diagonal/], none: [/cosine rule|sine rule/] },
  { lesson: /elevation.*depression/, any: [/elevation|depression/] },
  { lesson: /soh cah toa/, any: [/right.?angled triangle|right triangle|sin.*cos|cos.*sin|find.*angle.*triangle/], none: [/venn|probability|set diagram|double angle/] },
  { lesson: /^sine rule$/, any: [/sine rule/], none: [/ambiguous|two possible triangles|two possible values/] },
  { lesson: /^cosine rule$/, any: [/cosine rule/], none: [/right.?angled triangle|right triangle/] },
  { lesson: /exact triangles/, any: [/30.*45|45.*30|60|120|exact.*triangle|triangle.*exact/], none: [/sinusoidal model|regression|statistics/] },
  { lesson: /constant changes to data/, all: [/mean|variance|standard deviation|data/, /scal|multiply|add.*constant|transform|effect/] },
  { lesson: /outliers/, any: [/outlier|interquartile range|iqr|box plot/] },
  { lesson: /averages and spread/, any: [/mean|median|mode|range|variance|standard deviation|quartile/] },
  { lesson: /normal distribution.*finding mean and std dev/, all: [/normal/, /mean|mu/, /standard deviation|variance|sigma/] },
  { lesson: /variance and standard deviation of a discrete random variable/, all: [/random variable|probability distribution/, /variance|\bvar\b/] },
  { lesson: /^variance and standard deviation$/, all: [/mean/, /variance|standard deviation/] },
  { lesson: /continuous random variables intro/, all: [/continuous random variable|probability density function/, /constant|normalis|determine.*c|determine.*k/] },
  { lesson: /mean of a continuous random variable/, all: [/continuous random variable|probability density function/, /expected value|mean/] },
  { lesson: /median and mode of a discrete random variable/, any: [/median|mode/] },
  { lesson: /variance of a continuous random variable/, all: [/continuous random variable|probability density function/, /variance|\bvar\b/] },
  { lesson: /linear transformations of x/, all: [/random variable|probability distribution/, /variance|expected value|text e|text var/] },
  { lesson: /relationship between graphs and derivatives|sketching derivatives/, all: [/graph|sketch/, /derivative|gradient|f prime/] },
  { lesson: /discrete v continuous data/, any: [/discrete.*continuous|continuous.*discrete|classif.*data/] },
  { lesson: /introduction to differentiation|differentiation introduction/, any: [/differentiat.*first principles|derivative.*first principles|differentiat.*polynomial|derivative.*polynomial|gradient function/] },
  { lesson: /derivative at a point/, all: [/derivative|gradient/, /point|at x|evaluat/] },
  { lesson: /differentiation.*power rule|differentiation rule|diff rule/, any: [/differentiat.*polynomial|derivative.*polynomial|differentiat.*power|derivative.*power|differentiat.*cubic|derivative.*cubic|differentiat.*quartic|derivative.*quartic/], none: [/chain rule|product rule|quotient rule|implicit/] },
  { lesson: /integration.*power rule.*rational/, all: [/integrat/, /fractional|rational|root|sqrt|power/] , none: [/exponential|trigonometric|reverse chain|substitution/] },
  { lesson: /integration.*power rule/, any: [/integrat.*polynomial|integrat.*power|integrat.*linear|integrat.*quadratic|integrat.*cubic|antiderivative.*polynomial/], none: [/exponential|trigonometric|reverse chain|substitution|parts/] },
  { lesson: /^chain rule$/, any: [/chain rule|composite function/], none: [/quotient rule|product rule/] },
  { lesson: /^product rule$/, any: [/product rule/] },
  { lesson: /^quotient rule$/, any: [/quotient rule/] },
  { lesson: /inverse chain rule/, any: [/reverse chain|inverse chain|substitution|integrat.*e\^|integrat.*exponential/] },
  { lesson: /integrating e.*1 x/, any: [/integrat.*exponential|integrat.*logarith|integrat.*1 x|integrat.*e x/], none: [/reverse chain|substitution|x e/] },
  { lesson: /integrating sin.*cos/, any: [/integrat.*sin|integrat.*cos|integrat.*trig/] },
  { lesson: /derivative of sinx.*cosx.*lnx.*e x/, all: [/derivative|differentiat/, /\bsin\b|\bcos\b|\bln\b|exponential/] },
  { lesson: /areas using vector product/, all: [/area/, /vector product|cross product/] },
  { lesson: /^vector product$/, any: [/vector product|cross product/], none: [/scalar product(?!.*vector product)/] },
  { lesson: /magnitude and unit vectors|^magnitude$/, any: [/magnitude|unit vector|length of.*vector/] },
  { lesson: /determinant of a transformation/, all: [/determinant/, /transform|matrix/] },
  { lesson: /nearest neighbour/, any: [/nearest neighbour|nearest neighbor/] },
  { lesson: /kruskal/, any: [/kruskal/] },
  { lesson: /prim s algorithm/, any: [/prim/] },
  { lesson: /eulerian graphs/, any: [/eulerian/] },
  { lesson: /chinese postman/, any: [/route inspection|chinese postman/] },
  { lesson: /travelling salesman/, any: [/travelling salesman|traveling salesman/] },
  { lesson: /hamiltonian graphs/, any: [/hamiltonian/] },
  { lesson: /deleted vertex/, any: [/deleted vertex/] },
  { lesson: /weighted adjacency/, any: [/weighted adjacency|adjacency table|adjacency matrix/] },
  { lesson: /introduction to graph theory/, any: [/graph theory|vertices.*edges|degree.*vertex|adjacency/] },
  { lesson: /upper and lower bounds/, any: [/upper bound|lower bound|bounds|error interval/] },
  { lesson: /significant figures/, any: [/significant figure|rounding/] },
  { lesson: /^rounding$/, any: [/round|decimal place|significant figure/] },
  { lesson: /^loans$/, any: [/loan|repayment|borrow|debt|amort/] },
  { lesson: /^annuities$/, any: [/annuit|regular payment|recurring payment|pension/] },
  { lesson: /half life/, any: [/half life|radioactive|decay|remaining/] },
  { lesson: /reverse percentages/, any: [/reverse percentage|original value|before.*percentage|percentage.*original/] },
  { lesson: /percentage change/, any: [/percentage change|percentage increase|percentage decrease/] },
  { lesson: /percentages increase.*decrease/, any: [/percentage increase|percentage decrease|multiplier|increase.*percent|decrease.*percent/] },
  { lesson: /surds.*rationalis/, any: [/rationalis|rationaliz/] },
  { lesson: /surds.*expanding/, all: [/surd/, /expand|product|bracket/] },
  { lesson: /surds.*simplifying/, any: [/simplif.*surd|surd simplif|product involving surds|surd identity/], none: [/rationalis|rationaliz/] },
  { lesson: /^fractions$/, any: [/fraction|mixed number/], none: [/ratio|algebraic/] },
  { lesson: /recurring decimals/, any: [/recurring decimal/], none: [/surd|rationalis/] },
  { lesson: /difference of 2 squares/, any: [/difference of (two|2) squares/, /difference of squares/] },
  { lesson: /factorising common factors/, any: [/common factor|factoris.*expression|factoriz.*expression/] },
  { lesson: /factorising quadratics/, all: [/quadratic/, /factoris|factoriz|factor form|product of two linear factors/] },
  { lesson: /algebraic fractions/, any: [/algebraic fraction/] },
  { lesson: /completing the square/, any: [/complet.*square|vertex form/] },
  { lesson: /quadratic formula/, any: [/quadratic formula/] },
  { lesson: /quadratics.*factorising|solving quadratics by factorising/, any: [/factoris.*quadratic|factoriz.*quadratic/] },
  { lesson: /shading inequalities/, any: [/shad|region.*inequal|inequal.*region/] },
  { lesson: /quadratic inequalities/, all: [/quadratic/, /inequal/] },
  { lesson: /domain.*range/, any: [/domain|range/] },
  { lesson: /composite functions/, any: [/composite/] },
  { lesson: /finding inverses|inverse functions/, any: [/inverse function|finding.*inverse|inverse of/] },
  { lesson: /gradient of a line/, any: [/gradient/] },
  { lesson: /difficult straight line questions/, any: [/kite|isosceles|perpendicular bisector|line.*curve|square|trapezium|coordinate constraints/] },
  { lesson: /^trig graphs$/, any: [/sine graph|cosine graph|trigonometric graph|sine curves/] },
  { lesson: /transforming sin.*cos graphs/, all: [/transform|translation|shift/, /sine|cosine|trigonometric/] },
  { lesson: /arithmetic series/, any: [/arithmetic series|sum of.*arithmetic|sum.*term|partial sum/] },
  { lesson: /^arithmetic sequences$/, any: [/arithmetic sequence|nth term|term of.*sequence/], none: [/sum|series/] },
  { lesson: /stationary points/, any: [/stationary|turning point|minimum|maximum/] },
  { lesson: /optimisation|optimization/, any: [/optimis|optimiz|maximum|minimum/] },
  { lesson: /^kinematics$|kinematics 2/, any: [/velocity|acceleration|displacement|particle|motion/] },
  { lesson: /^density$/, any: [/density/] },
  { lesson: /^pressure$/, any: [/pressure/] },
  { lesson: /^speed$/, any: [/speed|distance.*time|time.*distance/] },
  { lesson: /circle theorems?/, any: [/circle theorem|angle.*circle|circle angle|cyclic|tangent.*angle|angle.*tangent/], none: [/area|perimeter|secant|segment/] },
  { lesson: /pythagoras.*3d/, all: [/cube|cuboid|prism|pyramid/, /distance|edge|length|pythagoras|missing/], none: [/angle/] },
  { lesson: /trig.*3d/, all: [/cube|cuboid|prism|pyramid/, /angle|trig/] },
  { lesson: /sinusoidal graphs/, all: [/graph|curve/, /sin|cos|sinusoidal|period|amplitude/] },
  { lesson: /sinusoidal modelling/, any: [/sinusoidal model|sine model|cosine model|model.*sin|model.*cos|temperature|tide|seasonal/] },
  { lesson: /^sine rule$/, any: [/sine rule/] },
  { lesson: /^cosine rule$/, any: [/cosine rule/] },
  { lesson: /area( of)?( a)? triangle/, any: [/area.*triangle|triangle.*area/] },
  { lesson: /surface area/, any: [/surface area/] },
  { lesson: /volume of prisms.*cylinders/, all: [/volume/, /prism|cylinder/] },
  { lesson: /spheres.*cones/, any: [/sphere|cone/] },
  { lesson: /circles.*arcs.*sectors/, any: [/arc|sector/] },
  { lesson: /similar.*length/, any: [/similar.*length|length.*similar|scale factor/] },
  { lesson: /similar.*area.*volume/, any: [/similar.*area|similar.*volume|area.*scale factor|volume.*scale factor/] },
  { lesson: /vectors introduction/, any: [/column vector|vector addition|vector subtraction|coordinates.*vector|vector.*coordinates/], none: [/line|plane|intersection|kinematic|velocity|motion/] },
  { lesson: /^operations with vectors$/, any: [/vector|position vector|in terms of/], none: [/\bangle\b|scalar product|dot product|perpendicular|unit vector|magnitude/] },
  { lesson: /magnitude and unit vectors/, any: [/magnitude|unit vector/] },
  { lesson: /scalar product and angle between vectors/, all: [/angle/, /scalar product|dot product|vector/] },
  { lesson: /properties of the scalar product/, all: [/vector/, /show|deduce|comment/], none: [/volume|integral|differentiat/] },
  { lesson: /vector equation of a line/, all: [/vector equation/, /line/] },
  { lesson: /angle between two lines/, all: [/angle/, /line/] },
  { lesson: /vectors and kinematics/, any: [/speed|velocity|position.*second|distance.*second|particle|airplane/] },
  { lesson: /vector proofs/, any: [/vector proof|prove.*vector|collinear|parallel/] },
  { lesson: /proof by induction.*de moivre/, all: [/de moivre/, /induction/] },
  // The N18 factorial-series title contains a printed sigma symbol, which is
  // removed by text normalization and leaves the distinctive "r(r!)" terms.
  { lesson: /proof by induction.*(?:intro and )?series/, all: [/induction/, /sum|series|sigma|induction for r r/], none: [/inequal|divisib|multiple of|derivative|differentiat|de moivre/] },
  { lesson: /proof by induction.*differentiation/, all: [/induction/, /derivative|differentiat/], none: [/inequal|divisib|multiple of|series|summation|sigma/] },
  { lesson: /proof by induction.*divisibility/, all: [/induction/, /divisib|multiple of/], none: [/inequal|derivative|differentiat|series|summation|sigma/] },
  // The N14 factorial-inequality title uses a printed >= symbol, which text
  // normalization removes; retain its distinctive "Induction: (2n)!" form.
  { lesson: /proof by induction.*inequal/, all: [/induction/, /inequal|induction 2n/], none: [/divisib|multiple of|derivative|differentiat|series|summation|sigma/] },
  { lesson: /proof by contradiction.*root 2/, any: [/contradiction/] },
  { lesson: /proof by contradiction.*infinite primes/, any: [/contradiction/] },
  { lesson: /counting principles introduction/, any: [/counting principle|product principle|addition principle|fundamental counting/] },
  { lesson: /factorials and arrangements/, any: [/factorial|arrangement/], none: [/selection|combination/] },
  { lesson: /algebra of factorials/, any: [/factorial/] },
  { lesson: /dividing polynomials/, any: [/polynomial division|divid.*polynomial/] },
  { lesson: /graphs of polynomials/, all: [/sketch|draw/, /polynomial|cubic|quartic|x 3|x 4/], none: [/translat|reflect|stretch|transformation/] },
  { lesson: /linear transformations of x/, any: [/linear transformation|transform.*random variable|mean.*variance.*transform/] },
  { lesson: /continuous functions/, any: [/continuous|continuity/] },
  { lesson: /homogenous differential equations|homogeneous differential equations/, any: [/homogeneous|homogenous/] },
  { lesson: /separation of variables/, any: [/separation of variables|separable differential/] },
  { lesson: /euler s identity/, any: [/euler.*identity|euler.*formula/] },
  { lesson: /euler form/, any: [/euler form|exponential form/] },
  { lesson: /reciprocal trig identities/, any: [/reciprocal|secant|cosecant|cosec|cotangent|\bsec\b|\bcot\b/] },
  { lesson: /graphs of sin.*cos.*tan/, all: [/graph/, /sin|cos|tan|trig/] },
  { lesson: /change of base/, any: [/change of base/] },
  { lesson: /introduction to matrices/, any: [/matrix.*dimension|matrix.*order|introduction.*matri/] },
  { lesson: /algebra of matrices/, any: [/matrix addition|matrix subtraction|scalar.*matrix|algebra.*matri/] },
  { lesson: /multiplication of matrices/, any: [/matrix multiplication|multiply.*matri|product.*matri/] },
  { lesson: /determinant and inverse of a matrix/, all: [/determinant/, /inverse.*matrix|matrix.*inverse/] },
  { lesson: /identity matrix/, any: [/identity matrix/] },
  { lesson: /powers of matrices/, any: [/power.*matri|matri.*power/] },
  { lesson: /^translations$/, any: [/translation/] },
  { lesson: /^enlargements$/, any: [/enlargement/] },
  { lesson: /^rotations$/, any: [/rotation/] },
  { lesson: /^reflections$/, any: [/reflection/] },
  { lesson: /motion with variable velocity/, any: [/variable velocity|velocity.*function|acceleration.*velocity/] },
  { lesson: /components of vectors/, any: [/component.*vector|vector.*component/] },
  { lesson: /surveys and questionnaires/, any: [/survey|questionnaire/] },
  { lesson: /reliability v validity/, any: [/reliability|validity/] },
  { lesson: /coefficient of determination/, any: [/coefficient of determination|r squared/] },
  { lesson: /normal distribution sampling/, any: [/sample mean|sampling distribution|central limit/] },
  { lesson: /poisson distribution$/, any: [/poisson/], none: [/type i|type ii|hypothesis test|poisson test/] },
  { lesson: /testing for correlation/, all: [/correlation/, /test|significance|hypothesis|critical value|p value/] },
  { lesson: /normal errors|binomial errors/, any: [/type i|type ii|error/] },
  { lesson: /z test one tailed/, all: [/z test/, /one tailed|one tail/] },
  { lesson: /z test two tailed/, all: [/z test/, /two tailed|two tail/] },
  { lesson: /^t test$/, any: [/t test/] },
  { lesson: /more exponents/, any: [/exponent|power.*equation|laws? of.*indices/] },
  { lesson: /compound angle identities/, all: [/sin|cos|tan/, /15|45|60|compound|sum|difference|show/] },
  { lesson: /solving trig equations with identities/, all: [/show|equivalent|rearrang|identity|double angle/, /solve|equation/, /sin|cos|tan/], none: [/differentiat|integrat|volume/] },
  { lesson: /^trig identities$/, all: [/sin|cos|tan/, /show|prove|simplif|identity|identities/], none: [/solve|equation|differentiat|integrat|volume/] },
  { lesson: /cumulative frequency/, any: [/cumulative frequency/] },
  { lesson: /histograms/, any: [/histogram|frequency density/] },
  { lesson: /discrete data stats/, any: [/mean|median|mode|range|quartile|standard deviation/] },
  { lesson: /frequency tables/, any: [/frequency table|frequency.*mean|mean.*frequency|unknown frequency|missing frequency/] },
  { lesson: /grouped data/, any: [/grouped data|estimate.*mean|estimate.*median/] },
  { lesson: /relative frequency/, any: [/relative frequency|probability from a table|expected frequency|estimat.*frequency|frequency.*probabilit|probabilit.*frequency/] },
  { lesson: /tree diagrams/, any: [/tree diagram|probability tree/] },
  { lesson: /probability and.*or rules/, any: [/union|intersection|addition rule|and or|complement|at least one|same.colour|independent probability|odd total|exactly two/] },
  { lesson: /changing the subject/, any: [/change.*subject|rearrang.*formula/] },
  { lesson: /direct and inverse proportion/, any: [/direct proportion|inverse proportion|direct variation|inverse variation/] },
  { lesson: /arithmetic series/, any: [/arithmetic series|sum.*arithmetic/] },
  { lesson: /soh cah toa/, any: [/right angled.*trig|right triangle|sine.*cosine.*tangent|soh|cah|toa/] },
  { lesson: /pythagoras theorem/, any: [/pythagoras/] },
  { lesson: /mr flynn s exact triangles/, all: [/sin|cos|tan|trig/, /exact value|exact triangle|special angle/], none: [/bacteria|growth model|exponential model|sine rule|cuboid|volume|standard form|rounding|derivative|differentiat|integral/] },
  { lesson: /^unit circle$/, all: [/sin|cos|trig/, /unit circle|coordinates.*circle|radian/] },
  { lesson: /cast diagram/, all: [/sin|cos|tan|trig/, /cast|quadrant|positive|negative/] },
  { lesson: /parallelograms.*trapezia/, any: [/parallelogram|trapez/] },
  { lesson: /converting units of area and volume/, any: [/convert.*unit|unit conversion|cubic.unit/] },
  { lesson: /higher derivatives/, any: [/higher derivative|successive derivative|repeated derivative|nth derivative|19th derivative/] },
  { lesson: /tangents and normals/, any: [/tangent|normal/] },
  { lesson: /finding f x/, any: [/find.*constant|given.*derivative|integrat.*constant|recover.*function|find.*f/] },
  { lesson: /integrating using partial fractions/, all: [/partial fraction/, /integrat|definite integral|area/] },
  { lesson: /volume of revolution.*intro.*x.axis/, all: [/volume of revolution/, /x axis/] },
  { lesson: /volume of revolution.*y.axis/, all: [/volume of revolution/, /y axis/] },
  { lesson: /volume of revolution.*between 2 curves/, all: [/volume of revolution/, /between.*curve|two curves/] },
  { lesson: /maclaurin.*substitutions.*products/, all: [/maclaurin/, /substitut|compos|product/] },
  { lesson: /maclaurin.*binomial/, all: [/maclaurin/, /binomial|negative power|negative index/] },
  { lesson: /maclaurin.*differentiation.*integration/, all: [/maclaurin/, /differentiat|integrat|term by term/] },
  { lesson: /maclaurin.*sigma notation/, all: [/maclaurin/, /sigma|summation|general term/] },
  { lesson: /maclaurin.*differential equations/, all: [/maclaurin/, /differential equation|from f/] },
];

function lessonSpecificRule(lesson) {
  const lessonTitle = normalize(lesson.title);
  return lessonSpecificRules.find((candidate) => candidate.lesson.test(lessonTitle));
}

function allowsCrossCourseQuestion(question, lesson, course) {
  if (course === "IGCSE Higher" || question.sourceBank !== "ib") return false;
  // This authored cubic-model question is fully within the shared AI SL/HL
  // modelling syllabus even though its bank metadata was originally AI HL.
  if (course === "AI SL"
    && /^cubic modelling$/.test(normalize(lesson.title))
    && question.id === "W_M22TZ2AIHL_P1_Q5") return true;
  // This Paper 1 AI HL source is a direct closest-point calculation in the
  // shared vector syllabus and is used here specifically to avoid a second
  // origin-based, calculator-only example.
  if (course === "AA HL"
    && /^distance between a point and a line$/.test(normalize(lesson.title))
    && question.id === "W_N23TZ0AIHL_P1_Q14") return true;
  // These are universal mathematical/financial skills. Some suitable records
  // are catalogued under only one IB pathway even though the question itself
  // is valid practice for another pathway.
  return /scientific notation|standard form|sigma notation|inflation|laws of exponents|more exponents|roots of a polynomial|factorising quadratics|pythagoras|soh cah toa|rounding|loans|annuities|equation.*straight line|functions introduction|evaluating functions|sketching functions|change of base|complex numbers introduction|operations with complex numbers|complex solutions|euler form|geometric interpretation|magnitude and unit vectors|exact triangles|unit circle|cast diagram|trig identities|solving trig equations|averages and spread|outliers|median and mode of a discrete random variable|introduction to differentiation|increasing and decreasing|differentiation.*power rule|derivative at a point|tangents and normals|definite integration|chain rule|product rule|related rates|sketching derivatives|classifying stationary points|points of inflexion|integration.*power rule|integrating sin.*cos|integrating e.*1 x|inverse chain rule|area under the curve|area between curve and y axis|finding f x/.test(normalize(lesson.title));
}

function passesLessonSpecificCheck(question, lesson) {
  const lessonTitle = normalize(lesson.title);
  const questionTitle = normalize(question.title);
  const rawQuestionText = questionText(question);
  const fullQuestionText = normalize(questionText(question));
  // AI Topic 2 replacements were checked at the exact displayed-part level.
  // Their original source titles can describe a broader question, so these
  // selected records are pinned to the narrower lesson they actually serve.
  if (/^asymptotes$/.test(lessonTitle)
    && ["M18TZ2AISL_P1_Q11", "M12TZ2AISL_P1_Q12"].includes(question.id)) return true;
  if (/^cubic modelling$/.test(lessonTitle)
    && ["V_M22TZ2AISL_P1_Q9", "W_M22TZ2AIHL_P1_Q5"].includes(question.id)) return true;
  if (/^creating a sinusoidal model$/.test(lessonTitle)
    && ["M13TZ1AISL_P1_Q13", "N11TZ0AISL_P2_Q5"].includes(question.id)) return true;
  if (/^composite functions$/.test(lessonTitle)
    && ["N10TZ0SL_P1_Q9", "W_M25TZ1AIHL_P1_Q6"].includes(question.id)) return true;
  if (/^piecewise functions$/.test(lessonTitle)
    && ["W_N24TZ0AIHL_P1_Q6", "W_N23TZ0AIHL_P1_Q2"].includes(question.id)) return true;
  if (/confidence intervals unknown variance/.test(lessonTitle)
    && question.id === "W_M23TZ2AIHL_P1_Q15") return true;
  if (/^scaling with logs$/.test(lessonTitle)
    && ["W_N22TZ0AIHL_P1_Q13", "W_M22TZ2AIHL_P2_Q4"].includes(question.id)) return true;
  // Final AI Topic 1 review: these exact rendered extracts were selected for
  // the named lesson after checking their displayed parts. Several come from
  // longer source questions whose broad source title spans neighbouring skills.
  if (/^sigma notation$/.test(lessonTitle)
    && question.id === "W_M22TZ2AIHL_P2_Q1") return true;
  if (/^inflation$/.test(lessonTitle)
    && ["W_SPECAIHL_P2_Q3", "V_M22TZ2AISL_P1_Q13"].includes(question.id)) return true;
  if (/^laws of exponents$/.test(lessonTitle)
    && question.id === "N16TZ0HL_P1_Q7") return true;
  if (/^operations with complex numbers$/.test(lessonTitle)
    && question.id === "W_M21TZ1AIHL_P1_Q9") return true;
  if (/^euler form$/.test(lessonTitle)
    && question.id === "W_M21TZ2AIHL_P1_Q12") return true;
  if (/^operations and geometric interpretation$/.test(lessonTitle)
    && question.id === "W_SPECAIHL_P1_Q15") return true;
  if (/^powers of matrices$/.test(lessonTitle)
    && question.id === "W_N24TZ0AIHL_P1_Q11") return true;
  // AA Topic 2 is reviewed at displayed-part level. These four sources have
  // later composite/inverse parts, but only their direct evaluation part (a)
  // is shown in 2.2.1 and 2.2.2.
  if (/^functions introduction$/.test(lessonTitle)
    && ["N18TZ0SL_P1_Q2", "M16TZ1SL_P1_Q1"].includes(question.id)) return true;
  if (/^evaluating functions$/.test(lessonTitle)
    && ["N16TZ0SL_P2_Q1", "M18TZ1SL_P1_Q1"].includes(question.id)) return true;
  if (/^finding inverse functions$/.test(lessonTitle)
    && question.id === "N15TZ0SL_P1_Q5") return true;
  if (/^factorising quadratics$/.test(lessonTitle)
    && question.id === "N08TZ0SL_P2_Q1") return true;
  if (/^sketching functions$/.test(lessonTitle)
    && question.id === "M08TZ2SL_P2_Q3") return true;
  if (/^rational functions$/.test(lessonTitle)
    && question.id === "A_M24TZ1SL_P1_Q8") return true;
  if (/^solving equations with gdc$/.test(lessonTitle)
    && ["M16TZ1SL_P2_Q2", "M15TZ2SL_P2_Q8X1"].includes(question.id)) return true;
  if (/^composite transformations$/.test(lessonTitle)
    && ["N09TZ0SL_P1_Q4", "M14TZ2HL_P1_Q8S"].includes(question.id)) return true;
  // AA HL Topic 2 final review uses these exact displayed parts. Each source
  // is deliberately cropped before neighbouring calculus, inverse-function
  // or inequality work, so relevance must be judged from the rendered extract
  // rather than the broader source title.
  if (/rational functions.*quadratic in denominator/.test(lessonTitle)
    && ["A_M22TZ2HL_P1_Q11", "N10TZ0HL_P2_Q8", "N19TZ0HL_P1_Q10"].includes(question.id)) return true;
  if (/rational functions.*quadratic in numerator/.test(lessonTitle)
    && ["A_N23TZ1HL_P2_Q11", "A_N21TZ0HL_P2_Q10"].includes(question.id)) return true;
  if (/^solving inequalities$/.test(lessonTitle)
    && ["M15TZ1HL_P2_Q10", "M10TZ1HL_P2_Q9"].includes(question.id)) return true;
  if (/^graphs of modulus functions$/.test(lessonTitle)
    && ["M08TZ1HL_P2_Q2", "A_N25TZ3HL_P1_Q5"].includes(question.id)) return true;
  if (/^modulus equations and inequalities$/.test(lessonTitle)
    && ["N10TZ0HL_P1_Q1", "M16TZ1HL_P1_Q7"].includes(question.id)) return true;
  // AA Topic 3 reviewed extracts. These mixed-source records are cropped to
  // the exact requested skill before their later area or percentage parts.
  if (/^distance between 2 points$/.test(lessonTitle)
    && ["N16TZ0AISL_P2_Q3", "N14TZ0AISL_P1_Q2"].includes(question.id)) return true;
  if (/^pythagoras' theorem$/.test(lessonTitle)
    && ["M16TZ2HL_P2_Q1", "N13TZ0AISL_P1_Q5"].includes(question.id)) return true;
  if (/^sine rule$/.test(lessonTitle)
    && ["M15TZ2SL_P2_Q1", "N17TZ0SL_P2_Q1"].includes(question.id)) return true;
  if (/^area of a triangle$/.test(lessonTitle)
    && ["M15TZ2HL_P2_Q1", "A_N23TZ2HL_P1_Q4"].includes(question.id)) return true;
  if (/^mr flynn s exact triangles$/.test(lessonTitle)
    && ["M17TZ1SL_P1_Q3", "M15TZ2AISL_P1_Q2"].includes(question.id)) return true;
  if (/^vectors introduction$/.test(lessonTitle)
    && ["N13TZ0SL_P1_Q1", "N15TZ0SL_P1_Q2"].includes(question.id)) return true;
  if (/^operations with vectors$/.test(lessonTitle)
    && ["M10TZ2HL_P1_Q3", "M13TZ1SL_P1_Q1"].includes(question.id)) return true;
  if (/^magnitude and unit vectors$/.test(lessonTitle)
    && ["M10TZ2SL_P1_Q2", "M16TZ2SL_P1_Q7"].includes(question.id)) return true;
  if (/^scalar product and angle between vectors$/.test(lessonTitle)
    && ["M18TZ2HL_P1_Q1", "N08TZ0HL_P2_Q4"].includes(question.id)) return true;
  if (/^distance between a point and a line$/.test(lessonTitle)
    && ["N13TZ0HL_P2_Q9", "W_N23TZ0AIHL_P1_Q14"].includes(question.id)) return true;
  if (/^intersection of 3 planes$/.test(lessonTitle)
    && ["M14TZ2HL_P1_Q3", "M08TZ1HL_P2_Q5"].includes(question.id)) return true;
  if (/^angle between a line and a plane$/.test(lessonTitle)
    && ["M10TZ1HL_P2_Q11", "M12TZ2HL_P2_Q11"].includes(question.id)) return true;
  if (/^angle between two planes$/.test(lessonTitle)
    && ["M10TZ1HL_P1_Q3", "N14TZ0HL_P2_Q1"].includes(question.id)) return true;
  // AA Topic 4 final review uses these exact displayed parts. Each extract is
  // cropped to the requested statistical skill even when the broader source
  // title describes a longer, mixed-skill question.
  if (/^regression line of x on y$/.test(lessonTitle)
    && question.id === "A_M24TZ1SL_P2_Q6") return true;
  if (/normal distribution.*finding mean and std dev/.test(lessonTitle)
    && question.id === "M11TZ1HL_P2_Q12") return true;
  if (/mean of a continuous random variable/.test(lessonTitle)
    && question.id === "A_N24TZ0HL_P2_Q6") return true;
  if (/median and mode of a discrete random variable/.test(lessonTitle)
    && question.id === "M08TZ1SL_P2_Q1") return true;
  if (/variance of a continuous random variable/.test(lessonTitle)
    && question.id === "M15TZ1HL_P2_Q11") return true;
  // Final AA trigonometry review. These are exact displayed extracts: the
  // first replacement solves a quadratic trigonometric equation directly,
  // while the second uses arctan and arcsin without any differentiation.
  if (/^solving trig equations$/.test(lessonTitle)
    && ["A_M24TZ2HL_P1_Q1", "M13TZ2HL_P2_Q6"].includes(question.id)) return true;
  if (/^inverse trigonometric functions$/.test(lessonTitle)
    && ["M09TZ2HL_P2_Q3", "N11TZ0HL_P2_Q4"].includes(question.id)) return true;
  // IGCSE Topic 1 selections reviewed at displayed-part level. The two surd
  // sources continue into rationalising work, but only their simplifying
  // part (a) is rendered. The set sources are symbolic/listing questions and
  // contain no Venn diagram despite their broader curriculum metadata.
  if (/surds.*simplifying/.test(lessonTitle)
    && ["4MA1_2023J_2H_Q17", "4MA1_2024N_1H_Q17"].includes(question.id)) return true;
  if (/^sets$/.test(lessonTitle)
    && ["4MA1_2020J_1HR_Q4", "4MA1_2019M_1HR_Q3"].includes(question.id)) return true;
  // IGCSE bounds and Topic 2 algebra were reviewed against the exact
  // displayed parts. These whitelists prevent broader source metadata from
  // rejecting a correct extract or admitting a neighbouring algebra skill.
  if (/upper and lower bounds/.test(lessonTitle)
    && ["4MA1_2020N_2HR_Q5", "4MA1_2019J_2HR_Q17"].includes(question.id)) return true;
  if (/factorising common factors/.test(lessonTitle)
    && ["4MA1_2019J_1H_Q1", "4MA1_2021J_1H_Q5"].includes(question.id)) return true;
  if (/difference of 2 squares/.test(lessonTitle)
    && ["4MA1_2023M_1H_Q14", "4MA1_2025M_2HR_Q13"].includes(question.id)) return true;
  if (/^factorising quadratics$/.test(lessonTitle)
    && ["4MA1_2019M_2HR_Q5", "4MA1_2024M_1H_Q12"].includes(question.id)) return true;
  if (/^algebraic fractions$/.test(lessonTitle)
    && ["4MA1_2019J_1H_Q11", "4MA1_2018M_2HR_Q22"].includes(question.id)) return true;
  if (/^changing the subject$/.test(lessonTitle)
    && ["4MA1_2018M_2H_Q1", "4MA1_2025M_2HR_Q17"].includes(question.id)) return true;
  if (/^solving linear equations$/.test(lessonTitle)
    && ["4MA1_2019M_1HR_Q4", "4MA1_2023J_2H_Q13"].includes(question.id)) return true;
  if (/solving quadratics by factorising/.test(lessonTitle)
    && question.id === "4MA1_2021M_2H_Q9") return true;
  if (/solving by completing the square/.test(lessonTitle)
    && question.id === "4MA1_2018M_2HR_Q24") return true;
  if (/^the quadratic formula$/.test(lessonTitle)
    && ["4MA1_2018M_1H_Q11", "4MA1_2018M_1HR_Q16"].includes(question.id)) return true;
  // IGCSE Topic 3 selections were reviewed at exact-question or displayed-
  // part level. These preserve the boundaries between sequence and series,
  // function evaluation, domain/range, inverse notation and line equations.
  if (/^arithmetic sequences$/.test(lessonTitle)
    && ["4MA1_2021M_1H_Q2", "4MA1_2019J_2HR_Q3"].includes(question.id)) return true;
  if (/^arithmetic series$/.test(lessonTitle)
    && ["4MA1_2020J_2H_Q25", "4MA1_2019M_1H_Q16"].includes(question.id)) return true;
  if (/^functions introduction$/.test(lessonTitle)
    && ["4MA1_2018M_1H_Q14", "4MA1_2019M_2H_Q24"].includes(question.id)) return true;
  if (/^domain and range$/.test(lessonTitle)
    && ["4MA1_2025M_2HR_Q19", "4MA1_2023M_1H_Q17", "4MA1_2020J_1HR_Q17"].includes(question.id)) return true;
  if (/^inverse functions introduction$/.test(lessonTitle)
    && question.id === "4MA1_2019J_1HR_Q23") return true;
  if (/^finding inverse functions$/.test(lessonTitle)
    && ["4MA1_2021J_1H_Q22", "4MA1_2024M_1H_Q15"].includes(question.id)) return true;
  if (/^equation of a straight line$/.test(lessonTitle)
    && ["4MA1_2020N_2H_Q6", "4MA1_2019M_1H_Q23"].includes(question.id)) return true;
  if (/^distance between two points$/.test(lessonTitle)
    && question.id === "4MA1_2022M_1H_Q10") return true;
  if (/^differentiation rule$/.test(lessonTitle)
    && ["4MA1_2018M_2H_Q17", "4MA1_2019J_1H_Q12"].includes(question.id)) return true;
  if (/^finding the gradient$/.test(lessonTitle)
    && ["4MA1_2020N_1HR_Q13", "4MA1_2023M_1H_Q11"].includes(question.id)) return true;
  if (/^pressure$/.test(lessonTitle)
    && ["4MA1_2018M_2HR_Q2", "4MA1_2019M_1HR_Q12"].includes(question.id)) return true;
  if (/angles of elevation and depression/.test(lessonTitle)
    && ["4MA1_2021J_2HR_Q13", "4MA1_2021N_1H_Q12"].includes(question.id)) return true;
  if (/^sine rule$/.test(lessonTitle)
    && ["4MA1_2021N_1H_Q13", "4MA1_2022J_1HR_Q22"].includes(question.id)) return true;
  if (/^cosine rule$/.test(lessonTitle)
    && ["4MA1_2018M_2H_Q18", "4MA1_2018M_1HR_Q18"].includes(question.id)) return true;
  if (/^area of a triangle$/.test(lessonTitle)
    && ["4MA1_2024M_2HR_Q15", "4MA1_2024M_1HR_Q15"].includes(question.id)) return true;
  if (/surface area of prisms and cylinders/.test(lessonTitle)
    && ["4MA1_2023J_1HR_Q2", "4MA1_2020N_2H_Q9"].includes(question.id)) return true;
  if (/similar shapes area and volume/.test(lessonTitle)
    && ["4MA1_2019J_2H_Q16", "4MA1_2022J_1H_Q17"].includes(question.id)) return true;
  // These four part-level selections are deliberately narrow even though the
  // full source records continue into later calculus skills.
  if ([
    "N12TZ0AISL_P1_Q15",
    "M13TZ1AISL_P1_Q15",
    "M14TZ1SL_P1_Q3",
    "V_M24TZ2AISL_P2_Q3",
  ].includes(question.id)) return true;
  // The bank's broader titles do not consistently say "Z-test", so use a
  // reviewed whitelist. Each record tests a population mean with known sigma;
  // unknown-variance/sample-standard-deviation records belong to T-tests.
  if (/z test one tailed/.test(lessonTitle)) {
    return ["H_M19TZ0HL_P3S_Q3", "H_N14TZ0HL_P3S_Q5"].includes(question.id);
  }
  if (/z test two tailed/.test(lessonTitle)) {
    return question.id === "H_M18TZ0HL_P3S_Q3";
  }
  if (/^matched pairs$/.test(lessonTitle)) {
    return ["H_M15TZ0HL_P3S_Q2", "H_N16TZ0HL_P3S_Q1X1"].includes(question.id);
  }
  if (/testing for population proportion/.test(lessonTitle)) {
    return ["W_M21TZ1AIHL_P1_Q11", "W_N23TZ0AIHL_P2_Q7"].includes(question.id);
  }
  // These are the two reviewed Poisson-mean hypothesis tests. Their source
  // records also carry broader Poisson and error tags, but the displayed
  // parts are limited to hypotheses, the test decision and its conclusion.
  if (/test for mean using poisson distribution/.test(lessonTitle)) {
    return ["W_N21TZ0AIHL_P2_Q7", "W_M21TZ2AIHL_P1_Q15"].includes(question.id);
  }
  // These extracts directly calculate unions and intersections. Their bank
  // metadata is the broader "Probability" label, but the displayed parts are
  // exactly the formulae lesson Rob requested.
  if (/^probability formulae$/.test(lessonTitle)
    && ["M11TZ1HL_P1_Q1", "M14TZ2HL_P1_Q1"].includes(question.id)) return true;
  // Both extracts apply Y = aX + b directly to a mean and a measure of
  // spread. Their complete source questions carry broader statistics labels,
  // but the displayed parts are exactly this lesson's transformation rule.
  if (/^linear transformations of x$/.test(lessonTitle)
    && ["W_M24TZ1AIHL_P1_Q3", "M19TZ2SL_P1_Q8A"].includes(question.id)) return true;
  // The displayed part is the finite summation calculation and its
  // interpretation. It contains no sum-to-infinity work.
  if (/^sigma notation$/.test(lessonTitle)
    && ["V_M22TZ2AISL_P2_Q2", "M14TZ2HL_P2_Q1", "W_M24TZ2AIHL_P2_Q6"].includes(question.id)) return true;
  // Only parts (a) and (b) of this source are displayed here. They are an
  // accessible calculator evaluation of an exponential expression; the later
  // modelling equation is deliberately excluded.
  if (/laws of exponents/.test(lessonTitle)
    && ["M13TZ2AISL_P1_Q13", "M10TZ1HL_P1_Q4", "A_N21TZ0SL_P2_Q2"].includes(question.id)) return true;
  // AA HL Topic 1 final review: these are exact displayed extracts selected
  // for the named lesson. Broader source metadata must not move them into an
  // adjacent logarithm, calculus or complex-number lesson.
  if (/^more exponents$/.test(lessonTitle)
    && ["A_M22TZ1SL_P1_Q2", "A_N21TZ0SL_P1_Q8"].includes(question.id)) return true;
  if (/^laws of logarithms$/.test(lessonTitle)
    && ["M16TZ2SL_P1_Q3", "M17TZ1HL_P1_Q1"].includes(question.id)) return true;
  if (/^partial fractions$/.test(lessonTitle)
    && ["A2_M24TZ1HL_P1_Q11", "M15TZ1HL_P1_Q6"].includes(question.id)) return true;
  if (/^operations with complex numbers$/.test(lessonTitle)
    && ["M11TZ1HL_P1_Q2", "M12TZ2HL_P1_Q6"].includes(question.id)) return true;
  if (/counting principles introduction/.test(lessonTitle)
    && question.id === "A_N22TZ0HL_P1_Q11") return true;
  // These sources were reviewed at part level for the opening calculus
  // lessons. Their complete source titles mention later follow-up work, while
  // the displayed parts are deliberately limited to the introductory skill.
  if (/differentiation.*power rule/.test(lessonTitle)
    && [
      "M14TZ1AISL_P1_Q10",
      "V_N23TZ2AISL_P1_Q3",
      "N12TZ0AISL_P1_Q15",
      "M13TZ1AISL_P1_Q15",
    ].includes(question.id)) return true;
  if (/tangents and normals/.test(lessonTitle)
    && ["N18TZ0AISL_P1_Q11", "N09TZ0SL_P1_Q10X1"].includes(question.id)) return true;
  if (/definite integration/.test(lessonTitle)
    && ["A_M22TZ1HL_P1_Q1", "N13TZ0SL_P1_Q4"].includes(question.id)) return true;
  if (/^area under the curve$/.test(lessonTitle)
    && ["A_N22TZ0SL_P2_Q3", "W_N23TZ0AIHL_P1_Q11"].includes(question.id)) return true;
  if (/derivative of sine.*cosine|derivative of sin.*cos.*ln.*e/.test(lessonTitle)
    && [
      "N16TZ0SL_P1_Q10X1",
      "M18TZ1SL_P2_Q1",
      "M15TZ1HL_P2_Q6",
      "MF_AIHL_T5_BASIC_DERIVATIVES_1",
      "MF_AIHL_T5_BASIC_DERIVATIVES_2",
    ].includes(question.id)) return true;
  // Final AI HL calculus and differential-equations review. These sources
  // were checked at displayed-part level so a broader source title cannot
  // push slope fields, vector motion or later modelling into the wrong card.
  if (/^kinematics$/.test(lessonTitle)
    && ["M08TZ1SL_P1_Q6", "H_M17TZ2HL_P1_Q4"].includes(question.id)) return true;
  if (/^kinematics 2$/.test(lessonTitle)
    && ["H_M14TZ1HL_P1_Q8", "W_N23TZ0AIHL_P3_Q1"].includes(question.id)) return true;
  if (/setting up a differential equation/.test(lessonTitle)
    && question.id === "W_M25TZ2AIHL_P1_Q12") return true;
  if (/^separation of variables$/.test(lessonTitle)
    && ["H_M13TZ2HL_P2_Q12", "W_M24TZ1AIHL_P2_Q5", "MF_AIHL_T5_SEPARATION"].includes(question.id)) return true;
  if (/^euler s method example$/.test(lessonTitle)
    && ["W_M24TZ1AIHL_P1_Q4", "W_M24TZ2AIHL_P1_Q7"].includes(question.id)) return true;
  if (/euler s method for coupled systems/.test(lessonTitle)
    && ["W_N24TZ0AIHL_P1_Q17", "W_M25TZ3AIHL_P1_Q11"].includes(question.id)) return true;
  if (/solutions of coupled differential equations p1/.test(lessonTitle)
    && ["W_N21TZ0AIHL_P2_Q6", "MF_AIHL_T5_COUPLED_EXACT_1"].includes(question.id)) return true;
  if (/solutions of coupled differential equations p2/.test(lessonTitle)
    && ["W_M23TZ2AIHL_P2_Q7", "MF_AIHL_T5_COUPLED_EXACT_2"].includes(question.id)) return true;
  if (/sketching phase portraits sink/.test(lessonTitle)
    && question.id === "W_M21TZ2AIHL_P2_Q7") return true;
  if (/sketching phase portraits spiral sink/.test(lessonTitle)
    && question.id === "W_N24TZ0AIHL_P2_Q7") return true;
  if (/sketching phase portraits spiral source/.test(lessonTitle)
    && question.id === "W_M23TZ1AIHL_P2_Q6") return true;
  if (/second order de exact solution/.test(lessonTitle)
    && ["W_M23TZ2AIHL_P2_Q7", "W_M22TZ2AIHL_P2_Q7"].includes(question.id)) return true;
  if (/^optimization$/.test(lessonTitle)
    && ["N17TZ0SL_P1_Q6A", "M19TZ1AISL_P1_Q15"].includes(question.id)) return true;
  if (/integration.*power rule/.test(lessonTitle)
    && ["N13TZ0SL_P2_Q3", "M14TZ1SL_P1_Q3", "V_M24TZ2AISL_P2_Q3", "N18TZ0HL_P2_Q2"].includes(question.id)) return true;
  if (/^chain rule$/.test(lessonTitle)
    && ["M19TZ2SL_P1_Q10", "M16TZ1SL_P1_Q10", "H_M18TZ1HL_P1_Q2"].includes(question.id)) return true;
  if (/^product rule$/.test(lessonTitle)
    && ["H_N10TZ0SL_P1_Q2", "M19TZ1SL_P2_Q3"].includes(question.id)) return true;
  if (/related rates/.test(lessonTitle)
    && ["M11TZ2HL_P2_Q9", "W_M23TZ2AIHL_P1_Q12"].includes(question.id)) return true;
  if (/relationship between graphs and derivatives/.test(lessonTitle) && question.id === "N08TZ0SL_P1_Q6") return true;
  // These have been checked at the displayed-part level for Rob's second
  // calculus review. Their source titles are broader than the selected work:
  // each derivative item genuinely asks for a derivative sketch, the
  // exponential item is a direct integral, the cosine-rate part requires a
  // cosine integral, and the inverse-chain items both have linear inners.
  if (/sketching derivatives with gdc/.test(lessonTitle)
    && ["M10TZ1SL_P2_Q3", "M12TZ2SL_P2_Q2"].includes(question.id)) return true;
  if (/^sketching derivatives$/.test(lessonTitle)
    && ["M14TZ2SL_P1_Q6", "W_N21TZ0AIHL_P1_Q8", "M12TZ2HL_P1_Q7"].includes(question.id)) return true;
  if (/classifying stationary points/.test(lessonTitle)
    && ["N09TZ0SL_P1_Q9", "M10TZ2SL_P1_Q8"].includes(question.id)) return true;
  if (/points of inflexion/.test(lessonTitle)
    && ["M08TZ2HL_P2_Q6", "M11TZ1SL_P2_Q9"].includes(question.id)) return true;
  if (/integrating e.*1 x/.test(lessonTitle)
    && [
      "N20TZ0SL_P1_Q6",
      "M13TZ1SL_P1_Q6",
      "MF_AIHL_T5_DIRECT_EXP_INTEGRATION",
      "MF_AIHL_T5_DIRECT_LOG_INTEGRATION",
    ].includes(question.id)) return true;
  if (/integrating sin.*cos/.test(lessonTitle)
    && [
      "N08TZ0SL_P1_Q9",
      "M10TZ2SL_P1_Q10",
      "A_M23TZ1SL_P2_Q9",
      "H_M15TZ1SL_P1_Q7",
      "MF_AIHL_T5_SIN_COS_INTEGRATION_1",
      "MF_AIHL_T5_SIN_COS_INTEGRATION_2",
    ].includes(question.id)) return true;
  if (/^integration by substitution$/.test(lessonTitle)
    && ["M17TZ1SL_P1_Q5", "A_N22TZ0SL_P1_Q5"].includes(question.id)) return true;
  if (/inverse chain rule/.test(lessonTitle)
    && ["N10TZ0SL_P1_Q6", "M14TZ2SL_P1_Q5", "M11TZ2SL_P2_Q7"].includes(question.id)) return true;
  if (/^area under the curve$/.test(lessonTitle)
    && ["M08TZ2HL_P2_Q3", "M10TZ2SL_P2_Q6"].includes(question.id)) return true;
  if (/area between curve and y axis/.test(lessonTitle)
    && ["H_N15TZ0HL_P2_Q5", "V_SPECAISL_P1_Q10", "MF_AIHL_T5_AREA_Y_AXIS"].includes(question.id)) return true;
  if (/volume of revolution about y axis/.test(lessonTitle)
    && ["W_N22TZ0AIHL_P2_Q5", "M12TZ1HL_P2_Q8"].includes(question.id)) return true;
  // These final AA HL calculus sources were reviewed at the displayed-part
  // level. Their complete source titles are broader than the selected prompt,
  // or the relevant mathematical notation is removed by text normalization.
  if (/volume of revolution.*intro.*x.axis/.test(lessonTitle)
    && question.id === "M10TZ1SL_P1_Q6") return true;
  if (/separation of variables/.test(lessonTitle)
    && ["N12TZ0HL_P3_Q1", "N08TZ0HL_P3_Q4"].includes(question.id)) return true;
  if (/maclaurin.*substitutions.*products/.test(lessonTitle)
    && question.id === "N20TZ0HL_P3_Q4") return true;
  if (/maclaurin.*differentiation.*integration/.test(lessonTitle)
    && question.id === "A_M22TZ1HL_P1_Q12") return true;
  if (/maclaurin.*sigma notation/.test(lessonTitle)
    && ["N12TZ0HL_P3_Q4", "N13TZ0HL_P3_Q4"].includes(question.id)) return true;
  // This source presents the data graphically, so the word "histogram" is
  // supplied by its figure rather than repeated in the text extracted from
  // the bank. Part (a) is the direct histogram-reading task Rob requested.
  if (/histograms and cumulative frequency curves/.test(lessonTitle)
    && ["M12TZ1SL_P2_Q8", "M17TZ1AISL_P1_Q1"].includes(question.id)) return true;
  // These IGCSE Topic 6 questions were reviewed from their full prompts. The
  // bank titles are intentionally concise and do not repeat the lesson label.
  if (/probability and.*or rules/.test(lessonTitle)
    && question.id === "4MA1_2024M_2HR_Q14") return true;
  if (/relative frequency/.test(lessonTitle)
    && question.id === "4MA1_2023M_1HR_Q12") return true;
  if (/tree diagrams/.test(lessonTitle)
    && question.id === "4MA1_2019M_2H_Q23") return true;
  // These adjacent lessons differ only by where the quadratic appears. Check
  // the actual displayed algebra so broad rational-function metadata cannot
  // put the same source into both lessons again. The four manually reviewed
  // records are whitelisted because their LaTeX contains nested braces that a
  // deliberately conservative generic expression check will not parse.
  if (/rational functions.*quadratic in denominator/.test(lessonTitle)) {
    if (["M17TZ1HL_P1_Q11", "M11TZ2HL_P2_Q5", "N19TZ0HL_P1_Q10"].includes(question.id)) return true;
    if (!/\\d?frac\{[^{}]*\}\{[^{}]*(?:x\^2|x²)[^{}]*\}/i.test(rawQuestionText)) return false;
  }
  if (/rational functions.*quadratic in numerator/.test(lessonTitle)) {
    if (["A_N23TZ1HL_P2_Q11", "A_N24TZ0HL_P2_Q12"].includes(question.id)) return true;
    if (!/\\d?frac\{[^{}]*(?:x\^2|x²)[^{}]*\}\{[^{}]*\}/i.test(rawQuestionText)) return false;
  }
  if (/^solving inequalities$/.test(lessonTitle)) {
    if (["A_N24TZ0HL_P1_Q6", "M14TZ1HL_P2_Q6", "M15TZ1HL_P2_Q10"].includes(question.id)) return true;
    if (/modulus|transformation/.test(fullQuestionText)) return false;
  }
  if (/graphs of y.*f x/.test(lessonTitle)) {
    return ["A_SPECHL_P1_Q3", "N18TZ0HL_P2_Q8"].includes(question.id);
  }
  // Rob explicitly approved this existing second question for the line-angle
  // lesson after reviewing it in the preview. Preserve it while replacing the
  // unrelated first question with a full two-line, three-dimensional problem.
  if (/angle between two lines/.test(lessonTitle) && question.id === "N08TZ0HL_P2_Q4") return true;
  // Only parts (a) and (b) are displayed from this source: direct airplane
  // speed and height calculations. Its later perpendicular-path work is not.
  if (/vectors and kinematics/.test(lessonTitle) && question.id === "H_M14TZ2SL_P1_Q9") return true;
  // Only the direct substitution part is displayed from each source. Later
  // sketching, calculus and graph-feature work is deliberately omitted.
  if (/evaluating functions/.test(lessonTitle)
    && ["M17TZ1AISL_P2_Q3", "M11TZ1AISL_P2_Q3"].includes(question.id)) return true;
  // AI Topic 1 has been checked at the displayed-part level. These source
  // questions may have broader titles or later parts, but only the precise
  // lesson-specific work listed in practicePartOverrides is shown.
  if (/laws of logs/.test(lessonTitle)
    && ["M11TZ2SL_P1_Q5", "W_M25TZ1AIHL_P1_Q10"].includes(question.id)) return true;
  if (/more exponents/.test(lessonTitle)
    && ["A_EXPQ_P1_Q1", "A_EXPQ_P1_Q2", "H_M13TZ2HL_P1_Q9", "H_N14TZ0HL_P1_Q11X1"].includes(question.id)) return true;
  if (/operations with complex numbers/.test(lessonTitle)
    && ["N12TZ0HL_P1_Q10", "H_M18TZ2HL_P2_Q1"].includes(question.id)) return true;
  if (/operations and geometric interpretation/.test(lessonTitle)
    && question.id === "W_M24TZ2AIHL_P1_Q15") return true;
  if (/determinant and inverse of a matrix/.test(lessonTitle)
    && ["W_M25TZ3AIHL_P1_Q8", "W_M23TZ2AIHL_P1_Q13"].includes(question.id)) return true;
  if (/eigenvalues and eigenvectors/.test(lessonTitle)
    && ["W_N24TZ0AIHL_P1_Q11", "W_M24TZ2AIHL_P2_Q5", "W_M22TZ1AIHL_P1_Q11"].includes(question.id)) return true;
  if (/powers of matrices/.test(lessonTitle)
    && ["W_M24TZ1AIHL_P1_Q17", "W_M21TZ1AIHL_P2_Q5", "W_M21TZ2AIHL_P2_Q4"].includes(question.id)) return true;
  if (/^system of linear equations$/.test(lessonTitle)
    && question.id === "W_M21TZ2AIHL_P1_Q14") return true;
  // AI Topic 3 has been reviewed at displayed-part level. Some source titles
  // describe a broader exam question or rely on the diagram to show the
  // right angle, so the selected prompt itself is the authoritative check.
  if (/^soh cah toa$/.test(lessonTitle)
    && ["M16TZ1AISL_P1_Q2", "V_N24TZ1AISL_P1_Q1"].includes(question.id)) return true;
  if (/^cosine rule$/.test(lessonTitle)
    && ["V_N21TZ0AISL_P1_Q2", "M14TZ1SL_P2_Q1"].includes(question.id)) return true;
  if (/arcs and sectors with radians/.test(lessonTitle)
    && question.id === "M13TZ1HL_P2_Q5") return true;
  if (/perpendicular bisectors/.test(lessonTitle)
    && question.id === "V_M21TZ2AISL_P1_Q6") return true;
  if (/graphs of sin, cos and tan/.test(lessonTitle)
    && ["N15TZ0SL_P1_Q4", "M10TZ1AISL_P1_Q11", "MF_AIHL_T3_TRIG_GRAPH_TAN"].includes(question.id)) return true;
  if (/^trig identities$/.test(lessonTitle)
    && ["MF_AIHL_T3_TRIG_IDENTITY_1", "MF_AIHL_T3_TRIG_IDENTITY_2"].includes(question.id)) return true;
  if (/^solving trigonometric equations$/.test(lessonTitle)
    && question.id === "M08TZ1SL_P2_Q4") return true;
  if (/matrix transformations.*intro.*stretches/.test(lessonTitle)
    && question.id === "MF_AIHL_T3_MATRIX_STRETCH") return true;
  if (/^translations$/.test(lessonTitle)
    && question.id === "MF_AIHL_T3_MATRIX_TRANSLATION") return true;
  if (/^enlargements$/.test(lessonTitle)
    && ["W_M22TZ1AIHL_P2_Q7", "MF_AIHL_T3_MATRIX_ENLARGEMENT"].includes(question.id)) return true;
  if (/^reflections$/.test(lessonTitle)
    && ["W_N23TZ0AIHL_P2_Q6", "MF_AIHL_T3_MATRIX_REFLECTION"].includes(question.id)) return true;
  if (/composite matrix transformations/.test(lessonTitle)
    && ["W_N24TZ0AIHL_P2_Q6", "W_M23TZ2AIHL_P1_Q13"].includes(question.id)) return true;
  if (/determinant of a transformation matrix/.test(lessonTitle)
    && ["W_M22TZ2AIHL_P1_Q15", "W_N22TZ0AIHL_P1_Q9"].includes(question.id)) return true;
  // AI HL vector and graph-theory sources were checked against their selected
  // subparts. These exact whitelists stop broad source titles from overriding
  // the much narrower prompt displayed in the lesson.
  if (/^operations with vectors$/.test(lessonTitle)
    && ["M10TZ2HL_P1_Q3", "M13TZ1SL_P1_Q1", "M11TZ2SL_P1_Q3"].includes(question.id)) return true;
  if (/magnitude and unit vectors/.test(lessonTitle)
    && ["N17TZ0SL_P2_Q3", "M10TZ2SL_P1_Q2", "MF_AIHL_T3_UNIT_VECTOR"].includes(question.id)) return true;
  if (/^vector equation of a line$/.test(lessonTitle)
    && ["MF_AIHL_T3_VECTOR_LINE_3D_POINTS", "MF_AIHL_T3_VECTOR_LINE_3D_DIRECTION"].includes(question.id)) return true;
  if (/^vectors and kinematics$/.test(lessonTitle)
    && ["MF_AIHL_T3_VECTOR_KINEMATICS_3D", "MF_AIHL_T3_VECTOR_KINEMATICS_MEETING"].includes(question.id)) return true;
  if (/distance between a point and a line/.test(lessonTitle)
    && question.id === "W_N23TZ0AIHL_P1_Q14") return true;
  if (/motion with variable velocity/.test(lessonTitle)
    && ["W_N22TZ0AIHL_P2_Q7", "W_M25TZ3AIHL_P1_Q14"].includes(question.id)) return true;
  if (/vector product$/.test(lessonTitle)
    && ["W_SPECAIHL_P1_Q11", "MF_AIHL_T3_VECTOR_PRODUCT"].includes(question.id)) return true;
  if (/areas using (?:the )?vector product/.test(lessonTitle)
    && ["W_M23TZ1AIHL_P1_Q7", "W_M24TZ2AIHL_P1_Q8"].includes(question.id)) return true;
  if (/components of vectors/.test(lessonTitle) && question.id === "MF_AIHL_T3_VECTOR_COMPONENT") return true;
  if (/weighted adjacency tables/.test(lessonTitle)
    && ["W_N22TZ0AIHL_P2_Q4", "MF_AIHL_T3_WEIGHTED_ADJACENCY"].includes(question.id)) return true;
  if (/graph routes/.test(lessonTitle) && question.id === "W_M21TZ2AIHL_P1_Q11") return true;
  if (/kruskal/.test(lessonTitle)
    && ["W_M22TZ2AIHL_P3_Q2", "W_M23TZ2AIHL_P2_Q4"].includes(question.id)) return true;
  if (/^prim s algorithm$/.test(lessonTitle)
    && ["W_M21TZ1AIHL_P1_Q10", "MF_AIHL_T3_PRIM_GRAPH"].includes(question.id)) return true;
  if (/prim s algorithm with adjacency table/.test(lessonTitle)
    && question.id === "W_M25TZ2AIHL_P2_Q4") return true;
  if (/eulerian graphs/.test(lessonTitle)
    && ["W_M23TZ1AIHL_P2_Q4", "MF_AIHL_T3_EULERIAN"].includes(question.id)) return true;
  if (/chinese postman/.test(lessonTitle)
    && ["W_M24TZ1AIHL_P1_Q8", "W_N23TZ0AIHL_P2_Q5", "MF_AIHL_T3_CHINESE_POSTMAN"].includes(question.id)) return true;
  if (/hamiltonian graphs/.test(lessonTitle)
    && ["W_N21TZ0AIHL_P3_Q1", "MF_AIHL_T3_HAMILTONIAN"].includes(question.id)) return true;
  if (/^the travelling salesman problem$/.test(lessonTitle)
    && ["W_N24TZ0AIHL_P3_Q1", "MF_AIHL_T3_TSP_BOUNDS"].includes(question.id)) return true;
  if (/tsp practical|travelling salesman problem practical/.test(lessonTitle)
    && ["W_M24TZ2AIHL_P2_Q4", "MF_AIHL_T3_TSP_PRACTICAL"].includes(question.id)) return true;
  if (/nearest neighbour algorithm/.test(lessonTitle)
    && ["MF_AIHL_T3_NEAREST_NEIGHBOUR_1", "MF_AIHL_T3_NEAREST_NEIGHBOUR_2"].includes(question.id)) return true;
  if (/deleted vertex algorithm/.test(lessonTitle)
    && ["W_M25TZ3AIHL_P2_Q4", "W_SPECAIHL_P2_Q5"].includes(question.id)) return true;
  // Only part (b) is displayed: a direct probability calculation for the
  // mean of five independent observations from a stated normal population.
  if (/normal distribution sampling/.test(lessonTitle)
    && question.id === "W_M22TZ1AIHL_P1_Q9") return true;
  if (/confidence intervals known variance/.test(lessonTitle)) {
    return ["H_N15TZ0HL_P3S_Q1X1", "H_M15TZ0HL_P3S_Q3"].includes(question.id);
  }
  if (/confidence intervals unknown variance/.test(lessonTitle)) {
    return ["W_SPECAIHL_P1_Q9", "W_M21TZ2AIHL_P1_Q10"].includes(question.id);
  }
  const rule = lessonSpecificRule(lesson);
  if (rule) {
    // Positive matches may come from a relevant subpart of a larger question.
    // Exclusions stay title-based so a question whose main skill is explicitly
    // a different lesson (for example algebraic fractions) remains blocked.
    if (rule.all && !rule.all.every((pattern) => pattern.test(fullQuestionText))) return false;
    if (rule.any && !rule.any.some((pattern) => pattern.test(fullQuestionText))) return false;
    if (rule.none && rule.none.some((pattern) => pattern.test(questionTitle))) return false;
  }
  if (/vectors and kinematics/.test(lessonTitle)) {
    return /vector/.test(fullQuestionText)
      && /velocity|speed|position|particle|motion|displacement/.test(fullQuestionText);
  }
  if (/t test/.test(lessonTitle)) return /t test/.test(questionTitle);
  if (/inverse chain rule/.test(lessonTitle)) return /reverse chain|inverse chain|substitution|integrat/.test(questionTitle);
  if (/continuous functions/.test(lessonTitle)) return /continuous|limit|l hopital|first principles/.test(questionTitle);
  if (/linear combination.*normal random variables/.test(lessonTitle)) return /normal/.test(questionTitle);
  return rule ? true : relevance(question, lesson) > 0;
}

const usage = new Map();

function scoreQuestion(question, lesson, course, subtopic, position) {
  const lessonTokens = tokenSet(lesson.title);
  const candidateText = normalize(questionText(question));
  const candidateTokens = tokenSet(candidateText);
  let overlap = 0;
  for (const token of lessonTokens) if (candidateTokens.has(token)) overlap += 1;
  const difficulty = difficultyOf(question, course);
  const difficultyBonus = position === 0
    ? ({ Easy: 12, Medium: 7, Hard: 1 }[difficulty] || 4)
    : ({ Easy: 7, Medium: 10, Hard: 4 }[difficulty] || 6);
  const marks = Number(question.marks) || 0;
  const markBonus = position === 0 ? Math.max(0, 22 - marks * 3) : Math.max(0, 16 - marks * 2);
  const partPenalty = Math.max(0, (question.parts?.length || 0) - 3) * 2;
  const phrase = normalize(lesson.title);
  const phraseBonus = phrase.length > 7 && candidateText.includes(phrase) ? 15 : 0;
  const questionTopics = topicsOf(question, course);
  const exactSubtopicBonus = questionTopics.some((topic) => topic.sub === subtopic) ? 12 : 0;
  const focusedSubtopicBonus = questionTopics.length > 0 && questionTopics.every((topic) => topic.sub === subtopic) ? 6 : 0;
  const reusePenalty = (usage.get(question.id) || 0) * 4;
  return overlap * 5 + difficultyBonus + markBonus + phraseBonus + exactSubtopicBonus + focusedSubtopicBonus - reusePenalty - partPenalty;
}

function relevance(question, lesson) {
  const lessonTokens = tokenSet(lesson.title);
  const candidateTokens = tokenSet(questionText(question));
  let overlap = 0;
  for (const token of lessonTokens) if (candidateTokens.has(token)) overlap += 1;
  return overlap;
}

function candidateQuestions(lesson, course, subtopic) {
  return seed.filter((question) => {
    if (!question.id || !question.markscheme || question.offSyllabus || question.provisional) return false;
    if (course === "IGCSE Higher" && question.sourceBank !== "igcse") return false;
    if (course !== "IGCSE Higher" && question.sourceBank !== "ib") return false;
    if (!passesCourseBoundary(question, course)) return false;
    if (!banksOf(question).includes(course)) return false;
    return topicsOf(question, course).some((topic) => topic.sub === subtopic);
  });
}

function exactCandidateQuestions(lesson, course, subtopic) {
  return seed.filter((question) => {
    if (!question.id || !question.markscheme || question.offSyllabus || question.provisional) return false;
    if (course === "IGCSE Higher" && question.sourceBank !== "igcse") return false;
    if (course !== "IGCSE Higher" && question.sourceBank !== "ib") return false;
    if (!passesCourseBoundary(question, course)) return false;
    if (!banksOf(question).includes(course)) return false;
    // A wording match is not enough to move a question between curriculum
    // subtopics. This prevents, for example, algebraic fractions being used
    // for the earlier numerical-fractions lesson.
    if (!topicsOf(question, course).some((topic) => topic.sub === subtopic)) return false;
    return passesLessonSpecificCheck(question, lesson);
  });
}

function broaderProfileQuestions(lesson, course, subtopic) {
  if (!lessonSpecificRule(lesson)) return [];
  return seed.filter((question) => {
    if (!question.id || !question.markscheme || question.offSyllabus || question.provisional) return false;
    if (course === "IGCSE Higher" && question.sourceBank !== "igcse") return false;
    if (course !== "IGCSE Higher" && question.sourceBank !== "ib") return false;
    if (!passesCourseBoundary(question, course)) return false;
    if (!banksOf(question).includes(course) && !allowsCrossCourseQuestion(question, lesson, course)) return false;
    if (banksOf(question).includes(course) && topicsOf(question, course).some((topic) => topic.sub === subtopic)) return false;
    return passesLessonSpecificCheck(question, lesson);
  });
}

function pairPassesLessonCheck(questions, lesson) {
  const lessonTitle = normalize(lesson.title);
  const titles = questions.map((question) => normalize(question.title));
  const combined = titles.join(" | ");
  if (/spheres.*cones/.test(lessonTitle)) {
    return titles.some((title) => /sphere/.test(title)) && titles.some((title) => /cone/.test(title));
  }
  if (/integrating e.*1 x/.test(lessonTitle)) {
    if (questions.some((question) => question.id === "N20TZ0SL_P1_Q6")
      && questions.some((question) => question.id === "A_M22TZ2SL_P2_Q2")) return true;
    return titles.some((title) => /exponential|e x/.test(title))
      && titles.some((title) => /logarith|reciprocal|1 x/.test(title));
  }
  if (/derivative of sinx.*cosx.*lnx.*e x/.test(lessonTitle)) {
    const families = [/\bsin\b/, /\bcos\b/, /\bln\b|logarith/, /exponential/]
      .filter((pattern) => pattern.test(combined)).length;
    return families >= 2;
  }
  if (/probability and.*or rules/.test(lessonTitle)) {
    const hasAndCase = titles.some((title) => /same.colour|independent probability|exactly two/.test(title));
    const hasOrCase = titles.some((title) => /at least one|odd total|union|addition rule|complement/.test(title));
    return hasAndCase && hasOrCase;
  }
  if (/relative frequency/.test(lessonTitle)) {
    const hasObservedProbability = titles.some((title) => /probability from a table|relative frequency/.test(title));
    const hasFrequencyEstimate = titles.some((title) => /expected frequency|estimat.*frequency|frequency.*probabilit|probabilit.*frequency/.test(title));
    return hasObservedProbability && hasFrequencyEstimate;
  }
  return true;
}

function pickQuestions(lessonId, lesson, course, subtopic, exclusions = {}, desiredCount = 2) {
  const excludedIds = exclusions.ids || new Set();
  const excludedSignatures = exclusions.signatures || new Set();
  const exactSubtopic = exactCandidateQuestions(lesson, course, subtopic);
  // Prefer questions whose curriculum metadata is focused entirely on this
  // lesson's subtopic. Mixed-topic questions remain a fallback only when the
  // bank does not contain two focused alternatives.
  const focusedSubtopic = exactSubtopic.filter((question) => {
    const topics = topicsOf(question, course);
    return topics.length > 0 && topics.every((topic) => topic.sub === subtopic);
  });
  // passesLessonSpecificCheck already requires either a fine-grained semantic
  // profile or meaningful title overlap. Do not add a second token gate that
  // would discard valid synonyms such as a prism question for a 3D lesson.
  const preferredExact = focusedSubtopic.length >= 2 ? focusedSubtopic : exactSubtopic;
  const broader = broaderProfileQuestions(lesson, course, subtopic);
  const relevant = [...preferredExact, ...broader]
    .filter((question) => !excludedIds.has(question.id))
    .filter((question) => !excludedSignatures.has(selectedContentSignature(lessonId, question.id)))
    .filter((question, index, all) => all.findIndex((candidate) => candidate.id === question.id) === index);
  // Prefer the short questions Rob requested. If a lesson still has fewer than
  // two, allow a larger multipart question up to 16 marks when a relevant part
  // clearly assesses the lesson skill.
  const shortCandidates = relevant.filter((question) => Number(question.marks) <= 10);
  const candidates = shortCandidates.length >= 2
    ? shortCandidates
    : relevant.filter((question) => Number(question.marks) <= 16);
  const selectSingle = () => {
    if (!candidates.length) return [];
    const [best] = [...candidates].sort((left, right) => (
      scoreQuestion(right, lesson, course, subtopic, 0) - scoreQuestion(left, lesson, course, subtopic, 0)
    ));
    usage.set(best.id, (usage.get(best.id) || 0) + 1);
    return [best.id];
  };
  if (desiredCount === 1 || candidates.length < 2) return selectSingle();
  const pairs = [];
  for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < candidates.length; secondIndex += 1) {
      const pair = [candidates[firstIndex], candidates[secondIndex]];
      if (!pairPassesLessonCheck(pair, lesson)) continue;
      const forward = scoreQuestion(pair[0], lesson, course, subtopic, 0) + scoreQuestion(pair[1], lesson, course, subtopic, 1);
      const reverse = scoreQuestion(pair[1], lesson, course, subtopic, 0) + scoreQuestion(pair[0], lesson, course, subtopic, 1);
      pairs.push({ pair: reverse > forward ? [pair[1], pair[0]] : pair, score: Math.max(forward, reverse) });
    }
  }
  if (!pairs.length) return selectSingle();
  pairs.sort((a, b) => b.score - a.score);
  const [first, second] = pairs[0].pair;
  for (const question of [first, second]) usage.set(question.id, (usage.get(question.id) || 0) + 1);
  return [first.id, second.id];
}

const lessons = {};
const audit = [];
const claimedQuestionIds = new Map();
const claimedContentSignatures = new Map();

function allowsApprovedSourceSplit(lessonId, questionId) {
  // Rob explicitly permits splitting a larger source question when its parts
  // belong cleanly to different lessons. Sampling uses only part (c) of this
  // source; the discrete median/mode lesson uses only part (a). No prompt is
  // displayed twice, and the selected-content duplicate check still applies.
  return (lessonId === "2f5766d2-e280-4aff-ac80-36b91b5218b7"
      && questionId === "A_M25TZ3HL_P2_Q3")
    // Part (a) is used only for unbiased estimates in 4.14.4; part (b) is
    // used only for the matched-pairs test in 4.18.4.
    || (lessonId === "a05dc6dd-60a5-4987-9191-16ba898b9cca"
      && questionId === "H_M15TZ0HL_P3S_Q2");
}

function exclusionsForLesson(lessonId, additionalIds = []) {
  const ids = new Set([...claimedQuestionIds.keys(), ...additionalIds]);
  const signatures = new Set(claimedContentSignatures.keys());
  for (const [questionId, ownerId] of reservedQuestionOwners) {
    if (ownerId !== lessonId) ids.add(questionId);
  }
  for (const [signature, ownerId] of reservedContentOwners) {
    if (ownerId !== lessonId) signatures.add(signature);
  }
  for (const questionId of additionalIds) {
    const signature = selectedContentSignature(lessonId, questionId);
    if (signature) signatures.add(signature);
  }
  return { ids, signatures };
}

for (const [id, placement] of placements) {
  const course = canonicalCourse(placement.courses);
  const subtopic = ruleFor(placement.lesson, course);
  const deliberatelyWithoutPractice = intentionallyWithoutPractice.has(id);
  const deliberatelySinglePractice = intentionallySinglePractice.has(id);
  const incompleteSingle = incompleteSinglePractice.has(id);
  const deliberatelyTriplePractice = intentionallyTriplePractice.has(id);
  const requestedCuratedIds = deliberatelyWithoutPractice || needsManualQuestionReview.has(id) ? null : verifiedOverrides[id];
  let curatedIds = requestedCuratedIds;
  if (requestedCuratedIds) {
    if (requestedCuratedIds.length < 1 || requestedCuratedIds.length > 3 || new Set(requestedCuratedIds).size !== requestedCuratedIds.length) {
      throw new Error(`Curated practice for ${placement.lesson.code} ${placement.lesson.title} must contain one to three distinct questions`);
    }
    for (const questionId of requestedCuratedIds) {
      const question = seed.find((candidate) => candidate.id === questionId);
      if (!question || !question.markscheme || question.offSyllabus || question.provisional) {
        throw new Error(`Curated practice question ${questionId} is not an approved complete bank record`);
      }
      if (!passesCourseBoundary(question, course)) {
        console.warn(`REJECTED CURATION ${placement.lesson.code} ${placement.lesson.title}: ${questionId} is outside the ${course} syllabus boundary`);
        curatedIds = null;
      }
      if (!banksOf(question).includes(course) && !allowsCrossCourseQuestion(question, placement.lesson, course)) {
        console.warn(`REJECTED CURATION ${placement.lesson.code} ${placement.lesson.title}: ${questionId} is not available in the ${course} bank`);
        curatedIds = null;
      }
      if (subtopic && !topicsOf(question, course).some((topic) => topic.sub === subtopic)) {
        console.warn(`CROSS-SUBTOPIC CURATION ${placement.lesson.code} ${placement.lesson.title}: ${questionId} retained because its actual question content passes the lesson-specific check`);
      }
      if (!passesLessonSpecificCheck(question, placement.lesson)) {
        console.warn(`REJECTED CURATION ${placement.lesson.code} ${placement.lesson.title}: ${questionId} does not assess the precise lesson skill`);
        curatedIds = null;
      }
    }
    if (curatedIds && curatedIds.length > 1) {
      const curatedQuestions = curatedIds.map((questionId) => seed.find((question) => question.id === questionId));
      if (!pairPassesLessonCheck(curatedQuestions, placement.lesson)) {
        console.warn(`REJECTED CURATION ${placement.lesson.code} ${placement.lesson.title}: the pair does not cover the lesson's required skill range`);
        curatedIds = null;
      }
    }
  }
  let uniquenessAdjusted = false;
  if (curatedIds) {
    const uniqueCuratedIds = curatedIds.filter((questionId) => {
      const ownerId = reservedQuestionOwners.get(questionId);
      const signature = selectedContentSignature(id, questionId);
      const contentOwnerId = signature ? reservedContentOwners.get(signature) : null;
      const approvedSourceSplit = allowsApprovedSourceSplit(id, questionId);
      return (approvedSourceSplit || !claimedQuestionIds.has(questionId))
        && (!signature || !claimedContentSignatures.has(signature))
        && (approvedSourceSplit || !ownerId || ownerId === id)
        && (!contentOwnerId || contentOwnerId === id);
    });
    uniquenessAdjusted = uniqueCuratedIds.length !== curatedIds.length;
    curatedIds = uniqueCuratedIds;
  }
  const exactCandidates = subtopic
    ? exactCandidateQuestions(placement.lesson, course, subtopic)
      .filter((question) => Number(question.marks) <= 10)
    : [];
  let questionIds = [];
  if (!deliberatelyWithoutPractice && !needsManualQuestionReview.has(id)) {
    const desiredCount = deliberatelySinglePractice || incompleteSingle ? 1 : deliberatelyTriplePractice ? 3 : 2;
    if (curatedIds) {
      questionIds = [...curatedIds].slice(0, desiredCount);
      if (subtopic && questionIds.length < desiredCount) {
        const replacements = pickQuestions(
          id,
          placement.lesson,
          course,
          subtopic,
          exclusionsForLesson(id, questionIds),
          desiredCount - questionIds.length,
        );
        questionIds.push(...replacements.slice(0, desiredCount - questionIds.length));
        uniquenessAdjusted = uniquenessAdjusted || replacements.length > 0;
      }
      if (questionIds.length > 1) {
        const selectedQuestions = questionIds.map((questionId) => seed.find((question) => question.id === questionId));
        if (!pairPassesLessonCheck(selectedQuestions, placement.lesson)) {
          const replacementPair = pickQuestions(
            id,
            placement.lesson,
            course,
            subtopic,
            exclusionsForLesson(id),
            desiredCount,
          );
          if (replacementPair.length === desiredCount) {
            questionIds = replacementPair;
            uniquenessAdjusted = true;
          } else {
            questionIds = questionIds.slice(0, 1);
          }
        }
      }
    } else if (subtopic) {
      questionIds = pickQuestions(
        id,
        placement.lesson,
        course,
        subtopic,
        exclusionsForLesson(id),
        desiredCount,
      );
    }
  }
  for (const questionId of questionIds) {
    const previousLessonId = claimedQuestionIds.get(questionId);
    if (previousLessonId && previousLessonId !== id && !allowsApprovedSourceSplit(id, questionId)) {
      throw new Error(`Practice question ${questionId} is attached to both ${previousLessonId} and ${id}`);
    }
    if (!previousLessonId) claimedQuestionIds.set(questionId, id);
    const signature = selectedContentSignature(id, questionId);
    const previousContentLessonId = signature ? claimedContentSignatures.get(signature) : null;
    if (previousContentLessonId && previousContentLessonId !== id) {
      throw new Error(`The same practice content is attached to both ${previousContentLessonId} and ${id}`);
    }
    if (signature) claimedContentSignatures.set(signature, id);
  }
  const displayable = questionIds.length > 0;
  const expectedCount = deliberatelySinglePractice ? 1 : deliberatelyTriplePractice ? 3 : 2;
  const practiceComplete = questionIds.length === expectedCount;
  const approvedSingle = deliberatelySinglePractice && questionIds.length === 1;
  const reviewReason = practiceComplete
    ? ""
    : approvedSingle
      ? "approved-single-question"
    : deliberatelyWithoutPractice
      ? "intentionally-no-practice"
    : questionIds.length === 1
      ? "only-one-exact-question"
    : needsManualQuestionReview.has(id)
      ? "withheld-for-manual-review"
      : !subtopic
        ? "no-precise-bank-subtopic"
        : requestedCuratedIds && !curatedIds
          ? "previous-curation-rejected"
          : "no-exact-short-match";
  const matchMethod = deliberatelyWithoutPractice
    ? "not-applicable"
    : !displayable
    ? "needs-review"
    : curatedIds
      ? uniquenessAdjusted ? "verified-curated-unique" : "verified-curated"
      : questionIds.every((questionId) => relevance(seed.find((question) => question.id === questionId), placement.lesson) > 0)
        ? "verified-specific"
        : "verified-profile";
  if (displayable) {
    lessons[id] = {
      lesson: `${placement.lesson.code} ${placement.lesson.title}`,
      course,
      subtopic,
      bankPath: course === "IGCSE Higher" ? "igcse-bank.html" : "ib-bank.html",
      questionIds,
      questionParts: practicePartOverrides[id] || undefined,
      questionPartLabels: practicePartLabelOverrides[id] || undefined,
      questionPartTexts: practicePartTextOverrides[id] || undefined,
      questionPartTitles: practicePartTitles[id] || undefined,
      questionBodies: practiceBodyOverrides[id] || undefined,
      questionHiddenDiagrams: practiceHiddenDiagrams[id] || undefined,
      questionDifficulties: displayDifficultyOverrides(course, questionIds, practiceDifficultyOverrides[id]),
    };
  }
  const quickMeta = questionIds[0] ? selectedQuestionMeta(id, questionIds[0]) : { title: "", marks: "" };
  const examMeta = questionIds[1] ? selectedQuestionMeta(id, questionIds[1]) : { title: "", marks: "" };
  audit.push({
    id,
    courses: placement.courses.join(" + "),
    code: placement.lesson.code,
    title: placement.lesson.title,
    bank: course,
    subtopic: subtopic || "",
    status: approvedSingle ? "approved-single" : practiceComplete ? "complete" : deliberatelyWithoutPractice ? "not-applicable" : "needs-review",
    matchMethod,
    reviewReason,
    selectedCount: questionIds.length,
    exactCandidateCount: exactCandidates.length,
    quickCheck: questionIds[0] || "",
    quickTitle: quickMeta.title,
    quickMarks: quickMeta.marks,
    quickPaper: questionIds[0] ? calculatorLabel(seed.find((question) => question.id === questionIds[0]), course) : "",
    examPractice: questionIds[1] || "",
    examTitle: examMeta.title,
    examMarks: examMeta.marks,
    examPaper: questionIds[1] ? calculatorLabel(seed.find((question) => question.id === questionIds[1]), course) : "",
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  format: "Verified lesson practice: lesson-specific exam questions, with explicit three-question exceptions",
  lessonCount: Object.keys(lessons).length,
  completeLessonCount: audit.filter((row) => row.status === "complete").length,
  approvedSingleLessonCount: audit.filter((row) => row.status === "approved-single").length,
  questionCount: Object.values(lessons).reduce((total, lesson) => total + lesson.questionIds.length, 0),
  selectionPolicy: "Exactly two verified existing-bank questions per completed lesson by default, with only explicitly approved blank, single-question or three-question exceptions; generated matches are capped at 10 marks, curated matches are revalidated, incomplete lessons remain flagged for review, and uncertain matches are withheld; AA paper and calculator rules are shown on every question",
  lessons,
};

fs.writeFileSync(outputPath, `window.MR_FLYNN_PRACTICE = ${JSON.stringify(payload, null, 2)};\n`);

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const columns = ["id", "courses", "code", "title", "bank", "subtopic", "status", "matchMethod", "reviewReason", "selectedCount", "exactCandidateCount", "quickCheck", "quickTitle", "quickMarks", "quickPaper", "examPractice", "examTitle", "examMarks", "examPaper"];
fs.writeFileSync(auditPath, `${columns.join(",")}\n${audit.map((row) => columns.map((column) => csvCell(row[column])).join(",")).join("\n")}\n`);

const complete = audit.filter((row) => row.status === "complete");
const review = audit.filter((row) => row.status === "needs-review");
const intentionallyBlank = audit.filter((row) => row.status === "not-applicable");
const intentionallySingle = audit.filter((row) => row.status === "approved-single");
const selectedQuestions = Object.entries(lessons)
  .flatMap(([lessonId, lesson]) => lesson.questionIds.map((questionId) => selectedQuestionMeta(lessonId, questionId).marks))
  .filter(Boolean)
  .map(Number);
const shortQuestions = selectedQuestions.filter((marks) => marks <= 8).length;
const longerQuestions = selectedQuestions.length - shortQuestions;
const methodCounts = audit.filter((row) => row.selectedCount > 0).reduce((counts, row) => {
  counts[row.matchMethod] = (counts[row.matchMethod] || 0) + 1;
  return counts;
}, {});
console.log(`Completed intended practice sets for ${complete.length} of ${audit.length} unique lesson videos; ${selectedQuestions.length} verified question-bank records are currently displayed.`);
console.log(`${shortQuestions} placements are eight marks or fewer; ${longerQuestions} are longer.`);
console.log(`Selection methods: ${Object.entries(methodCounts).map(([method, count]) => `${method}=${count}`).join(", ")}.`);
console.log(`Left ${review.length} lessons unmapped.`);
console.log(`${intentionallyBlank.length} lessons are intentionally published without practice.`);
console.log(`${intentionallySingle.length} lessons have an explicitly approved single-question practice set.`);
for (const row of review) console.log(`REVIEW ${row.courses} ${row.code} ${row.title}`);

if (process.argv.includes("--review-candidates")) {
  for (const row of review) {
    const placement = placements.get(row.id);
    const options = candidateQuestions(placement.lesson, row.bank, row.subtopic)
      .sort((a, b) => (Number(a.marks) || 0) - (Number(b.marks) || 0));
    console.log(`\nCANDIDATES ${row.id} | ${row.courses} | ${row.code} ${row.title} | ${row.subtopic}`);
    for (const question of options) {
      console.log(`${question.id} | ${question.marks} marks | ${question.title}`);
    }
  }
}
