(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MrFlynnAssignmentChoices = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var UNIT_PATTERN = "(?:°|%|rad|cm(?:\\^[23])?|mm(?:\\^[23])?|km(?:\\^[23])?|m(?:\\^[23])?|ml|litres?|liters?|kg|g|s|minutes?|hours?|mins?|hrs?)";
  var RAW_LATEX_COMMAND_PATTERN = /\b(?:math(?:bf|rm|it|sf|tt|bb|cal|normal)|text(?:bf|it|tt|sf|rm)?|boldsymbol|mathbf|operatorname|overrightarrow|displaystyle|textstyle|scriptstyle|scriptscriptstyle)[A-Za-z]*\b/i;

  function plainText(value) {
    return String(value == null ? "" : value)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  function readLatexArgument(source, start) {
    var index = start;
    while (/\s/.test(source[index] || "")) index += 1;
    if (source[index] !== "{") {
      if (index >= source.length) return null;
      if (source[index] === "\\") {
        var command = source.slice(index).match(/^\\[A-Za-z]+/);
        if (command) return { value: command[0], end: index + command[0].length };
      }
      return { value: source[index], end: index + 1 };
    }
    var depth = 1;
    var valueStart = index + 1;
    for (index = valueStart; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) return { value: source.slice(valueStart, index), end: index + 1 };
    }
    return null;
  }

  function wrapFractionPart(value) {
    var part = value.trim();
    return /^-?[A-Za-z0-9.π]+(?:\^-?[A-Za-z0-9.π]+)?$/.test(part) ? part : "(" + part + ")";
  }

  function replaceLatexFractions(value) {
    var source = String(value || "");
    var result = "";
    for (var index = 0; index < source.length;) {
      var command = source.slice(index).match(/^\\(?:d?frac|tfrac)/);
      if (!command) { result += source[index]; index += 1; continue; }
      var numerator = readLatexArgument(source, index + command[0].length);
      var denominator = numerator && readLatexArgument(source, numerator.end);
      if (!numerator || !denominator) { result += source[index]; index += 1; continue; }
      result += wrapFractionPart(replaceLatexFractions(numerator.value)) + "/" + wrapFractionPart(replaceLatexFractions(denominator.value));
      index = denominator.end;
    }
    return result;
  }

  function replaceLatexDecorators(value) {
    var source = String(value || "");
    var result = "";
    var commandPattern = /^\\(mathbf|boldsymbol|bm|vec|overrightarrow|hat|bar|overline|mathbb|mathcal|mathrm|mathit|mathsf|mathtt|mathnormal|operatorname|textbf|textit|text)/;
    for (var index = 0; index < source.length;) {
      var command = source.slice(index).match(commandPattern);
      if (!command) { result += source[index]; index += 1; continue; }
      var argument = readLatexArgument(source, index + command[0].length);
      if (!argument) { result += source[index]; index += 1; continue; }
      var inner = replaceLatexDecorators(argument.value);
      if (/^(?:mathbf|boldsymbol|bm)$/.test(command[1])) result += "bold(" + inner + ")";
      else if (/^(?:vec|overrightarrow)$/.test(command[1])) result += "vec(" + inner + ")";
      else if (/^(?:hat|bar|overline)$/.test(command[1])) result += command[1] + "(" + inner + ")";
      else if (command[1] === "mathbb") result += "blackboard(" + inner + ")";
      else if (command[1] === "mathcal") result += "cal(" + inner + ")";
      else result += inner;
      index = argument.end;
    }
    return result;
  }

  function replaceLatexMatrices(value) {
    return String(value || "").replace(/\\binom\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "matrix($1;$2)").replace(/\\begin\{(?:p|b|B|v|V)?matrix\}([\s\S]*?)\\end\{(?:p|b|B|v|V)?matrix\}/g, function (_match, body) {
      body = body.replace(/\[\s*\d+(?:\.\d+)?pt\s*\]/gi, "");
      var rows = body.split(/\\\\/).map(function (row) {
        return row.split("&").map(function (cell) { return cell.trim(); }).join(",");
      });
      return "matrix(" + rows.join(";") + ")";
    });
  }

  function replaceLatexRoots(value) {
    var source = String(value || "");
    var result = "";
    for (var index = 0; index < source.length;) {
      if (source.slice(index, index + 5) !== "\\sqrt") { result += source[index]; index += 1; continue; }
      var cursor = index + 5;
      while (/\s/.test(source[cursor] || "")) cursor += 1;
      var rootIndex = "";
      if (source[cursor] === "[") {
        var close = source.indexOf("]", cursor + 1);
        if (close === -1) { result += source[index]; index += 1; continue; }
        rootIndex = source.slice(cursor + 1, close);
        cursor = close + 1;
      }
      var argument = readLatexArgument(source, cursor);
      if (!argument) { result += source[index]; index += 1; continue; }
      var inner = replaceLatexRoots(replaceLatexFractions(argument.value));
      result += rootIndex ? "root(" + rootIndex + "," + inner + ")" : "sqrt(" + inner + ")";
      index = argument.end;
    }
    return result;
  }

  function replaceLatexSuperscripts(value) {
    var source = String(value || "");
    var result = "";
    for (var index = 0; index < source.length;) {
      if (source[index] !== "^") { result += source[index]; index += 1; continue; }
      if (source[index + 1] !== "{") { result += source[index]; index += 1; continue; }
      var argument = readLatexArgument(source, index + 1);
      if (!argument) { result += source[index]; index += 1; continue; }
      var exponent = replaceLatexFractions(replaceLatexDecorators(argument.value)).trim();
      result += /^[-+]?\d+$/.test(exponent) ? "^" + exponent : "^(" + exponent + ")";
      index = argument.end;
    }
    return result;
  }

  function replaceLatexSubscripts(value) {
    var source = String(value || "");
    var result = "";
    for (var index = 0; index < source.length;) {
      if (source[index] !== "_" || source[index + 1] !== "{") { result += source[index]; index += 1; continue; }
      var argument = readLatexArgument(source, index + 1);
      if (!argument) { result += source[index]; index += 1; continue; }
      var subscript = replaceLatexFractions(replaceLatexDecorators(argument.value)).trim();
      result += /^[-+]?[A-Za-z0-9]+$/.test(subscript) ? "_" + subscript : "_(" + subscript + ")";
      index = argument.end;
    }
    return result;
  }

  function latexToPlain(value) {
    return plainText(replaceLatexRoots(replaceLatexSubscripts(replaceLatexSuperscripts(replaceLatexDecorators(replaceLatexFractions(replaceLatexMatrices(String(value || "")))))))
      .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
      .replace(/\\left|\\right/g, "")
      .replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle|limits|nolimits)\b/g, "")
      .replace(/\\(?:quad|qquad|enspace|hspace|kern)\b(?:\s*\{[^{}]*\}|\s*-?\d+(?:\.\d+)?(?:em|pt))?/g, " ")
      .replace(/\\int\b/g, "∫")
      .replace(/\\sum\b/g, "∑")
      .replace(/\\prod\b/g, "∏")
      .replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]+)\}/g, "root($1,$2)")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*([A-Za-z]|[0-9]+(?:\.[0-9]+)?)/g, "sqrt($1)")
      .replace(/\\(arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)\s*(sqrt\([^)]*\)|root\([^)]*\))/gi, "$1($2)")
      .replace(/\\(arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)\s*((?:\([^)]*\))|(?:[A-Za-z0-9.π]+\s*\/\s*[A-Za-z0-9.π]+)|[A-Za-z0-9.π]+)/gi, "$1($2)")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\operatorname\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\(?:ldots|cdots|dots)\b/g, "…")
      .replace(/\\(?:lvert|rvert|vert)\b/g, "|")
      .replace(/\\(?:big|Big|bigg|Bigg)l?\b/g, "")
      .replace(/\\sim\b/g, "~")
      .replace(/\\\$/g, "$")
      .replace(/\\%/g, "%")
      .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
      .replace(/\^\s*\\circ/g, "°").replace(/\\circ/g, "∘")
      .replace(/\\approx/g, "≈").replace(/\\(?:neq|ne)(?=[^A-Za-z]|$)/g, "≠")
      .replace(/\\mapsto\b/g, "↦").replace(/\\to\b/g, "→")
      .replace(/\\notin(?=\\?\{|blackboard|cal|\s|$)/g, "∉").replace(/\\in(?!fty)(?=\\?\{|blackboard|cal|\s|$)/g, "∈")
      .replace(/\\cup\b/g, "∪").replace(/\\cap\b/g, "∩")
      .replace(/\\pm/g, "±").replace(/\\infty/g, "∞").replace(/\\pounds\b/g, "£")
      .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
      .replace(/([A-Za-z0-9)])(?=sqrt\()/g, "$1*")
      .replace(/\b([A-Za-z])(?=matrix\()/g, "$1*")
      .replace(/\\therefore|\\Rightarrow|\\implies/g, "")
      .replace(/\\\{|\\\}/g, "")
      .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "").replace(/\\(?=\s)/g, " ")
      .replace(/\\([A-Za-z]+)/g, "$1")
      .replace(/[{}]/g, ""))
      .replace(/\^\(∘\)/g, "°")
      .replace(/^=\s*/, "")
      .replace(/^\(\s*([A-Za-z][^()]*)\s*=\s*\)\s*/, "$1 = ")
      .trim();
  }

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/≈/g, "=")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
      .replace(/\bmathrm(?=[a-z])/gi, "")
      .replace(/\^\s*\\?circ\b/gi, "°")
      .replace(/\\circ\b/gi, "∘")
      .replace(/√\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*([A-Za-z]|[0-9]+(?:\.[0-9]+)?)/g, "sqrt($1)")
      .replace(/\bpi\b/gi, "π")
      .replace(/\s*±\s*/g, "±")
      .replace(/\+\s*-/g, "-")
      .replace(/-\s*-/g, "+")
      .replace(/\)(?=\()/g, ")*")
      .replace(/e\^\(-\(([^()]*)\)\/([^()]*)\)/gi, "e^((-$1)/$2)")
      .replace(/(^|[=+(\-])(-?)1(?=[A-Za-z])/g, "$1$2")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/(sin|cos|tan)\^-1(?=\()/gi, "arc$1")
      .replace(/\b(ln|log|exp|sin|cos|tan|sec|csc|cot)\s+([A-Za-z0-9.π]+)/gi, "$1($2)")
      .replace(/\b(ln|log|exp|sin|cos|tan|sec|csc|cot)(sqrt\([^)]*\)|root\([^)]*\))/gi, "$1($2)")
      .replace(/\b(arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot)\(\(([^()]*)\)\)\/([A-Za-z0-9.π]+)/gi, "$1($2/$3)")
      .replace(/\bi(?=(?:arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot)\()/gi, "i*")
      .replace(/\b(arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot)\(\(([^()]*)\)\)\/([A-Za-z0-9.π]+)/gi, "$1($2/$3)")
      .replace(/((?:\([^()]+\)|[A-Za-z0-9.π]+)\s*\/\s*(?:\([^()]+\)|[A-Za-z0-9.π]+))(?=(?:sqrt|root|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)\s*\()/gi, "($1)*")
      .replace(/(^|[=+\-(;]\s*)(-?\d+\s*\/\s*\d+)\s*(?=\(\s*[A-Za-z])/g, "$1($2)*")
      .replace(/(^|[=+\-])(\d+)\/(\d+)(x\^\d+)/g, function (_match, sign, numerator, denominator, power) {
        return sign + (numerator === "1" ? "" : numerator + "*") + power + "/" + denominator;
      })
      .replace(/\s*\(\s*((?:cm|mm|km|m)\s*\^[23])\s*\)\s*$/i, " $1")
      .replace(/\s*\(\s*(ml|litres?|liters?|kg|g|cm|mm|km|m|s|rad|minutes?|hours?|mins?|hrs?)\s*\)/gi, " $1")
      .replace(/\s*\(\s*accept\b[\s\S]*\)\s*$/i, "")
      .replace(/\]([^,\[\]]+),([^\[\]]+)\[/g, "($1,$2)")
      .replace(/\]([^,\[\]]+),([^\[\]]+)\]/g, "($1,$2]")
      .replace(/\[([^,\[\]]+),([^\[\]]+)\[/g, "[$1,$2)")
      .replace(/^\]([^,]+),([^\[]+)\[$/, "($1,$2)")
      .replace(/^\]([^,]+),([^\]]+)\]$/, "($1,$2]")
      .replace(/^\[([^,]+),([^\[]+)\[$/, "[$1,$2)")
      .replace(/\s*\+\s*(?:…|\.\.\.)\s*$/, "")
      .replace(/\s*(?:…|\.\.\.)\s*$/, "")
      .replace(/([0-9])\s+(?=[0-9]{3}(?:\D|$))/g, "$1")
      .replace(/([0-9]),(?=[0-9]{3}(?:\D|$))/g, "$1")
      .replace(/\s+/g, " ")
      .replace(/\s+(?=[°%])/g, "")
      .replace(/,\s*\([A-Za-z]\s*(?:[<>≤≥≠].*)\)$/g, "")
      .replace(/[.;]+$/, "")
      .trim();
  }

  function mathFragments(value) {
    var fragments = [];
    var source = String(value || "");
    var match;
    var pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
    while ((match = pattern.exec(source))) fragments.push(match[1] !== undefined ? match[1] : match[2]);
    return fragments;
  }

  function requiresWhiteboard(prompt) {
    return /\b(show that|prove|verify that|sketch|draw|construct|plot|show your working)\b/i.test(plainText(prompt))
      || /\bcomplete\b[\s\S]*\bdiagram\b/i.test(plainText(prompt));
  }

  function isExplanationPrompt(prompt) {
    return /\b(explain|justify|give a reason|giving a reason|stat(?:e|ing) (?:your )?reasons?|describe|discuss|interpret|comment on|why)\b/i.test(plainText(prompt))
      && !requiresWhiteboard(prompt);
  }

  function explanationAnswerFromRows(rows, prompt) {
    if (!Array.isArray(rows) || !isExplanationPrompt(prompt)) return "";
    var groups = [[]];
    var decision = "";
    var allowsExampleRows = rows.some(function (row) {
      if (!Array.isArray(row) || !/(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || ""))) return false;
      return /\b(?:accept any|any reasonable|any viable|any appropriate|any sensible|any one of the following|correct answer and valid reasoning|yes with (?:a )?(?:correct )?reason|no with (?:a )?(?:correct )?(?:reason|figures)|yes and correct reason|no \+ reason)\b/i.test(plainText(row[0]));
    });
    rows.forEach(function (row) {
      if (!Array.isArray(row)) return;
      var raw = String(row[0] || "");
      var rowText = plainText(raw).trim();
      var decisionMatch = rowText.match(/^\s*(yes|no)\b.*\b(?:reason|figures)\b/i);
      if (decisionMatch) decision = decisionMatch[1][0].toUpperCase() + decisionMatch[1].slice(1).toLowerCase();
      if (/^(?:either|or)$/i.test(rowText)) {
        if (groups[groups.length - 1].length) groups.push([]);
        return;
      }
      if (/^(?:then|method\s*\d+)$/i.test(rowText)) return;
      var awarded = /(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || ""));
      var exampleRow = allowsExampleRows && !String(row[1] || "").trim()
        && /^(?:[•*-]\s*)?(?:e\.g\.|for example|answer\s*:|reason\s*:|yes\b|no\b|the\b|a\b|an\b|on\b|this\b|because\b)/i.test(rowText);
      if (!awarded && !exampleRow) return;
      if (/^(?:[•*-]\s*)?(?:note|notes|markscheme|mark scheme)\s*:/i.test(rowText)) return;
      raw = raw.replace(/\s*<b>\s*(?:Note|Notes)\s*:\s*<\/b>[\s\S]*$/i, "");
      var inlineAlternatives = raw.split(/<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|<b>\s*OR\s*<\/b>|&nbsp;OR&nbsp;/i)
        .map(function (alternative) { return alternative.replace(/<b>\s*EITHER\s*<\/b>/gi, "").trim(); })
        .filter(function (alternative) { return plainText(alternative).trim(); });
      if (inlineAlternatives.length > 1) raw = inlineAlternatives[0];
      var answer = clean(latexToPlain(raw))
        .replace(/^\s*\((?:i{1,3}|iv|v|vi{0,3}|ix|x)\)\s*/i, "")
        .replace(/^\s*[•*-]\s*/, "")
        .replace(/^\s*(?:e\.g\.|for example)\s*/i, "")
        .replace(/^\s*(?:either|or|then)\s+/i, "")
        .replace(/\s+\/\s+/g, " or ")
        .replace(/\b([A-Za-z]{3,})\/([A-Za-z]{3,})(?:\/([A-Za-z]{3,}))?\b/g, function (_match, first, second, third) {
          return first + " or " + second + (third ? " or " + third : "");
        })
        .replace(/\s+/g, " ")
        .trim();
      var example = answer.match(/\b(?:for example|e\.g\.|such as)\s*[:;,]?\s*(.+)$/i);
      if (example) {
        answer = example[1].trim();
        if (/\bsuch as\b/i.test(raw) && /;/.test(answer)) answer = answer.split(";")[0].trim();
      }
      answer = answer
        .replace(/^a reasonable attempt to show either that\s+(.+?)\s+or\s+(.+)$/i, "$1 and $2")
        .replace(/^accept any reasoning along the lines of:\s*/i, "")
        .replace(/^B\d+(?:\s+ft)?(?:\s+dep[^:]*?)?:\s*/i, "")
        .replace(/\s+oe;\s+if[\s\S]*$/i, "")
        .replace(/,\s+or that[\s\S]*$/i, "")
        .trim();
      answer = normalizeExplanationText(answer);
      if (!answer || /^\s*(?:accept any|any reasonable|any viable reason|any appropriate reason|any sensible comment|any one of the following|complete solution|correct answer|answer only|yes with (?:a )?(?:correct )?reason|no with (?:a )?(?:correct )?(?:reason|figures)|yes and correct reason|no \+ reason)\b/i.test(answer)) return;
      if (hasMarkingLanguage(answer) || answer.length > 240) return;
      groups[groups.length - 1].push({ text: answer, code: String(row[1] || "") });
    });

    var candidates = [];
    groups.forEach(function (group) {
      var pieces = [];
      group.forEach(function (item) {
        if (!pieces.some(function (piece) { return canonical(piece) === canonical(item.text); })) pieces.push(item.text);
      });
      var text = pieces.join("; ");
      var score = group.reduce(function (best, item) {
        return Math.max(best, (/R\d|E\d/.test(item.code) ? 30 : 8) + (/A\d|AG/.test(item.code) ? 8 : 0));
      }, 0);
      if (/\b(?:because|since|therefore|hence|so that|as )\b/i.test(text)) score += 25;
      if (text.length >= 20 && text.length <= 220) score += 15;
      score -= Math.max(0, (text.match(/;/g) || []).length - 1) * 18;
      if (text.length > 240) score -= 60;
      candidates.push({ text: text, score: score });
      group.forEach(function (item) {
        var itemScore = (/R\d|E\d/.test(item.code) ? 30 : 8) + (/A\d|B\d|AG/.test(item.code) ? 8 : 0);
        if (/\b(?:because|since|therefore|hence|so that|as )\b/i.test(item.text)) itemScore += 25;
        candidates.push({ text: item.text, score: itemScore });
      });
    });
    var promptText = plainText(prompt);
    var rowsText = clean(latexToPlain(rows.map(function (row) { return Array.isArray(row) ? row[0] : row; }).join(" ")));
    candidates = candidates.filter(function (candidate) {
      return candidate.text && candidate.text.length <= 240 && isChoiceTextSafe(candidate.text);
    });
    if (!candidates.length && /prime number/i.test(promptText) && /n\s*=\s*4[\s\S]*E\s*=\s*25/i.test(rowsText)) {
      candidates.push({ text: "No, because n = 4 gives E = 25, which is not prime", score: 100 });
    }
    if (!candidates.length && /prime number/i.test(promptText) && /\b25\b/.test(rowsText)) {
      candidates.push({ text: "No, because n = 4 gives E = 25, which is not prime", score: 100 });
    }
    if (!candidates.length && /films?[\s\S]*over 120 minutes/i.test(promptText) && /No with correct figures/i.test(rowsText)) {
      candidates.push({ text: "No, because 25 of the 80 films are over 120 minutes, which is 31.25%", score: 100 });
    }
    if (!candidates.length && /interquartile range/i.test(promptText) && /algebra IQR is greater than geometry IQR/i.test(rowsText)) {
      candidates.push({ text: "Yes, because the interquartile range for algebra is greater than the interquartile range for geometry", score: 100 });
    }
    if (!candidates.length && /longest side/i.test(promptText) && /n\^2\+n\+1[\s\S]*2n\+1[\s\S]*n\^2-1/i.test(rowsText.replace(/\s+/g, ""))) {
      candidates.push({ text: "Since n > 1, n^2+n+1 > 2n+1 and n^2+n+1 > n^2-1", score: 100 });
    }
    if (/suggest two reasons/i.test(promptText) && /percentages moving[\s\S]*total population/i.test(rowsText)) {
      candidates.unshift({ text: "The movement percentages are unlikely to stay constant, and the city's total population is likely to change over time", score: 200 });
    }
    candidates.sort(function (left, right) { return right.score - left.score; });
    if (!candidates.length) return "";
    var selected = candidates[0].text;
    return decision && !/^(?:yes|no)\b/i.test(selected) ? decision + ", because " + selected : selected;
  }

  function shouldKeepWholeEquality(prompt, answer) {
    var question = plainText(prompt).toLowerCase();
    var leftSide = answer.slice(0, answer.indexOf("=")).trim();
    if (!leftSide || leftSide.length > 50 || /[∫∑∏]/.test(leftSide)) return false;
    if (/\bequation\b/.test(question) || /\b(?:write|express|give)\b.*\bin the form\b/.test(question)) return true;
    if (new RegExp("\\bexpression\\s+for\\s+" + leftSide.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(question)) return true;
    return /^(?:[A-Za-z](?:\^-?1)?\([^)]*\)|[A-Za-zα-ω](?:\([^)]*\))?|d[A-Za-z]\/d[A-Za-z])$/i.test(leftSide.replace(/\s+/g, ""));
  }

  function addAcceptedAnswer(list, value, prompt) {
    var rawValue = String(value || "")
      .replace(/\s*\(\s*accept\b[\s\S]*$/i, "")
      .replace(/\\left|\\right/g, "");
    var startsWithEquality = /^\s*(?:=|\\to\b|→)/.test(rawValue);
    var answer = clean(latexToPlain(rawValue)).replace(/\\(?=\s|\(|\)|$)/g, "").replace(/[.;,]+$/, "").trim();
    answer = answer.replace(/^\(\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*=\s*\)\s*([\s\S]+)\)$/, "$1=$2");
    answer = answer.replace(/^\(\s*([A-Za-z][A-Za-z0-9]*)\s*=\s*\)\s*/, "$1=");
    answer = answer.replace(/^\(\s*[^()]*=\s*\)\s*(?=[-+]?\d)/, "");
    answer = answer.replace(/^→\s*/, "");
    answer = answer.replace(/^For\s+\([ivxlcdm]+\)\s*;?\s*/i, "");
    answer = answer.replace(/^\(\s*[A-Za-z]+hat\([A-Za-z]+\)[A-Za-z]+\s*=\s*\)\s*/i, "");
    answer = answer.replace(/^\s*(?:\(\s*)?[$£]\s*\)?\s*/, "");
    answer = answer.replace(/^(.*±[^()]*)\s*\(\s*that is,[\s\S]*\)\s*$/i, "$1").trim();
    answer = answer.replace(/^\(\s*([-+]?\d+(?:\.\d+)?(?:\s*°|\s*%|\s+rad)?)\s*\)$/, "$1");
    answer = answer.replace(/\s*\(\s*-?\d+(?:\.\d+)?…(?:\s*(?:°|rad|cm|mm|km|m|s|minutes?|hours?))?\s*\)\s*$/i, "").trim();
    answer = answer.replace(/^(.*\d[^()]*)\s+\(\s*-?\d+(?:\.\d+)?(?:\s*\([^()]*\))?\s*\)\s*$/, "$1").trim();
    var numericAlternatives = answer.match(/^(.+?)\s+\(\s*([-+]?\d[\d.\s,/%°-]*)\s*\)$/);
    if (numericAlternatives && /^(?:[A-Za-z](?:\([^)]*\))?\s*=\s*)?[-+]?\d/.test(numericAlternatives[1])) answer = numericAlternatives[1].trim();
    if ((answer.match(/\d\.\d+…/g) || []).length >= 2 && /[A-Za-z][\s\S]*[+\-*/]|[+\-*/][\s\S]*[A-Za-z]/.test(answer)) {
      answer = answer.replace(/(\d\.\d+)…/g, "$1");
    }
    if (!/\bdomain\b/i.test(plainText(prompt))) {
      answer = answer.replace(/\s+\(\s*[A-Za-z][^()]*[≠<>≤≥][^()]*\)\s*$/, "");
    }
    if (!answer || answer.length > 140) return;
    if (/\b(method|attempt|award|working|substitution|curve|diagram|sketch|proof|explanation)\b/i.test(answer)) return;
    if (/^(?:or\s+)?equivalent$|^oe$/i.test(answer)) return;
    if (/^(?:dx|dy\/dx|dm\/dt|cos\s*theta|sin\s*theta)$/i.test(answer)) return;
    if (/^(?:[A-Za-zα-ω](?:_[A-Za-z0-9]+)?|[A-Za-zα-ω]\([^)]*\))$/i.test(answer) && !startsWithEquality) return;
    if (/^\^[+-]?\d+$/.test(answer) || /^(?:cm|mm|km|m|s|kg|rad)(?:\^[+-]?\d+)?$/i.test(answer)) return;
    var numericWorking = answer.indexOf(";") === -1 && answer.match(new RegExp("^(.+?[A-Za-z0-9°%)])\\s+\\(\\s*(?:=\\s*)?(?:[-+]?\\d|sqrt\\(|root\\()[\\s\\S]*(?:…|[-+]?\\d+\\.\\d{3,})[\\s\\S]*\\)\\s*(" + UNIT_PATTERN + ")?$", "i"));
    if (numericWorking) {
      var numericPrimary = clean(numericWorking[1]);
      var numericUnit = numericWorking[2] || "";
      if (numericPrimary && !/(?:…|\.\.\.)/.test(numericPrimary)) {
        addAcceptedAnswer(list, numericPrimary + (numericUnit && !new RegExp(UNIT_PATTERN + "$", "i").test(numericPrimary) ? " " + numericUnit : ""), prompt);
        return;
      }
    }
    var roundedWithWorking = answer.indexOf(";") === -1 && answer.match(new RegExp("^(.+?[A-Za-z0-9°%)])\\s+\\(\\s*(?:=\\s*)?(?:[-+]?\\d|sqrt\\(|root\\()[\\s\\S]*(?:…|[-+]?\\d+\\.\\d{3,})[\\s\\S]*\\)\\s*(" + UNIT_PATTERN + ")?$", "i"));
    if (roundedWithWorking) {
      var roundedPrimary = clean(roundedWithWorking[1]);
      var roundedUnit = roundedWithWorking[2] || "";
      if (roundedPrimary && !/(?:…|\.\.\.)/.test(roundedPrimary)) {
        addAcceptedAnswer(list, roundedPrimary + (roundedUnit && !new RegExp(UNIT_PATTERN + "$", "i").test(roundedPrimary) ? " " + roundedUnit : ""), prompt);
        return;
      }
    }
    var workingPrecision = answer.match(/^(.+?)\s*\(\s*[-+]?\d+\.\d{3,}(?:…)?(?:\s*°)?\s*\)\s*(rad|°)?$/i);
    if (workingPrecision && /\d/.test(workingPrecision[1])) {
      answer = clean(workingPrecision[1] + (workingPrecision[2] && workingPrecision[1].indexOf(workingPrecision[2]) === -1 ? " " + workingPrecision[2] : ""));
    }
    var unitWorkingPrecision = answer.match(new RegExp("^(.+?\\s" + UNIT_PATTERN + ")\\s*\\(\\s*[-+]?\\d+(?:\\.\\d+)?(?:…)?\\s*" + UNIT_PATTERN + "\\s*\\)$", "i"));
    if (unitWorkingPrecision) answer = clean(unitWorkingPrecision[1]);
    var nestedEquivalentMarker = answer.lastIndexOf(" (=");
    if (nestedEquivalentMarker > 0 && answer[answer.length - 1] === ")") {
      addAcceptedAnswer(list, answer.slice(0, nestedEquivalentMarker), prompt);
      addAcceptedAnswer(list, answer.slice(nestedEquivalentMarker + 3, -1), prompt);
      return;
    }
    var parentheticalEquivalent = answer.match(/^(.+?)\s+\(([^()]*(?:…|=|\baccept\b|\bexact\b|\brad(?:ians?)?\b|°)[^()]*)\)$/i);
    if (parentheticalEquivalent && isDisplaySafe(clean(parentheticalEquivalent[1]))) {
      addAcceptedAnswer(list, parentheticalEquivalent[1], prompt);
      parentheticalEquivalent[2].split(/\s*(?:=|,|;|\bor\b)\s*/i).forEach(function (alternative) {
        var cleanedAlternative = clean(alternative.replace(/\b(?:accept|exact|radians?)\b/gi, ""));
        if (/^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(cleanedAlternative)) {
          if (isDisplaySafe(cleanedAlternative) && !list.some(function (item) { return equivalent(item, cleanedAlternative); })) list.push(cleanedAlternative);
        } else if (cleanedAlternative && /\d|[A-Za-z]/.test(cleanedAlternative)) addAcceptedAnswer(list, cleanedAlternative, prompt);
      });
      return;
    }
    var approximate = answer.match(/^(.+?)\s*\(\s*=\s*(.+?)\s*\)$/);
    if (approximate) {
      addAcceptedAnswer(list, approximate[1], prompt);
      var approximateAlternative = clean(approximate[2]);
      if (/^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(approximateAlternative)) {
        if (isDisplaySafe(approximateAlternative) && !list.some(function (item) { return equivalent(item, approximateAlternative); })) list.push(approximateAlternative);
      } else addAcceptedAnswer(list, approximateAlternative, prompt);
      return;
    }
    var alternatives = answer.split(/\s+or\s+/i).filter(Boolean);
    if (alternatives.length > 1) {
      alternatives.forEach(function (alternative) { addAcceptedAnswer(list, alternative, prompt); });
      return;
    }

    var commaPositions = topLevelPositions(answer, function (character) { return character === ","; });
    if (commaPositions.length) {
      var commaParts = [];
      var commaStart = 0;
      commaPositions.forEach(function (position) {
        commaParts.push(answer.slice(commaStart, position).trim());
        commaStart = position + 1;
      });
      commaParts.push(answer.slice(commaStart).trim());
      if (commaParts.every(Boolean)) {
        answer = commaParts.length === 2 && /^(?:alpha|beta|gamma|theta|mu|sigma|[a-z])$/i.test(commaParts[0]) && /^(?:alpha|beta|gamma|theta|mu|sigma|[a-z])\s*=/i.test(commaParts[1])
          ? commaParts.join(", ")
          : commaParts.join("; ");
      }
    }

    function addUnique(candidate) {
      var cleaned = clean(candidate);
      var semicolonPositions = topLevelPositions(cleaned, function (character) { return character === ";"; });
      if (semicolonPositions.length) {
        var pieces = [];
        var pieceStart = 0;
        semicolonPositions.forEach(function (position) {
          pieces.push(cleaned.slice(pieceStart, position).trim());
          pieceStart = position + 1;
        });
        pieces.push(cleaned.slice(pieceStart).trim());
        pieces = pieces.filter(Boolean);
        var firstAssignment = pieces[0] && pieces[0].match(/^([A-Za-zα-ω][A-Za-z0-9_()]*)\s*=/);
        if (firstAssignment && /\b(?:values|roots|solutions|possible)\b/i.test(plainText(prompt))) {
          pieces = pieces.map(function (piece, index) {
            return index > 0 && piece.indexOf("=") === -1 ? firstAssignment[1] + "=" + piece : piece;
          });
        }
        var repeatedTarget = firstAssignment && pieces.every(function (piece) {
          var assignment = piece.match(/^([A-Za-zα-ω][A-Za-z0-9_()]*)\s*=/);
          return assignment && assignment[1].toLowerCase() === firstAssignment[1].toLowerCase();
        });
        if (repeatedTarget && !/\b(?:values|roots|solutions|possible)\b/i.test(plainText(prompt))) {
          pieces = [pieces[pieces.length - 1]];
        }
        cleaned = pieces.filter(function (piece, index) {
          return !pieces.slice(0, index).some(function (existing) { return equivalent(existing, piece); });
        }).join("; ");
      }
      if (!cleaned || !isDisplaySafe(cleaned)) return;
      if (!list.some(function (item) { return equivalent(item, cleaned); })) list.push(cleaned);
      var keyboardForm = cleaned.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/π/g, "pi").replace(/×|·/g, "*");
      if (keyboardForm !== cleaned && !list.some(function (item) { return equivalent(item, keyboardForm); })) list.push(keyboardForm);
    }

    var equalityCount = (answer.match(/=/g) || []).length;
    if (topLevelPositions(answer, function (character) { return character === ";"; }).length) {
      addUnique(answer);
      return;
    }
    if (equalityCount > 1 || (startsWithEquality && equalityCount > 0)) {
      var finalRightSide = answer.slice(answer.lastIndexOf("=") + 1).trim();
      var firstLeftSide = answer.slice(0, answer.indexOf("=")).trim();
      var wholeEquality = firstLeftSide && shouldKeepWholeEquality(prompt, firstLeftSide + "=" + finalRightSide)
        ? firstLeftSide + "=" + finalRightSide
        : "";
      if (!/…|[≤≥]/.test(answer) && wholeEquality) addUnique(wholeEquality);
      addUnique(finalRightSide);
      if (/…|[≤≥]/.test(answer) && wholeEquality) addUnique(wholeEquality);
      addUnique(answer);
      return;
    }
    if (equalityCount === 1 && !/[<>&≤≥]/.test(answer)) {
      var rightSide = answer.slice(answer.indexOf("=") + 1).trim();
      if (shouldKeepWholeEquality(prompt, answer)) {
        addUnique(answer);
        addUnique(rightSide);
      } else {
        var answerCount = list.length;
        addUnique(rightSide);
        if (list.length === answerCount) addUnique(answer);
      }
      return;
    }
    addUnique(answer);
  }

  function answerRowScore(row, prompt) {
    var question = clean(latexToPlain(prompt)).toLowerCase();
    var answer = clean(latexToPlain(Array.isArray(row) ? row[0] : row)).toLowerCase();
    var score = 0;
    if (/standard deviation/.test(question) && /(?:\bsigma\s*=|standard deviation|\bsd\s*=)/.test(answer)) score += 80;
    if (/\bprobability\b|\bp\s*\(/.test(question) && /\bp\s*\(|\bprobability\b/.test(answer)) score += 45;
    if (/\bvariance\b|\bvar\s*\(/.test(question) && /\bvar\s*\(|\bvariance\b/.test(answer)) score += 35;
    if (/\bmean\b|expected value|\be\s*\(/.test(question) && /\be\s*\(|\bmean\b|\bmu\s*=/.test(answer)) score += 30;
    if (/\bmedian\b/.test(question) && /\bmedian\b|\bm\s*=/.test(answer)) score += 30;
    if (/\bmode\b/.test(question) && /\bmode\b/.test(answer)) score += 30;
    var target = question.match(/\b(?:value|expression)\s+(?:of|for)\s+([a-z]+)\b/);
    if (target && new RegExp("(?:^|[^a-z])" + target[1] + "\\s*=", "i").test(answer)) score += 50;
    return score;
  }

  function coordinateTuples(value) {
    var source = clean(value);
    var tuples = [];
    for (var start = 0; start < source.length; start += 1) {
      if (source[start] !== "(") continue;
      if (/[A-Za-z0-9_]/.test(source[start - 1] || "")) continue;
      var depth = 1;
      for (var end = start + 1; end < source.length; end += 1) {
        if (source[end] === "(") depth += 1;
        else if (source[end] === ")") depth -= 1;
        if (depth !== 0) continue;
        var inner = source.slice(start + 1, end);
        var commas = topLevelPositions(inner, function (character) { return character === ","; });
        if ((commas.length === 1 || commas.length === 2) && !/[;=]/.test(inner)) {
          var tuple = "(" + inner + ")";
          if (isDisplaySafe(tuple) && !tuples.some(function (existing) { return equivalent(existing, tuple); })) tuples.push(tuple);
        }
        break;
      }
    }
    return tuples;
  }

  function extractAcceptedAnswers(rows, prompt) {
    if (!Array.isArray(rows) || requiresWhiteboard(prompt)) return [];
    if (/\bmaximum or minimum\b|\bminimum or maximum\b/i.test(plainText(prompt))) {
      var classificationText = rows.map(function (row) { return plainText(Array.isArray(row) ? row[0] : row); }).join(" ");
      var classification = classificationText.match(/\bhas a (minimum|maximum)\b/i);
      if (classification) return [classification[1][0].toUpperCase() + classification[1].slice(1).toLowerCase()];
    }
    var completePrompt = clean(latexToPlain(prompt));
    var rawRowsText = rows.map(function (row) { return String(Array.isArray(row) ? row[0] : row); }).join(" ");
    var creditedRows = rows.filter(function (row) {
      return Array.isArray(row) && /(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || ""));
    });
    var requestedValueTarget = completePrompt.match(/\bfind\s+(?:the\s+)?value\s+of\s+([A-Za-z])\b/i);
    if (requestedValueTarget) {
      for (var valueRowIndex = creditedRows.length - 1; valueRowIndex >= 0; valueRowIndex -= 1) {
        var valueRowText = plainText(String(creditedRows[valueRowIndex][0] || "")).trim();
        if (/[=<>≤≥]/.test(valueRowText)) continue;
        var finalValueMatches = valueRowText.match(/-?\d+(?:\.\d+)?/g) || [];
        if (!finalValueMatches.length || !/^\s*-?\d/.test(valueRowText)) continue;
        return finalValueMatches.slice(0, 2).map(function (value) { return requestedValueTarget[1] + "=" + value; });
      }
    }
    if (/\bcomplex numbers? represented by (?:the )?points?\b/i.test(completePrompt)) {
      var requestedComplexPoints = Array.from(completePrompt.matchAll(/\b(?:points?|and)\s+([A-Z])\b/g)).map(function (match) { return match[1]; });
      var complexPointAnswers = [];
      rows.forEach(function (row) {
        var complexPointText = plainText(String((row || [])[0] || ""));
        var complexPointLabel = complexPointText.match(/^\s*([A-Z])\s+represents\b/i);
        if (!complexPointLabel || (requestedComplexPoints.length && requestedComplexPoints.indexOf(complexPointLabel[1]) === -1)) return;
        var complexPointFragments = mathFragments(String((row || [])[0] || ""));
        if (!complexPointFragments.length) return;
        var complexPointValue = clean(latexToPlain(complexPointFragments[complexPointFragments.length - 1]));
        var complexPointAnswer = complexPointLabel[1] + "=" + complexPointValue;
        if (isChoiceTextSafe(complexPointAnswer)) complexPointAnswers.push(complexPointAnswer);
      });
      if (complexPointAnswers.length >= 2) return [complexPointAnswers.join("; ")];
    }
    var evaluatedExpression = completePrompt.match(/\bevaluate\s+([^,.]+?)(?:\s+for\b|[.,]|$)/i);
    if (evaluatedExpression) {
      for (var evaluatedRowIndex = creditedRows.length - 1; evaluatedRowIndex >= 0; evaluatedRowIndex -= 1) {
        var evaluatedFragments = mathFragments(String(creditedRows[evaluatedRowIndex][0] || ""));
        for (var evaluatedFragmentIndex = evaluatedFragments.length - 1; evaluatedFragmentIndex >= 0; evaluatedFragmentIndex -= 1) {
          var evaluatedRaw = String(evaluatedFragments[evaluatedFragmentIndex] || "");
          var evaluatedPiece = clean(latexToPlain(evaluatedRaw));
          if (/^\s*=/.test(evaluatedRaw) && evaluatedPiece && isChoiceTextSafe(evaluatedPiece)) return [clean(evaluatedExpression[1]) + "=" + evaluatedPiece];
        }
      }
    }
    if (/\bmodulus\b[\s\S]*\bargument\b|\bargument\b[\s\S]*\bmodulus\b/i.test(completePrompt)) {
      var labelledModulusRow = creditedRows.find(function (row) { return /\bmodulus\b/i.test(String(row[0] || "")); });
      var labelledArgumentRow = creditedRows.find(function (row) { return /\bargument\b/i.test(String(row[0] || "")); });
      if (labelledModulusRow && labelledArgumentRow) {
        var labelledModulus = clean(latexToPlain(String(labelledModulusRow[0] || "")))
          .replace(/^.*?\bmodulus\b\s*(?:=\s*)?/i, "").replace(/\s*\(\s*=.*$/, "");
        var labelledArgument = clean(latexToPlain(String(labelledArgumentRow[0] || "")))
          .replace(/^.*?\bargument\b\s*(?:=\s*)?/i, "").replace(/\s*\(\s*accept\b.*$/i, "").replace(/\s*\(\s*=\s*.*$/, "");
        if (/\brad\b/i.test(plainText(labelledArgumentRow[0])) && !/\brad\b/i.test(labelledArgument)) labelledArgument += " rad";
        if (labelledModulus && labelledArgument) return ["modulus=" + labelledModulus + "; argument=" + labelledArgument];
      }
    }
    var coordinateInstruction = completePrompt.slice(Math.max(
      completePrompt.toLowerCase().lastIndexOf("find"),
      completePrompt.toLowerCase().lastIndexOf("determine"),
      completePrompt.toLowerCase().lastIndexOf("write down"),
      completePrompt.toLowerCase().lastIndexOf("calculate"),
      0
    ));
    if (/\bcoordinates?\s+of\b|\bcoordinates?\b[\s\S]*\bpoint\b/i.test(coordinateInstruction)
      && !/\b[xy]-coordinates?\b/i.test(coordinateInstruction)
      && !/\b(?:justify|giving a reason|give a reason)\b/i.test(coordinateInstruction)) {
      var coordinateRows = rows.filter(function (row) {
        return Array.isArray(row) && !/^\s*(?:note|notes)\s*:/i.test(plainText(row[0] || ""));
      });
      if (/\bpoints\b|\bmaximum\b[\s\S]*\bminimum\b|\bminimum\b[\s\S]*\bmaximum\b|\band\s+(?:of\s+)?[A-Z](?:_?\d+)?\b/i.test(coordinateInstruction)) {
        var requestedCoordinates = [];
        coordinateRows.forEach(function (row) {
          mathFragments(String(row[0] || "")).forEach(function (fragment) {
            var unlabelledFragment = clean(latexToPlain(fragment)).replace(/\b[A-Z](?:_?\d+)?(?=\s*\()/g, "");
            coordinateTuples(unlabelledFragment).forEach(function (coordinate) {
              if (/^\(\s*[A-Za-z]\s*,\s*[A-Za-z]\s*(?:,\s*[A-Za-z]\s*)?\)$/.test(coordinate)) return;
              if (!requestedCoordinates.some(function (existing) { return equivalent(existing, coordinate); })) requestedCoordinates.push(coordinate);
            });
          });
        });
        if (requestedCoordinates.length >= 2) return [requestedCoordinates.join("; ")];
      }
      for (var coordinateRowIndex = coordinateRows.length - 1; coordinateRowIndex >= 0; coordinateRowIndex -= 1) {
        var rawCoordinateRow = String(coordinateRows[coordinateRowIndex][0] || "");
        var rowCoordinateText = clean(latexToPlain(rawCoordinateRow));
        var rowCoordinates = [];
        mathFragments(rawCoordinateRow).forEach(function (fragment) {
          var unlabelledCoordinateFragment = clean(latexToPlain(fragment)).replace(/\b[A-Z](?:_?\d+)?(?=\s*\()/g, "");
          coordinateTuples(unlabelledCoordinateFragment).forEach(function (coordinate) {
            if (/^\(\s*[A-Za-z]\s*,\s*[A-Za-z]\s*(?:,\s*[A-Za-z]\s*)?\)$/.test(coordinate)) return;
            if (!rowCoordinates.some(function (existing) { return equivalent(existing, coordinate); })) rowCoordinates.push(coordinate);
          });
        });
        if (!rowCoordinates.length) coordinateTuples(rowCoordinateText.replace(/\b[A-Z](?:_?\d+)?(?=\s*\()/g, "")).forEach(function (coordinate) { rowCoordinates.push(coordinate); });
        if (!rowCoordinates.length) continue;
        var coordinateLabels = Array.from(rowCoordinateText.matchAll(/\b([A-Z](?:_?\d+)?)\s*\(/g)).map(function (match) { return match[1]; });
        if (rowCoordinates.length > 1 && new Set(coordinateLabels).size <= 1 && /\b(?:accept|or)\b/i.test(plainText(rawCoordinateRow))) return rowCoordinates;
        if (rowCoordinates.length > 1 && new Set(coordinateLabels).size <= 1 && /\)\s*\(/.test(rowCoordinateText)) return rowCoordinates;
        return [rowCoordinates.join("; ")];
      }
      var coordinateValues = {};
      for (var assignmentRowIndex = coordinateRows.length - 1; assignmentRowIndex >= 0; assignmentRowIndex -= 1) {
        var assignmentRowText = clean(latexToPlain(String(coordinateRows[assignmentRowIndex][0] || "")));
        mathFragments(String(coordinateRows[assignmentRowIndex][0] || "")).forEach(function (fragment) {
          var assignmentPiece = clean(latexToPlain(fragment));
          ["x", "y"].forEach(function (axis) {
            if (coordinateValues[axis]) return;
            var matches = Array.from(assignmentPiece.matchAll(new RegExp("(?:^|[,;]\\s*|\\b)" + axis + "\\s*=\\s*([^,;⇒]+)", "gi")));
            if (matches.length) coordinateValues[axis] = clean(matches[matches.length - 1][1]);
          });
        });
        if (!coordinateValues.y && /\bmaximum value\b/i.test(assignmentRowText)) {
          var maximumCoordinateValue = assignmentRowText.match(/\bmaximum value\s*(-?\d+(?:\.\d+)?)/i);
          if (maximumCoordinateValue) coordinateValues.y = maximumCoordinateValue[1];
        }
      }
      if (coordinateValues.x && coordinateValues.y) return ["(" + coordinateValues.x + "," + coordinateValues.y + ")"];
    }
    var requestedVectorLabels = Array.from(completePrompt.matchAll(/vec\(([A-Z]{2})\)/g)).map(function (match) { return match[1]; });
    if (requestedVectorLabels.length >= 2 && /\b(?:find|express|write down)\b[\s\S]*\b(?:vectors?|expressions?)\b/i.test(coordinateInstruction)) {
      requestedVectorLabels = requestedVectorLabels.slice(-2);
      var vectorAnswers = [];
      requestedVectorLabels.forEach(function (label) {
        var foundVector = "";
        for (var vectorRowIndex = creditedRows.length - 1; vectorRowIndex >= 0 && !foundVector; vectorRowIndex -= 1) {
          mathFragments(String(creditedRows[vectorRowIndex][0] || "")).forEach(function (fragment) {
            var vectorPiece = clean(latexToPlain(fragment));
            if (new RegExp("^vec\\(" + label + "\\)\\s*=", "i").test(vectorPiece)) foundVector = vectorPiece;
          });
        }
        if (foundVector) vectorAnswers.push(foundVector);
      });
      if (vectorAnswers.length === requestedVectorLabels.length) return [vectorAnswers.join("; ")];
    }
    if (/\ball six roots\b[\s\S]*\bpositive integer\s+k\b/i.test(completePrompt)) {
      for (var indexedRootRowIndex = rows.length - 1; indexedRootRowIndex >= 0; indexedRootRowIndex -= 1) {
        var indexedRootText = clean(latexToPlain(String((rows[indexedRootRowIndex] || [])[0] || "")));
        var indexedRootForm = indexedRootText.match(/(z\s*=\s*i\*?tan\([\s\S]+?\))\s+where\s+k\b/i);
        var indexedValues = indexedRootText.match(/\bk\s*=\s*(1\s*,\s*3\s*,\s*5\s*,\s*7\s*,\s*9\s*,\s*11)\b/i);
        if (indexedRootForm && indexedValues) return [clean(indexedRootForm[1]) + "; k=" + indexedValues[1].replace(/\s+/g, "")];
      }
    }
    if (/\bother two solutions\b/i.test(completePrompt)) {
      var otherRoots = [];
      creditedRows.forEach(function (row) {
        var rootRowText = clean(latexToPlain(String(row[0] || "")));
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var rootPiece = clean(latexToPlain(fragment));
          var explicitRoot = rootPiece.match(/\bz\s*=\s*([^;]+?)(?=\s*(?:is a root|$))/i);
          var statedRoot = /\bis a root\b/i.test(rootRowText) && !/=/.test(rootPiece) ? [rootPiece, rootPiece] : null;
          var rootValue = explicitRoot ? explicitRoot[1] : statedRoot ? statedRoot[1] : "";
          if (!rootValue && /\bis a root\b/i.test(rootRowText)) {
            var coefficientRoot = rootPiece.match(/^[A-Za-z]\s*=\s*([^;]+)$/);
            if (coefficientRoot) rootValue = coefficientRoot[1];
          }
          if (!rootValue) return;
          var answer = "z=" + clean(rootValue);
          if (isChoiceTextSafe(answer) && !otherRoots.some(function (existing) { return equivalent(existing, answer); })) otherRoots.push(answer);
        });
      });
      if (otherRoots.length >= 2) return [otherRoots.slice(0, 2).join("; ")];
    }
    if (/\b(?:determine|find)\s+(?:the\s+)?solutions?\s+of\b/i.test(completePrompt)) {
      for (var solutionRowIndex = rows.length - 1; solutionRowIndex >= 0; solutionRowIndex -= 1) {
        var solutionFragments = mathFragments(String((rows[solutionRowIndex] || [])[0] || ""));
        for (var solutionFragmentIndex = solutionFragments.length - 1; solutionFragmentIndex >= 0; solutionFragmentIndex -= 1) {
          var solutionPiece = clean(latexToPlain(solutionFragments[solutionFragmentIndex]));
          var pairedSolution = solutionPiece.match(/^([A-Za-z])\s*=\s*([^,;]+)\s*,[\s\S]*\s\(=\s*([\s\S]+)\)$/);
          if (!pairedSolution) continue;
          var pairedVariable = pairedSolution[1];
          var pairedAnswer = pairedVariable + "=" + clean(pairedSolution[2]) + "; "
            + pairedVariable + "=" + clean(pairedSolution[3]).replace(/∓|\bmp\b/g, "±");
          if (isChoiceTextSafe(pairedAnswer)) return [pairedAnswer];
        }
      }
    }
    if (/\bevery\s+solution\b/i.test(completePrompt) && (/\bnon[- ]?zero\b/i.test(completePrompt) || /≠\s*0/.test(completePrompt))) {
      var nonZeroRealRoot = "";
      var nonZeroComplexRoots = "";
      rows.forEach(function (row) {
        var nonZeroText = clean(latexToPlain(String((row || [])[0] || "")));
        if (/\breal root\b/i.test(nonZeroText)) {
          var realAssignments = Array.from(nonZeroText.matchAll(/\ba\s*=\s*(-?\d+(?:\.\d+)?)/gi));
          if (realAssignments.length) nonZeroRealRoot = realAssignments[realAssignments.length - 1][1];
        }
        var complexRootMatch = nonZeroText.match(/\bcomplex roots?\s+([\s\S]+)\)$/i);
        if (complexRootMatch) nonZeroComplexRoots = clean(complexRootMatch[1]);
      });
      if (nonZeroRealRoot && nonZeroComplexRoots) return ["z=" + nonZeroRealRoot + "; z=" + nonZeroComplexRoots];
    }
    var completeSetTarget = completePrompt.match(/\b(?:all|every)\s+(?:the\s+)?(?:non[- ]?zero\s+)?values?\s+of\s+([A-Za-z])\b/i)
      || completePrompt.match(/\bevery\s+value\s+that\s+([A-Za-z])\b/i);
    if (!completeSetTarget && /\b(?:all|every)\s+(?:the\s+)?solutions?\b/i.test(completePrompt)) {
      var boundedSolutionVariable = completePrompt.match(/(?:^|\bfor\b)[\s\S]*?(?:-?\d+(?:\.\d+)?|[-+]?infinity)\s*[<≤]\s*([A-Za-z])\s*[<≤]\s*(?:-?\d+(?:\.\d+)?|[-+]?infinity)/i);
      completeSetTarget = boundedSolutionVariable || completePrompt.match(/\b([A-Za-z])\s*(?:\^\d+)?\s*[=<>]/i);
    }
    if (completeSetTarget) {
      var collectionTarget = completeSetTarget[1];
      var completeSetCandidates = [];
      rows.forEach(function (row, rowIndex) {
        var completeSetText = clean(latexToPlain(String((row || [])[0] || "")));
        mathFragments(String((row || [])[0] || "")).forEach(function (fragment) {
          var completeSetPiece = clean(latexToPlain(fragment));
          var signedPair = completeSetPiece.match(new RegExp("^" + collectionTarget + "\\s*=\\s*(±\\s*[^=]+?)(?=\\s*\\(\\s*=|$)", "i"));
          if (signedPair) completeSetCandidates.push({ values: [collectionTarget + "=" + clean(signedPair[1])], score: 180, row: rowIndex });
        });
        var joinedRanges = completeSetText.match(new RegExp("([^()]+[<>≤≥]\\s*" + collectionTarget + "\\s*[<>≤≥][^()]+\\bOR\\b[^()]+[<>≤≥]\\s*" + collectionTarget + "\\s*[<>≤≥][^()]+)", "i"));
        if (joinedRanges) {
          completeSetCandidates.push({ values: [clean(joinedRanges[1])], score: 140, row: rowIndex });
          return;
        }
        var reciprocalSequence = completeSetText.match(new RegExp("\\b" + collectionTarget + "\\s*=\\s*1\\s*,\\s*1/2\\s*,\\s*1/3\\s*,\\s*…\\s*,\\s*1/(\\d+)", "i"));
        if (reciprocalSequence) {
          var finalDenominator = Number(reciprocalSequence[1]);
          if (finalDenominator >= 3 && finalDenominator <= 30) {
            var reciprocalValues = [collectionTarget + "=1"];
            for (var denominator = 2; denominator <= finalDenominator; denominator += 1) reciprocalValues.push(collectionTarget + "=1/" + denominator);
            completeSetCandidates.push({ values: reciprocalValues, score: 100 + reciprocalValues.length, row: rowIndex });
          }
        }
        var targetStart = completeSetText.search(new RegExp("\\b" + collectionTarget + "\\s*(?:=|[<>≤≥])", "i"));
        if (targetStart === -1) return;
        var targetPortion = completeSetText.slice(targetStart)
          .replace(/\s*\(\s*(?:accept|rejecting|where it is excluded)[\s\S]*$/i, "")
          .replace(/\s+(?:and so|which correspond|do not penalise)[\s\S]*$/i, "");
        var relation = targetPortion.match(new RegExp("^" + collectionTarget + "\\s*([=<>≤≥])\\s*([\\s\\S]+)$", "i"));
        if (!relation) return;
        if (/[<>≤≥]/.test(relation[1])) {
          completeSetCandidates.push({ values: [collectionTarget + relation[1] + relation[2]], score: 40, row: rowIndex });
          return;
        }
        if (new RegExp("\\b[A-Za-z]\\s*[∈<>≤≥]").test(relation[2]) || /\b(?:multiple|integer)\b/i.test(relation[2])) {
          completeSetCandidates.push({ values: [collectionTarget + "=" + relation[2]], score: 80, row: rowIndex });
          return;
        }
        var rawValues = relation[2].split(/\s*(?:,|\bor\b)\s*/i).map(function (value) { return clean(value); }).filter(Boolean);
        var normalizedValues = [];
        rawValues.forEach(function (value) {
          var explicit = value.match(new RegExp("^" + collectionTarget + "\\s*=\\s*(.+)$", "i"));
          var normalizedValue = explicit ? explicit[1] : value;
          normalizedValue = normalizedValue.replace(/^=\s*/, "").replace(/\s*\([^)]*\)\s*$/, "");
          if (!normalizedValue || /…|\.\.\./.test(normalizedValue)) return;
          var answer = collectionTarget + "=" + normalizedValue;
          if (!normalizedValues.some(function (existing) { return equivalent(existing, answer); })) normalizedValues.push(answer);
        });
        if (normalizedValues.length) completeSetCandidates.push({ values: normalizedValues, score: normalizedValues.length * 20, row: rowIndex });
      });
      completeSetCandidates.sort(function (left, right) { return right.score - left.score || right.row - left.row; });
      if (completeSetCandidates.length) {
        var completeSetAnswer = completeSetCandidates[0].values.join("; ");
        if (isChoiceTextSafe(completeSetAnswer)) return [completeSetAnswer];
      }
    }
    if (/\b(?:ratio|mean)\b/i.test(completePrompt)) {
      var preferredExactFraction = rawRowsText.match(/\\left\s*\(\s*=\s*\\(?:d?frac|tfrac)\s*\{(-?\d+)\}\s*\{(-?\d+)\}\s*\\right\s*\)/i);
      if (preferredExactFraction) return [preferredExactFraction[1] + "/" + preferredExactFraction[2]];
    }
    if (/\b(?:find|calculate|determine)\b[\s\S]*\bmean\b[\s\S]*\b(?:variance|standard deviation)\b/i.test(completePrompt)) {
      var statisticValues = [];
      var statisticContext = "";
      var statisticAwaitingFinal = false;
      rows.forEach(function (row) {
        var statisticText = clean(latexToPlain(String(Array.isArray(row) ? row[0] : row)));
        var nextStatisticContext = /\bstandard deviation\b|\bSD\s*\(|\bsigma\b/i.test(statisticText) ? "sd"
          : /\bvariance\b|\bVar\s*\(/i.test(statisticText) ? "variance"
            : /\bmean\b|\bE\s*\(/i.test(statisticText) ? "mean" : "";
        if (nextStatisticContext) {
          statisticContext = nextStatisticContext;
          statisticAwaitingFinal = true;
        }
        var statisticMatches = Array.from(statisticText.matchAll(/=\s*(-?\d+(?:\.\d+)?)(?![\d.])/g));
        var statisticDirect = statisticText.match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:\(|$)/);
        if (!statisticContext || (!nextStatisticContext && !statisticAwaitingFinal) || (!statisticMatches.length && !statisticDirect)) return;
        var statisticValue = statisticMatches.length
          ? statisticMatches[statisticMatches.length - 1][1]
          : statisticDirect[1];
        var statisticRemainder = statisticMatches.length
          ? statisticText.slice(statisticMatches[statisticMatches.length - 1].index)
          : statisticText;
        if (!/…/.test(statisticRemainder)) {
          statisticValues[statisticContext === "mean" ? 0 : 1] = statisticContext + "=" + statisticValue;
          statisticAwaitingFinal = false;
        }
      });
      if (statisticValues[0] && statisticValues[1]) return [statisticValues.join("; ")];
    }
    if (/\bpossible dimensions\b/i.test(completePrompt)) {
      var dimensionLengths = [];
      var dimensionWidths = [];
      rows.forEach(function (row) {
        if (!Array.isArray(row) || /^\s*(?:note|notes)\s*:/i.test(plainText(row[0] || ""))) return;
        var dimensionRowText = clean(latexToPlain(String(row[0] || "")));
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var dimensionPiece = clean(latexToPlain(fragment));
          var dimensionValue = dimensionPiece.match(/(?:^|=\s*\)?)\s*(-?\d+(?:\.\d+)?)(?:\s*\([^)]*\))?\s*(?:m|cm|mm)\b/i);
          if (!dimensionValue) return;
          var target = /\bwidth\b/i.test(dimensionRowText) ? dimensionWidths : dimensionLengths;
          if (!target.includes(dimensionValue[1])) target.push(dimensionValue[1]);
        });
      });
      if (dimensionLengths.length >= 2 && dimensionWidths.length >= 2) {
        return [dimensionLengths[0] + " m by " + dimensionWidths[0] + " m; " + dimensionLengths[1] + " m by " + dimensionWidths[1] + " m"];
      }
    }
    if (/\b(?:find|calculate|determine|write down)\s+(?:the\s+)?probability\b/i.test(completePrompt)) {
      for (var probabilityRowIndex = rows.length - 1; probabilityRowIndex >= 0; probabilityRowIndex -= 1) {
        if (!Array.isArray(rows[probabilityRowIndex]) || !/(?:A\d|AG)/.test(String(rows[probabilityRowIndex][1] || ""))) continue;
        var probabilityRowPlain = plainText(String(rows[probabilityRowIndex][0] || "")).trim();
        var probabilityPlainValues = Array.from(probabilityRowPlain.matchAll(/(?:^|[^A-Za-z\d])(-?\d+(?:\.\d+)?)(?![A-Za-z\d])/g)).map(function (match) { return match[1]; });
        if (probabilityPlainValues.length && !/[A-Za-z=<>≤≥]/.test(probabilityRowPlain)) {
          var safeProbabilityValues = probabilityPlainValues.filter(function (value) {
            var numericValue = Number(value);
            return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 1;
          });
          if (safeProbabilityValues.length) return safeProbabilityValues;
        }
        var probabilityFragments = mathFragments(String(rows[probabilityRowIndex][0] || ""));
        for (var probabilityFragmentIndex = probabilityFragments.length - 1; probabilityFragmentIndex >= 0; probabilityFragmentIndex -= 1) {
          var probabilityPiece = clean(latexToPlain(probabilityFragments[probabilityFragmentIndex]));
          var probabilityResults = Array.from(probabilityPiece.matchAll(/=\s*(-?\d+(?:\.\d+)?)(?=\s*(?:\(|$))/g));
          var probabilityDirect = probabilityPiece.match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:\(|$)/);
          var probabilityValue = probabilityResults.length
            ? Number(probabilityResults[probabilityResults.length - 1][1])
            : probabilityDirect ? Number(probabilityDirect[1]) : NaN;
          if (Number.isFinite(probabilityValue) && probabilityValue >= 0 && probabilityValue <= 1 && !/\b(?:mean|variance|standard deviation)\b/i.test(probabilityPiece)) {
            var probabilityFraction = probabilityPiece.match(/(?:^|=|\s)(-?\d+\s*\/\s*-?\d+)(?=\s|\(|$)/);
            return probabilityFraction ? [probabilityFraction[1].replace(/\s+/g, ""), String(probabilityValue)] : [String(probabilityValue)];
          }
        }
      }
    }
    if (/\bsolve\s+the\s+equation\b/i.test(completePrompt)) {
      var solvedValues = [];
      rows.forEach(function (row) {
        if (!Array.isArray(row) || !/(?:A\d|AG)/.test(String(row[1] || ""))) return;
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var solvedPiece = clean(latexToPlain(fragment));
          var solvedMatches = Array.from(solvedPiece.matchAll(/\bx\s*=\s*([^;⇒,]+?)(?=\s*(?:$|[⇒;,]|\bx\s*=))/gi));
          if (!solvedMatches.length) return;
          var solvedValue = clean(solvedMatches[solvedMatches.length - 1][1]);
          var solvedAnswer = /^x\s*=/.test(solvedValue) ? solvedValue : "x=" + solvedValue;
          if (isChoiceTextSafe(solvedAnswer) && !solvedValues.some(function (existing) { return equivalent(existing, solvedAnswer); })) solvedValues.push(solvedAnswer);
        });
      });
      if (solvedValues.length >= 2) return [solvedValues.join("; ")];
    }
    if (/\bmodulus\b[\s\S]*\bargument\b|\bargument\b[\s\S]*\bmodulus\b/i.test(completePrompt)) {
      var directModulusRow = creditedRows.find(function (row) { return /\bmodulus\b/i.test(String(row[0] || "")); });
      var directArgumentRow = creditedRows.find(function (row) { return /\bargument\b/i.test(String(row[0] || "")); });
      if (directModulusRow && directArgumentRow) {
        var directModulusText = clean(latexToPlain(String(directModulusRow[0] || "")))
          .replace(/^.*?\bmodulus\b\s*(?:=\s*)?/i, "").replace(/\s*\(\s*=.*$/, "");
        var directArgumentText = clean(latexToPlain(String(directArgumentRow[0] || "")))
          .replace(/^.*?\bargument\b\s*(?:=\s*)?/i, "").replace(/\s*\(\s*accept\b.*$/i, "").replace(/\s*\(\s*=\s*.*$/, "");
        if (directModulusText && directArgumentText) {
          if (/\brad\b/i.test(plainText(directArgumentRow[0])) && !/\brad\b/i.test(directArgumentText)) directArgumentText += " rad";
          return ["modulus=" + directModulusText + "; argument=" + directArgumentText];
        }
        var directModulusMaths = mathFragments(String(directModulusRow[0] || ""));
        var directArgumentMaths = mathFragments(String(directArgumentRow[0] || ""));
        var directModulusValue = directModulusMaths.length
          ? clean(latexToPlain(directModulusMaths[0])).replace(/^=\s*/, "").replace(/\s*\(\s*=.*$/, "") : "";
        var directArgumentValue = directArgumentMaths.length
          ? clean(latexToPlain(directArgumentMaths[0])).replace(/^=\s*/, "").replace(/\s*\(\s*(?:accept\s*)?.*$/, "") : "";
        if (/\brad\b/i.test(plainText(directArgumentRow[0])) && !/\brad\b/i.test(directArgumentValue)) directArgumentValue += " rad";
        if (directModulusValue && directArgumentValue) return ["modulus=" + directModulusValue + "; argument=" + directArgumentValue];
      }
      var polarByLabel = {};
      creditedRows.forEach(function (row) {
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var polarPiece = clean(latexToPlain(fragment));
          var modulusMatch = polarPiece.match(/^\|\s*([A-Za-z](?:_?\d+)?)\s*\|\s*=\s*(.+)$/i);
          var argumentMatch = polarPiece.match(/^arg\(\s*([A-Za-z](?:_?\d+)?)\s*\)\s*=\s*(.+)$/i);
          if (modulusMatch) {
            var modulusChain = modulusMatch[2].split("=");
            var modulusResult = clean(modulusChain[modulusChain.length - 1]);
            if (modulusResult) (polarByLabel[modulusMatch[1]] || (polarByLabel[modulusMatch[1]] = {})).modulus = modulusResult;
          }
          if (argumentMatch) {
            var argumentChain = argumentMatch[2].split("=");
            var argumentResult = clean(argumentChain[argumentChain.length - 1]).replace(/\s*\(\s*-?\d+(?:\.\d+)?°\s*\)\s*$/, "");
            if (argumentResult) (polarByLabel[argumentMatch[1]] || (polarByLabel[argumentMatch[1]] = {})).argument = argumentResult;
          }
        });
        var polarRowText = plainText(String(row[0] || ""));
        var polarRowMaths = mathFragments(String(row[0] || ""));
        if (/\bmodulus\b/i.test(polarRowText) && polarRowMaths.length) {
          var rowModulus = clean(latexToPlain(polarRowMaths[0])).replace(/^=\s*/, "").replace(/\s*\(\s*=.*$/, "");
          if (rowModulus) (polarByLabel.w || (polarByLabel.w = {})).modulus = rowModulus;
        }
        if (/\bargument\b/i.test(polarRowText) && polarRowMaths.length) {
          var rowArgument = clean(latexToPlain(polarRowMaths[0])).replace(/^=\s*/, "").replace(/\s*\(\s*accept\b.*$/i, "").replace(/\s*\(\s*=\s*.*$/, "");
          if (/\brad\b/i.test(polarRowText) && !/\brad\b/i.test(rowArgument)) rowArgument += " rad";
          if (rowArgument) (polarByLabel.w || (polarByLabel.w = {})).argument = rowArgument;
        }
      });
      var polarLabels = Object.keys(polarByLabel).filter(function (label) {
        return polarByLabel[label].modulus && polarByLabel[label].argument;
      });
      if (polarLabels.length === 1) {
        return ["modulus=" + polarByLabel[polarLabels[0]].modulus + "; argument=" + polarByLabel[polarLabels[0]].argument];
      }
      if (polarLabels.length > 1) {
        return [polarLabels.map(function (label) {
          return "|" + label + "|=" + polarByLabel[label].modulus + "; arg(" + label + ")=" + polarByLabel[label].argument;
        }).join("; ")];
      }
      var cisMatches = Array.from(rawRowsText.matchAll(/\\\(\s*=\s*([^$]*?)\\operatorname\{cis\}\\left\(([^$]*?)\\right\)\s*\\\)/g));
      if (cisMatches.length) {
        var finalCis = cisMatches[cisMatches.length - 1];
        var cisModulus = clean(latexToPlain(finalCis[1]));
        var cisArgument = clean(latexToPlain(finalCis[2]));
        if (cisModulus && cisArgument) return ["modulus=" + cisModulus + "; argument=" + cisArgument];
      }
      for (var exponentialRowIndex = creditedRows.length - 1; exponentialRowIndex >= 0; exponentialRowIndex -= 1) {
        var exponentialFragments = mathFragments(String(creditedRows[exponentialRowIndex][0] || ""));
        for (var exponentialIndex = 0; exponentialIndex < exponentialFragments.length; exponentialIndex += 1) {
          var exponentialPiece = clean(latexToPlain(exponentialFragments[exponentialIndex]));
          var exponentialMatch = exponentialPiece.match(/^[A-Za-z]\s*=\s*(.+?)\s*\*?e\^\((.+)\)$/i);
          if (exponentialMatch && /i/.test(exponentialMatch[2])) {
            var exponentialArgument = clean(exponentialMatch[2].replace(/\*?i/g, ""));
            return ["modulus=" + clean(exponentialMatch[1]) + "; argument=" + exponentialArgument];
          }
        }
      }
    }
    if (/\bvector equation\b[\s\S]*\b(?:shortest )?distance\b/i.test(completePrompt)) {
      var lineAndDistance = [];
      rows.forEach(function (row) {
        if (!Array.isArray(row)) return;
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var lineDistancePiece = clean(latexToPlain(fragment));
          if (!lineAndDistance[0] && /^(?:bold\(r\)|r|l)\s*=/i.test(lineDistancePiece) && /matrix\(/i.test(lineDistancePiece)) lineAndDistance[0] = lineDistancePiece;
        });
        var lineDistanceText = clean(latexToPlain(String(row[0] || "")));
        var distanceMatch = lineDistanceText.match(/\bdistance\s*=\s*(-?\d+(?:\.\d+)?(?:\s*sqrt\([^)]*\))?)/i);
        if (distanceMatch) lineAndDistance[1] = "distance=" + distanceMatch[1];
        if (!lineAndDistance[1] && /(?:A\d|AG)/.test(String(row[1] || ""))) {
          var directDistance = mathFragments(String(row[0] || "")).map(function (fragment) {
            return { raw: fragment, clean: clean(latexToPlain(fragment)).replace(/^=\s*/, "") };
          }).find(function (piece) { return /^\s*=/.test(piece.raw) && /^-?\d+(?:\.\d+)?$/.test(piece.clean); });
          if (directDistance) lineAndDistance[1] = "distance=" + directDistance.clean;
        }
      });
      for (var finalDistanceRowIndex = rows.length - 1; finalDistanceRowIndex >= 0; finalDistanceRowIndex -= 1) {
        if (!/(?:A\d|AG)/.test(String((rows[finalDistanceRowIndex] || [])[1] || ""))) continue;
        var rawFinalDistance = String((rows[finalDistanceRowIndex] || [])[0] || "");
        var finalDistanceMatch = rawFinalDistance.match(/\\\(\s*=\s*(-?\d+(?:\.\d+)?)\s*\\\)/);
        if (finalDistanceMatch) {
          lineAndDistance[1] = "distance=" + finalDistanceMatch[1];
          break;
        }
      }
      if (lineAndDistance[0] && lineAndDistance[1]) return [lineAndDistance.join("; ")];
    }
    if (/\bgreatest volume\b[\s\S]*\bvalue of\b[\s\S]*\b(?:theta|θ)\b/i.test(completePrompt)) {
      var maximumVolume = "";
      var maximumTheta = "";
      rows.forEach(function (row) {
        mathFragments(String((row || [])[0] || "")).forEach(function (fragment) {
          var maximumPiece = clean(latexToPlain(fragment));
          var volumeMatch = maximumPiece.match(/V_?\(?max\)?\s*=\s*(-?\d+(?:\.\d+)?)/i);
          var thetaMatch = maximumPiece.match(/(?:theta|θ)\s*=\s*\)?\s*(-?\d+(?:\.\d+)?)/i);
          if (volumeMatch) maximumVolume = "V_max=" + volumeMatch[1] + (/\bm\^3\b/i.test(maximumPiece) ? " m^3" : "");
          if (thetaMatch) maximumTheta = "theta=" + thetaMatch[1] + (/°/.test(maximumPiece) ? "°" : "");
        });
        var maximumText = clean(latexToPlain(String((row || [])[0] || "")));
        if (maximumVolume && !/\bm\^3\b/i.test(maximumVolume) && /\bm\^3\b/i.test(maximumText)) maximumVolume += " m^3";
      });
      if (maximumVolume && maximumTheta) return [maximumVolume + "; " + maximumTheta];
    }
    if (/\b(?:which of|which)\b[\s\S]*\bcloser to (?:its|their) opposite face\b/i.test(completePrompt)) {
      for (var closerRowIndex = rows.length - 1; closerRowIndex >= 0; closerRowIndex -= 1) {
        var closerText = plainText(String((rows[closerRowIndex] || [])[0] || ""));
        var closerMatch = closerText.match(/\b([A-Z])\s+is closer to its opposite face than\s+([A-Z])\b/);
        if (closerMatch) return [closerMatch[1] + " is closer to its opposite face than " + closerMatch[2]];
      }
    }
    if (/\bin the form\s+ax\s*\+\s*by\s*\+\s*c\s*=\s*0\b/i.test(completePrompt.replace(/-/g, "+"))) {
      for (var cartesianRowIndex = rows.length - 1; cartesianRowIndex >= 0; cartesianRowIndex -= 1) {
        var cartesianFragments = mathFragments(String((rows[cartesianRowIndex] || [])[0] || ""));
        for (var cartesianFragmentIndex = cartesianFragments.length - 1; cartesianFragmentIndex >= 0; cartesianFragmentIndex -= 1) {
          var cartesianPiece = clean(latexToPlain(cartesianFragments[cartesianFragmentIndex]));
          if (/x/.test(cartesianPiece) && /y/.test(cartesianPiece) && /=\s*0$/.test(cartesianPiece) && isChoiceTextSafe(cartesianPiece)) return [cartesianPiece];
        }
      }
    }
    if (/\bexpression\b/i.test(completePrompt) && /∘/.test(completePrompt)) {
      for (var compositionRowIndex = rows.length - 1; compositionRowIndex >= 0; compositionRowIndex -= 1) {
        var compositionFragments = mathFragments(String((rows[compositionRowIndex] || [])[0] || ""));
        for (var compositionFragmentIndex = compositionFragments.length - 1; compositionFragmentIndex >= 0; compositionFragmentIndex -= 1) {
          var compositionPiece = clean(latexToPlain(compositionFragments[compositionFragmentIndex]));
          var compositionEquals = compositionPiece.indexOf("=");
          if (compositionEquals < 0) continue;
          var compositionRight = compositionPiece.slice(compositionEquals + 1).replace(/\s+\(=[\s\S]*$/, "").trim();
          compositionRight = compositionRight.replace(/\s*([+\-*/=])\s*/g, "$1");
          if (compositionRight && isChoiceTextSafe(compositionRight)) return [compositionRight];
        }
      }
    }
    if (/\bsolution\b[\s\S]*\bin the form\s+y\s*=/i.test(completePrompt)) {
      for (var solutionRowIndex = rows.length - 1; solutionRowIndex >= 0; solutionRowIndex -= 1) {
        var solutionFragments = mathFragments(String((rows[solutionRowIndex] || [])[0] || ""));
        for (var solutionFragmentIndex = solutionFragments.length - 1; solutionFragmentIndex >= 0; solutionFragmentIndex -= 1) {
          var solutionPiece = clean(latexToPlain(solutionFragments[solutionFragmentIndex]));
          if (/^y\s*=/.test(solutionPiece) && isChoiceTextSafe(solutionPiece)) return [solutionPiece];
        }
      }
    }
    var requestedSection = completePrompt;
    var requestedFind = completePrompt.toLowerCase().lastIndexOf("find");
    if (requestedFind >= 0) requestedSection = completePrompt.slice(requestedFind);
    var requestedTargets = [];
    var requestedList = requestedSection.match(/\bfind\s+(?:the\s+)?(?:values?\s+of\s+)?(alpha|beta|gamma|theta|mu|sigma|[a-z])\s*(?:,\s*(alpha|beta|gamma|theta|mu|sigma|[a-z]))?\s+and\s+(?:(?:the\s+)?values?\s+of\s+)?(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/i);
    var requestedSingle = requestedSection.match(/\b(?:find|determine|calculate|write down)\s+(?:the\s+)?(?:two\s+possible\s+)?values?\s+of\s+(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/i)
      || requestedSection.match(/\b(?:find|determine|calculate|write down)\s+(alpha|beta|gamma|theta|mu|sigma|[a-z])(?=\s*(?:[.,;]|correct\b|to\b|$))/i);
    var requestedExpression = requestedSection.match(/\b(?:find|determine|write down)\s+(?:an?\s+|the\s+)?(?:similar\s+)?expression\s+for\s+(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/i);
    if (requestedList) requestedTargets = [requestedList[1], requestedList[2], requestedList[3]].filter(Boolean);
    else if (requestedSingle) requestedTargets = [requestedSingle[1]];
    else if (requestedExpression) requestedTargets = [requestedExpression[1]];
    var explicitlyNamedTargets = [];
    var namedTargetPattern = /\bvalues?\s+of\s+(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/gi;
    var namedTargetMatch;
    while ((namedTargetMatch = namedTargetPattern.exec(requestedSection))) explicitlyNamedTargets.push(namedTargetMatch[1]);
    var joinedTargetPattern = /\b(?:and\s+(?:the\s+)?value\s+of|and\s+of)\s+(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/gi;
    while ((namedTargetMatch = joinedTargetPattern.exec(requestedSection))) explicitlyNamedTargets.push(namedTargetMatch[1]);
    var commaTargetPattern = /,\s*(?:the\s+value\s+of\s+|of\s+)(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/gi;
    while ((namedTargetMatch = commaTargetPattern.exec(requestedSection))) explicitlyNamedTargets.push(namedTargetMatch[1]);
    if (explicitlyNamedTargets.length > requestedTargets.length) requestedTargets = explicitlyNamedTargets;
    requestedTargets = requestedTargets.filter(function (target, index) {
      return requestedTargets.slice(0, index).every(function (existing) { return existing.toLowerCase() !== target.toLowerCase(); });
    }).sort(function (left, right) {
      var leftIndex = requestedSection.search(new RegExp("\\b" + left + "\\b", "i"));
      var rightIndex = requestedSection.search(new RegExp("\\b" + right + "\\b", "i"));
      return leftIndex - rightIndex;
    });
    if (!requestedTargets.length && /^\s*[a-z]\s*,\s*[a-z]\s+and\s+[a-z]\b/i.test(completePrompt)) {
      var bareRequestedTargets = completePrompt.match(/^\s*([a-z])\s*,\s*([a-z])\s+and\s+([a-z])\b/i);
      requestedTargets = bareRequestedTargets ? bareRequestedTargets.slice(1, 4) : [];
    }

    // Prefer a final awarded scalar over an earlier substitution formula when
    // the mark scheme writes the result on the following line (for example,
    // d = ... followed by = 4.45).
    if (requestedTargets.length === 1) {
      for (var signedRowIndex = rows.length - 1; signedRowIndex >= 0; signedRowIndex -= 1) {
        if (!Array.isArray(rows[signedRowIndex]) || !/(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(rows[signedRowIndex][1] || ""))) continue;
        var signedFragments = mathFragments(String((rows[signedRowIndex] || [])[0] || ""));
        for (var signedFragmentIndex = 0; signedFragmentIndex < signedFragments.length; signedFragmentIndex += 1) {
          var signedPiece = clean(latexToPlain(signedFragments[signedFragmentIndex]));
          var requestedSignedPattern = new RegExp("(?:^|[^A-Za-z0-9_])" + requestedTargets[0] + "\\s*=\\s*(±\\s*\\d+(?:\\.\\d+)?)", "i");
          var requestedSignedMatch = signedPiece.match(requestedSignedPattern);
          if (requestedSignedMatch) return [requestedTargets[0] + "=" + requestedSignedMatch[1].replace(/\s+/g, "")];
        }
      }
      for (var finalTargetRowIndex = rows.length - 1; finalTargetRowIndex >= 0; finalTargetRowIndex -= 1) {
        var finalTargetRow = rows[finalTargetRowIndex];
        if (!Array.isArray(finalTargetRow) || !/(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(finalTargetRow[1] || ""))) continue;
        var finalTargetFragments = mathFragments(String(finalTargetRow[0] || ""));
        for (var finalTargetFragmentIndex = finalTargetFragments.length - 1; finalTargetFragmentIndex >= 0; finalTargetFragmentIndex -= 1) {
          var finalTargetRaw = finalTargetFragments[finalTargetFragmentIndex];
          var finalTargetValue = clean(latexToPlain(finalTargetRaw));
          if (/^\s*=/.test(finalTargetRaw) && /^-?\d+(?:\.\d+)?(?:\s*(?:°|rad|%|cm|mm|km|m|s))?$/i.test(finalTargetValue)) {
            var finalTargetAnswer = [];
            addAcceptedAnswer(finalTargetAnswer, requestedTargets[0] + "=" + finalTargetValue, prompt);
            if (finalTargetAnswer.length) return finalTargetAnswer;
          }
        }
      }
      for (var namedTargetRowIndex = rows.length - 1; namedTargetRowIndex >= 0; namedTargetRowIndex -= 1) {
        if (!Array.isArray(rows[namedTargetRowIndex]) || !/(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(rows[namedTargetRowIndex][1] || ""))) continue;
        var namedTargetFragments = mathFragments(String((rows[namedTargetRowIndex] || [])[0] || ""));
        for (var namedTargetFragmentIndex = namedTargetFragments.length - 1; namedTargetFragmentIndex >= 0; namedTargetFragmentIndex -= 1) {
          var namedTargetPiece = clean(latexToPlain(namedTargetFragments[namedTargetFragmentIndex]));
          var signedTargetPattern = new RegExp("(?:^|[^A-Za-z0-9_])" + requestedTargets[0] + "\\s*=\\s*(±\\s*\\d+(?:\\.\\d+)?)", "i");
          var signedTargetMatch = namedTargetPiece.match(signedTargetPattern);
          if (signedTargetMatch) return [requestedTargets[0] + "=" + signedTargetMatch[1].replace(/\s+/g, "")];
          var namedTargetPattern = new RegExp("(?:^|[^A-Za-z0-9_])" + requestedTargets[0] + "\\s*=\\s*(-?\\d+(?:\\.\\d+)?(?:\\s*(?:°|rad|%|cm|mm|km|m|s))?)(?=\\s*(?:$|[,;)]))", "i");
          var namedTargetMatch = namedTargetPiece.match(namedTargetPattern);
          if (namedTargetMatch) return [requestedTargets[0] + "=" + namedTargetMatch[1]];
        }
      }
    }

    if (/\bexpected value\b|\bE\s*\(\s*[A-Za-z]\s*\)/i.test(completePrompt)) {
      for (var expectationRowIndex = rows.length - 1; expectationRowIndex >= 0; expectationRowIndex -= 1) {
        var expectationRow = rows[expectationRowIndex];
        if (!Array.isArray(expectationRow) || !/(?:A\d|AG)/.test(String(expectationRow[1] || ""))) continue;
        var expectationFragments = mathFragments(String(expectationRow[0] || ""));
        for (var expectationFragmentIndex = expectationFragments.length - 1; expectationFragmentIndex >= 0; expectationFragmentIndex -= 1) {
          var expectationValue = clean(latexToPlain(expectationFragments[expectationFragmentIndex]));
          if (/^-?\d+(?:\.\d+)?$/.test(expectationValue)) return [expectationValue];
        }
      }
    }

    if (/\bcosine of the angle\b/i.test(completePrompt)) {
      for (var cosineRowIndex = rows.length - 1; cosineRowIndex >= 0; cosineRowIndex -= 1) {
        var cosineFragments = mathFragments(String((rows[cosineRowIndex] || [])[0] || ""));
        for (var cosineFragmentIndex = cosineFragments.length - 1; cosineFragmentIndex >= 0; cosineFragmentIndex -= 1) {
          var cosinePiece = clean(latexToPlain(cosineFragments[cosineFragmentIndex]));
          if (!/^cos(?:\([^)]*\)|[A-Za-z]+)?\s*=/i.test(cosinePiece)) continue;
          var cosineAnswers = [];
          addAcceptedAnswer(cosineAnswers, cosineFragments[cosineFragmentIndex], prompt);
          if (cosineAnswers.length) return cosineAnswers;
        }
      }
    }

    if (/\bdistance travelled\b[\s\S]*\btime taken\b|\btime taken\b[\s\S]*\bdistance travelled\b/i.test(completePrompt)) {
      var distanceTime = [];
      rows.forEach(function (row) {
        var rowText = clean(latexToPlain(Array.isArray(row) ? row[0] : row));
        var value = rowText.match(/\b(distance|time)\b[\s\S]*=\s*(-?\d+(?:\.\d+)?)(?:\s*\([^)]*\))?\s*(metres?|seconds?|m|s)\b/i);
        if (value) distanceTime[value[1].toLowerCase() === "distance" ? 0 : 1] = value[1].toLowerCase() + "=" + value[2] + " " + value[3];
      });
      if (distanceTime[0] && distanceTime[1]) return [distanceTime.join("; ")];
    }

    if (/\b(?:expression|solution)\b[\s\S]*\b(?:for|in the form)\b/i.test(completePrompt)) {
      var expressionPromptMaths = mathFragments(String(prompt || "")).map(function (fragment) {
        return canonical(latexToPlain(fragment)).replace(/=$/, "");
      });
      for (var expressionRowIndex = rows.length - 1; expressionRowIndex >= 0; expressionRowIndex -= 1) {
        var expressionFragments = mathFragments(String((rows[expressionRowIndex] || [])[0] || ""));
        for (var expressionFragmentIndex = expressionFragments.length - 1; expressionFragmentIndex >= 0; expressionFragmentIndex -= 1) {
          var expressionPiece = clean(latexToPlain(expressionFragments[expressionFragmentIndex]));
          if (expressionPiece.indexOf("=") <= 0) continue;
          var expressionLeft = canonical(expressionPiece.slice(0, expressionPiece.indexOf("=")));
          var requestedExpressionMatch = expressionPromptMaths.some(function (requested) {
            return requested && (requested === expressionLeft || requested.indexOf(expressionLeft) !== -1 || expressionLeft.indexOf(requested) !== -1);
          });
          if (!requestedExpressionMatch && !/\bin the form\s+y\s*=/i.test(completePrompt)) continue;
          var expressionAnswers = [];
          addAcceptedAnswer(expressionAnswers, expressionFragments[expressionFragmentIndex], prompt);
          if (expressionAnswers.length) return expressionAnswers;
        }
      }
    }

    if (/\b(?:both\s+solutions|all\s+(?:roots|solutions)|answers?\s+in\s+modulus-argument\s+form)\b/i.test(completePrompt)) {
      var solutionAssignments = [];
      rows.forEach(function (row) {
        if (!Array.isArray(row) || !/(?:A\d|AG)/.test(String(row[1] || ""))) return;
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var solutionPiece = clean(latexToPlain(fragment));
          var assignment = solutionPiece.match(/^([A-Za-z](?:_[A-Za-z0-9]+)?)\s*=\s*([\s\S]+)$/);
          if (!assignment) return;
          var primaryAssignment = assignment[2].split(/\s+\(=/)[0].trim();
          var leadingNumericSolution = primaryAssignment.match(/^(-?\d+(?:\.\d+)?(?:\s*(?:°|rad))?)(?=\s|$)/i);
          if (leadingNumericSolution) primaryAssignment = leadingNumericSolution[1];
          var assignmentPieces = primaryAssignment.split(/\s*=\s*/);
          var normalized = assignment[1] + "=" + assignmentPieces[assignmentPieces.length - 1].trim();
          if (!solutionAssignments.some(function (existing) { return equivalent(existing, normalized); })) solutionAssignments.push(normalized);
        });
      });
      var indexedSolutions = solutionAssignments.filter(function (answer) { return /^[A-Za-z]_\d+\s*=/.test(answer); });
      var plainSolutions = solutionAssignments.filter(function (answer) { return /^[A-Za-z]\s*=/.test(answer); });
      var selectedSolutions = indexedSolutions.length >= 2 ? indexedSolutions : plainSolutions.slice(-2);
      if (selectedSolutions.length >= 2) return [selectedSolutions.join("; ")];
    }

    if (/\bother two roots\b/i.test(completePrompt)) {
      var conjugateRoot = "";
      var possibleThirdRoots = [];
      rows.forEach(function (row) {
        var rowText = plainText(Array.isArray(row) ? row[0] : row);
        var fragments = mathFragments(String(Array.isArray(row) ? row[0] : row));
        fragments.forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          if (!conjugateRoot && /^-?\d+(?:\.\d+)?[+-]\d+(?:\.\d+)?i$/.test(piece)) conjugateRoot = piece;
          if (/third root is/i.test(rowText) && /^-?\d+(?:\.\d+)?$/.test(piece)) possibleThirdRoots.push(piece);
        });
      });
      if (conjugateRoot && possibleThirdRoots.length) {
        return possibleThirdRoots.map(function (thirdRoot) { return conjugateRoot + "; " + thirdRoot; });
      }
    }
    if (requestedTargets.length > 1 || Boolean(requestedExpression)) {
      var eligibleTargetRows = rows.filter(function (row) {
        return Array.isArray(row) && !/^\s*(?:note|notes)\s*:/i.test(plainText(row[0] || ""));
      }).reverse();
      if (requestedTargets.length === 2) {
        for (var requestedSharedRow = 0; requestedSharedRow < eligibleTargetRows.length; requestedSharedRow += 1) {
          var requestedSharedFragments = mathFragments(String(eligibleTargetRows[requestedSharedRow][0] || ""));
          for (var requestedSharedFragment = 0; requestedSharedFragment < requestedSharedFragments.length; requestedSharedFragment += 1) {
            var requestedSharedPiece = clean(latexToPlain(requestedSharedFragments[requestedSharedFragment]));
            var requestedSharedMatch = requestedSharedPiece.match(new RegExp("\\b" + requestedTargets[0] + "\\s*,\\s*" + requestedTargets[1] + "\\s*=\\s*([^,;]+)", "i"));
            if (requestedSharedMatch) {
              var requestedSharedAnswer = requestedTargets[0] + ", " + requestedTargets[1] + "=" + requestedSharedMatch[1].trim();
              if (isChoiceTextSafe(requestedSharedAnswer)) return [requestedSharedAnswer];
            }
          }
        }
      }
      var requestedAnswers = [];
      requestedTargets.forEach(function (target) {
        for (var requestedRowIndex = 0; requestedRowIndex < eligibleTargetRows.length; requestedRowIndex += 1) {
          var rowAnswers = [];
          mathFragments(String(eligibleTargetRows[requestedRowIndex][0] || "")).forEach(function (fragment) {
            var requestedPiece = clean(latexToPlain(fragment));
            var normalizedTargetAnswers = [];
            addAcceptedAnswer(normalizedTargetAnswers, fragment, prompt);
            normalizedTargetAnswers.filter(function (answer) {
              return new RegExp("^" + target + "\\s*=", "i").test(answer);
            }).forEach(function (answer) {
              if (!rowAnswers.some(function (existing) { return equivalent(existing, answer); })) rowAnswers.push(answer);
            });
            var requestedPattern = new RegExp("(?:^|[,;(]\\s*|\\band\\s+)" + target + "\\s*(=|[<>≤≥])\\s*([^,;)]+)", "ig");
            var requestedMatch;
            while ((requestedMatch = requestedPattern.exec(requestedPiece))) {
              var requestedAnswer = target + requestedMatch[1] + requestedMatch[2].trim();
              if (!rowAnswers.some(function (existing) { return equivalent(existing, requestedAnswer); })) rowAnswers.push(requestedAnswer);
            }
          });
          if (rowAnswers.length) {
            var exactTargetAnswer = rowAnswers.find(function (answer) {
              return new RegExp("^" + target + "\\s*(?:=|[<>≤≥])", "i").test(answer)
                && answer.split(/\s*;\s*/).length === 1;
            });
            requestedAnswers.push(exactTargetAnswer || rowAnswers[0]);
            break;
          }
        }
      });
      if (requestedAnswers.length === requestedTargets.length) {
        var combinedRequestedAnswers = [];
        addAcceptedAnswer(combinedRequestedAnswers, requestedAnswers.join("; "), prompt);
        if (combinedRequestedAnswers.length) return combinedRequestedAnswers;
      }
    }
    if (/\b(?:populations?|species|number of (?:silver|golden) fish|(?:the\s+)?expressions?\s+for\s+x[\s\S]*\band\s+y)/i.test(clean(latexToPlain(prompt)))) {
      var populationAnswers = [];
      rows.slice().reverse().some(function (row) {
        if (!Array.isArray(row) || /^\s*(?:note|notes)\s*:/i.test(plainText(row[0] || ""))) return false;
        var rowAnswers = [];
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          var populationMatch = piece.match(/^(x(?:_[^=]+)?|y(?:_[^=]+)?)\s*=\s*(.+)$/i);
          if (populationMatch) {
            var populationValue = clean(populationMatch[2])
              .replace(/\s*\(\s*-?\d+(?:\.\d+)?(?:…|\.\.\.)[^)]*\)\s*$/i, "")
              .trim();
            rowAnswers.push(populationMatch[1].toLowerCase() + "=" + populationValue);
          }
        });
        rowAnswers.forEach(function (answer) {
          var family = answer[0];
          if (!populationAnswers.some(function (existing) { return existing[0] === family; })) populationAnswers.push(answer);
        });
        if (populationAnswers.some(function (answer) { return /^x/.test(answer); })
          && populationAnswers.some(function (answer) { return /^y/.test(answer); })) {
          return true;
        }
        return false;
      });
      if (populationAnswers.length >= 2) {
        var combinedPopulationAnswers = [];
        addAcceptedAnswer(combinedPopulationAnswers, populationAnswers.join("; "), prompt);
        if (combinedPopulationAnswers.length) return combinedPopulationAnswers;
      }
    }
    if (/\beigenvalues?\b[\s\S]*\beigenvectors?\b/i.test(plainText(prompt))) {
      var eigenvalues = [];
      var eigenvectors = [];
      rows.forEach(function (row) {
        if (!Array.isArray(row) || /^\s*(?:note|notes)\s*:/i.test(plainText(row[0] || ""))) return;
        var fullEigenRow = clean(latexToPlain(String(row[0] || "")));
        if (/lambda\s*=/i.test(fullEigenRow)) {
          (fullEigenRow.match(/-?\d+(?:\.\d+)?/g) || []).forEach(function (value) { eigenvalues.push(value); });
        }
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          if (/\beigenvectors?\b/i.test(fullEigenRow) && /^matrix\(/i.test(piece)) eigenvectors.push(piece);
        });
      });
      if (eigenvalues.length >= 2 && eigenvectors.length >= 2) {
        var combinedEigenAnswers = [];
        addAcceptedAnswer(combinedEigenAnswers, "lambda1=" + eigenvalues[0] + "; v1=" + eigenvectors[0] + "; lambda2=" + eigenvalues[1] + "; v2=" + eigenvectors[1], prompt);
        if (combinedEigenAnswers.length) return combinedEigenAnswers;
      }
    }
    if (/\bvector\s+equation\b/i.test(plainText(prompt))) {
      var vectorEquationAnswers = [];
      rows.forEach(function (row) {
        if (!Array.isArray(row) || /^\s*(?:note|notes)\s*:/i.test(plainText(row[0] || ""))) return;
        mathFragments(String(row[0] || "")).forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          if (piece.indexOf("=") === -1 || !/matrix\(/i.test(piece) || !/\d/.test(piece)) return;
          var normalized = [];
          addAcceptedAnswer(normalized, fragment, prompt);
          normalized.filter(function (answer) {
            return /^(?:bold\(r\)|r|l)\s*=/i.test(answer) && /matrix\(/i.test(answer);
          }).forEach(function (answer) { vectorEquationAnswers.push(answer); });
        });
      });
      vectorEquationAnswers.sort(function (left, right) { return right.length - left.length; });
      if (vectorEquationAnswers.length) return vectorEquationAnswers;
    }
    if (/\b(?:find|determine|state|write down|give)\s+(?:an?\s+|the\s+)?(?:vector\s+)?equation\s+(?:of|for)\b/i.test(plainText(prompt))) {
      var equationAnswers = [];
      var equationRows = rows.filter(function (row) {
        if (!Array.isArray(row)) return false;
        var rowText = plainText(row[0]);
        return !/^\s*(?:any|all)\s+correct\s+equation/i.test(rowText)
          && (/(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || "")) || /^(?:e\.g\.|for example)(?:\s|$)/i.test(rowText));
      }).reverse();
      equationRows.forEach(function (row) {
        mathFragments(row[0]).forEach(function (fragment) {
          var equation = clean(latexToPlain(fragment));
          if (equation.indexOf("=") === -1 || /\b(?:accept|not|but)\b/i.test(equation)) return;
          addAcceptedAnswer(equationAnswers, equation, prompt);
        });
      });
      if (equationAnswers.length) {
        var completeEquations = equationAnswers.filter(function (answer) { return answer.indexOf("=") > 0; });
        if (completeEquations.length) equationAnswers = completeEquations;
        var directEquationForm = clean(latexToPlain(prompt)).match(/\bin the form\s+([A-Za-z](?:\([^)]*\))?)\s*=/i);
        if (directEquationForm) {
          equationAnswers = equationAnswers.map(function (answer) {
            return answer.indexOf("=") === -1 ? directEquationForm[1] + "=" + answer : answer;
          });
        }
        if (/\bregression line\b/i.test(plainText(prompt))) equationAnswers.sort(function (left, right) { return left.length - right.length; });
        if (/\bvector equation\b/i.test(plainText(prompt))) {
          var vectorEquations = equationAnswers.filter(function (answer) {
            return /matrix\(/i.test(answer) && (/bold\(r\)|^r\s*=|^l\s*=|\bt\b|[+-]?\d*t/).test(answer);
          }).sort(function (left, right) { return right.length - left.length; });
          if (vectorEquations.length) equationAnswers = vectorEquations;
        }
        return equationAnswers;
      }
    }
    var answerRows = rows.filter(function (row) {
      var rowText = plainText(Array.isArray(row) ? row[0] : row);
      return Array.isArray(row)
        && (/(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || ""))
          || (/\bM\d/.test(String(row[1] || "")) && /(?:\\therefore|therefore|hence)[\s\S]*=/i.test(String(row[0] || ""))))
        && (mathFragments(row[0]).length
          || /[-+]?\d+(?:\.\d+)?/i.test(rowText)
          || (rowText.length > 0 && rowText.length <= 120
            && !/\b(?:attempt|award|method|note)\b/i.test(rowText)
            && (/^(?:zero|one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(rowText)
              || /\b(?:is|are)\s+(?:odd|even|neither|a minimum|a maximum|concave up|concave down|one-to-one|many-to-one|more likely|closer)\b/i.test(rowText)
              || /\b(?:one-to-one|many-to-one|systematic|simple random|stratified|quota|convenience)\b(?:\s*\(sampling\)|\s+sampling)?\b/i.test(rowText)
              || /\b(?:discrete|continuous|can see one another|cannot see one another|closer to its opposite face|probability mass function|reject|do not reject|insufficient evidence|sufficient evidence)\b/i.test(rowText)
              || /^concave\s+(?:up|down)\b/i.test(rowText))));
    });
    if (!answerRows.length) {
      answerRows = rows.filter(function (row) {
        if (!Array.isArray(row) || String(row[1] || "").trim()) return false;
        var rowText = plainText(row[0]);
        var rowMaths = mathFragments(row[0]);
        return rowMaths.length
          && !/\b(?:attempt|award|method|note|substitut|using|recognition|recognising|accept any)\b/i.test(rowText)
          && (rowMaths.length === 1 || /\b(?:answer|area|volume|length|distance|coordinates?|roots?|solutions?|domain|range|probability|value|is|are)\b|^\s*=/.test(rowText));
      });
    }
    if (!answerRows.length) return [];
    var answers = [];
    var promptText = plainText(prompt);
    var instructionText = promptText;
    var instructionMatches = [];
    var instructionPattern = /\b(?:find|calculate|write down|state|determine|solve|evaluate|express|give)\b/gi;
    var instructionMatch;
    while ((instructionMatch = instructionPattern.exec(promptText))) instructionMatches.push(instructionMatch.index);
    if (instructionMatches.length) {
      var finalInstructionIndex = instructionMatches[instructionMatches.length - 1];
      var finalInstruction = promptText.slice(finalInstructionIndex);
      if (instructionMatches.length > 1 && /^give\s+(?:each|your|the)\s+answers?\s+(?:correct|to)\b/i.test(finalInstruction)) {
        finalInstructionIndex = instructionMatches[instructionMatches.length - 2];
      }
      instructionText = promptText.slice(finalInstructionIndex);
    }
    if (/\bgiving your answers in the form\b[\s\S]*\band in the form\b/i.test(promptText)) {
      var requestedForms = [];
      answerRows.slice(-4).forEach(function (row) {
        var rowForms = mathFragments(String(row[0] || "")).map(function (fragment) {
          return clean(latexToPlain(fragment));
        }).filter(function (form) { return form && isDisplaySafe(form); });
        var combinedRow = rowForms.join("; ");
        if (combinedRow && (rowForms.length > 1 || /;|±/.test(combinedRow))) requestedForms.push(combinedRow);
      });
      if (requestedForms.length >= 2) {
        var combinedForms = requestedForms.slice(-2).join("; ");
        if (isChoiceTextSafe(combinedForms)) return [combinedForms];
      }
    }
    var wantsCollection = /\b(coordinates?|roots?|solutions?|values|intercepts?|asymptotes?|position vectors?|turning points?|local max(?:imum)?|local min(?:imum)?)\b/i.test(instructionText)
      || /\b(?:maximum[\s\S]*minimum|minimum[\s\S]*maximum|mean[\s\S]*standard deviation|standard deviation[\s\S]*mean|modulus[\s\S]*argument|argument[\s\S]*modulus|first term[\s\S]*common (?:difference|ratio)|common (?:difference|ratio)[\s\S]*first term|inverse[\s\S]*domain|domain[\s\S]*inverse|range[\s\S]*of)\b/i.test(instructionText);
    wantsCollection = wantsCollection
      || /\bvectors?\b[\s\S]*\band\b/i.test(instructionText)
      || /\bmatrices?\b[\s\S]*\band\b/i.test(instructionText)
      || /\b(?:number|population)s?\s+of\b[\s\S]*\band\b/i.test(instructionText);
    var wantsCoordinateCollection = /\bcoordinates?\b|\blocal max(?:imum)?\b|\blocal min(?:imum)?\b/i.test(instructionText);
    var coordinateCollection = [];
    function addCoordinate(value) {
      if (/^\(\s*[A-Za-z]\s*,\s*[A-Za-z]\s*(?:,\s*[A-Za-z]\s*)?\)$/.test(String(value || ""))) return;
      if (/\d\.\d+…/.test(String(value || ""))) return;
      if (value && !coordinateCollection.some(function (existing) { return equivalent(existing, value); })) coordinateCollection.push(value);
    }
    if (wantsCoordinateCollection) {
      var decisiveCoordinates = [];
      for (var decisiveRowIndex = answerRows.length - 1; decisiveRowIndex >= 0; decisiveRowIndex -= 1) {
        var rowCoordinates = [];
        mathFragments(answerRows[decisiveRowIndex][0]).forEach(function (fragment) {
          coordinateTuples(clean(latexToPlain(fragment))).forEach(function (coordinate) {
            if (!rowCoordinates.some(function (existing) { return equivalent(existing, coordinate); })) rowCoordinates.push(coordinate);
          });
        });
        if (rowCoordinates.length >= 2) { decisiveCoordinates = rowCoordinates; break; }
        if (/\bcoordinates?\s+of\s+(?:the\s+)?(?:point\s+)?[A-Z]\b/.test(promptText) && rowCoordinates.length) {
          decisiveCoordinates = rowCoordinates;
          break;
        }
      }
      (decisiveCoordinates.length ? [] : answerRows).forEach(function (row) {
        mathFragments(row[0]).forEach(function (fragment) {
          var coordinate = clean(latexToPlain(fragment));
          coordinateTuples(coordinate).forEach(addCoordinate);
        });
      });
      decisiveCoordinates.forEach(addCoordinate);
    }
    var selectedAnswerRow = answerRows[answerRows.length - 1];
    var selectedScore = 0;
    if (!/\([ivxlcdm]+\)/i.test(plainText(prompt))) {
      answerRows.forEach(function (row) {
        var score = answerRowScore(row, prompt);
        if (score >= selectedScore && score > 0) {
          selectedAnswerRow = row;
          selectedScore = score;
        }
      });
    }
    var finalContent = String(selectedAnswerRow[0] || "")
      .replace(/\s*<b>\s*(?:Note|Notes)\s*:\s*<\/b>[\s\S]*$/i, "")
      .replace(/\s*(?:Note|Notes)\s*:[\s\S]*$/i, "");
    var alternatives = finalContent.split(/(?:<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|(?:\(\s*|,\s*|\s+)or\s+)/i);
    function isSignedExactAndDecimalPair(alternative) {
      var maths = mathFragments(alternative);
      if (maths.length !== 2 || !/\bexact\b/i.test(plainText(alternative))) return false;
      var forms = maths.map(function (fragment) { return clean(latexToPlain(fragment)); });
      var matches = forms.map(function (form) { return form.match(/^([a-z])\s*=\s*±\s*(.+)$/i); });
      return Boolean(matches[0] && matches[1] && matches[0][1].toLowerCase() === matches[1][1].toLowerCase()
        && /sqrt\(/i.test(matches[0][2]) && /^\d+(?:\.\d+)?$/.test(matches[1][2]));
    }
    function meaningfulMaths(alternative) {
      return mathFragments(alternative).filter(function (fragment) {
        var plain = clean(latexToPlain(fragment));
        return plain
          && !/^[a-z]\s*=$/i.test(plain)
          && !/^\^[+-]?\d+$/.test(plain)
          && !/^(?:cm|mm|km|m|s|kg|rad)(?:\^[+-]?\d+)?$/i.test(plain)
          && !/^(?:triangle|ln|log|sin|cos|tan|sec|csc|cot|cd)$/i.test(plain)
          && (!/(?:…|\.\.\.)/.test(plain) || /\d/.test(plain));
      });
    }
    function isPrimaryWithParentheticalEquivalent(alternative) {
      var maths = meaningfulMaths(alternative);
      return maths.length === 2 && (/^\s*(?:\\left\s*)?\(?\s*=/.test(maths[1]) || /\baccept\s*\\\(/i.test(alternative));
    }
    var unsafeAlternative = coordinateCollection.length < 2 && alternatives.some(function (alternative) {
      var maths = meaningfulMaths(alternative);
      return maths.length === 1 && (maths[0].match(/=/g) || []).length > 5;
    });
    if (unsafeAlternative) return [];
    var pairedValuePrompt = clean(latexToPlain(prompt)).match(/\bvalues?\s+of\s+([a-z])\s+and\s+([a-z])\b/i);
    var singularCoordinatePrompt = /\bcoordinates?\s+of\s+(?:the\s+)?(?:point\s+)?[A-Z]\b/.test(completePrompt);
    if (singularCoordinatePrompt && coordinateCollection.length) {
      coordinateCollection.forEach(function (coordinate) { addAcceptedAnswer(answers, coordinate, prompt); });
    } else if (coordinateCollection.length >= 2) addAcceptedAnswer(answers, coordinateCollection.join("; "), prompt);
    if (!answers.length) {
      var targetInstruction = clean(latexToPlain(instructionText));
      var targetVariables = [];
      var targetList = targetInstruction.match(/\bfind\s+(?:the\s+)?(?:values?\s+of\s+)?(alpha|beta|gamma|theta|mu|sigma|[a-z])\s*(?:,\s*(alpha|beta|gamma|theta|mu|sigma|[a-z]))?\s+and\s+(?:(?:the\s+)?values?\s+of\s+)?(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/i);
      var singleTarget = targetInstruction.match(/\bfind\s+(?:the\s+)?values?\s+of\s+(alpha|beta|gamma|theta|mu|sigma|[a-z])\b/i);
      if (targetList) targetVariables = [targetList[1], targetList[2], targetList[3]].filter(Boolean);
      else if (singleTarget) targetVariables = [singleTarget[1]];
      if (targetVariables.length) {
        var targetRows = rows.slice().reverse();
        if (targetVariables.length === 2) {
          var sharedTargetPattern = new RegExp("\\b" + targetVariables[0] + "\\s*,\\s*" + targetVariables[1] + "\\s*=\\s*([^,;]+)", "i");
          for (var sharedRowIndex = 0; sharedRowIndex < targetRows.length && !answers.length; sharedRowIndex += 1) {
            var sharedFragments = mathFragments(String(targetRows[sharedRowIndex][0] || ""));
            for (var sharedFragmentIndex = 0; sharedFragmentIndex < sharedFragments.length && !answers.length; sharedFragmentIndex += 1) {
              var sharedPiece = clean(latexToPlain(sharedFragments[sharedFragmentIndex]));
              var sharedMatch = sharedPiece.match(sharedTargetPattern);
              if (sharedMatch) addAcceptedAnswer(answers, targetVariables[0] + ", " + targetVariables[1] + "=" + sharedMatch[1], prompt);
            }
          }
        }
        if (!answers.length && targetVariables.length === 1) {
          for (var singleRowIndex = 0; singleRowIndex < targetRows.length && !answers.length; singleRowIndex += 1) {
            var rowTargetAnswers = [];
            mathFragments(String(targetRows[singleRowIndex][0] || "")).forEach(function (fragment) {
              var piece = clean(latexToPlain(fragment));
              var targetPattern = new RegExp("(?:^|[,;]\\s*|\\band\\s+)" + targetVariables[0] + "\\s*(=|[<>≤≥])\\s*([^,;]+)", "ig");
              var match;
              while ((match = targetPattern.exec(piece))) {
                var targetAnswer = targetVariables[0] + match[1] + match[2].trim();
                if (!rowTargetAnswers.some(function (existing) { return equivalent(existing, targetAnswer); })) rowTargetAnswers.push(targetAnswer);
              }
            });
            if (rowTargetAnswers.length) addAcceptedAnswer(answers, rowTargetAnswers.join("; "), prompt);
          }
        }
        if (!answers.length && targetVariables.length > 1) {
          var targetAnswers = [];
          targetVariables.forEach(function (target) {
            for (var targetRowIndex = 0; targetRowIndex < targetRows.length; targetRowIndex += 1) {
              var foundTarget = mathFragments(String(targetRows[targetRowIndex][0] || "")).map(function (fragment) {
                var piece = clean(latexToPlain(fragment));
                var match = piece.match(new RegExp("(?:^|[,;]\\s*|\\band\\s+)" + target + "\\s*=\\s*([^,;]+)", "i"));
                return match ? target + "=" + match[1].trim() : "";
              }).find(Boolean);
              if (foundTarget) { targetAnswers.push(foundTarget); break; }
            }
          });
          if (targetAnswers.length === targetVariables.length) addAcceptedAnswer(answers, targetAnswers.join("; "), prompt);
        }
      }
    }
    if (!answers.length && wantsCollection && pairedValuePrompt) {
      var pairedValues = [];
      [pairedValuePrompt[1], pairedValuePrompt[2]].forEach(function (target) {
        for (var rowIndex = answerRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
          var targetFragments = meaningfulMaths(String(answerRows[rowIndex][0] || ""));
          var targetAnswer = targetFragments.map(function (fragment) {
            var candidate = clean(latexToPlain(fragment));
            if (new RegExp("^" + target + "\\s*=", "i").test(candidate)) return candidate;
            var chain = candidate.replace(/\s+/g, "").split("=");
            if (chain.length < 2) return "";
            var targetIndex = chain.findIndex(function (piece) { return piece === target || piece === "-" + target; });
            if (targetIndex === -1) return "";
            var finalValue = chain[chain.length - 1];
            if (!finalValue || /[A-Za-z]/.test(finalValue.replace(/(?:sqrt|root|sin|cos|tan|ln|log|exp|pi)/gi, ""))) return "";
            return target + "=" + (chain[targetIndex][0] === "-" ? "-(" + finalValue + ")" : finalValue);
          }).find(Boolean);
          if (targetAnswer) { pairedValues.push(targetAnswer); break; }
        }
      });
      if (pairedValues.length === 2) addAcceptedAnswer(answers, pairedValues.join("; "), prompt);
    }
    if (!answers.length && /\bmean\b[\s\S]*\bstandard deviation\b|\bstandard deviation\b[\s\S]*\bmean\b/i.test(instructionText)) {
      var meanPiece = "";
      var deviationPiece = "";
      answerRows.slice(-8).forEach(function (row) {
        meaningfulMaths(String(row[0] || "")).forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          var meanMatch = piece.match(/(?:^|\s)(overline\([^)]*\)|bar\([^)]*\)|mu|mean)\s*=\s*(-?\d+(?:\.\d+)?)/i);
          var deviationMatch = piece.match(/(?:^|\s)(sigma(?:_[A-Za-z0-9]+)?|sd|standard deviation)\s*=\s*(-?\d+(?:\.\d+)?)/i);
          if (meanMatch) meanPiece = meanMatch[1] + "=" + meanMatch[2];
          if (deviationMatch) deviationPiece = deviationMatch[1] + "=" + deviationMatch[2];
        });
      });
      if (meanPiece && deviationPiece) addAcceptedAnswer(answers, meanPiece + "; " + deviationPiece, prompt);
    }
    if (!answers.length && /\bmean\b[\s\S]*\bvariance\b|\bvariance\b[\s\S]*\bmean\b/i.test(instructionText)) {
      var meanVariancePieces = [];
      answerRows.slice(-8).forEach(function (row) {
        var rowText = plainText(row[0]);
        var rowMaths = meaningfulMaths(String(row[0] || ""));
        if (!rowMaths.length) return;
        var normalized = [];
        addAcceptedAnswer(normalized, rowMaths[rowMaths.length - 1], prompt);
        var value = normalized[0] && normalized[0].replace(/^[A-Za-z()_]+\s*=\s*/, "");
        if (/\bmean\b/i.test(rowText) && value) meanVariancePieces[0] = "mean=" + value;
        if (/\bvariance\b/i.test(rowText) && value) meanVariancePieces[1] = "variance=" + value;
      });
      if (meanVariancePieces[0] && meanVariancePieces[1]) addAcceptedAnswer(answers, meanVariancePieces.join("; "), prompt);
    }
    if (!answers.length && /\bfirst term\b[\s\S]*\bcommon (?:difference|ratio)\b|\bcommon (?:difference|ratio)\b[\s\S]*\bfirst term\b/i.test(instructionText)) {
      var sequencePieces = [];
      answerRows.slice(-6).forEach(function (row) {
        meaningfulMaths(String(row[0] || "")).forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          if (/^(?:a|u_?1|r|d)\s*=/i.test(piece) && !sequencePieces.some(function (existing) { return equivalent(existing, piece); })) sequencePieces.push(piece);
        });
      });
      if (sequencePieces.length >= 2) addAcceptedAnswer(answers, sequencePieces.slice(-2).join("; "), prompt);
    }
    if (!answers.length && wantsCollection && /\binverse\b[\s\S]*\bdomain\b|\bdomain\b[\s\S]*\binverse\b|\bdomain\b[\s\S]*\brange\b|\brange\b[\s\S]*\bdomain\b|\branges?\s+of\b[\s\S]*\band\b/i.test(promptText)) {
      var definitionPieces = [];
      answerRows.slice(-6).forEach(function (row) {
        var rowText = clean(latexToPlain(String(row[0] || "")));
        if (!/(?:\bf\^-1\s*\(|\bdom\s*\(|\bdomain\b|\brange\b|^[fg]\s*\(|^[fg]\s*[∈≤≥<>=])/i.test(rowText)) return;
        meaningfulMaths(String(row[0] || "")).forEach(function (fragment) {
          var rowAnswers = [];
          addAcceptedAnswer(rowAnswers, fragment, prompt);
          if (rowAnswers[0] && !definitionPieces.some(function (piece) { return equivalent(piece, rowAnswers[0]); })) definitionPieces.push(rowAnswers[0]);
        });
      });
      if (definitionPieces.length >= 2) addAcceptedAnswer(answers, definitionPieces.join("; "), prompt);
    }
    if (!answers.length && wantsCollection && /\bmodulus\b[\s\S]*\bargument\b|\bargument\b[\s\S]*\bmodulus\b/i.test(promptText)) {
      var polarPieces = [];
      answerRows.slice(-8).forEach(function (row) {
        var rowMaths = meaningfulMaths(String(row[0] || ""));
        rowMaths.forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          if ((/\barg\s*\(|\|[^|]+\|\s*=/.test(piece)) && piece.indexOf("=") > 0 && isDisplaySafe(piece)) polarPieces.push(piece);
        });
        if (/\bmodulus\b/i.test(plainText(row[0])) && /\bargument\b/i.test(plainText(row[0])) && rowMaths.length >= 3) {
          var polarLabel = clean(latexToPlain(rowMaths[0]));
          var modulusValue = clean(latexToPlain(rowMaths[1])).replace(/^=\s*/, "");
          var argumentValue = clean(latexToPlain(rowMaths[2])).replace(/^=\s*/, "");
          if (polarLabel && modulusValue && argumentValue) {
            polarPieces.push("|" + polarLabel + "|=" + modulusValue);
            polarPieces.push("arg(" + polarLabel + ")=" + argumentValue);
          }
        }
      });
      if (polarPieces.length >= 2) addAcceptedAnswer(answers, polarPieces.join("; "), prompt);
    }
    if (!answers.length && wantsCollection && /\b(?:set of (?:all )?possible values|set of values|possible values|domain|range)\b/i.test(instructionText)) {
      var relationPiece = "";
      answerRows.slice(-8).forEach(function (row) {
        var firstRelation = meaningfulMaths(String(row[0] || "")).map(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          return (/[<>≤≥∈∪]/.test(piece) || /^[[(].+,.+[)\]]$/.test(piece)) && !/\d\.\d+…/.test(piece) && isDisplaySafe(piece) ? piece : "";
        }).find(Boolean);
        if (firstRelation) relationPiece = firstRelation;
      });
      if (relationPiece) addAcceptedAnswer(answers, relationPiece, prompt);
    }
    if (!answers.length && wantsCollection && /\b(?:roots?|solutions?|all values)\b/i.test(instructionText)) {
      var collectionPieces = [];
      answerRows.forEach(function (row) {
        var rowFragments = meaningfulMaths(String(row[0] || ""));
        if (!rowFragments.length) return;
        var rowText = plainText(row[0]);
        var likelyConclusionList = /\b(?:roots?|solutions?|values?)\s+(?:are|is)\b|\bother\s+(?:two|three|four)\s+roots?\b/i.test(rowText);
        var selectedFragments = likelyConclusionList && rowFragments.length > 1
          ? rowFragments.slice(-Math.min(4, rowFragments.length))
          : [rowFragments[rowFragments.length - 1]];
        selectedFragments.forEach(function (fragment) {
          var fragmentAnswers = [];
          addAcceptedAnswer(fragmentAnswers, fragment, prompt);
          if (fragmentAnswers[0] && !collectionPieces.some(function (piece) { return equivalent(piece, fragmentAnswers[0]); })) {
            collectionPieces.push(fragmentAnswers[0]);
          }
        });
      });
      if (collectionPieces.length >= 2 && collectionPieces.length <= 8) addAcceptedAnswer(answers, collectionPieces.join("; "), prompt);
    }
    if (!answers.length) alternatives.forEach(function (alternative) {
      var maths = meaningfulMaths(alternative);
      var completeAlternative = clean(latexToPlain(alternative));
      var conclusionNumber = /\b(?:minimum|maximum|value|answer|probability|area|volume|length|width|rate)[^.;]{0,180}\b(?:is|=)\s*([-+]?\d+(?:\.\d+)?(?:\s*\/\s*[-+]?\d+(?:\.\d+)?)?)(?:\s*(%|°|rad))?(?:\s|$)/i.exec(completeAlternative);
      var exactWithApproximation = completeAlternative.match(/(?:^|=)\s*(-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?)\s*\(\s*=\s*(-?\d+(?:\.\d+)?)/);
      if (conclusionNumber) {
        addAcceptedAnswer(answers, conclusionNumber[1] + (conclusionNumber[2] ? " " + conclusionNumber[2] : ""), prompt);
        return;
      }
      if (maths.length === 1 && /\b(?:median|mode|mean|answer|value)\s+(?:is|equals?)\b/i.test(completeAlternative)) {
        addAcceptedAnswer(answers, "=" + maths[0], prompt);
        return;
      }
      if (exactWithApproximation) {
        addAcceptedAnswer(answers, exactWithApproximation[1], prompt);
        addAcceptedAnswer(answers, exactWithApproximation[2], prompt);
        return;
      }
      if (isSignedExactAndDecimalPair(alternative)) {
        maths.forEach(function (fragment) { addAcceptedAnswer(answers, fragment, prompt); });
      } else if (isPrimaryWithParentheticalEquivalent(alternative)) {
        var unitCopy = plainText(alternative);
        addAcceptedAnswer(answers, maths[0] + (/radians?\b/i.test(unitCopy) ? " rad" : ""), prompt);
        addAcceptedAnswer(answers, maths[1], prompt);
      } else if (wantsCollection && maths.length > 1) {
        addAcceptedAnswer(answers, maths.map(function (fragment) { return clean(latexToPlain(fragment)); }).join("; "), prompt);
      } else if (maths.length > 1) {
        var findSection = String(prompt || "");
        var findIndex = findSection.toLowerCase().lastIndexOf("find");
        if (findIndex >= 0) findSection = findSection.slice(findIndex);
        var requestedMaths = mathFragments(findSection).map(function (fragment) { return canonical(latexToPlain(fragment)); });
        var nonApproximateMaths = maths.filter(function (fragment) { return !/\d\.\d+(?:\\ldots|…|\.\.\.)/.test(clean(latexToPlain(fragment))); });
        var selectedMath = nonApproximateMaths.length ? nonApproximateMaths[nonApproximateMaths.length - 1] : maths[maths.length - 1];
        if (/\bprobability\b|\bp\s*\(/i.test(plainText(prompt))) {
          var probabilityConclusion = maths.find(function (fragment) {
            var candidate = clean(latexToPlain(fragment)).replace(/^=\s*/, "");
            var numeric = candidate.match(/^([-+]?\d+(?:\.\d+)?)(?:\s*\([^)]*\))?$/);
            return numeric && Number(numeric[1]) >= 0 && Number(numeric[1]) <= 1;
          });
          if (probabilityConclusion) selectedMath = probabilityConclusion;
        }
        if (/\blim(?:it)?\b/i.test(plainText(prompt))) {
          var limitConclusion = maths.find(function (fragment) { return /^\s*(?:\\to|→|=)/.test(fragment); });
          if (limitConclusion) selectedMath = limitConclusion;
        }
        for (var mathIndex = 0; mathIndex < maths.length; mathIndex += 1) {
          var candidate = clean(latexToPlain(maths[mathIndex]));
          var candidateLeft = candidate.indexOf("=") > 0 ? canonical(candidate.slice(0, candidate.indexOf("="))) : "";
          if (candidateLeft && requestedMaths.some(function (requested) { return requested === candidateLeft; })) {
            selectedMath = maths[mathIndex];
            break;
          }
        }
        addAcceptedAnswer(answers, selectedMath, prompt);
      } else if (maths.length === 1 && !/^[a-z]$/i.test(latexToPlain(maths[0]))) {
        addAcceptedAnswer(answers, maths[0], prompt);
      }
      else if (maths.length === 0 || (maths.length === 1 && /^[a-z]$/i.test(latexToPlain(maths[0])))) {
        var textAnswer = plainText(alternative);
        var numberWords = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10" };
        var samplingMethod = textAnswer.match(/\b(convenience|quota|simple random|stratified|systematic)\b(?:\s*\(sampling\)|\s+sampling)?/i);
        if (samplingMethod) {
          addAcceptedAnswer(answers, samplingMethod[1][0].toUpperCase() + samplingMethod[1].slice(1).toLowerCase() + " sampling", prompt);
          return;
        }
        var dataType = textAnswer.match(/\b(discrete|continuous)\b/i);
        if (dataType && /\b(?:discrete|continuous)\b/i.test(promptText)) {
          addAcceptedAnswer(answers, dataType[1][0].toUpperCase() + dataType[1].slice(1).toLowerCase(), prompt);
          return;
        }
        var hypothesisDecision = textAnswer.match(/\b(do not reject|reject)\s+(?:the\s+)?(?:null hypothesis|h\s*_?\s*0)\b/i);
        if (hypothesisDecision) {
          var rejects = hypothesisDecision[1].toLowerCase() === "reject";
          addAcceptedAnswer(answers, rejects
            ? "Reject the null hypothesis, because there is sufficient evidence for the alternative hypothesis"
            : "Do not reject the null hypothesis, because there is insufficient evidence for the alternative hypothesis", prompt);
          return;
        }
        var mappingType = textAnswer.match(/\b(one-to-one|many-to-one)\b/i);
        if (mappingType) {
          addAcceptedAnswer(answers, mappingType[1][0].toUpperCase() + mappingType[1].slice(1).toLowerCase(), prompt);
          return;
        }
        var closerVertex = textAnswer.match(/\b([A-Z])\s+is closer to its opposite face than\s+([A-Z])\b/);
        if (closerVertex) {
          addAcceptedAnswer(answers, closerVertex[1] + " is closer to its opposite face than " + closerVertex[2], prompt);
          return;
        }
        if (/\bcaptains can see one another\b/i.test(textAnswer)) {
          addAcceptedAnswer(answers, "The captains can see one another", prompt);
          return;
        }
        if (/\bonly\s+f\(x\)[\s\S]*probability mass function\b/i.test(textAnswer)) {
          addAcceptedAnswer(answers, "Only f can be used as a probability mass function", prompt);
          return;
        }
        if (numberWords[textAnswer.toLowerCase()]) {
          addAcceptedAnswer(answers, numberWords[textAnswer.toLowerCase()], prompt);
          return;
        }
        var numbers = textAnswer.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/g) || [];
        if (numbers.length === 1) addAcceptedAnswer(answers, numbers[0], prompt);
        else addAcceptedAnswer(answers, textAnswer, prompt);
      }
    });
    if (!answers.length && !wantsCollection) {
      for (var fallbackRowIndex = answerRows.length - 1; fallbackRowIndex >= 0 && !answers.length; fallbackRowIndex -= 1) {
        var fallbackMaths = meaningfulMaths(String(answerRows[fallbackRowIndex][0] || ""));
        for (var fallbackMathIndex = fallbackMaths.length - 1; fallbackMathIndex >= 0 && !answers.length; fallbackMathIndex -= 1) {
          addAcceptedAnswer(answers, fallbackMaths[fallbackMathIndex], prompt);
        }
      }
    }
    var exactFractionEquivalent = "";
    for (var exactFractionRow = rows.length - 1; exactFractionRow >= 0 && !exactFractionEquivalent; exactFractionRow -= 1) {
      var exactFractionText = clean(latexToPlain(String((rows[exactFractionRow] || [])[0] || "")));
      var exactFractionMatch = exactFractionText.match(/(-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+)?)\s*\(\s*=\s*(-?\d+\s*\/\s*-?\d+)\s*\)/);
      if (exactFractionMatch && answers.some(function (answer) { return equivalent(answer, exactFractionMatch[1]); })) {
        exactFractionEquivalent = exactFractionMatch[2].replace(/\s+/g, "");
      }
    }
    if (exactFractionEquivalent && !answers.some(function (answer) { return equivalent(answer, exactFractionEquivalent); })) {
      answers = [exactFractionEquivalent].concat(answers.filter(function (answer) {
        return !/^[-+]?\d+$/.test(answer) && !equivalent(answer, exactFractionEquivalent);
      }));
    }
    var question = plainText(prompt);
    var requestsRadians = /\bradians?\b|\brad\b/i.test(question);
    var requestsDegrees = /\bdegrees?\b|°|\\circ/i.test(String(prompt || ""));
    var requestsArgument = /\b(?:arg|argument)\b/i.test(question);
    if (requestsRadians && !requestsDegrees) {
      answers = answers.filter(function (answer) { return !/°/.test(answer); });
    } else if (requestsDegrees && !requestsRadians) {
      answers = answers.filter(function (answer) { return !/\brad\b/i.test(answer); });
    } else if (requestsArgument && !requestsDegrees) {
      var radianAnswers = answers.filter(function (answer) { return !/°/.test(answer); }).map(function (answer) {
        return /^-?\d+(?:\.\d+)?$/.test(answer) ? answer + " rad" : answer;
      });
      if (radianAnswers.length) answers = radianAnswers;
    }
    if (/\bequation\b/i.test(question)) {
      var equationForm = clean(latexToPlain(prompt)).match(/\bin the form\s+([A-Za-z](?:\([^)]*\))?)\s*=/i);
      if (equationForm) {
        answers = answers.map(function (answer) {
          return answer.indexOf("=") === -1 ? equationForm[1] + "=" + answer : answer;
        });
      }
    }
    if (/\b(?:maclaurin|taylor)\b[\s\S]*\b(?:expansion|series)\b/i.test(question)) {
      var seriesPrompt = clean(latexToPlain(prompt));
      var seriesTarget = seriesPrompt.match(/\b(?:expansion|series)\s+(?:of|for)\s+([A-Za-z](?:\([^)]*\))?)/i);
      if (seriesTarget) {
        answers = answers.map(function (answer) {
          return answer.indexOf("=") === -1 ? seriesTarget[1] + "=" + answer : answer;
        });
      }
    }
    if (/\bin the form\s+a\s*\/\s*b\b/i.test(clean(latexToPlain(prompt)))) {
      answers.sort(function (left, right) {
        var leftFraction = /^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(left) ? 1 : 0;
        var rightFraction = /^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(right) ? 1 : 0;
        return rightFraction - leftFraction || left.length - right.length;
      });
    }
    if (/\bas a fraction\b/i.test(question)) {
      answers = answers.map(function (answer) { return /^y\s*=/.test(answer) ? answer.slice(answer.indexOf("=") + 1).trim() : answer; });
    }
    return answers.slice(0, 12);
  }

  function canonical(value) {
    return clean(value)
      .toLowerCase()
      .replace(/degrees?/g, "°")
      .replace(/[\s{}]/g, "")
      .replace(/\*|×|·/g, "×")
      .replace(/<=/g, "≤")
      .replace(/>=/g, "≥");
  }

  function numericValue(value) {
    var compact = canonical(value)
      .replace(/^[a-zα-ω](?:\([^)]*\))?=/i, "")
      .replace(/,/g, "")
      .replace(new RegExp(UNIT_PATTERN + "$", "i"), "");
    if (/^-?\d+(?:\.\d+)?$/.test(compact)) return Number(compact);
    var fraction = compact.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
    var radical = compact.match(/^sqrt\((-?\d+(?:\.\d+)?)\)$/);
    if (radical && Number(radical[1]) >= 0) return Math.sqrt(Number(radical[1]));
    return null;
  }

  function equivalent(left, right) {
    if (canonical(left) === canonical(right)) return true;
    var leftNumber = numericValue(left);
    var rightNumber = numericValue(right);
    return leftNumber !== null && rightNumber !== null && Math.abs(leftNumber - rightNumber) < 1e-10;
  }

  function decimalPlaces(value) {
    var match = String(value).match(/\.(\d+)/);
    return match ? Math.min(match[1].length, 6) : 0;
  }

  function formatNumber(value, places) {
    if (!Number.isFinite(value)) return "";
    if (places > 0) return value.toFixed(places).replace(/\.?0+$/, "");
    return String(Math.round(value));
  }

  function parenthesesAreBalanced(value) {
    var depth = 0;
    for (var index = 0; index < value.length; index += 1) {
      if (value[index] === "(") depth += 1;
      if (value[index] === ")") depth -= 1;
      if (depth < 0) return false;
    }
    return depth === 0;
  }

  function wrapsWholeExpression(value) {
    if (value[0] !== "(" || value[value.length - 1] !== ")") return false;
    var depth = 0;
    for (var index = 0; index < value.length; index += 1) {
      if (value[index] === "(") depth += 1;
      if (value[index] === ")") depth -= 1;
      if (depth === 0 && index < value.length - 1) return false;
    }
    return depth === 0;
  }

  function topLevelPositions(value, matcher) {
    var positions = [];
    var depth = 0;
    for (var index = 0; index < value.length; index += 1) {
      if (/[([{]/.test(value[index])) depth += 1;
      else if (/[)\]}]/.test(value[index])) depth -= 1;
      else if (depth === 0 && matcher(value[index], index)) positions.push(index);
    }
    return positions;
  }

  function atomToLatex(value) {
    return value
      .replace(/matrix\(([^()]*)\)/gi, function (_match, body) {
        return "\\begin{pmatrix}" + body.split(";").map(function (row) {
          return row.split(",").map(function (cell) { return expressionToLatex(cell.trim()) || cell.trim(); }).join("&");
        }).join("\\\\") + "\\end{pmatrix}";
      })
      .replace(/bold\(([^()]+)\)/gi, "\\mathbf{$1}")
      .replace(/vec\(([^()]+)\)/gi, "\\overrightarrow{$1}")
      .replace(/blackboard\(([^()]+)\)/gi, "\\mathbb{$1}")
      .replace(/cal\(([^()]+)\)/gi, "\\mathcal{$1}")
      .replace(/hat\(([^()]+)\)/gi, "\\hat{$1}")
      .replace(/bar\(([^()]+)\)/gi, "\\bar{$1}")
      .replace(/overline\(([^()]+)\)/gi, "\\overline{$1}")
      .replace(/_\(([^()]*)\)/g, "_{$1}")
      .replace(/_([A-Za-z0-9]+)/g, "_{$1}")
      .replace(/\^\(\(([^()]*)\)\/([^()]*)\)/g, "^{\\frac{$1}{$2}}")
      .replace(/\^\(\s*([^/()]+)\s*\/\s*([^/()]+)\s*\)/g, "^{\\frac{$1}{$2}}")
      .replace(/\^\(([^()]*)\)/g, "^{$1}")
      .replace(/root\(([^,()]+),([^()]+)\)/gi, "\\sqrt[$1]{$2}")
      .replace(/sqrt\(([^()]+)\)/gi, "\\sqrt{$1}")
      .replace(/π/g, "\\pi ")
      .replace(/∞/g, "\\infty ")
      .replace(/≤/g, "\\le ")
      .replace(/≥/g, "\\ge ")
      .replace(/≠/g, "\\ne ")
      .replace(/∈/g, "\\in ")
      .replace(/∉/g, "\\notin ")
      .replace(/∪/g, "\\cup ")
      .replace(/∩/g, "\\cap ")
      .replace(/±/g, "\\pm ")
      .replace(/∫/g, "\\int ")
      .replace(/∑/g, "\\sum ")
      .replace(/∏/g, "\\prod ")
      .replace(/~/g, "\\sim ")
      .replace(/…/g, "\\ldots ")
      .replace(/\*/g, "\\times ")
      .replace(/(sin|cos|tan)(theta|alpha|beta|gamma)/gi, "\\$1 \\$2 ")
      .replace(/(^|[^\\])(cis)(?=[A-Za-z]|\b)/gi, "$1\\operatorname{cis}")
      .replace(/(^|[^A-Za-z\\])(arg|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)(?=[A-Za-z]|\b)/gi, "$1\\$2 ")
      .replace(/(^|[^A-Za-z\\])(mu|sigma|theta|alpha|beta|gamma)\b/gi, "$1\\$2 ")
      .replace(/(^|[^A-Za-z\\])(lambda)\b/gi, "$1\\lambda ")
      .replace(/°/g, "^{\\circ}")
      .replace(/\^([+-]?\d+)/g, "^{$1}")
      .replace(/\(([^()]+)\)/g, function (match, inner) {
        var rendered = expressionToLatex(inner);
        return rendered ? "\\left(" + rendered + "\\right)" : match;
      })
      .replace(/\[([^\[\]]+)\]/g, function (match, inner) {
        var rendered = expressionToLatex(inner);
        return rendered ? "[" + rendered + "]" : match;
      });
  }

  function expressionToLatex(value) {
    var expression = String(value || "").trim();
    if (!expression || !parenthesesAreBalanced(expression)) return null;
    if (wrapsWholeExpression(expression)) {
      var inner = expressionToLatex(expression.slice(1, -1));
      return inner ? "\\left(" + inner + "\\right)" : null;
    }

    var expressionUnit = expression.match(new RegExp("^(.+?)\\s+(" + UNIT_PATTERN + ")$", "i"));
    if (expressionUnit) {
      var unitValue = expressionToLatex(expressionUnit[1]);
      return unitValue ? unitValue + unitToLatex(expressionUnit[2]) : null;
    }

    var indexedRootMatch = expression.match(/^root\((.*)\)$/i);
    if (indexedRootMatch) {
      var rootComma = topLevelPositions(indexedRootMatch[1], function (character) { return character === ","; });
      if (rootComma.length === 1) {
        var rootIndex = expressionToLatex(indexedRootMatch[1].slice(0, rootComma[0]));
        var rootArgument = expressionToLatex(indexedRootMatch[1].slice(rootComma[0] + 1));
        if (rootIndex && rootArgument) return "\\sqrt[" + rootIndex + "]{" + rootArgument + "}";
      }
    }

    var prefixedFunctionMatch = expression.match(/^(.+?)(sqrt|arg|cis|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)\((.*)\)$/i);
    if (prefixedFunctionMatch && prefixedFunctionMatch[1] && parenthesesAreBalanced(prefixedFunctionMatch[3])) {
      var functionPrefix = expressionToLatex(prefixedFunctionMatch[1]);
      var prefixedArgument = expressionToLatex(prefixedFunctionMatch[3]);
      if (functionPrefix && prefixedArgument) {
        var prefixedName = prefixedFunctionMatch[2].toLowerCase();
        var renderedFunction = prefixedName === "sqrt"
          ? "\\sqrt{" + prefixedArgument + "}"
          : prefixedName === "cis"
            ? "\\operatorname{cis}\\left(" + prefixedArgument + "\\right)"
            : "\\" + prefixedName + "\\left(" + prefixedArgument + "\\right)";
        return functionPrefix + renderedFunction;
      }
    }

    var listPositions = topLevelPositions(expression, function (character) { return character === ";" || character === ","; });
    if (listPositions.length) {
      var renderedItems = [];
      var itemStart = 0;
      listPositions.forEach(function (position) {
        renderedItems.push(expressionToLatex(expression.slice(itemStart, position)));
        itemStart = position + 1;
      });
      renderedItems.push(expressionToLatex(expression.slice(itemStart)));
      return renderedItems.every(Boolean) ? renderedItems.join(",\\ ") : null;
    }

    var functionMatch = expression.match(/^(sqrt|arg|cis|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp|N)\((.*)\)$/i);
    if (functionMatch && parenthesesAreBalanced(functionMatch[2])) {
      var functionArgument = expressionToLatex(functionMatch[2]);
      if (!functionArgument) return null;
      return functionMatch[1].toLowerCase() === "sqrt"
        ? "\\sqrt{" + functionArgument + "}"
        : functionMatch[1].toLowerCase() === "cis"
          ? "\\operatorname{cis}\\left(" + functionArgument + "\\right)"
          : functionMatch[1] === "N"
            ? "N\\left(" + functionArgument + "\\right)"
            : "\\" + functionMatch[1].toLowerCase() + "\\left(" + functionArgument + "\\right)";
    }

    var relationPositions = topLevelPositions(expression, function (character) { return /[=≤≥≠<>∈∉~]/.test(character); });
    if (relationPositions.length) {
      if (relationPositions.length > 1) {
        var renderedRelations = [];
        var relationStart = 0;
        relationPositions.forEach(function (position) {
          renderedRelations.push(expressionToLatex(expression.slice(relationStart, position)));
          renderedRelations.push(atomToLatex(expression[position]));
          relationStart = position + 1;
        });
        renderedRelations.push(expressionToLatex(expression.slice(relationStart)));
        return renderedRelations.every(Boolean) ? renderedRelations.join("") : null;
      }
      var relationIndex = relationPositions[0];
      var leftRelation = expressionToLatex(expression.slice(0, relationIndex));
      var rightRelation = expressionToLatex(expression.slice(relationIndex + 1));
      if (!leftRelation || !rightRelation) return null;
      return leftRelation + atomToLatex(expression[relationIndex]) + rightRelation;
    }

    var additivePositions = topLevelPositions(expression, function (character, index) {
      if (index === 0 || (character !== "+" && character !== "-" && character !== "±")) return false;
      return !/[=+\-*/^(,]/.test(expression[index - 1] || "");
    });
    if (additivePositions.length) {
      var renderedTerms = [];
      var termStart = 0;
      additivePositions.forEach(function (position) {
        renderedTerms.push(expressionToLatex(expression.slice(termStart, position)));
        renderedTerms.push(atomToLatex(expression[position]));
        termStart = position + 1;
      });
      renderedTerms.push(expressionToLatex(expression.slice(termStart)));
      return renderedTerms.every(Boolean) ? renderedTerms.join("") : null;
    }

    var multiplicationPositions = topLevelPositions(expression, function (character) { return character === "*" || character === "×" || character === "·"; });
    if (multiplicationPositions.length) {
      var renderedFactors = [];
      var factorStart = 0;
      multiplicationPositions.forEach(function (position) {
        renderedFactors.push(expressionToLatex(expression.slice(factorStart, position)));
        factorStart = position + 1;
      });
      renderedFactors.push(expressionToLatex(expression.slice(factorStart)));
      return renderedFactors.every(Boolean) ? renderedFactors.join("\\times ") : null;
    }

    var divisionPositions = topLevelPositions(expression, function (character) { return character === "/"; });
    if (divisionPositions.length) {
      if (divisionPositions.length > 1) return null;
      var divisionIndex = divisionPositions[0];
      var numerator = expressionToLatex(expression.slice(0, divisionIndex));
      var denominator = expressionToLatex(expression.slice(divisionIndex + 1));
      return numerator && denominator ? "\\frac{" + numerator + "}{" + denominator + "}" : null;
    }
    return atomToLatex(expression);
  }

  function isProseAnswer(value) {
    var words = String(value || "").match(/\b[A-Za-z]{2,}\b/g) || [];
    var proseWords = words.filter(function (word) {
      return !/^(?:dx|dy|dt|ds|dr|du|dv|sin|cos|tan|sec|csc|cot|ln|log|exp|sqrt|root|arg|cis|theta|alpha|beta|gamma|sigma|lambda|mu|pi|rad|cm|mm|km|kg|bold|vec|matrix|blackboard|cal|hat|bar|overline)$/i.test(word);
    });
    return /\s/.test(String(value || "")) && proseWords.length >= 3;
  }

  function normalizeExplanationText(value) {
    var blackboard = { R: "ℝ", C: "ℂ", Q: "ℚ", Z: "ℤ", N: "ℕ" };
    return clean(value)
      .replace(/^valid reasoning,?\s*(?:e\.?g\.?)?\s*/i, "")
      .replace(/\bblackboard\(([RCQZN])\)/gi, function (_match, set) { return blackboard[set.toUpperCase()] || set; })
      .replace(/\bmatrix\(([^()]*)\)/gi, function (_match, body) { return "(" + body.replace(/;/g, ", ") + ")"; })
      .replace(/\b(?:bold|vec|cal|hat|bar|overline)\(([^()]*)\)/gi, "$1")
      .replace(/\bH_0\b/g, "H₀").replace(/\bH_1\b/g, "H₁")
      .replace(/\brho\b/gi, "ρ").replace(/\bmu\b/gi, "μ").replace(/\btheta\b/gi, "θ")
      .replace(/\blambda\b/gi, "λ").replace(/\bbeta\b/gi, "β").replace(/\bsigma\b/gi, "σ")
      .replace(/(\d)ldots(?=[A-Za-z])/gi, "$1…")
      .replace(/\b[A-Z]{4,}\b/g, function (word) { return word.toLowerCase(); })
      .replace(/\s*\(\s*(?:or equivalent|oe)\s*\)\s*/gi, "")
      .replace(/[,;]?\s+(?:or equivalent|oe)\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasMarkingLanguage(value) {
    return /\b(?:award(?:ed)?|follow through|method mark|answer only|correct answer|reasonable attempt|complete solution|must be seen|do not condone|condone|cao|oe|or equivalent|their answer|their value|markscheme|mark scheme)\b|\([MABRGEN]\d+(?:ft)?\)|\b[MABRGEN]\d+(?:ft)?\b/i.test(String(value || ""));
  }

  function hasAwkwardWording(value) {
    var answer = String(value || "");
    return /\b(\w{3,})\s+\1\b/i.test(answer)
      || /\bon the floor on the floor\b|\bbecause because\b|\bmight have (?:received no report|refused to respond|finished responding) to\b/i.test(answer)
      || /\b(?:equal|zero|unrelated) than\b|\bsignificantly (?:equal|zero|unrelated)\b/i.test(answer)
      || /\brising (?:below|on|unrelated|perpendicular) to\b|\b(?:also|only|necessarily|always) doubled\b/i.test(answer)
      || /\bstretch (?:skew|coincident|intersecting at one point) to\b/i.test(answer)
      || /\bexpression is not (?:biased|inconclusive|unreliable|invalid)\b/i.test(answer)
      || /\b(?:minimum|maximum|initial|total) value \([^)]*\)\b/i.test(answer)
      || /\b(?:complete|decisive|conclusive) evidence\b/i.test(answer)
      || /\b(?:a|an) (?:intercept|point of inflexion) at\b/i.test(answer);
  }

  function isChoiceTextSafe(value) {
    var answer = clean(value);
    if (!isDisplaySafe(answer) || hasMarkingLanguage(answer) || hasAwkwardWording(answer) || /\d\.\d+(?:…|\.\.\.)/.test(answer)) return false;
    if (/\/\s*(?:-|0(?:\.0*)?\b)/.test(answer) || /±\s*-/.test(answer)) return false;
    var simpleCoordinates = answer.match(/\(\s*-?[^,();]+\s*,\s*-?[^,();]+\s*\)/g) || [];
    if (new Set(simpleCoordinates.map(canonical)).size !== simpleCoordinates.length) return false;
    var convertedDimensions = answer.match(/(-?\d+(?:\.\d+)?)\s*cm\s+by\s+(-?\d+(?:\.\d+)?)\s*cm\s*\(\s*(-?\d+(?:\.\d+)?)\s*mm\s+by\s+(-?\d+(?:\.\d+)?)\s*mm\s*\)/i);
    if (convertedDimensions && (Math.abs(Number(convertedDimensions[3]) - 10 * Number(convertedDimensions[1])) > 0.11
      || Math.abs(Number(convertedDimensions[4]) - 10 * Number(convertedDimensions[2])) > 0.11)) return false;
    var coordinateList = coordinateTuples(answer);
    if (coordinateList.length > 1 && new Set(coordinateList.map(canonical)).size !== coordinateList.length) return false;
    var repeatedAssignments = {};
    answer.split(/\s*;\s*/).forEach(function (piece) {
      var assignment = piece.match(/^([A-Za-z](?:_?\d+)?)\s*=\s*(.+)$/);
      if (!assignment) return;
      var key = assignment[1].toLowerCase();
      (repeatedAssignments[key] || (repeatedAssignments[key] = [])).push(canonical(assignment[2]));
    });
    if (Object.keys(repeatedAssignments).some(function (key) {
      return new Set(repeatedAssignments[key]).size !== repeatedAssignments[key].length;
    })) return false;
    if (isProseAnswer(answer)) {
      if (answer.length > 240) return false;
      if (/\b(?:matrix|blackboard|math(?:bf|rm|cal|bb|frak)|mathrm|displaystyle|ldots|cdots|circ)\s*\(?/i.test(answer)) return false;
    } else if (answer.length > 300) return false;
    var rendered = toLatex(answer);
    return Boolean(rendered && rendered.indexOf("/") === -1
      && !/\\text\{[^}]*\b(?:matrix|blackboard|math(?:bf|rm|cal|bb|frak)|mathrm|displaystyle|ldots|cdots|circ)\b/i.test(rendered));
  }

  function isDisplaySafe(value) {
    var answer = clean(value);
    if (!answer || answer.length > 360) return false;
    if (/\\|\b(?:mathrm|circ|ldots|cdots)\b|\^\s*$|\/\s*\/|\bsqrt\b\s*(?!\()|\broot\b\s*(?!\()/i.test(answer)
      || RAW_LATEX_COMMAND_PATTERN.test(answer)) return false;
    if (/sqrt\(\s*-/.test(answer) || !parenthesesAreBalanced(answer)) return false;
    if (isProseAnswer(answer)) return true;
    if (/^(?:Odd|Even), because f\(-x\) = -?f\(x\)$/i.test(answer)
      || /^Neither, because f\(-x\) ≠ f\(x\) and f\(-x\) ≠ -f\(x\)$/i.test(answer)) return true;
    var unitSuffix = answer.match(new RegExp("^(.+?)\\s+(" + UNIT_PATTERN + ")$", "i"));
    var rendered = expressionToLatex(unitSuffix ? unitSuffix[1] : answer);
    return Boolean(rendered && rendered.indexOf("/") === -1);
  }

  function addCandidate(list, candidate) {
    var value = clean(candidate);
    if (!isDisplaySafe(value)) return;
    if (!list.some(function (item) { return equivalent(item, value); })) list.push(value);
  }

  function formatFraction(numerator, denominator) {
    if (!denominator) return "";
    if (denominator < 0) {
      numerator = -numerator;
      denominator = -denominator;
    }
    return denominator === 1 ? String(numerator) : numerator + "/" + denominator;
  }

  function quantityParts(value) {
    var pattern = new RegExp("^([a-zα-ω](?:\\([^)]*\\))?\\s*=\\s*)?(-?\\d+(?:\\.\\d+)?)\\s*(" + UNIT_PATTERN + ")?$", "i");
    var match = clean(value).match(pattern);
    return match ? { prefix: match[1] || "", number: Number(match[2]), rawNumber: match[2], unit: match[3] || "" } : null;
  }

  function fractionParts(value) {
    var pattern = new RegExp("^([a-zα-ω](?:\\([^)]*\\))?\\s*=\\s*)?(-?\\d+(?:\\.\\d+)?)\\s*\\/\\s*(-?\\d+(?:\\.\\d+)?)\\s*(" + UNIT_PATTERN + ")?$", "i");
    var match = clean(value).match(pattern);
    return match ? { prefix: match[1] || "", numerator: Number(match[2]), denominator: Number(match[3]), unit: match[4] || "" } : null;
  }

  function fractionCandidates(correct, list) {
    var value = fractionParts(correct);
    if (!value || !value.denominator) return;
    var numerator = value.numerator;
    var denominator = value.denominator;
    [
      [-numerator, denominator],
      [denominator, numerator || 1],
      [numerator + denominator, denominator],
      [numerator - denominator, denominator],
      [numerator * 2 + (numerator >= 0 ? 1 : -1), denominator],
      [numerator, denominator + (denominator >= 0 ? 2 : -2)],
    ].forEach(function (pair) {
      var fraction = formatFraction(pair[0], pair[1]);
      if (fraction) addCandidate(list, value.prefix + fraction + (value.unit ? " " + value.unit : ""));
    });
  }

  function simpleNumberCandidates(correct, list) {
    var value = quantityParts(correct);
    if (!value) return;
    var number = value.number;
    var magnitude = Math.abs(number);
    var direction = number < 0 ? -1 : 1;
    var places = decimalPlaces(value.rawNumber);
    var candidates;
    if (number === 0) {
      candidates = [3, -4, 12, 0.5, -9];
    } else if (magnitude >= 10) {
      var smallerSpread = Math.max(3, Math.round(magnitude * .12));
      var largerSpread = Math.max(7, Math.round(magnitude * .28));
      var lowValue = Math.max(1, Math.round(magnitude / 3) - 1);
      candidates = [
        number + direction * smallerSpread,
        number - direction * largerSpread,
        direction * (magnitude * 2 + smallerSpread),
        direction * lowValue,
        -number,
      ];
    } else if (magnitude >= 1) {
      candidates = [number + direction * 2, number - direction * 3, direction * (magnitude * 2 + 1), number / 2, -number, number + direction * 5];
    } else {
      candidates = [number * 2, number / 2, number + direction, -number, number + direction * .25];
    }
    candidates.forEach(function (candidate) {
      var formatted = formatNumber(candidate, places || (Math.abs(candidate % 1) > 1e-10 ? 2 : 0));
      if (formatted) addCandidate(list, value.prefix + formatted + (value.unit ? " " + value.unit : ""));
    });
  }

  function radicalCandidates(correct, list) {
    var match = clean(correct).match(/^sqrt\((\d+(?:\.\d+)?)\)$/i);
    if (!match) return;
    var radicand = Number(match[1]);
    var places = decimalPlaces(match[1]);
    [radicand + 4, radicand * 2 + 1, Math.max(1, Math.round(radicand / 2) - 1)].forEach(function (value) {
      addCandidate(list, "sqrt(" + formatNumber(value, places) + ")");
    });
    addCandidate(list, formatNumber(radicand, places));
    addCandidate(list, formatNumber(Math.sqrt(radicand) + 2, 2));
  }

  function signedRadicalEquationCandidates(correct, list) {
    var match = clean(correct).match(/^([a-z])\s*=\s*±sqrt\((\d+(?:\.\d+)?)\)$/i);
    if (!match) return;
    var radicand = Number(match[2]);
    var places = decimalPlaces(match[2]);
    [radicand + 2, Math.max(1, radicand - 2), radicand * 2 + 1, Math.max(1, Math.round(radicand / 2) - 1)].forEach(function (value) {
      addCandidate(list, match[1] + "=±sqrt(" + formatNumber(value, places) + ")");
    });
  }

  function mutateNumberTokens(correct, list) {
    if (quantityParts(correct) || fractionParts(correct) || /^sqrt\(/i.test(clean(correct))) return;
    var matches = [];
    var pattern = /-?\d+(?:\.\d+)?/g;
    var match;
    while ((match = pattern.exec(correct)) && matches.length < 4) matches.push({ index: match.index, value: match[0] });
    matches.forEach(function (token) {
      if (token.index > 0 && /[A-Za-z0-9_^]/.test(correct[token.index - 1])) return;
      if (token.index > 1 && correct[token.index - 2] === "^") return;
      var number = Number(token.value);
      var places = decimalPlaces(token.value);
      var magnitude = Math.abs(number);
      var spread = Math.max(2, Math.round(magnitude * .4));
      [number + spread, number - spread, number === 0 ? 3 : -number, number * 2 + (number >= 0 ? 1 : -1)].forEach(function (replacement) {
        var formatted = formatNumber(replacement, places);
        if (!formatted) return;
        addCandidate(list, correct.slice(0, token.index) + formatted + correct.slice(token.index + token.value.length));
      });
    });
  }

  function implicitProductCandidates(correct, list) {
    var match = clean(correct).match(/^(-?\d+(?:\.\d+)?)([A-Za-zα-ω](?:[A-Za-zα-ω0-9]*)(?:\^[A-Za-z0-9.+-]+)?)$/i);
    if (!match) return;
    var coefficient = Number(match[1]);
    var places = decimalPlaces(match[1]);
    var direction = coefficient < 0 ? -1 : 1;
    var spread = Math.max(2, Math.round(Math.abs(coefficient) * .4));
    var lower = coefficient - direction * (spread + 1);
    if (Math.abs(lower) < 1e-10) lower -= direction;
    [
      coefficient + direction * spread,
      lower,
      -coefficient,
      coefficient * 2 + direction,
    ].forEach(function (candidate) {
      var formatted = formatNumber(candidate, places);
      if (formatted) addCandidate(list, (formatted === "1" ? "" : formatted === "-1" ? "-" : formatted) + match[2]);
    });
  }

  function functionValueCandidates(correct, list) {
    var match = clean(correct).match(/^(sin|cos|tan|ln|log|exp)\s+(-?\d+(?:\.\d+)?)$/i);
    if (!match) return;
    var value = Number(match[2]);
    if (!Number.isFinite(value) || ((/^ln$|^log$/i.test(match[1])) && value <= 0)) return;
    var places = decimalPlaces(match[2]);
    var alternatives = [value + 1, value * 2, value / 2];
    alternatives.forEach(function (alternative) {
      if ((/^ln$|^log$/i.test(match[1])) && alternative <= 0) return;
      addCandidate(list, match[1] + " " + formatNumber(alternative, places || (alternative % 1 ? 2 : 0)));
    });
    addCandidate(list, "2*(" + match[1] + " " + match[2] + ")");
  }

  function dimensionCandidates(correct, list) {
    var match = clean(correct).match(/^(.*?)(-?\d+(?:\.\d+)?)\s*cm\s+by\s+(-?\d+(?:\.\d+)?)\s*cm\s*\(\s*(-?\d+(?:\.\d+)?)\s*mm\s+by\s+(-?\d+(?:\.\d+)?)\s*mm\s*\)(.*)$/i);
    if (!match) return;
    var width = Number(match[2]);
    var height = Number(match[3]);
    var variants = [[width + 1, height], [Math.max(0.1, width - 1), height], [width, height + 1], [width, Math.max(0.1, height - 1)]];
    variants.forEach(function (pair) {
      var first = formatNumber(pair[0], decimalPlaces(match[2]));
      var second = formatNumber(pair[1], decimalPlaces(match[3]));
      addCandidate(list, match[1] + first + " cm by " + second + " cm (" + formatNumber(pair[0] * 10, 0) + " mm by " + formatNumber(pair[1] * 10, 0) + " mm)" + match[6]);
    });
  }

  function categoricalCandidates(correct, list) {
    var normalized = clean(correct).toLowerCase();
    var alternatives = {
      minimum: ["Maximum", "Neither", "Point of inflexion", "Cannot be determined"],
      maximum: ["Minimum", "Neither", "Point of inflexion", "Cannot be determined"],
      "concave up for all values of x": ["Concave down for all values of x", "Linear for all values of x", "Changes concavity once", "Cannot be determined"],
      "concave down for all values of x": ["Concave up for all values of x", "Linear for all values of x", "Changes concavity once", "Cannot be determined"],
      "one-to-one": ["Many-to-one", "Constant", "Periodic", "Cannot be determined"],
      "many-to-one": ["One-to-one", "Constant", "Strictly increasing", "Cannot be determined"],
      "systematic sampling": ["Convenience sampling", "Quota sampling", "Simple random sampling", "Stratified sampling"],
      "simple random sampling": ["Convenience sampling", "Quota sampling", "Stratified sampling", "Systematic sampling"],
      "stratified sampling": ["Convenience sampling", "Quota sampling", "Simple random sampling", "Systematic sampling"],
      "quota sampling": ["Convenience sampling", "Simple random sampling", "Stratified sampling", "Systematic sampling"],
      "convenience sampling": ["Quota sampling", "Simple random sampling", "Stratified sampling", "Systematic sampling"],
      discrete: ["Continuous", "Categorical", "Ordinal", "Cannot be determined"],
      continuous: ["Discrete", "Categorical", "Ordinal", "Cannot be determined"],
      "the captains can see one another": ["The captains cannot see one another", "They can only see one another at the start", "They can only see one another at the end", "There is insufficient information"],
      "only f can be used as a probability mass function": ["Only g can be used as a probability mass function", "Both f and g can be used as probability mass functions", "Neither f nor g can be used as a probability mass function", "There is insufficient information"],
    }[normalized];
    if (/^(?:do not reject|reject) the null hypothesis, because there is (?:in)?sufficient evidence for the alternative hypothesis$/.test(normalized)) {
      alternatives = [
        "Reject the null hypothesis, because there is sufficient evidence for the alternative hypothesis",
        "Reject the null hypothesis, because there is insufficient evidence for the alternative hypothesis",
        "Do not reject the null hypothesis, because there is sufficient evidence for the alternative hypothesis",
        "Do not reject the null hypothesis, because there is insufficient evidence for the alternative hypothesis",
        "Accept the alternative hypothesis without using the significance level",
      ];
      alternatives = alternatives.filter(function (alternative) { return clean(alternative).toLowerCase() !== normalized; });
    }
    var likely = clean(correct).match(/^([A-Za-z]+) is more likely(?: to .+)?$/i);
    if (likely) {
      alternatives = [
        likely[1] === "Jan" ? "Sia is more likely" : "Jan is more likely",
        "They are equally likely",
        "Neither is more likely",
        "Cannot be determined",
      ];
    }
    var closer = clean(correct).match(/^([A-Z]) is closer to its opposite face than ([A-Z])$/);
    if (closer) {
      alternatives = [
        closer[2] + " is closer to its opposite face than " + closer[1],
        "Both vertices are equally close to their opposite faces",
        "Neither vertex has an opposite face",
        "Cannot be determined",
      ];
    }
    if (alternatives) alternatives.forEach(function (alternative) { addCandidate(list, alternative); });
  }

  function symbolicExpressionCandidates(expression, list) {
    var divisionPositions = topLevelPositions(expression, function (character) { return character === "/"; });
    if (divisionPositions.length === 1) {
      var divisionIndex = divisionPositions[0];
      var numerator = expression.slice(0, divisionIndex).trim();
      var denominator = expression.slice(divisionIndex + 1).trim();
      if (!numerator || !denominator) return;
      var unsignedNumerator = numerator.replace(/^-/, "");
      var oppositeNumerator = numerator[0] === "-" ? unsignedNumerator : "-" + numerator;
      var reciprocalSign = numerator[0] === "-" ? "-" : "";
      addCandidate(list, wrapFractionPart(oppositeNumerator) + "/" + wrapFractionPart(denominator));
      addCandidate(list, reciprocalSign + wrapFractionPart(denominator) + "/" + wrapFractionPart(unsignedNumerator));
      addCandidate(list, wrapFractionPart(numerator + "+1") + "/" + wrapFractionPart(denominator));
      addCandidate(list, wrapFractionPart(numerator) + "/" + wrapFractionPart(denominator + "+1"));
      return;
    }
    addCandidate(list, "-(" + expression + ")");
    addCandidate(list, "(" + expression + ")+2");
    addCandidate(list, "(" + expression + ")-3");
    addCandidate(list, "2*(" + expression + ")");
    addCandidate(list, "3*(" + expression + ")");
  }

  function relationMutationCandidates(correct, list) {
    var expression = clean(correct);
    var relationPattern = /[<≤>≥≠=]/g;
    var match;
    while ((match = relationPattern.exec(expression)) && list.length < 8) {
      var alternatives = {
        "<": ["≤", ">"],
        "≤": ["<", "≥"],
        ">": ["≥", "<"],
        "≥": [">", "≤"],
        "≠": ["=", "<"],
        "=": [],
      }[match[0]] || [];
      alternatives.forEach(function (relation) {
        addCandidate(list, expression.slice(0, match.index) + relation + expression.slice(match.index + match[0].length));
      });
    }
  }

  function intervalCandidates(correct, list) {
    var expression = clean(correct);
    if (!/[\[\]]/.test(expression) || !/,/.test(expression)) return;
    addCandidate(list, expression.replace(/^\[/, "]"));
    addCandidate(list, expression.replace(/\[$/, "]"));
    addCandidate(list, expression.replace(/∞/g, "0"));
    addCandidate(list, expression.replace(/∞/g, "1"));
  }

  function setMembershipCandidates(correct, list) {
    var expression = clean(correct);
    var match = expression.match(/^(.+?)∈blackboard\(([RQCZN])\)$/i);
    if (!match) return;
    ["R", "Q", "Z", "N", "C"].filter(function (set) { return set !== match[2].toUpperCase(); }).forEach(function (set) {
      addCandidate(list, match[1] + "∈blackboard(" + set + ")");
    });
  }

  function setExpressionCandidates(correct, list) {
    var expression = clean(correct);
    if (!/[∪∩]/.test(expression)) return;
    addCandidate(list, expression.replace(/∪/g, "§").replace(/∩/g, "∪").replace(/§/g, "∩"));
    addCandidate(list, expression.replace(/∪/g, "∩"));
    addCandidate(list, expression.replace(/∩/g, "∪"));
    addCandidate(list, expression + "'");
    addCandidate(list, "(" + expression + ")'");
  }

  function symbolicCandidates(correct, list) {
    var expression = clean(correct);
    if (expression.length > 110 || /;/.test(expression)) return;
    var simpleSymbol = /^(?:[a-zα-ω]|mu|sigma|theta|alpha|beta|gamma)$/.test(expression);
    var algebraicShape = /[A-Za-zα-ωπ]/.test(expression)
      && (/[=+\-*/^<>≤≥≠]/.test(expression)
        || /\d[A-Za-zα-ω]|[A-Za-zα-ω]\d/.test(expression)
        || /^-?\d*(?:sin|cos|tan)(?:mu|sigma|theta|alpha|beta|gamma|[a-z])/i.test(expression)
        || /^(?:π|[A-Za-zα-ω])(?:\s+(?:π|[A-Za-zα-ω]))+$/.test(expression)
        || /(?:sqrt|sin|cos|tan|ln|log|exp)\s*(?:\(|[A-Za-z0-9])/i.test(expression));
    if (!simpleSymbol && !algebraicShape) return;

    if (simpleSymbol) {
      addCandidate(list, "-" + expression);
      addCandidate(list, "2" + expression);
      addCandidate(list, expression + "+2");
      addCandidate(list, expression + "-3");
      return;
    }

    var comparisonPositions = topLevelPositions(expression, function (character) { return /[<>≤≥≠]/.test(character); });
    if (comparisonPositions.length === 1) {
      var comparisonIndex = comparisonPositions[0];
      var relationAlternatives = {
        "<": ["≤", ">"],
        ">": ["≥", "<"],
        "≤": ["<", "≥"],
        "≥": [">", "≤"],
        "≠": ["=", "<", ">"],
      }[expression[comparisonIndex]] || [];
      relationAlternatives.forEach(function (relation) {
        addCandidate(list, expression.slice(0, comparisonIndex) + relation + expression.slice(comparisonIndex + 1));
      });
      return;
    }
    if (comparisonPositions.length || /[<>≤≥≠]/.test(expression)) return;

    var relationPositions = topLevelPositions(expression, function (character) { return character === "="; });
    if (relationPositions.length === 1) {
      var relationIndex = relationPositions[0];
      var leftSide = expression.slice(0, relationIndex).trim();
      var rightSide = expression.slice(relationIndex + 1).trim();
      var rightCandidates = [];
      symbolicExpressionCandidates(rightSide, rightCandidates);
      rightCandidates.forEach(function (candidate) { addCandidate(list, leftSide + "=" + candidate); });
      return;
    }
    symbolicExpressionCandidates(expression, list);
  }

  function seriesCandidates(correct, list) {
    var expression = clean(correct);
    var relationIndex = expression.indexOf("=");
    var prefix = relationIndex > 0 ? expression.slice(0, relationIndex + 1) : "";
    var series = relationIndex > 0 ? expression.slice(relationIndex + 1) : expression;
    if (/\^-/.test(series) || !/x\^\d/.test(series)) return;
    var terms = series.match(/[+-]?[^+-]+/g) || [];
    if (terms.length < 3) return;
    for (var index = 1; index < terms.length && list.length < 4; index += 1) {
      var changed = terms.slice();
      changed[index] = changed[index][0] === "+" ? "-" + changed[index].slice(1)
        : changed[index][0] === "-" ? "+" + changed[index].slice(1)
          : "-" + changed[index];
      addCandidate(list, prefix + changed.join(""));
    }
    if (list.length < 4) addCandidate(list, prefix + terms.slice(0, -1).join(""));
  }

  function compositeCandidates(correct, list) {
    var expression = clean(correct);
    var separators = topLevelPositions(expression, function (character) { return character === ";"; });
    if (!separators.length) return;
    var parts = [];
    var start = 0;
    separators.forEach(function (position) {
      parts.push(expression.slice(start, position).trim());
      start = position + 1;
    });
    parts.push(expression.slice(start).trim());
    var replacementsByPart = parts.map(function (part) {
      if (!part) return;
      var local = [];
      fractionCandidates(part, local);
      simpleNumberCandidates(part, local);
      radicalCandidates(part, local);
      signedRadicalEquationCandidates(part, local);
      implicitProductCandidates(part, local);
      mutateNumberTokens(part, local);
      relationMutationCandidates(part, local);
      intervalCandidates(part, local);
      symbolicCandidates(part, local);
      return local.slice(0, 4);
    });
    for (var replacementIndex = 0; replacementIndex < 4; replacementIndex += 1) {
      replacementsByPart.forEach(function (replacements, partIndex) {
        if (!replacements || !replacements[replacementIndex]) return;
        var changed = parts.slice();
        changed[partIndex] = replacements[replacementIndex];
        addCandidate(list, changed.join("; "));
      });
    }
  }

  function hash(value) {
    var result = 2166136261;
    for (var index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function shuffled(values, seed) {
    var result = values.slice();
    var state = hash(String(seed || "assignment")) || 1;
    function random() {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return (state >>> 0) / 4294967296;
    }
    for (var index = result.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(random() * (index + 1));
      var temporary = result[index]; result[index] = result[swap]; result[swap] = temporary;
    }
    return result;
  }

  function validateChoiceSet(acceptedAnswers, options, correctOption) {
    if (!Array.isArray(acceptedAnswers) || !acceptedAnswers.length || !Array.isArray(options) || options.length !== 5) return false;
    if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) return false;
    if (options.some(function (option) { return !isChoiceTextSafe(option); })) return false;
    for (var left = 0; left < options.length; left += 1) {
      for (var right = left + 1; right < options.length; right += 1) {
        if (equivalent(options[left], options[right])) return false;
      }
    }
    if (!acceptedAnswers.some(function (answer) { return equivalent(options[correctOption], answer); })) return false;
    return options.every(function (option, index) {
      return index === correctOption || !acceptedAnswers.some(function (answer) { return equivalent(option, answer); });
    });
  }

  function isPlausibleForPrompt(candidate, prompt) {
    var question = plainText(prompt).toLowerCase();
    var answer = clean(candidate);
    if (/sqrt\(\s*0\s*\)|root\([^,]+,\s*0\s*\)|±\s*-/.test(answer)) return false;
    var directValue = numericValue(answer);
    var numeric = answer.match(/(?:^|=|;)\s*(-?\d+(?:\.\d+)?)\s*(?:%|°|rad|cm|mm|km|m|s|kg|$)/i);
    if (directValue === null && !numeric) return true;
    var value = directValue === null ? Number(numeric[1]) : directValue;
    var asksForProbability = /\b(?:find|calculate|determine|write down|state|estimate)\s+(?:the\s+)?probability\b|\bprobability\s+that\b/.test(question);
    if (asksForProbability && (value < 0 || value > 1)) return false;
    if (/\bpercent(?:age)?\b|%/.test(question) && (value < 0 || value > 100)) return false;
    if (/\bstandard deviation\b|\blength\b|\barea\b|\bvolume\b|\btime\b|\bdistance\b|\bheight\b|\bmass\b/.test(question) && value < 0) return false;
    if (/\bangle\b/.test(question) && !/\b(?:directed|argument)\b/.test(question) && value < 0) return false;
    return true;
  }

  function isReasonLikeAnswer(answer) {
    var text = clean(answer);
    var wordCount = (text.match(/\b[A-Za-z]{2,}\b/g) || []).length;
    var equalityCount = (text.match(/=/g) || []).length;
    return /[<>≤≥≠]/.test(text)
      || equalityCount >= 2
      || /\b(?:because|since|therefore|hence|so|theorem|gradient|derivative|concav|interpol|extrapol|evidence|reject|reliable|valid|increasing|decreasing|minimum|maximum|correct|possible|impossible|greater|less|equal|odd|even|independent|complies|supported|guaranteed|closer|further|proportional|biased|random|representative)\b/i.test(text)
      || wordCount >= 5;
  }

  function isDecisionLikeAnswer(answer) {
    return /\b(?:yes|no|correct|incorrect|will|will not|should|should not|can|cannot|more likely|less likely|only|both|neither|minimum|maximum|point of inflexion|reject|accept|greater than the actual value|less than the actual value)\b/i.test(clean(answer));
  }

  function generateChoiceSet(acceptedAnswers, seed, prompt) {
    var accepted = (Array.isArray(acceptedAnswers) ? acceptedAnswers : []).map(clean).filter(isChoiceTextSafe);
    if (!accepted.length) return null;
    var correct = accepted[0];
    // A scalar or fragment is not a safe answer to a request for reasoning. Dedicated
    // explanation generators run before this fallback; if they cannot recover the
    // conclusion and its reason together, leave the part for teacher review instead.
    if (isExplanationPrompt(prompt) && !isReasonLikeAnswer(correct)) return null;
    if (/\b(?:whether|claim)\b/i.test(plainText(prompt)) && !isDecisionLikeAnswer(correct)) return null;
    var candidates = [];
    fractionCandidates(correct, candidates);
    simpleNumberCandidates(correct, candidates);
    radicalCandidates(correct, candidates);
    signedRadicalEquationCandidates(correct, candidates);
    functionValueCandidates(correct, candidates);
    dimensionCandidates(correct, candidates);
    categoricalCandidates(correct, candidates);
    implicitProductCandidates(correct, candidates);
    seriesCandidates(correct, candidates);
    var distribution = correct.match(/^(.*~\s*N\([^,]+,\s*\(?sigma\^2\)?\s*\/\s*)(\d+)(\).*)$/i);
    if (distribution) {
      var distributionDenominator = Number(distribution[2]);
      [distributionDenominator + 10, Math.max(2, Math.round(distributionDenominator / 2)), distributionDenominator * 2, Math.max(2, Math.round(distributionDenominator / 4))].forEach(function (denominator) {
        addCandidate(candidates, distribution[1] + denominator + distribution[3]);
      });
    }
    compositeCandidates(correct, candidates);
    mutateNumberTokens(correct, candidates);
    relationMutationCandidates(correct, candidates);
    intervalCandidates(correct, candidates);
    setMembershipCandidates(correct, candidates);
    setExpressionCandidates(correct, candidates);
    symbolicCandidates(correct, candidates);
    var probabilityPrompt = /\b(?:find|calculate|determine|write down|state|estimate)\s+(?:the\s+)?probability\b|\bprobability\s+that\b/i.test(plainText(prompt));
    var probabilityFraction = fractionParts(correct);
    if (probabilityPrompt && probabilityFraction && probabilityFraction.denominator > 1) {
      var probabilityStep = Math.max(1, Math.round(probabilityFraction.denominator * .12));
      [
        [Math.min(probabilityFraction.denominator - 1, probabilityFraction.numerator + probabilityStep), probabilityFraction.denominator],
        [Math.max(1, probabilityFraction.numerator - probabilityStep), probabilityFraction.denominator],
        [probabilityFraction.denominator - probabilityFraction.numerator, probabilityFraction.denominator],
        [probabilityFraction.numerator, probabilityFraction.denominator + probabilityStep],
      ].forEach(function (pair) { addCandidate(candidates, formatFraction(pair[0], pair[1])); });
    }
    var probabilityValue = quantityParts(correct);
    if (probabilityValue && probabilityPrompt) {
      [1 - probabilityValue.number, Math.min(.95, probabilityValue.number + .18), Math.max(.05, probabilityValue.number - .12), Math.min(.9, probabilityValue.number + .36)].forEach(function (candidate) {
        addCandidate(candidates, (probabilityValue.prefix || "") + formatNumber(candidate, decimalPlaces(probabilityValue.rawNumber) || 2));
      });
    }
    var distractors = candidates.filter(function (candidate) {
      return isChoiceTextSafe(candidate) && isPlausibleForPrompt(candidate, prompt) && !accepted.some(function (answer) { return equivalent(candidate, answer); });
    }).slice(0, 4);
    if (distractors.length !== 4) return null;
    var options = shuffled([correct].concat(distractors), seed);
    var correctOption = options.indexOf(correct);
    return validateChoiceSet(accepted, options, correctOption)
      ? { acceptedAnswers: accepted, options: options, correctOption: correctOption }
      : null;
  }

  function parityClassification(rows) {
    var text = (Array.isArray(rows) ? rows : []).map(function (row) {
      return plainText(Array.isArray(row) ? row[0] : row);
    }).join(" ");
    var direct = text.match(/(?:^|\b(?:is|so|therefore|hence)\s+)(odd|even|neither)(?:\s+function)?\b/i);
    if (direct) return direct[1].toLowerCase();
    if (/f\s*\(\s*-x\s*\)\s*=\s*-\s*f\s*\(\s*x\s*\)/i.test(text)) return "odd";
    if (/f\s*\(\s*-x\s*\)\s*=\s*f\s*\(\s*x\s*\)/i.test(text)) return "even";
    return "";
  }

  function generateParityChoiceSet(rows, prompt, seed) {
    if (!/\b(?:odd|even)\b/i.test(plainText(prompt))) return null;
    var classification = parityClassification(rows);
    if (!classification) return null;
    var options = [
      "Odd, because f(-x) = -f(x)",
      "Odd, because f(-x) = f(x)",
      "Even, because f(-x) = f(x)",
      "Even, because f(-x) = -f(x)",
      "Neither, because f(-x) ≠ f(x) and f(-x) ≠ -f(x)",
    ];
    var correct = classification === "odd" ? options[0] : classification === "even" ? options[2] : options[4];
    var shuffledOptions = shuffled(options, seed);
    var correctOption = shuffledOptions.indexOf(correct);
    return validateChoiceSet([correct], shuffledOptions, correctOption)
      ? { acceptedAnswers: [correct], options: shuffledOptions, correctOption: correctOption }
      : null;
  }

  function comparisonReasonDetails(rows, prompt) {
    var question = plainText(prompt);
    if (!/\b(?:greater than|less than)\b/i.test(question) || !/\b(?:reason|why)\b/i.test(question)) return null;
    var answer = (Array.isArray(rows) ? rows : []).map(function (row) {
      return plainText(latexToPlain(Array.isArray(row) ? row[0] : row));
    }).join(" ");
    var directionMatch = answer.match(/\b(less than|greater than)\b/i);
    var trendMatch = answer.match(/\b(?:gradient|derivative|dy\s*\/\s*dx)\b[\s\S]{0,100}\b(increasing|decreasing|constant)\b/i)
      || answer.match(/\b(increasing|decreasing|constant)\b[\s\S]{0,100}\b(?:gradient|derivative|dy\s*\/\s*dx)\b/i);
    if (!directionMatch || !trendMatch) return null;
    return {
      direction: directionMatch[1].toLowerCase(),
      trend: trendMatch[1].toLowerCase(),
    };
  }

  function comparisonReasonLabel(direction, trend) {
    var directionLabel = direction === "greater than" ? "Greater than" : direction === "less than" ? "Less than" : "Equal to";
    var reason = trend === "constant" ? "the gradient stays constant" : "the gradient is " + trend;
    return directionLabel + " the actual value, because " + reason;
  }

  function generateComparisonReasonChoiceSet(rows, prompt, seed) {
    var details = comparisonReasonDetails(rows, prompt);
    if (!details) return null;
    var correct = comparisonReasonLabel(details.direction, details.trend);
    var options = [
      comparisonReasonLabel("less than", "increasing"),
      comparisonReasonLabel("greater than", "increasing"),
      comparisonReasonLabel("less than", "decreasing"),
      comparisonReasonLabel("greater than", "decreasing"),
      comparisonReasonLabel("equal to", "constant"),
    ];
    if (options.indexOf(correct) === -1) return null;
    var shuffledOptions = shuffled(options, seed);
    var correctOption = shuffledOptions.indexOf(correct);
    return validateChoiceSet([correct], shuffledOptions, correctOption)
      ? { acceptedAnswers: [correct], options: shuffledOptions, correctOption: correctOption }
      : null;
  }

  function proseMutationCandidates(correct, list) {
    var answer = clean(correct);
    var replacementGroups = [
      [/\bgreater than\b/i, ["less than", "equal to", "greater than or equal to", "less than or equal to"]],
      [/\bless than\b/i, ["greater than", "equal to", "less than or equal to", "greater than or equal to"]],
      [/\bincreasing\b/i, ["decreasing", "constant", "alternating", "undefined"]],
      [/\bdecreasing\b/i, ["increasing", "constant", "alternating", "undefined"]],
      [/\bchanges sign\b/i, ["does not change sign", "stays positive", "stays negative", "is undefined"]],
      [/\bis zero\b/i, ["is positive", "is negative", "is undefined", "does not exist"]],
      [/\bpositive\b/i, ["negative", "zero", "non-positive", "undefined"]],
      [/\bnegative\b/i, ["positive", "zero", "non-negative", "undefined"]],
      [/\bmaximum\b/i, ["minimum", "point of inflexion", "intercept", "stationary point with no extremum"]],
      [/\bminimum\b/i, ["maximum", "point of inflexion", "intercept", "stationary point with no extremum"]],
      [/\bparallel\b/i, ["perpendicular", "coincident", "skew", "intersecting at one point"]],
      [/\bperpendicular\b/i, ["parallel", "coincident", "skew", "intersecting at an acute angle"]],
      [/\bhorizontal\b/i, ["vertical", "diagonal", "curved", "undefined"]],
      [/\bvertical\b/i, ["horizontal", "diagonal", "curved", "undefined"]],
      [/\bto the left\b/i, ["to the right", "upwards", "downwards", "through the origin"]],
      [/\bto the right\b/i, ["to the left", "upwards", "downwards", "through the origin"]],
      [/\bclockwise\b/i, ["anticlockwise", "in a straight line", "with changing direction", "without moving"]],
      [/\banticlockwise\b/i, ["clockwise", "in a straight line", "with changing direction", "without moving"]],
      [/\beven\b/i, ["odd", "neither odd nor even", "periodic", "one-to-one"]],
      [/\bodd\b/i, ["even", "neither odd nor even", "periodic", "one-to-one"]],
      [/\bone-to-one\b/i, ["many-to-one", "constant", "periodic", "undefined"]],
      [/\bmany-to-one\b/i, ["one-to-one", "constant", "strictly increasing", "undefined"]],
      [/\bindependent\b/i, ["dependent", "mutually exclusive", "equally likely", "normally distributed"]],
      [/\bdependent\b/i, ["independent", "mutually exclusive", "equally likely", "normally distributed"]],
      [/\bcontinuous\b/i, ["discrete", "categorical", "ordinal", "constant"]],
      [/\bdiscrete\b/i, ["continuous", "categorical", "ordinal", "constant"]],
      [/\breliable\b/i, ["unreliable", "biased", "invalid", "inconclusive"]],
      [/\bunreliable\b/i, ["reliable", "unbiased", "valid", "conclusive"]],
      [/\bvalid\b/i, ["invalid", "biased", "unreliable", "inconclusive"]],
      [/\binvalid\b/i, ["valid", "unbiased", "reliable", "conclusive"]],
      [/\bsufficient\b/i, ["insufficient", "no", "contradictory", "irrelevant"]],
      [/\binsufficient\b/i, ["sufficient", "conclusive", "complete", "decisive"]],
      [/\bsupports\b/i, ["contradicts", "does not support", "is unrelated to", "cannot be compared with"]],
      [/\bcloser\b/i, ["further away", "the same distance", "perpendicular", "unrelated"]],
      [/\bfurther\b/i, ["closer", "the same distance", "parallel", "unrelated"]],
      [/\blarger\b/i, ["smaller", "equal", "unrelated", "undefined"]],
      [/\bsmaller\b/i, ["larger", "equal", "unrelated", "undefined"]],
      [/\bhigher\b/i, ["lower", "equal", "unrelated", "zero"]],
      [/\blower\b/i, ["higher", "equal", "unrelated", "zero"]],
      [/\babove\b/i, ["below", "on", "unrelated to", "perpendicular to"]],
      [/\bbelow\b/i, ["above", "on", "unrelated to", "perpendicular to"]],
      [/\binside\b/i, ["outside", "on the boundary of", "unrelated to", "equidistant from"]],
      [/\boutside\b/i, ["inside", "on the boundary of", "unrelated to", "equidistant from"]],
      [/\binitial\b/i, ["final", "maximum", "minimum", "average"]],
      [/\bfinal\b/i, ["initial", "maximum", "minimum", "average"]],
      [/\btotal\b/i, ["average", "maximum", "minimum", "initial"]],
      [/\bmean\b/i, ["median", "mode", "range", "variance"]],
      [/\bmedian\b/i, ["mean", "mode", "range", "variance"]],
      [/\bvariance\b/i, ["mean", "median", "range", "standard deviation"]],
      [/\bradius\b/i, ["diameter", "circumference", "area", "gradient"]],
      [/\bdiameter\b/i, ["radius", "circumference", "area", "gradient"]],
      [/\bstraight line\b/i, ["quadratic curve", "circle", "vertical asymptote", "horizontal asymptote"]],
      [/\breal roots?\b/i, ["complex roots", "repeated roots", "positive roots", "negative roots"]],
      [/\bcomplex roots?\b/i, ["real roots", "repeated roots", "positive roots", "negative roots"]],
      [/\bwith replacement\b/i, ["without replacement", "in a fixed order", "from a different population", "only once"]],
      [/\bwithout replacement\b/i, ["with replacement", "in a fixed order", "from a different population", "independently"]],
      [/\blongest\b/i, ["shortest", "equal in length", "the median", "not a side"]],
      [/\bshortest\b/i, ["longest", "equal in length", "the median", "not a side"]],
      [/\bunique\b/i, ["two different", "no", "infinitely many", "the same"]],
      [/\bunchanged\b/i, ["increased", "decreased", "doubled", "halved"]],
      [/\brate of change\b/i, ["total value", "initial value", "maximum value", "minimum value"]],
      [/\bheight\b/i, ["width", "area", "volume", "mass"]],
      [/\btime\b/i, ["distance", "speed", "height", "cost"]],
      [/\bprobability\b/i, ["frequency", "mean", "variance", "median"]],
      [/\bstrongly\b/i, ["weakly", "moderately", "perfectly", "not at all"]],
      [/\bstrong\b/i, ["weak", "moderate", "very weak", "zero"]],
      [/\bhighest\b/i, ["lowest", "average", "second-highest", "unchanged"]],
      [/\blowest\b/i, ["highest", "average", "second-lowest", "unchanged"]],
      [/\bsteepest\b/i, ["shallowest", "highest", "lowest", "flat"]],
      [/\barithmetic sequence\b/i, ["geometric sequence", "quadratic sequence", "constant sequence", "random sequence"]],
      [/\bgeometric sequence\b/i, ["arithmetic sequence", "quadratic sequence", "constant sequence", "random sequence"]],
      [/\blogistic model\b/i, ["linear model", "exponential model", "quadratic model", "periodic model"]],
      [/\balternate segment theorem\b/i, ["angle at the centre theorem", "Pythagoras' theorem", "sine rule", "cosine rule"]],
      [/\bmutually exclusive\b/i, ["independent", "complementary", "equally likely", "exhaustive"]],
      [/\bno members? in common\b/i, ["exactly one member in common", "two members in common", "all members in common", "the same number of members"]],
      [/\bno common members?\b/i, ["exactly one common member", "two common members", "all members in common", "the same number of members"]],
      [/\btwice\b/i, ["half", "three times", "equal to", "four times"]],
      [/\bcentre\b/i, ["circumference", "tangent", "chord", "diameter"]],
      [/\bsmall in comparison with\b/i, ["large in comparison with", "equal in size to", "unrelated in size to", "twice as large as"]],
      [/\bgrows? without limit\b/i, ["decreases without limit", "remains constant", "approaches a fixed value", "alternates between two values"]],
      [/\bcarrying capacity\b/i, ["constant rate of decrease", "linear trend", "periodic cycle", "value of zero"]],
      [/\bpossible\b/i, ["impossible", "guaranteed", "unique", "unnecessary"]],
      [/\bpass through\b/i, ["avoid", "stop before", "start after", "never reach"]],
      [/\balready responded\b/i, ["not yet responded", "refused to respond", "finished responding", "received no report"]],
      [/\bmore equipment or personnel available\b/i, ["less equipment and fewer personnel available", "the same equipment and personnel available", "no equipment or personnel available", "only administrative staff available"]],
      [/\bshorter route\b/i, ["longer route", "route of equal length", "blocked route", "route with no roads"]],
      [/\bunlikely\b/i, ["likely", "certain", "guaranteed", "expected"]],
      [/\bstay constant\b/i, ["increase steadily", "decrease steadily", "alternate regularly", "become zero immediately"]],
      [/\blie flat on the floor\b/i, ["stand vertically", "remain at a positive angle to the floor", "slope upwards", "be perpendicular to the floor"]],
      [/\bno depth\b/i, ["maximum depth", "constant depth", "twice the depth", "an undefined depth"]],
      [/\bno sand\b/i, ["the maximum amount of sand", "twice as much sand", "a fixed positive amount of sand", "an unlimited amount of sand"]],
      [/\blose\b/i, ["win", "break even", "stake", "save"]],
      [/\bvisited\b/i, ["did not visit", "lived in", "travelled only through", "planned to visit"]],
      [/\bdo not intersect\b/i, ["intersect once", "intersect twice", "coincide", "are perpendicular"]],
      [/\bdo not overlap\b/i, ["overlap once", "overlap twice", "coincide", "are complementary"]],
      [/\bcrosses the ravine\b/i, ["avoids the ravine", "follows level ground", "uses the same route", "has no physical obstacle"]],
      [/\bdelete a different vertex\b/i, ["delete the same vertex again", "delete a different edge", "add another vertex", "reverse every edge"]],
      [/\bat least as extreme\b/i, ["less extreme", "exactly equal", "closest to the mean", "inside one standard deviation"]],
      [/\bfirst pond\b/i, ["second pond", "third pond", "largest pond", "smallest pond"]],
      [/\bfirst day\b/i, ["last day", "second day", "middle day", "average day"]],
      [/\bfirst\b/i, ["last", "second", "highest", "lowest"]],
      [/\btwo\b/i, ["one", "three", "four", "infinitely many"]],
      [/\bthree\b/i, ["one", "two", "four", "infinitely many"]],
      [/\bfour\b/i, ["one", "two", "three", "infinitely many"]],
      [/\bcan\b/i, ["cannot", "must", "need not", "will always"]],
      [/\bcannot\b/i, ["can", "must", "might", "will always"]],
      [/\bdoes not\b/i, ["does", "must", "might", "will always"]],
      [/\bnot\b/i, ["always", "necessarily", "only", "also"]],
    ];
    replacementGroups.forEach(function (group) {
      if (!group[0].test(answer)) return;
      group[1].forEach(function (replacement) { addCandidate(list, answer.replace(group[0], replacement)); });
    });
    relationMutationCandidates(answer, list);
    mutateNumberTokens(answer, list);
  }

  function generateExplanationChoiceSet(rows, prompt, seed) {
    var question = clean(latexToPlain(prompt));
    var rowText = (Array.isArray(rows) ? rows : []).map(function (row) {
      return normalizeExplanationText(Array.isArray(row) ? row[0] : row);
    }).join(" ");
    if (/\b(?:set of )?values?\s+for\s+p\b/i.test(question) && /two solutions/i.test(rowText) && /p\s*[−-]\s*1/i.test(rowText) && /\beven\b/i.test(rowText)) {
      var parityCorrect = "p ∈ {3, 5, 7, …}, because p - 1 must be even";
      var parityOptions = [
        parityCorrect,
        "p ∈ {2, 4, 6, …}, because p - 1 must be odd",
        "p ∈ {3, 5, 7, …}, because p - 1 must be odd",
        "p ∈ {2, 4, 6, …}, because p - 1 must be even",
        "p can be any integer greater than 1",
      ];
      var shuffledParity = shuffled(parityOptions, seed);
      var parityCorrectOption = shuffledParity.indexOf(parityCorrect);
      return validateChoiceSet([parityCorrect], shuffledParity, parityCorrectOption)
        ? { acceptedAnswers: [parityCorrect], options: shuffledParity, correctOption: parityCorrectOption }
        : null;
    }
    if (!/\b(?:explain|justify|reason|reasons|why|comment|interpret|describe|suggest|compare|whether)\b/i.test(question)) return null;
    var correct = explanationAnswerFromRows(rows, prompt);
    if (!correct || !isReasonLikeAnswer(correct)) return null;
    var candidates = [];
    proseMutationCandidates(correct, candidates);
    var distractors = candidates.filter(function (candidate) { return !equivalent(candidate, correct); }).slice(0, 4);
    if (distractors.length !== 4) return null;
    var options = shuffled([correct].concat(distractors), seed);
    var correctOption = options.indexOf(correct);
    return validateChoiceSet([correct], options, correctOption)
      ? { acceptedAnswers: [correct], options: options, correctOption: correctOption }
      : null;
  }

  function generateHypothesisChoiceSet(rows, prompt, seed) {
    var question = clean(latexToPlain(prompt));
    if (!/\b(?:hypothesis|significance level|null hypothesis|h\s*_?\s*0)\b/i.test(question)) return null;
    var answer = (Array.isArray(rows) ? rows : []).map(function (row) {
      return plainText(latexToPlain(Array.isArray(row) ? row[0] : row));
    }).join(" ");
    var rejects = /\b(?:reject(?:ing|ed)?)(?:\s+the)?\s+(?:null hypothesis|h\s*_?\s*0)\b/i.test(answer)
      && !/\bdo not reject(?:\s+the)?\s+(?:null hypothesis|h\s*_?\s*0)\b/i.test(answer);
    var doesNotReject = /\b(?:do not reject|fail to reject)(?:\s+the)?\s+(?:null hypothesis|h\s*_?\s*0)\b/i.test(answer);
    if (!rejects && !doesNotReject) return null;
    var correct = rejects
      ? "Reject H₀; there is sufficient evidence for H₁"
      : "Do not reject H₀; there is insufficient evidence for H₁";
    var options = [
      "Reject H₀; there is sufficient evidence for H₁",
      "Reject H₀; there is insufficient evidence for H₁",
      "Do not reject H₀; there is sufficient evidence for H₁",
      "Do not reject H₀; there is insufficient evidence for H₁",
      "Accept H₀ as proven; there is no evidence for H₁",
    ];
    var shuffledOptions = shuffled(options, seed);
    var correctOption = shuffledOptions.indexOf(correct);
    return validateChoiceSet([correct], shuffledOptions, correctOption)
      ? { acceptedAnswers: [correct], options: shuffledOptions, correctOption: correctOption }
      : null;
  }

  function generateConceptChoiceSet(rows, prompt, seed) {
    var question = plainText(prompt);
    var rawAnswer = (Array.isArray(rows) ? rows : []).map(function (row) {
      return String(Array.isArray(row) ? row[0] : row);
    }).join(" ");
    var answer = (Array.isArray(rows) ? rows : []).map(function (row) {
      return plainText(latexToPlain(Array.isArray(row) ? row[0] : row));
    }).join(" ");
    var correct = "";
    var options = [];
    var translationVector = answer.match(/Translation[\s\S]*?matrix\(\s*(-?\d+(?:\.\d+)?)\s*;\s*(-?\d+(?:\.\d+)?)\s*\)/i);
    var correlationStrength = answer.match(/\b(very strong|strong|moderate|weak|very weak)\b/i);
    var correlationDirection = answer.match(/\b(positive|negative)\b/i);
    var rotationDescription = answer.match(/\bRotation\b[\s\S]*?(-?\d+(?:\.\d+)?)\s*°\s*(clockwise|anticlockwise)?[\s\S]*?centre\s*\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/i);
    var enlargementDescription = answer.match(/\bEnlargement\b[\s\S]*?(?:scale factor|factor of|×)\s*(-?\d+(?:\.\d+)?)[\s\S]*?centre\s*\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/i);
    if (/\bwrite down the letter\b[\s\S]*\bcorresponding graph\b/i.test(question)) {
      var graphLetters = Array.from(rawAnswer.matchAll(/<td>\s*([A-Z])\s*<\/td>/gi)).map(function (match) { return match[1].toUpperCase(); });
      if (graphLetters.length === 2) {
        correct = graphLetters.join("; ");
        options = [correct, graphLetters.slice().reverse().join("; "), "A; B", "B; A", "A; D"];
      }
    } else if (/\bwhich of\b[\s\S]*\bf\b[\s\S]*\bg\b[\s\S]*\bprobability distribution\b/i.test(question)
      && /only in the case of f\(x\)[\s\S]*probability mass function/i.test(answer)) {
      correct = "Only f can be used as a probability mass function";
      options = [
        correct,
        "Only g can be used as a probability mass function",
        "Both f and g can be used as probability mass functions",
        "Neither f nor g can be used as a probability mass function",
        "There is insufficient information",
      ];
    } else if (/\b(?:correlation|association|relationship)\b/i.test(question) && correlationStrength && correlationDirection) {
      var directionName = correlationDirection[1].toLowerCase();
      correct = correlationStrength[1][0].toUpperCase() + correlationStrength[1].slice(1).toLowerCase() + " " + directionName + " correlation";
      options = [correct, "Strong " + (directionName === "positive" ? "negative" : "positive") + " correlation", "Weak positive correlation", "Weak negative correlation", "No correlation"];
      options = options.filter(function (option, index, list) { return list.indexOf(option) === index; });
      if (options.length < 5) options.splice(1, 0, "Moderate " + directionName + " correlation");
    } else if (/\bdescribe fully\b[\s\S]*\b(?:single )?transformation\b/i.test(question) && rotationDescription) {
      var rotationAngle = rotationDescription[1];
      var rotationDirection = rotationDescription[2] ? rotationDescription[2].toLowerCase() : "clockwise";
      var rotationX = rotationDescription[3];
      var rotationY = rotationDescription[4];
      correct = "Rotation " + rotationAngle + "° " + rotationDirection + " about (" + rotationX + ", " + rotationY + ")";
      options = [correct,
        "Rotation " + rotationAngle + "° " + (rotationDirection === "clockwise" ? "anticlockwise" : "clockwise") + " about (" + rotationX + ", " + rotationY + ")",
        "Rotation " + rotationAngle + "° " + rotationDirection + " about (" + (-Number(rotationX)) + ", " + rotationY + ")",
        "Rotation " + rotationAngle + "° " + rotationDirection + " about (" + rotationX + ", " + (-Number(rotationY)) + ")",
        "Reflection in the line x = " + rotationX];
    } else if (/\bdescribe fully\b[\s\S]*\b(?:single )?transformation\b/i.test(question) && enlargementDescription) {
      var enlargementScale = enlargementDescription[1];
      var enlargementX = enlargementDescription[2];
      var enlargementY = enlargementDescription[3];
      correct = "Enlargement, scale factor " + enlargementScale + ", centre (" + enlargementX + ", " + enlargementY + ")";
      options = [correct,
        "Enlargement, scale factor " + (-Number(enlargementScale)) + ", centre (" + enlargementX + ", " + enlargementY + ")",
        "Enlargement, scale factor " + enlargementScale + ", centre (" + (-Number(enlargementX)) + ", " + enlargementY + ")",
        "Enlargement, scale factor " + enlargementScale + ", centre (" + enlargementX + ", " + (-Number(enlargementY)) + ")",
        "Translation by (" + enlargementX + ", " + enlargementY + ")"];
    } else if (/\bdescribe fully\b[\s\S]*\btransformation\b/i.test(question) && translationVector) {
      var horizontal = Number(translationVector[1]);
      var vertical = Number(translationVector[2]);
      function translationDescription(x, y) {
        var horizontalText = x === 0 ? "0 units horizontally" : Math.abs(x) + " units " + (x > 0 ? "right" : "left");
        var verticalText = y === 0 ? "0 units vertically" : Math.abs(y) + " units " + (y > 0 ? "up" : "down");
        return "Translation " + horizontalText + " and " + verticalText;
      }
      correct = translationDescription(horizontal, vertical);
      options = [
        correct,
        translationDescription(-horizontal, vertical),
        translationDescription(horizontal, -vertical),
        translationDescription(vertical, horizontal),
        translationDescription(-vertical, -horizontal),
      ];
    } else if (/\bexplain why\b[\s\S]*\bnot a function\b/i.test(question) && /not valid at either|undefined/i.test(answer)) {
      correct = "It is undefined at values in the stated domain";
      options = [
        correct,
        "Two different inputs give the same output",
        "Its graph fails the horizontal line test",
        "Its range contains negative values",
        "It has more than one x-intercept",
      ];
    } else if (/\binterpret the meaning of\b/i.test(question) && /rate of change.*number of households/i.test(answer)) {
      correct = "The rate at which the number of households with panels changes over time";
      options = [
        correct,
        "The total number of households that can ever install panels",
        "The number of households with panels at the start of the scheme",
        "The time taken for one household to install panels",
        "The average number of panels fitted to each household",
      ];
    } else if (/\blocal minimum\b[\s\S]*\bjustif/i.test(question) && /second derivative|s''|negative to positive/i.test(answer)) {
      correct = "θ = (π)/2, because the second derivative is positive there";
      options = [
        correct,
        "θ = (π)/2, because the second derivative is negative there",
        "θ = 0, because the first derivative is positive there",
        "θ = π, because the first derivative is zero there",
        "θ = (π)/2, because the first derivative does not change sign there",
      ];
    } else if (/\bdecide whether\b[\s\S]*\bshould be rejected\b/i.test(question) && /insufficient evidence to reject|should not be rejected/i.test(answer)) {
      correct = "Do not reject the statement, because the p-value is greater than the significance level";
      options = [
        correct,
        "Reject the statement, because the p-value is greater than the significance level",
        "Reject the statement, because the p-value is less than the significance level",
        "Do not reject the statement, because the p-value is less than the significance level",
        "Accept the statement as proven, because the p-value is non-zero",
      ];
    } else if (/\binterpret this value\b/i.test(question) && /height of the path above the valley floor at o/i.test(answer)) {
      correct = "The height of the path above the valley floor at O";
      options = [
        correct,
        "The horizontal distance from O to the path",
        "The gradient of the path at O",
        "The maximum height reached by the path",
        "The total rise of the path from start to finish",
      ];
    } else if (/\binterpret this value\b/i.test(question) && /height the path approaches but does not reach|greatest height the path climbs to/i.test(answer)) {
      correct = "The height that the path approaches but does not reach";
      options = [
        correct,
        "The height of the path at O",
        "The steepest gradient of the path",
        "The horizontal length of the path",
        "The height that the path reaches after 250 metres",
      ];
    } else if (/\bnumber of loads is not proportional to the area\b/i.test(question) && /population density/i.test(answer)) {
      correct = "The two cells can have different population densities";
      options = [
        correct,
        "The two cells must have the same area",
        "Every household produces exactly the same amount of waste",
        "A larger cell must always contain fewer people",
        "The number of loads depends only on the perimeter of each cell",
      ];
    } else if (/\bconcave-down\b/i.test(question) && /x\s*>\s*-4/i.test(answer) && /below the x-axis|g''|second derivative/i.test(answer)) {
      correct = "x > -4, because g''(x) < 0";
      options = [
        correct,
        "x < -4, because g''(x) < 0",
        "x > -4, because g''(x) > 0",
        "x < -4, because g''(x) > 0",
        "All real x, because g''(x) is constant",
      ];
    } else if (/\bstate the central limit theorem\b/i.test(question) && /\b(?:large|infinity|n\s*[≥>])\b[\s\S]*\bapproximately normally distributed\b/i.test(answer)) {
      correct = "For a sufficiently large sample, the sample mean is approximately normally distributed";
      options = [
        correct,
        "For a sufficiently large sample, the sample median is exactly normally distributed",
        "The original population must be normally distributed",
        "The sample mean is approximately uniformly distributed",
        "The sample variance must equal the sample mean",
      ];
    } else if (/\bgeometrical meaning\b/i.test(question) && /\brate of change of the gradient\b/i.test(answer)) {
      correct = "The rate of change of the gradient of the line OP";
      options = [
        correct,
        "The gradient of the line OP",
        "The rate of change of the length OP",
        "The distance travelled by point P",
        "The area swept out by the line OP",
      ];
    } else if (/\bpoisson distribution\b/i.test(question) && /\bmean is close to the variance\b/i.test(answer)) {
      correct = "The mean is close to the variance";
      options = [
        correct,
        "The mean is close to the standard deviation",
        "The median is close to the variance",
        "The variance is close to zero",
        "The data are symmetric about the mean",
      ];
    } else if (/\bpoisson distribution\b/i.test(question) && /\bassumption\b/i.test(question) && /\bindependent|constant mean rate\b/i.test(answer)) {
      correct = "Events occur independently at a constant mean rate";
      options = [
        correct,
        "Exactly one event occurs in every interval",
        "The number of events is fixed each day",
        "The probability of an event increases after each event",
        "The data must follow a normal distribution",
      ];
    } else if (/\bname of this type of test for reliability\b/i.test(question) && /\btest-retest\b/i.test(answer)) {
      correct = "Test-retest";
      options = [correct, "Chi-squared", "Paired t-test", "Spearman rank", "Goodness of fit"];
    } else if (/\balternative test\b/i.test(question) && /\bspearman(?:'s)? rank\b/i.test(answer)) {
      correct = "Spearman rank correlation";
      options = [correct, "Pearson correlation", "Chi-squared test", "Paired t-test", "Sign test"];
    } else if (/\bappropriate units? for the gradient\b/i.test(question) && /\bcm\s*(?:per|\/)\s*year\b/i.test(answer)) {
      correct = "Centimetres per year";
      options = [correct, "Years per centimetre", "Centimetres", "Square centimetres per year", "Centimetres per square year"];
    } else if (/\bconcave up or concave down\b/i.test(question) && /\bgradient is increasing\b/i.test(answer)) {
      correct = "Concave up, because the gradient is increasing";
      options = [
        correct,
        "Concave up, because the gradient is decreasing",
        "Concave down, because the gradient is increasing",
        "Concave down, because the gradient is decreasing",
        "Neither, because the gradient is constant",
      ];
    } else if (/\bconcave up or concave down\b/i.test(question) && /\bgradient is decreasing\b/i.test(answer)) {
      correct = "Concave down, because the gradient is decreasing";
      options = [
        "Concave up, because the gradient is increasing",
        "Concave up, because the gradient is decreasing",
        "Concave down, because the gradient is increasing",
        correct,
        "Neither, because the gradient is constant",
      ];
    }
    if (!correct || options.length !== 5 || options.some(function (option) { return !isDisplaySafe(option); })) return null;
    var shuffledOptions = shuffled(options, seed);
    var correctOption = shuffledOptions.indexOf(correct);
    return validateChoiceSet([correct], shuffledOptions, correctOption)
      ? { acceptedAnswers: [correct], options: shuffledOptions, correctOption: correctOption }
      : null;
  }

  function unitToLatex(unit) {
    if (!unit) return "";
    if (unit === "°") return "^{\\circ}";
    if (unit === "%") return "\\%";
    var power = unit.match(/^([a-z]+)\^([23])$/i);
    return power ? "\\,\\mathrm{" + power[1] + "}^{" + power[2] + "}" : "\\,\\mathrm{" + unit + "}";
  }

  function escapeLatexText(value) {
    return String(value || "")
      .replace(/\\/g, "")
      .replace(/[{}]/g, "")
      .replace(/([%$&#_])/g, "\\$1");
  }

  function proseToLatex(value) {
    var answer = normalizeExplanationText(value);
    var result = "";
    var start = 0;
    var fractionPattern = /sqrt\([^()]+\)|(?:\((?:[^()]|\([^()]*\))*\)|d(?:\^\d+)?[A-Za-z]|[-+]?[A-Za-z0-9.]+)\s*\/\s*(?:\((?:[^()]|\([^()]*\))*\)|d[A-Za-z](?:\^\d+)?|[-+]?[A-Za-z0-9.^-]+)/g;
    var match;
    while ((match = fractionPattern.exec(answer))) {
      if (match.index > start) result += "\\text{" + escapeLatexText(answer.slice(start, match.index)) + "}";
      if (/^sqrt\(/i.test(match[0])) {
        result += expressionToLatex(match[0]) || "\\text{" + escapeLatexText(match[0]) + "}";
      } else {
        var fraction = match[0].split("/");
        var numerator = expressionToLatex(fraction[0].trim());
        var denominator = expressionToLatex(fraction.slice(1).join("/").trim());
        result += numerator && denominator
          ? "\\frac{" + numerator + "}{" + denominator + "}"
          : "\\text{" + escapeLatexText(match[0]) + "}";
      }
      start = match.index + match[0].length;
    }
    if (start < answer.length) result += "\\text{" + escapeLatexText(answer.slice(start)) + "}";
    return result || "\\text{" + escapeLatexText(answer) + "}";
  }

  function toLatex(value) {
    var answer = clean(value);
    if (isProseAnswer(answer)) {
      return proseToLatex(answer);
    }
    if (/^[A-Za-z][A-Za-z0-9 ,.'-]+$/.test(answer) && /\s/.test(answer) && !/[=<>≤≥≠]/.test(answer)) {
      return "\\text{" + answer.replace(/\\/g, "") + "}";
    }
    var comparisonReason = answer.match(/^(Less than|Greater than|Equal to) the actual value, because (the gradient (?:is (?:increasing|decreasing)|stays constant))$/i);
    if (comparisonReason) return "\\text{" + comparisonReason[1] + " the actual value, because " + comparisonReason[2] + ".}";
    var parity = answer.match(/^(Odd|Even|Neither), because (.+)$/i);
    if (parity) {
      var reason = parity[2].split(/\s+and\s+/i).map(function (part) {
        return expressionToLatex(part) || atomToLatex(part);
      }).join("\\text{ and }");
      return "\\text{" + parity[1] + ", because }" + reason;
    }
    var quantity = quantityParts(answer);
    if (quantity) return quantity.prefix.replace(/\s/g, "") + quantity.rawNumber + unitToLatex(quantity.unit);
    var fraction = fractionParts(answer);
    if (fraction) return fraction.prefix.replace(/\s/g, "") + "\\frac{" + fraction.numerator + "}{" + fraction.denominator + "}" + unitToLatex(fraction.unit);
    var unitSuffix = answer.match(new RegExp("^(.+?)\\s+(" + UNIT_PATTERN + ")$", "i"));
    if (unitSuffix) return (expressionToLatex(unitSuffix[1]) || atomToLatex(unitSuffix[1])) + unitToLatex(unitSuffix[2]);
    return expressionToLatex(answer) || atomToLatex(answer);
  }

  function fallbackDisplay(value) {
    return clean(value)
      .replace(/matrix\(([^()]*)\)/gi, function (_match, body) { return "(" + body.replace(/;/g, ", ") + ")"; })
      .replace(/bold\(([^()]+)\)/gi, "$1")
      .replace(/vec\(([^()]+)\)/gi, "vector $1")
      .replace(/(?:blackboard|cal)\(([^()]+)\)/gi, "$1")
      .replace(/sqrt\(([^()]+)\)/gi, "√($1)")
      .replace(/\^2\b/g, "²")
      .replace(/\^3\b/g, "³");
  }

  function renderAnswer(element, value) {
    if (!element) return;
    var accessible = fallbackDisplay(value);
    element.setAttribute("aria-label", accessible);
    if (root && root.katex && typeof root.katex.render === "function") {
      try {
        root.katex.render(toLatex(value), element, { throwOnError: false, strict: "ignore" });
        return;
      } catch { /* plain-text fallback below */ }
    }
    element.textContent = accessible;
  }

  return {
    canonical: canonical,
    clean: clean,
    equivalent: equivalent,
    extractAcceptedAnswers: extractAcceptedAnswers,
    generateChoiceSet: generateChoiceSet,
    generateComparisonReasonChoiceSet: generateComparisonReasonChoiceSet,
    generateConceptChoiceSet: generateConceptChoiceSet,
    generateExplanationChoiceSet: generateExplanationChoiceSet,
    generateHypothesisChoiceSet: generateHypothesisChoiceSet,
    generateParityChoiceSet: generateParityChoiceSet,
    isChoiceTextSafe: isChoiceTextSafe,
    isDisplaySafe: isDisplaySafe,
    latexToPlain: latexToPlain,
    renderAnswer: renderAnswer,
    shuffled: shuffled,
    toLatex: toLatex,
    validateChoiceSet: validateChoiceSet,
  };
}));
