import ExcelJS from "exceljs";

export type TestAnalysisQuestion = {
  number: number;
  title: string;
  topic: string;
  subtopic: string;
  marks: number;
  paper: string;
  section: "A" | "B";
};

export type TestAnalysisInput = {
  title: string;
  course: "AA HL" | "AA SL" | "AI HL" | "AI SL";
  paper: "Paper 1" | "Paper 2" | "Paper 1 and Paper 2";
  teacherOrClass: string;
  testDate: string;
  questions: TestAnalysisQuestion[];
};

const colours = {
  navy: "FF0B1B3B",
  blue: "FF1F66B3",
  paleBlue: "FFEAF4FC",
  line: "FFCFD9E6",
  input: "FFF1F6F9",
  orange: "FFF9CB9C",
  green: "FFB7E1CD",
  red: "FFE06666",
  grey: "FFF5F7FA",
  white: "FFFFFFFF",
};

const maxStudents = 100;
const firstStudentRow = 9;
const lastStudentRow = firstStudentRow + maxStudents - 1;
const firstQuestionColumn = 3;

function columnName(number: number) {
  let result = "";
  let current = number;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function border(style: ExcelJS.BorderStyle = "thin"): Partial<ExcelJS.Borders> {
  const side = { style, color: { argb: colours.line } };
  return { top: side, left: side, bottom: side, right: side };
}

function solidFill(argb: string): ExcelJS.Fill {
  const opaqueArgb = argb.length === 6 ? `FF${argb}` : argb;
  return { type: "pattern", pattern: "solid", fgColor: { argb: opaqueArgb }, bgColor: { argb: opaqueArgb } };
}

function styleTitle(sheet: ExcelJS.Worksheet, lastColumn: string, title: string, subtitle: string) {
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { name: "Arial", size: 20, bold: true, color: { argb: colours.white } };
  sheet.getCell("A1").fill = solidFill(colours.navy);
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 32;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getCell("A2").value = subtitle;
  sheet.getCell("A2").font = { name: "Arial", size: 10, color: { argb: "FFD7E6F7" } };
  sheet.getCell("A2").fill = solidFill(colours.navy);
  sheet.getRow(2).height = 22;
}

function styleFrozenEntryTitle(sheet: ExcelJS.Worksheet, lastColumn: string) {
  sheet.mergeCells("A1:B1");
  sheet.mergeCells(`C1:${lastColumn}1`);
  sheet.mergeCells("A2:B2");
  sheet.mergeCells(`C2:${lastColumn}2`);

  sheet.getCell("A1").value = "IB test marks entry";
  sheet.getCell("C1").value = "Question-level analysis";
  sheet.getCell("A2").value = "Student details stay visible";
  sheet.getCell("C2").value = "Enter names, teachers and question marks only. Totals, percentages and grades calculate automatically.";

  ["A1", "C1", "A2", "C2"].forEach((address) => {
    sheet.getCell(address).fill = solidFill(colours.navy);
    sheet.getCell(address).alignment = { vertical: "middle" };
  });
  ["A1", "C1"].forEach((address) => {
    sheet.getCell(address).font = { name: "Arial", size: 17, bold: true, color: { argb: colours.white } };
  });
  ["A2", "C2"].forEach((address) => {
    sheet.getCell(address).font = { name: "Arial", size: 9, color: { argb: "FFD7E6F7" } };
  });
  sheet.getRow(1).height = 30;
  sheet.getRow(2).height = 22;
}

function styleRange(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, startColumn: number, endColumn: number, apply: (cell: ExcelJS.Cell, row: number, column: number) => void) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) apply(sheet.getCell(row, column), row, column);
  }
}

function addPercentageRules(sheet: ExcelJS.Worksheet, range: string, firstCell: string) {
  sheet.addConditionalFormatting({
    ref: range,
    rules: [
      { type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}<0.32)`], style: { fill: solidFill(colours.red) } },
      { type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}>=0.32,${firstCell}<=0.70)`], style: { fill: solidFill(colours.orange) } },
      { type: "expression", priority: 3, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}>0.70)`], style: { fill: solidFill(colours.green) } },
    ],
  });
}

function addQuestionMarkRules(sheet: ExcelJS.Worksheet, range: string, firstCell: string, maximumCell: string) {
  sheet.addConditionalFormatting({
    ref: range,
    rules: [
      { type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}/${maximumCell}<0.32)`], style: { fill: solidFill(colours.red) } },
      { type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}/${maximumCell}>=0.32,${firstCell}/${maximumCell}<=0.70)`], style: { fill: solidFill(colours.orange) } },
      { type: "expression", priority: 3, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}/${maximumCell}>0.70)`], style: { fill: solidFill(colours.green) } },
    ],
  });
}

