import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const dist = path.join(root, "course-platform-pilot", "dist");

function readBrowserData(file, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(dist, file), "utf8"), sandbox);
  return sandbox.window[key];
}

const library = readBrowserData("library-data.js", "MR_FLYNN_LIBRARY");
const igcse = readBrowserData("igcse-library-data.js", "MR_FLYNN_IGCSE_LIBRARY");
const papers = readBrowserData("past-paper-data.js", "MR_FLYNN_PAST_PAPERS");
const practice = readBrowserData("practice-data.js", "MR_FLYNN_PRACTICE");
const courses = {};

const curatedSamples = {
  "aa-sl": [
    "e6cca689-8f8c-4d4d-8566-7dff6e20a096", "e533a89a-2e12-47b6-a54c-534a461dcb04", "cf573eb5-7cdc-4534-a90b-faa307f6e5ff",
    "e62cb90d-32c9-4dc7-b508-15e458124e56", "ffb4c343-0db5-45dd-b9b5-5289dba0484b", "bd083b0d-a7b1-44cc-9980-47cce4046c0d",
    "588719f5-78e2-44da-9132-970cf1ce2ebe", "c5f358f0-e49c-4fc1-a20a-296f64992376", "b49b3fd5-a955-4ba5-a569-77ec56466fe8",
    "639dc690-35bc-4a84-b7fb-89844ecaf252", "125a9218-3aed-48c9-b96b-3cf08968de9c", "f924ec98-3f94-4b6e-b485-50d9a7cb0959",
    "20b8ec75-0605-426a-abec-066ca4c4f9d2", "6b4acb2b-3242-40a3-b616-228c878585f8", "0922ca4f-d53f-4299-b9c9-eafe6d17caf1",
  ],
  "aa-hl": [
    "4e377a7a-be35-4b76-bcbc-3684974dfaf9", "044da60a-f4cd-46c6-a71f-95b0087e3bb5", "921a99b5-a673-423c-aeed-402fec0952e0",
    "529c9f56-5b88-4226-a374-0b54c32fcd15", "bd083b0d-a7b1-44cc-9980-47cce4046c0d", "990b6aba-3d06-489d-81e6-70a683d4f23a",
    "588719f5-78e2-44da-9132-970cf1ce2ebe", "2242b24b-b800-4f2c-bb5a-16bd04201870", "35a8aee0-4d48-4084-883f-fc23b5be9039",
    "f924ec98-3f94-4b6e-b485-50d9a7cb0959", "2153e754-5338-4e7e-aca4-6f0e2090c038", "4fa5e51a-f4dd-477e-b393-54f1be7266ec",
    "6b4acb2b-3242-40a3-b616-228c878585f8", "2cf30a58-a31b-47c7-a9c2-fd9bd7a49ca8", "1768c593-44ef-481a-a01b-5ad58562ce78",
  ],
  "ai-sl": [
    "2a0f7d5c-a645-4249-9da4-f473559ed27c", "d4bab5f4-84db-4cdd-8a36-845c777c7077", "afd5d455-6489-4643-a71f-f8ebe31421ce",
    "a067432b-da49-4081-877b-d31f4161c517", "15f7fd17-2c1a-47c7-ac1f-c27c6b9fbc20", "3c314627-da30-4ce3-b16f-c80816aaec14",
    "74b278eb-4d1f-4ff7-b35a-0bf29c49fb62", "4c20491d-5660-48b6-80eb-943004d1f8b0", "5b93e2db-6972-4037-ad50-d913af48e762",
    "6280cb5e-91bd-4761-b655-6b88addc1345", "afce0bd2-d3b2-48ae-a8a6-9fab49e893a3", "861b44f7-4494-4574-9972-d1613d013ba1",
    "f06c971e-bbd7-4cb2-8db5-e3abbe338077", "b31ff22b-38f1-489b-a9ce-209fa91d73e6", "dacb95b4-e21c-4bb2-9269-2823cbe5a118",
  ],
  "ai-hl": [
    "7038e65e-6cf6-4f3e-b9d5-666683bb9f97", "35b51817-4a71-4b1b-9c57-056e58fe4a94", "54b5b92d-2f8a-4bbf-bf64-a9db0aa7622f",
    "84a0811a-9a01-4f18-ab5f-bf7d28f0ca9c", "948590a2-fbea-4b15-aa2f-e93f7e54e4cd", "f75bb4d1-fc72-4587-974f-2abcd54ec855",
    "41d1e966-9bb1-4436-976e-d02187f32932", "80522e92-56ee-4aa2-ae07-9e105b2efdf0", "752f518f-e2bf-4781-b9aa-51367b8b0c05",
    "d1e6ca22-dca8-4359-b0a4-610b88e5f329", "876ad43a-c778-48f2-8c79-8a3d409cfd41", "a864173f-9449-4675-bcaf-44ecc16cd9d4",
    "c6d7188a-fc5c-4552-a901-11ee186d96c1", "660e272a-8a71-4422-8450-61a7ea1d58cf", "8f385b78-d17a-4742-831b-049b78b96673",
  ],
  igcse: [
    "cbc83cb9-d117-46ea-ac62-bb7ac362394d", "de764a82-d18a-4259-8042-26a3a4a87486", "62baae37-e03d-4e49-ae83-a9c5114e54cd",
    "0cdedfbf-26ea-489e-b9ce-f8166c7ddbbc", "2933b84a-2edd-4f9e-a768-e79a27aeeae7", "bb898f99-9f38-47fc-b1ae-6587fd81284d",
    "fb79ddd5-ef05-48a7-a489-311620a88c6b", "1ec9f03e-2faf-4349-b0ee-96686806c30b", "b6a712ae-cb1e-49bd-9b61-c86995a6d6ad",
    "1b2ba545-340e-419b-a0a2-6208f342588b", "4b8eb48d-283b-46bf-8938-bc964e29c1f4", "0dfeed4d-a6d3-420f-861c-85d6ff9f765a",
    "b2a1b37c-f7ed-4d36-abfa-932da0c6c776", "116fe4a6-4c4c-4800-b173-a95d83f251b6", "c9936059-0955-4a3d-981e-64c4ca741e51",
    "81b9c335-ac60-4ca7-88f8-0f26f696266b", "20b25248-b2b7-4f5b-b270-d68567b564d7", "1a51ff2e-8cdc-4a3d-9f0b-85cf3f65e853",
  ],
};

