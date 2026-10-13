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
  paper: "Paper 1" | "Paper 2";
  teacherOrClass: string;
  testDate: string;
  questions: TestAnalysisQuestion[];
};

const colours = {
  navy: "0B1B3B",
  blue: "1F66B3",
  paleBlue: "EAF4FC",
  line: "CFD9E6",
  input: "FFF3CD",
  orange: "FCE5CD",
  green: "DDF4E8",
  red: "FCE1E1",
  grey: "F5F7FA",
  white: "FFFFFF",
};

const maxStudents = 40;
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
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
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
  sheet.getCell("A2").font = { name: "Arial", size: 10, color: { argb: "D7E6F7" } };
  sheet.getCell("A2").fill = solidFill(colours.navy);
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
      { type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}<=0.25)`], style: { fill: solidFill(colours.red) } },
      { type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}>0.25,${firstCell}<=0.75)`], style: { fill: solidFill(colours.orange) } },
      { type: "expression", priority: 3, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}>0.75)`], style: { fill: solidFill(colours.green) } },
    ],
  });
}

function addQuestionMarkRules(sheet: ExcelJS.Worksheet, range: string, firstCell: string, maximumCell: string) {
  sheet.addConditionalFormatting({
    ref: range,
    rules: [
      { type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}/${maximumCell}<=0.25)`], style: { fill: solidFill(colours.red) } },
      { type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}/${maximumCell}>0.25,${firstCell}/${maximumCell}<=0.75)`], style: { fill: solidFill(colours.orange) } },
      { type: "expression", priority: 3, formulae: [`AND(ISNUMBER(${firstCell}),${firstCell}/${maximumCell}>0.75)`], style: { fill: solidFill(colours.green) } },
    ],
  });
}

function formula(value: string): ExcelJS.CellFormulaValue {
  return { formula: value, result: "" };
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

  const questions = input.questions;
  const lastQuestionColumn = firstQuestionColumn + questions.length - 1;
  const totalColumn = lastQuestionColumn + 1;
  const percentageColumn = totalColumn + 1;
  const gradeColumn = percentageColumn + 1;
  const totalColumnLetter = columnName(totalColumn);
  const percentageColumnLetter = columnName(percentageColumn);
  const gradeColumnLetter = columnName(gradeColumn);
  const lastQuestionColumnLetter = columnName(lastQuestionColumn);
  const boundariesLabelColumn = 1;
  const boundariesValueColumn = 2;
  const boundariesLabelLetter = columnName(boundariesLabelColumn);
  const boundariesValueLetter = columnName(boundariesValueColumn);
  const boundariesHeadingRow = lastStudentRow + 3;
  const boundariesHeaderRow = boundariesHeadingRow + 1;
  const boundariesFirstRow = boundariesHeaderRow + 1;
  const boundariesLastThresholdRow = boundariesFirstRow + 5;
  const boundariesLastRow = boundariesFirstRow + 6;
  const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);

  const entry = workbook.addWorksheet("Marks entry", {
    views: [{ state: "frozen", ySplit: 8 }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  entry.views = [{ state: "frozen", ySplit: 8, showGridLines: false }];
  entry.properties.tabColor = { argb: colours.blue };
  styleTitle(entry, gradeColumnLetter, "IB test marks entry", "Enter student names, teacher names and marks only. All summary fields calculate automatically.");
  entry.getCell("A3").value = "Test";
  entry.getCell("B3").value = input.title;
  entry.getCell("A4").value = "Course";
  entry.getCell("B4").value = input.course;
  entry.getCell("A5").value = "Paper";
  entry.getCell("B5").value = input.paper;
  entry.getCell("B5").dataValidation = { type: "list", allowBlank: false, formulae: ['"Paper 1,Paper 2"'] };
  entry.getCell("D3").value = "Class";
  entry.getCell("E3").value = input.teacherOrClass;
  entry.getCell("D4").value = "Test date";
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
  entry.mergeCells(`${totalColumnLetter}6:${gradeColumnLetter}6`);
  entry.getCell(`${totalColumnLetter}6`).value = "Overall";
  entry.getCell(`${totalColumnLetter}7`).value = "Total";
  entry.getCell(`${percentageColumnLetter}7`).value = "%";
  entry.getCell(`${gradeColumnLetter}7`).value = "Grade";
  entry.getCell(`${totalColumnLetter}8`).value = totalMarks;
  entry.getCell(`${percentageColumnLetter}8`).value = 100;

  styleRange(entry, 6, 8, 1, gradeColumn, (cell, row, column) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: colours.navy } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = solidFill(row === 6 ? (column >= totalColumn ? colours.navy : colours.blue) : colours.paleBlue);
    if (row === 6) cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
  });
  entry.getCell("A7").alignment = { vertical: "middle", horizontal: "left" };
  entry.getCell("B7").alignment = { vertical: "middle", horizontal: "left" };
  entry.getRow(7).height = 38;

  questions.forEach((question, index) => {
    const column = firstQuestionColumn + index;
    entry.getCell(6, column).value = `Q${question.number}`;
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
  entry.getColumn(totalColumn).width = 11;
  entry.getColumn(percentageColumn).width = 11;
  entry.getColumn(gradeColumn).width = 11;
  styleRange(entry, firstStudentRow, lastStudentRow, 1, gradeColumn, (cell, _row, column) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 10, color: { argb: colours.navy } };
    cell.alignment = { vertical: "middle", horizontal: column <= 2 ? "left" : "center" };
    if (column <= 2) cell.fill = solidFill(colours.input);
  });
  for (let row = firstStudentRow; row <= lastStudentRow; row += 1) {
    entry.getCell(row, totalColumn).value = formula(`IF(COUNTA(C${row}:${lastQuestionColumnLetter}${row})=0,"",SUM(C${row}:${lastQuestionColumnLetter}${row}))`);
    entry.getCell(row, percentageColumn).value = formula(`IF(COUNT(C${row}:${lastQuestionColumnLetter}${row})=0,"",${totalColumnLetter}${row}/${totalColumnLetter}$8)`);
    entry.getCell(row, percentageColumn).numFmt = "0.0%";
    entry.getCell(row, gradeColumn).value = formula(`IF(COUNT(C${row}:${lastQuestionColumnLetter}${row})=0,"",IF(COUNT($${boundariesValueLetter}$${boundariesFirstRow}:$${boundariesValueLetter}$${boundariesLastThresholdRow})<6,"",IF(${percentageColumnLetter}${row}>=$${boundariesValueLetter}$${boundariesFirstRow},7,IF(${percentageColumnLetter}${row}>=$${boundariesValueLetter}$${boundariesFirstRow + 1},6,IF(${percentageColumnLetter}${row}>=$${boundariesValueLetter}$${boundariesFirstRow + 2},5,IF(${percentageColumnLetter}${row}>=$${boundariesValueLetter}$${boundariesFirstRow + 3},4,IF(${percentageColumnLetter}${row}>=$${boundariesValueLetter}$${boundariesFirstRow + 4},3,IF(${percentageColumnLetter}${row}>=$${boundariesValueLetter}$${boundariesLastThresholdRow},2,1))))))))`);
  }
  addPercentageRules(entry, `${percentageColumnLetter}${firstStudentRow}:${percentageColumnLetter}${lastStudentRow}`, `${percentageColumnLetter}${firstStudentRow}`);

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
    entry.getCell(row, boundariesValueColumn).numFmt = "0%";
    if (offset < 6) {
      entry.getCell(row, boundariesValueColumn).fill = solidFill(colours.input);
      entry.getCell(row, boundariesValueColumn).dataValidation = { type: "decimal", operator: "between", allowBlank: true, formulae: [0, 1] };
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
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow + 1}`).value = "Enter the six upper grade thresholds only if you want grades calculated. Leave them blank to use totals and percentages only.";
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow + 1}`).alignment = { wrapText: true, vertical: "top" };
  entry.getCell(`${boundariesLabelLetter}${boundariesNoteRow + 1}`).font = { name: "Arial", size: 9, color: { argb: colours.navy } };

  const analysis = workbook.addWorksheet("Class analysis", {
    views: [{ state: "frozen", ySplit: 7, showGridLines: false }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  analysis.properties.tabColor = { argb: "3B82C4" };
  styleTitle(analysis, "G", "Class question analysis", "This question-by-question view updates as marks are entered on the first sheet.");
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
  analysis.getRow(7).values = ["Question", "Subtopic", "Maximum", "Average mark", "Average %", "Attempted", "Teaching signal"];
  styleRange(analysis, 7, 7, 1, 7, (cell) => {
    cell.fill = solidFill(colours.navy);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
    cell.border = border();
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  questions.forEach((question, index) => {
    const row = 8 + index;
    const sourceColumn = columnName(firstQuestionColumn + index);
    analysis.getCell(row, 1).value = `Q${question.number}`;
    analysis.getCell(row, 2).value = question.subtopic || question.title;
    analysis.getCell(row, 2).note = `${question.title}\nMain topic: ${question.topic}`;
    analysis.getCell(row, 3).value = question.marks;
    analysis.getCell(row, 4).value = formula(`IF(COUNT('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow})=0,"",AVERAGE('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow}))`);
    analysis.getCell(row, 5).value = formula(`IF(COUNT('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow})=0,"",D${row}/C${row})`);
    analysis.getCell(row, 5).numFmt = "0.0%";
    analysis.getCell(row, 6).value = formula(`COUNT('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow})`);
    analysis.getCell(row, 7).value = formula(`IF(NOT(ISNUMBER(E${row})),"",IF(E${row}>0.75,"Strong",IF(E${row}>0.25,"Developing","Priority for review")))`);
  });
  const analysisLastRow = 7 + questions.length;
  styleRange(analysis, 8, analysisLastRow, 1, 7, (cell) => {
    cell.font = { name: "Arial", size: 9, color: { argb: colours.navy } };
    cell.border = border();
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  analysis.getColumn(1).width = 11;
  analysis.getColumn(2).width = 32;
  for (let column = 3; column <= 6; column += 1) analysis.getColumn(column).width = 14;
  analysis.getColumn(7).width = 22;
  addPercentageRules(analysis, `D8:G${analysisLastRow}`, "$E8");

  const feedback = workbook.addWorksheet("Student feedback", {
    views: [{ state: "frozen", ySplit: 9, showGridLines: false }],
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1, paperSize: 9, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
  });
  feedback.properties.tabColor = { argb: "79AEDD" };
  styleTitle(feedback, "F", "Student feedback", "Choose a student below, then print or save this sheet as their individual feedback page.");
  feedback.getCell("A4").value = "Student";
  feedback.getCell("A4").font = { name: "Arial", size: 10, bold: true, color: { argb: colours.navy } };
  feedback.mergeCells("B4:D4");
  feedback.getCell("B4").fill = solidFill(colours.input);
  feedback.getCell("B4").border = border();
  workbook.definedNames.add("StudentNames", `'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow}`);
  feedback.getCell("B4").dataValidation = { type: "list", allowBlank: true, showErrorMessage: true, errorTitle: "Choose a student", error: "Select a student from the list.", showInputMessage: true, promptTitle: "Student feedback", prompt: "Choose a student whose name has been entered on the Marks entry sheet.", formulae: ["StudentNames"] };
  feedback.getRow(6).values = ["Teacher", null, "Total", null, "Percentage", null];
  styleRange(feedback, 6, 7, 1, 6, (cell, row) => {
    cell.border = border();
    cell.font = { name: "Arial", size: 9, bold: row === 6, color: { argb: colours.navy } };
    if (row === 6) cell.fill = solidFill(colours.paleBlue);
  });
  feedback.getCell("A7").value = formula(`IFERROR(INDEX('Marks entry'!$B$${firstStudentRow}:$B$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getCell("C7").value = formula(`IFERROR(INDEX('Marks entry'!$${totalColumnLetter}$${firstStudentRow}:$${totalColumnLetter}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getCell("E7").value = formula(`IFERROR(INDEX('Marks entry'!$${percentageColumnLetter}$${firstStudentRow}:$${percentageColumnLetter}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
  feedback.getCell("E7").numFmt = "0.0%";
  feedback.getRow(9).values = ["Question", "Subtopic", "Score", "Out of", "%", "Feedback"];
  styleRange(feedback, 9, 9, 1, 6, (cell) => {
    cell.fill = solidFill(colours.navy);
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: colours.white } };
    cell.border = border();
  });
  questions.forEach((question, index) => {
    const row = 10 + index;
    const sourceColumn = columnName(firstQuestionColumn + index);
    feedback.getCell(row, 1).value = `Q${question.number}`;
    feedback.getCell(row, 2).value = question.subtopic || question.title;
    feedback.getCell(row, 2).note = `${question.title}\nMain topic: ${question.topic}`;
    feedback.getCell(row, 3).value = formula(`IFERROR(INDEX('Marks entry'!$${sourceColumn}$${firstStudentRow}:$${sourceColumn}$${lastStudentRow},MATCH($B$4,'Marks entry'!$A$${firstStudentRow}:$A$${lastStudentRow},0)),"")`);
    feedback.getCell(row, 4).value = question.marks;
    feedback.getCell(row, 5).value = formula(`IF(ISNUMBER(C${row}),C${row}/D${row},"")`);
    feedback.getCell(row, 5).numFmt = "0.0%";
    feedback.getCell(row, 6).value = formula(`IF(NOT(ISNUMBER(E${row})),"",IF(E${row}>0.75,"Strong performance",IF(E${row}>0.25,"Developing; revisit this subtopic","Priority for review")))`);
  });
  const feedbackLastRow = 9 + questions.length;
  styleRange(feedback, 10, feedbackLastRow, 1, 6, (cell) => {
    cell.font = { name: "Arial", size: 9, color: { argb: colours.navy } };
    cell.border = border();
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  feedback.getColumn(1).width = 11;
  feedback.getColumn(2).width = 36;
  feedback.getColumn(3).width = 13;
  feedback.getColumn(4).width = 13;
  feedback.getColumn(5).width = 13;
  feedback.getColumn(6).width = 30;
  addPercentageRules(feedback, `C10:F${feedbackLastRow}`, "$E10");
  const notesHeadingRow = feedbackLastRow + 2;
  feedback.mergeCells(`A${notesHeadingRow}:F${notesHeadingRow}`);
  feedback.getCell(`A${notesHeadingRow}`).value = "Teacher notes";
  feedback.getCell(`A${notesHeadingRow}`).fill = solidFill(colours.paleBlue);
  feedback.getCell(`A${notesHeadingRow}`).font = { name: "Arial", size: 10, bold: true, color: { argb: colours.navy } };
  feedback.mergeCells(`A${notesHeadingRow + 1}:F${notesHeadingRow + 3}`);
  feedback.getCell(`A${notesHeadingRow + 1}`).border = border();
  feedback.getCell(`A${notesHeadingRow + 1}`).alignment = { vertical: "top", wrapText: true };
  feedback.pageSetup.printArea = `A1:F${notesHeadingRow + 3}`;
  feedback.headerFooter.oddFooter = "Mr Flynn IB  •  &F  •  Page &P of &N";

  return workbook.xlsx.writeBuffer();
}