function formula(value: string): ExcelJS.CellFormulaValue {
  return { formula: value };
}

function paperLabel(value: string) {
  return /paper\s*2/i.test(value) ? "Paper 2" : "Paper 1";
}

function orderQuestions(input: TestAnalysisInput) {
  return input.questions
    .map((question, index) => ({ question, index }))
    .sort((left, right) => {
      if (input.paper === "Paper 1 and Paper 2") {
        const paperDifference = (paperLabel(left.question.paper) === "Paper 1" ? 0 : 1) - (paperLabel(right.question.paper) === "Paper 1" ? 0 : 1);
        if (paperDifference) return paperDifference;
      }
      if (input.course.startsWith("AA") && (left.question.section === "B") !== (right.question.section === "B")) return left.question.section === "B" ? 1 : -1;
      return left.index - right.index;
    })
    .map(({ question }) => question);
}

export async function buildTestAnalysisWorkbook(input: TestAnalysisInput) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Mr Flynn IB";
  workbook.company = "Mr Flynn IB";
  workbook.subject = "IB Mathematics question-level analysis";
  workbook.title = `${input.title} analysis`;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const questions = orderQuestions(input);
  const lastQuestionColumn = firstQuestionColumn + questions.length - 1;
  const summaryLabels = input.paper === "Paper 1 and Paper 2" ? ["Paper 1", "Paper 2", "Overall"] as const : ["Overall"] as const;
  const summaryGroups = summaryLabels.map((label, index) => ({
    label,
    startColumn: lastQuestionColumn + 1 + index * 3,
    questionIndexes: questions.map((question, questionIndex) => ({ question, questionIndex })).filter(({ question }) => label === "Overall" || paperLabel(question.paper) === label).map(({ questionIndex }) => questionIndex),
  }));
  const overallGroup = summaryGroups[summaryGroups.length - 1];
  const totalColumn = overallGroup.startColumn;
  const percentageColumn = totalColumn + 1;
  const gradeColumn = percentageColumn + 1;
  const totalColumnLetter = columnName(totalColumn);
  const percentageColumnLetter = columnName(percentageColumn);
  const gradeColumnLetter = columnName(gradeColumn);
  const boundariesLabelColumn = gradeColumn + 2;
  const boundariesValueColumn = boundariesLabelColumn + 1;
  const boundariesLabelLetter = columnName(boundariesLabelColumn);
  const boundariesValueLetter = columnName(boundariesValueColumn);
  const boundariesHeadingRow = firstStudentRow;
  const boundariesHeaderRow = boundariesHeadingRow + 1;
  const boundariesFirstRow = boundariesHeaderRow + 1;
  const boundariesLastThresholdRow = boundariesFirstRow + 5;
  const boundariesLastRow = boundariesFirstRow + 6;
  const entry = workbook.addWorksheet("Marks entry", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 8, topLeftCell: "C9", activeCell: "C9", showGridLines: false }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  entry.views = [{ state: "frozen", xSplit: 2, ySplit: 8, topLeftCell: "C9", activeCell: "C9", showGridLines: false }];
  entry.properties.tabColor = { argb: colours.blue };
  styleFrozenEntryTitle(entry, gradeColumnLetter);
  entry.getCell("A3").value = "Test";
  entry.getCell("B3").value = input.title;
  entry.getCell("A4").value = "Course";
  entry.getCell("B4").value = input.course;
  entry.getCell("A5").value = "Paper";
  entry.getCell("B5").value = input.paper;
  entry.getCell("B5").dataValidation = { type: "list", allowBlank: false, formulae: ['"Paper 1,Paper 2,Paper 1 and Paper 2"'] };
  entry.getCell("D3").value = "Class";
  entry.getCell("E3").value = input.teacherOrClass;
  entry.getCell("D4").value = "Test date";
  entry.mergeCells("E4:F4");
  if (input.testDate) {
    entry.getCell("E4").value = new Date(`${input.testDate}T12:00:00`);
    entry.getCell("E4").numFmt = "d mmmm yyyy";
  }
  ["A3", "A4", "A5", "D3", "D4"].forEach((address) => {
    entry.getCell(address).font = { name: "Arial", size: 10, bold: true, color: { argb: colours.navy } };
  });
  ["B3", "B4", "B5", "E3", "E4"].forEach((address) => {
    entry.getCell(address).font = { name: "Arial", size: 10, color: { argb: colours.navy } };
    entry.getCell(address).fill = solidFill(["B5", "E3", "E4"].includes(address) ? colours.input : colours.paleBlue);
    entry.getCell(address).border = border();
  });

  entry.mergeCells("A6:B6");
  entry.getCell("A6").value = "Student details";
  entry.getCell("A7").value = "Name";
  entry.getCell("B7").value = "Teacher";
  summaryGroups.forEach((group) => {
    const groupTotalColumn = group.startColumn;
    const groupPercentageColumn = groupTotalColumn + 1;
    const groupGradeColumn = groupTotalColumn + 2;
    entry.mergeCells(`${columnName(groupTotalColumn)}6:${columnName(groupGradeColumn)}6`);
    entry.getCell(6, groupTotalColumn).value = group.label;
    entry.getCell(7, groupTotalColumn).value = "Total";
    entry.getCell(7, groupPercentageColumn).value = "%";
    entry.getCell(7, groupGradeColumn).value = "Grade";
    entry.getCell(8, groupTotalColumn).value = group.questionIndexes.reduce((sum, questionIndex) => sum + questions[questionIndex].marks, 0);
    entry.getCell(8, groupPercentageColumn).value = 100;
  });

  styleRange(entry, 6, 8, 1, gradeColumn, (cell, row, column) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: colours.navy } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = solidFill(row === 6 ? (column > lastQuestionColumn ? colours.navy : colours.blue) : colours.paleBlue);
    if (row === 6) cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
  });
  entry.getCell("A7").alignment = { vertical: "middle", horizontal: "left" };
  entry.getCell("B7").alignment = { vertical: "middle", horizontal: "left" };
  entry.getRow(7).height = 38;

  questions.forEach((question, index) => {
    const column = firstQuestionColumn + index;
    entry.getCell(6, column).value = input.paper === "Paper 1 and Paper 2" ? `${paperLabel(question.paper).replace("Paper ", "P")} Q${question.number}` : `Q${question.number}`;
    entry.getCell(7, column).value = question.subtopic || question.title;
    entry.getCell(8, column).value = question.marks;
    entry.getColumn(column).width = 12;
    for (let row = firstStudentRow; row <= lastStudentRow; row += 1) {
      const cell = entry.getCell(row, column);
      cell.fill = solidFill(colours.input);
      cell.dataValidation = { type: "whole", operator: "between", allowBlank: true, showErrorMessage: true, errorTitle: "Check this mark", error: `Enter a whole number from 0 to ${question.marks}.`, formulae: [0, question.marks] };
    }
    entry.getCell(7, column).note = `${question.title}\nMain topic: ${question.topic}`;
    entry.getCell(6, column).alignment = { horizontal: "center", vertical: "middle" };
    entry.getCell(8, column).alignment = { horizontal: "center", vertical: "middle" };
    entry.getCell(7, column).font = { name: "Arial", size: 8, bold: true, color: { argb: colours.navy } };
    const columnLetter = columnName(column);
    addQuestionMarkRules(entry, `${columnLetter}${firstStudentRow}:${columnLetter}${lastStudentRow}`, `${columnLetter}${firstStudentRow}`, `${columnLetter}$8`);
  });

  entry.getColumn(1).width = 24;
  entry.getColumn(2).width = 18;
  summaryGroups.forEach((group) => {
    entry.getColumn(group.startColumn).width = 11;
    entry.getColumn(group.startColumn + 1).width = 11;
    entry.getColumn(group.startColumn + 2).width = 11;
  });
  entry.getColumn(gradeColumn + 1).width = 3;
  entry.getColumn(boundariesLabelColumn).width = 13;
  entry.getColumn(boundariesValueColumn).width = 14;
  styleRange(entry, firstStudentRow, lastStudentRow, 1, gradeColumn, (cell, _row, column) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 10, color: { argb: colours.navy } };
    cell.alignment = { vertical: "middle", horizontal: column <= 2 ? "left" : "center" };
    if (column <= 2) cell.fill = solidFill(colours.input);
  });
  for (let row = firstStudentRow; row <= lastStudentRow; row += 1) {
    summaryGroups.forEach((group) => {
      const groupTotalColumn = group.startColumn;
      const groupPercentageColumn = groupTotalColumn + 1;
      const groupGradeColumn = groupTotalColumn + 2;
      const scoreReferences = group.questionIndexes.map((questionIndex) => `${columnName(firstQuestionColumn + questionIndex)}${row}`);
      if (!scoreReferences.length) {
        entry.getCell(row, groupTotalColumn).value = "";
        entry.getCell(row, groupPercentageColumn).value = "";
        entry.getCell(row, groupGradeColumn).value = "";
        return;
      }
      const scores = scoreReferences.join(",");
      const totalCell = `${columnName(groupTotalColumn)}${row}`;
      const percentageCell = `${columnName(groupPercentageColumn)}${row}`;
      entry.getCell(row, groupTotalColumn).value = formula(`IF(COUNTA(${scores})=0,"",SUM(${scores}))`);
      entry.getCell(row, groupPercentageColumn).value = formula(`IF(COUNT(${scores})=0,"",${totalCell}/${columnName(groupTotalColumn)}$8)`);
      entry.getCell(row, groupPercentageColumn).numFmt = "0.0%";
      entry.getCell(row, groupGradeColumn).value = formula(`IF(COUNT(${scores})=0,"",IF(COUNT($${boundariesValueLetter}$${boundariesFirstRow}:$${boundariesValueLetter}$${boundariesLastThresholdRow})<6,"",IF(${percentageCell}>=$${boundariesValueLetter}$${boundariesFirstRow}/100,7,IF(${percentageCell}>=$${boundariesValueLetter}$${boundariesFirstRow + 1}/100,6,IF(${percentageCell}>=$${boundariesValueLetter}$${boundariesFirstRow + 2}/100,5,IF(${percentageCell}>=$${boundariesValueLetter}$${boundariesFirstRow + 3}/100,4,IF(${percentageCell}>=$${boundariesValueLetter}$${boundariesFirstRow + 4}/100,3,IF(${percentageCell}>=$${boundariesValueLetter}$${boundariesLastThresholdRow}/100,2,1))))))))`);
    });
  }
  summaryGroups.forEach((group) => {
    const groupPercentageLetter = columnName(group.startColumn + 1);
    addPercentageRules(entry, `${groupPercentageLetter}${firstStudentRow}:${groupPercentageLetter}${lastStudentRow}`, `${groupPercentageLetter}${firstStudentRow}`);
  });

  entry.mergeCells(`${boundariesLabelLetter}${boundariesHeadingRow}:${boundariesValueLetter}${boundariesHeadingRow}`);
  entry.getCell(`${boundariesLabelLetter}${boundariesHeadingRow}`).value = "Optional IB grade boundaries";
  entry.getCell(`${boundariesLabelLetter}${boundariesHeadingRow}`).fill = solidFill(colours.blue);
  entry.getCell(`${boundariesLabelLetter}${boundariesHeadingRow}`).font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
  entry.getCell(boundariesHeaderRow, boundariesLabelColumn).value = "Grade";
  entry.getCell(boundariesHeaderRow, boundariesValueColumn).value = "Minimum %";
  for (let offset = 0; offset < 7; offset += 1) {
    const row = boundariesFirstRow + offset;
    entry.getCell(row, boundariesLabelColumn).value = 7 - offset;
    entry.getCell(row, boundariesValueColumn).value = offset === 6 ? 0 : null;
    entry.getCell(row, boundariesValueColumn).numFmt = '0"%"';
    if (offset < 6) {
      entry.getCell(row, boundariesValueColumn).fill = solidFill(colours.input);
      entry.getCell(row, boundariesValueColumn).dataValidation = { type: "whole", operator: "between", allowBlank: true, showErrorMessage: true, errorTitle: "Check this boundary", error: "Enter a whole percentage from 0 to 100, for example 70 for 70%.", formulae: [0, 100] };
    }
  }
  styleRange(entry, boundariesHeaderRow, boundariesLastRow, boundariesLabelColumn, boundariesValueColumn, (cell, row) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 9, bold: row === boundariesHeaderRow, color: { argb: colours.navy } };
    if (row === boundariesHeaderRow) cell.fill = solidFill(colours.paleBlue);
  });
  const boundariesNoteRow = boundariesLastRow + 2;
  entry.mergeCells(`${boundariesLabelLetter}${boundariesNoteRow}:${boundariesValueLetter}${boundariesNoteRow}`);
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow}`).value = "How to use";
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow}`).font = { name: "Arial", size: 9, bold: true, color: { argb: colours.navy } };
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow}`).fill = solidFill(colours.grey);
  entry.mergeCells(`${boundariesLabelLetter}${boundariesNoteRow + 1}:${boundariesValueLetter}${boundariesNoteRow + 3}`);
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow + 1}`).value = "Enter the six upper grade thresholds as whole percentages (for example, enter 70 for 70%). Grades update automatically. Leave them blank to use totals and percentages only.";
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow + 1}`).alignment = { wrapText: true, vertical: "top" };
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow + 1}`).font = { name: "Arial", size: 9, color: { argb: colours.navy } };

  const analysis = workbook.addWorksheet("Class analysis", {
    views: [{ state: "frozen", ySplit: 7, showGridLines: false }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  analysis.properties.tabColor = { argb: "FF3B82C4" };
  styleTitle(analysis, "H", "Class question analysis", "This question-by-question view updates as marks are entered on the first sheet.");
  [["A4", "Students entered"], ["C4", "Class average"], ["E4", "Highest"], ["G4", "Lowest"]].forEach(([address, label]) => {
    const cell = analysis.getCell(address);
    cell.value = label;
    cell.fill = solidFill(colours.paleBlue);
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: colours.navy } };
    cell.border = border();
  });
  analysis.getCell("A5").value = formula(`COUNTA('Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow})`);
  analysis.getCell("C5").value = formula(`IF(COUNT('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow})=0,"",AVERAGE('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow}))`);
  analysis.getCell("E5").value = formula(`IF(COUNT('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow})=0,"",MAX('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow}))`);
  analysis.getCell("G5").value = formula(`IF(COUNT('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow})=0,"",MIN('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow}))`);
  ["C5", "E5", "G5"].forEach((address) => { analysis.getCell(address).numFmt = "0.0%"; });
  ["A5", "C5", "E5", "G5"].forEach((address) => { analysis.getCell(address).border = border(); });
  analysis.getRow(7).values = ["Paper", "Question", "Subtopic", "Maximum", "Average mark", "Average %", "Attempted", "Teaching signal"];
  styleRange(analysis, 7, 7, 1, 8, (cell) => {
    cell.fill = solidFill(colours.navy);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
    cell.border = border();
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  questions.forEach((question, index) => {
    const row = 8 + index;
    const sourceColumn = columnName(firstQuestionColumn + index);
    analysis.getCell(row, 1).value = input.paper === "Paper 1 and Paper 2" ? paperLabel(question.paper) : input.paper;
    analysis.getCell(row, 2).value = `Q${question.number}`;
    analysis.getCell(row, 3).value = question.subtopic || question.title;
    analysis.getCell(row, 3).note = `${question.title}\nMain topic: ${question.topic}`;
    analysis.getCell(row, 4).value = question.marks;
    analysis.getCell(row, 5).value = formula(`IF(COUNT('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow})=0,"",AVERAGE('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow}))`);
    analysis.getCell(row, 5).numFmt = "0.00";
    analysis.getCell(row, 6).value = formula(`IF(COUNT('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow})=0,"",E${row}/D${row})`);
    analysis.getCell(row, 6).numFmt = "0.0%";
    analysis.getCell(row, 7).value = formula(`COUNT('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow})`);
    analysis.getCell(row, 8).value = formula(`IF(NOT(ISNUMBER(F${row})),"",IF(F${row}>0.70,"Strong",IF(F${row}>=0.32,"Developing","Priority for review")))`);
  });
  const analysisLastRow = 7 + questions.length;
  styleRange(analysis, 8, analysisLastRow, 1, 8, (cell) => {
    cell.font = { name: "Arial", size: 9, color: { argb: colours.navy } };
    cell.border = border();
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  analysis.getColumn(1).width = 12;
  analysis.getColumn(2).width = 11;
  analysis.getColumn(3).width = 32;
  for (let column = 4; column <= 7; column += 1) analysis.getColumn(column).width = 14;
  analysis.getColumn(8).width = 22;
  addPercentageRules(analysis, `E8:H${analysisLastRow}`, "$F8");

  const feedback = workbook.addWorksheet("Student feedback", {
    views: [{ state: "frozen", ySplit: 9, showGridLines: false }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  });
  feedback.properties.tabColor = { argb: "FF79AEDD" };
  styleTitle(feedback, "H", "Student feedback", "Choose a student below, then print or save this sheet as their individual feedback page.");
  feedback.getCell("A4").value = "Student";
  feedback.getCell("A4").font = { name: "Arial", size: 10, bold: true, color: { argb: colours.navy } };
  feedback.mergeCells("B4:D4");
  feedback.getCell("B4").fill = solidFill(colours.input);
  feedback.getCell("B4").border = border();
  workbook.definedNames.add(`'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow}`, "StudentNames");
  feedback.getCell("B4").dataValidation = { type: "list", allowBlank: true, showErrorMessage: true, errorTitle: "Choose a student", error: "Select a student from the list.", showInputMessage: true, promptTitle: "Student feedback", prompt: "Choose a student whose name has been entered on the Marks entry sheet.", formulae: ["StudentNames"] };
  feedback.getRow(6).values = ["Teacher", null, "Total", null, "Percentage", null, "Grade", null];
  styleRange(feedback, 6, 7, 1, 8, (cell, row) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 9, bold: row === 6, color: { argb: colours.navy } };
    if (row === 6) cell.fill = solidFill(colours.paleBlue);
  });
  feedback.getCell("A7").value = formula(`IFERROR(INDEX('Marks entry'!$B$${firstStudentRow}:$B$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getCell("C7").value = formula(`IFERROR(INDEX('Marks entry'!$${totalColumnLetter}$${firstStudentRow}:$${totalColumnLetter}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getCell("E7").value = formula(`IFERROR(INDEX('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getCell("E7").numFmt = "0.0%";
  feedback.getCell("G7").value = formula(`IFERROR(INDEX('Marks entry'!$${gradeColumnLetter}$${firstStudentRow}:$${gradeColumnLetter}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getRow(9).values = ["Paper", "Question", "Subtopic", "Score", "Out of", "%"];
  styleRange(feedback, 9, 9, 1, 6, (cell) => {
    cell.fill = solidFill(colours.navy);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
    cell.border = border();
  });
  questions.forEach((question, index) => {
    const row = 10 + index;
    const sourceColumn = columnName(firstQuestionColumn + index);
    feedback.getCell(row, 1).value = input.paper === "Paper 1 and Paper 2" ? paperLabel(question.paper) : input.paper;
    feedback.getCell(row, 2).value = `Q${question.number}`;
    feedback.getCell(row, 3).value = question.subtopic || question.title;
    feedback.getCell(row, 3).note = `${question.title}\nMain topic: ${question.topic}`;
    feedback.getCell(row, 4).value = formula(`IFERROR(INDEX('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
    feedback.getCell(row, 5).value = question.marks;
    feedback.getCell(row, 6).value = formula(`IF(ISNUMBER(D${row}),D${row}/E${row},"")`);
    feedback.getCell(row, 6).numFmt = "0.0%";
  });
  const feedbackLastRow = 9 + questions.length;
  styleRange(feedback, 10, feedbackLastRow, 1, 6, (cell) => {
    cell.font = { name: "Arial", size: 9, color: { argb: colours.navy } };
    cell.border = border();
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  feedback.getColumn(1).width = 12;
  feedback.getColumn(2).width = 11;
  feedback.getColumn(3).width = 36;
  feedback.getColumn(4).width = 13;
  feedback.getColumn(5).width = 13;
  feedback.getColumn(6).width = 13;
  feedback.getColumn(7).width = 11;
  feedback.getColumn(8).width = 6;
  addPercentageRules(feedback, `D10:F${feedbackLastRow}`, "$F10");
  feedback.pageSetup.printArea = `A1:H${feedbackLastRow}`;
  feedback.headerFooter.oddFooter = "Mr Flynn IB  •  &F  •  Page &P of &N";

  return workbook.xlsx.writeBuffer();
}