function sampleLessons(courseId, lessons, expectedTopicCount) {
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const samples = curatedSamples[courseId] || [];
  const invalid = samples.filter((id) => !lessonById.has(id) || !practice.lessons?.[id]);
  if (invalid.length) throw new Error(`Invalid free lesson selection for ${courseId}: ${invalid.join(", ")}`);
  if (samples.length !== expectedTopicCount * 3) throw new Error(`Expected three free lessons per topic for ${courseId}`);
  for (let topic = 1; topic <= expectedTopicCount; topic += 1) {
    if (samples.filter((id) => lessonById.get(id)?.topic === topic).length !== 3) {
      throw new Error(`Expected three free lessons in topic ${topic} for ${courseId}`);
    }
  }
  return samples;
}

for (const [code, lessons] of Object.entries(library.courses || {})) {
  const id = code.toLowerCase().replaceAll(" ", "-");
  const coursePapers = papers.courses?.[code] || [];
  courses[id] = {
    lessons: lessons.map((lesson) => lesson.id),
    samples: sampleLessons(id, lessons, 5),
    pastPapers: coursePapers.flatMap((paper) => paper.questions.map((question) => question.id)),
    freePastPapers: coursePapers
      .filter((paper) => paper.session === "Specimen" || paper.session === "May 2021")
      .flatMap((paper) => paper.questions.map((question) => question.id)),
  };
}

courses.igcse = {
  lessons: (igcse.lessons || []).map((lesson) => lesson.id),
  samples: sampleLessons("igcse", igcse.lessons || [], 6),
  pastPapers: (papers.courses?.IGCSE || []).flatMap((paper) => paper.questions.map((question) => question.id)),
};

fs.mkdirSync(path.join(root, "src", "data"), { recursive: true });
fs.writeFileSync(path.join(root, "src", "data", "course-video-access.json"), `${JSON.stringify({ libraryId: String(library.libraryId), courses }, null, 2)}\n`);
