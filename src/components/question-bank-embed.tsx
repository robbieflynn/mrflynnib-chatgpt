type QuestionBankEmbedProps = {
  course: "AA HL" | "AA SL";
};

export function QuestionBankEmbed({ course }: QuestionBankEmbedProps) {
  const query = new URLSearchParams({ course, embedded: "1" });

  return (
    <iframe
      className="qb-bank-frame"
      loading="eager"
      src={`/question-bank/bank.html?${query.toString()}`}
      title={`${course} question bank`}
    />
  );
}
