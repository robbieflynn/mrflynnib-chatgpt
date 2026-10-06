"use client";

import { useMemo, useState } from "react";

export type AssignmentQuestionSummary = {
  id: string;
  title: string;
  paper: string;
  paperNumber: string;
  marks: number | null;
  difficulty: string;
  topics: { main: string; sub: string }[];
};

export function AssignmentQuestionPicker({ questions }: { questions: AssignmentQuestionSummary[] }) {
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const topics = useMemo(() => [...new Set(questions.flatMap((question) => question.topics.map((item) => item.main)))], [questions]);
  const subtopics = useMemo(() => [...new Set(questions.flatMap((question) => question.topics.filter((item) => !topic || item.main === topic).map((item) => item.sub)))], [questions, topic]);
  const visible = useMemo(() => questions.filter((question) => {
    const matchesTopic = !topic || question.topics.some((item) => item.main === topic);
    const matchesSubtopic = !subtopic || question.topics.some((item) => item.sub === subtopic);
    const needle = search.trim().toLowerCase();
    return matchesTopic && matchesSubtopic && (!needle || `${question.title} ${question.paper} ${question.id}`.toLowerCase().includes(needle));
  }).slice(0, 100), [questions, search, subtopic, topic]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 40) next.add(id);
      return next;
    });
  }

  return (
    <div className="assignment-picker stack">
      {[...selected].map((id) => <input key={id} name="questionIds" type="hidden" value={id} />)}
      <div className="assignment-picker-toolbar">
        <label className="field"><span>Topic</span><select value={topic} onChange={(event) => { setTopic(event.target.value); setSubtopic(""); }}><option value="">All topics</option>{topics.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Subtopic</span><select value={subtopic} onChange={(event) => setSubtopic(event.target.value)}><option value="">All subtopics</option>{subtopics.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Question, paper or ID" /></label>
      </div>
      <div className="assignment-picker-summary"><strong>{selected.size} selected</strong><span>Choose up to 40 questions. Showing the first {visible.length} matches.</span></div>
      <div className="assignment-question-list">
        {visible.map((question) => {
          const checked = selected.has(question.id);
          return (
            <label className={`assignment-question ${checked ? "is-selected" : ""}`} key={question.id}>
              <input checked={checked} onChange={() => toggle(question.id)} type="checkbox" />
              <span className="assignment-question-copy"><strong>{question.title}</strong><small>{question.topics[0]?.sub || question.topics[0]?.main || "Question bank"} · {question.paper || question.id}{question.marks ? ` · ${question.marks} marks` : ""}</small></span>
              {question.difficulty ? <span className="badge">{question.difficulty}</span> : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}
