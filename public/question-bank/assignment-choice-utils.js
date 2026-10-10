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
    return /^-?[A-Za-z0-9.π]+(?:\^[A-Za-z0-9.+-]+)?$/.test(part) ? part : "(" + part + ")";
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
    return String(value || "").replace(/\\begin\{(?:p|b|B|v|V)?matrix\}([\s\S]*?)\\end\{(?:p|b|B|v|V)?matrix\}/g, function (_match, body) {
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

  function latexToPlain(value) {
    return plainText(replaceLatexRoots(replaceLatexSuperscripts(replaceLatexDecorators(replaceLatexFractions(replaceLatexMatrices(String(value || ""))))))
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
      .replace(/\\notin(?=blackboard|cal|\s|$)/g, "∉").replace(/\\in(?=blackboard|cal|\s|$)/g, "∈")
      .replace(/\\cup\b/g, "∪").replace(/\\cap\b/g, "∩")
      .replace(/\\pm/g, "±").replace(/\\infty/g, "∞").replace(/\\pounds\b/g, "£")
      .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
      .replace(/([A-Za-z0-9)])(?=sqrt\()/g, "$1*")
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
      .replace(/±\s+/g, "±")
      .replace(/\+\s*-/g, "-")
      .replace(/-\s*-/g, "+")
      .replace(/(^|[=+(\-])(-?)1(?=[A-Za-z])/g, "$1$2")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/(sin|cos|tan)\^-1(?=\()/gi, "arc$1")
      .replace(/\b(ln|log|exp|sin|cos|tan|sec|csc|cot)\s+([A-Za-z0-9.π]+)/gi, "$1($2)")
      .replace(/\b(ln|log|exp|sin|cos|tan|sec|csc|cot)(sqrt\([^)]*\)|root\([^)]*\))/gi, "$1($2)")
      .replace(/((?:\([^()]+\)|[A-Za-z0-9.π]+)\s*\/\s*(?:\([^()]+\)|[A-Za-z0-9.π]+))(?=(?:sqrt|root|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)\s*\()/gi, "($1)*")
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
    return /\b(show that|prove|verify that|sketch|draw|construct|plot|explain|justify|give a reason|giving a reason|state a reason|write down the steps|show your working|describe|discuss|interpret|comment on)\b/i.test(plainText(prompt));
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
    var rawValue = String(value || "").replace(/\\left|\\right/g, "");
    var startsWithEquality = /^\s*(?:=|\\to\b|→)/.test(rawValue);
    var answer = clean(latexToPlain(value)).replace(/\\(?=\s|\(|\)|$)/g, "").replace(/[.;,]+$/, "").trim();
    answer = answer.replace(/^\(\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*=\s*\)\s*([\s\S]+)\)$/, "$1=$2");
    answer = answer.replace(/^\(\s*([A-Za-z][A-Za-z0-9]*)\s*=\s*\)\s*/, "$1=");
    answer = answer.replace(/^→\s*/, "");
    answer = answer.replace(/^\s*(?:\(\s*)?[$£]\s*\)?\s*/, "");
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
    var parentheticalEquivalent = answer.match(/^(.+?)\s+\(([^()]*(?:…|=|\baccept\b|\bexact\b|\brad(?:ians?)?\b|°)[^()]*)\)$/i);
    if (parentheticalEquivalent && isDisplaySafe(clean(parentheticalEquivalent[1]))) {
      addAcceptedAnswer(list, parentheticalEquivalent[1], prompt);
      parentheticalEquivalent[2].split(/\s*(?:=|,|;|\bor\b)\s*/i).forEach(function (alternative) {
        var cleanedAlternative = clean(alternative.replace(/\b(?:accept|exact|radians?)\b/gi, ""));
        if (cleanedAlternative && /\d|[A-Za-z]/.test(cleanedAlternative)) addAcceptedAnswer(list, cleanedAlternative, prompt);
      });
      return;
    }
    var approximate = answer.match(/^(.+?)\s*\(\s*=\s*(.+?)\s*\)$/);
    if (approximate) {
      addAcceptedAnswer(list, approximate[1], prompt);
      addAcceptedAnswer(list, approximate[2], prompt);
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
      if (commaParts.every(Boolean)) answer = commaParts.join("; ");
    }

    function addUnique(candidate) {
      var cleaned = clean(candidate);
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
    if (/standard deviation/.test(question) && /(?:\bsigma\s*=|standard deviation|\bsd\s*=)/.test(answer)) score += 40;
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
    var answerRows = rows.filter(function (row) {
      var rowText = plainText(Array.isArray(row) ? row[0] : row);
      return Array.isArray(row)
        && /(?:A\d|B\d|G\d|N\d|E\d|R\d|AG)/.test(String(row[1] || ""))
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
    var wantsCollection = /\b(coordinates?|roots?|solutions?|values|intercepts?|asymptotes?|position vectors?|turning points?|local max(?:imum)?|local min(?:imum)?)\b/i.test(promptText)
      || /\b(?:maximum[\s\S]*minimum|minimum[\s\S]*maximum|mean[\s\S]*standard deviation|standard deviation[\s\S]*mean|modulus[\s\S]*argument|argument[\s\S]*modulus|first term[\s\S]*common difference|common difference[\s\S]*first term|inverse[\s\S]*domain|domain[\s\S]*inverse|range[\s\S]*of)\b/i.test(promptText);
    var wantsCoordinateCollection = /\bcoordinates?\b|\blocal max(?:imum)?\b|\blocal min(?:imum)?\b/i.test(promptText);
    var coordinateCollection = [];
    function addCoordinate(value) {
      if (value && !coordinateCollection.some(function (existing) { return equivalent(existing, value); })) coordinateCollection.push(value);
    }
    if (wantsCoordinateCollection) {
      answerRows.forEach(function (row) {
        mathFragments(row[0]).forEach(function (fragment) {
          var coordinate = clean(latexToPlain(fragment));
          coordinateTuples(coordinate).forEach(addCoordinate);
        });
      });
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
    var finalContent = String(selectedAnswerRow[0] || "");
    var alternatives = finalContent.split(/(?:<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|\s+or\s+)/i);
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
    if (coordinateCollection.length >= 2) addAcceptedAnswer(answers, coordinateCollection.join("; "), prompt);
    else if (coordinateCollection.length === 1 && /\bcoordinates?\s+of\s+(?:the\s+)?(?:point\s+)?[A-Z]\b/.test(promptText)) {
      addAcceptedAnswer(answers, coordinateCollection[0], prompt);
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
    if (!answers.length && wantsCollection && /\binverse\b[\s\S]*\bdomain\b|\bdomain\b[\s\S]*\binverse\b|\bdomain\b[\s\S]*\brange\b|\brange\b[\s\S]*\bdomain\b|\branges?\s+of\b[\s\S]*\band\b/i.test(promptText)) {
      var definitionPieces = [];
      answerRows.slice(-6).forEach(function (row) {
        var rowText = clean(latexToPlain(String(row[0] || "")));
        if (!/(?:\bf\^-1\s*\(|\bdom\s*\(|\brange\b|^[fg]\s*\(|^[fg]\s*[∈≤≥<>=])/i.test(rowText)) return;
        var rowAnswers = [];
        meaningfulMaths(String(row[0] || "")).forEach(function (fragment) { addAcceptedAnswer(rowAnswers, fragment, prompt); });
        if (rowAnswers[0] && !definitionPieces.some(function (piece) { return equivalent(piece, rowAnswers[0]); })) definitionPieces.push(rowAnswers[0]);
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
    if (!answers.length && wantsCollection && /\b(?:set of (?:all )?possible values|set of values|domain|range)\b/i.test(promptText)) {
      var relationPieces = [];
      answerRows.slice(-8).forEach(function (row) {
        meaningfulMaths(String(row[0] || "")).forEach(function (fragment) {
          var piece = clean(latexToPlain(fragment));
          if ((/[<>≤≥∈∪]/.test(piece) || /^[[(].+,.+[)\]]$/.test(piece))
            && isDisplaySafe(piece)
            && !relationPieces.some(function (existing) { return equivalent(existing, piece); })) relationPieces.push(piece);
        });
      });
      if (relationPieces.length) addAcceptedAnswer(answers, relationPieces.slice(-4).join("; "), prompt);
    }
    if (!answers.length && wantsCollection && /\b(?:roots?|solutions?|all values)\b/i.test(promptText)) {
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
        var selectedMath = maths[maths.length - 1];
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
    if (/\b(?:maclaurin|taylor)\b[\s\S]*\b(?:expansion|series)\b/i.test(question)) {
      var seriesPrompt = clean(latexToPlain(prompt));
      var seriesTarget = seriesPrompt.match(/\b(?:expansion|series)\s+(?:of|for)\s+([A-Za-z](?:\([^)]*\))?)/i);
      if (seriesTarget) {
        answers = answers.map(function (answer) {
          return answer.indexOf("=") === -1 ? seriesTarget[1] + "=" + answer : answer;
        });
      }
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
      .replace(/(^|[^\\])(cis)(?=[A-Za-z]|\b)/gi, "$1\\operatorname{cis}")
      .replace(/(^|[^\\])(arg|arcsin|arccos|arctan|sin|cos|tan|sec|csc|cot|ln|log|exp)(?=[A-Za-z]|\b)/gi, "$1\\$2 ")
      .replace(/(^|[^A-Za-z\\])(mu|sigma|theta|alpha|beta|gamma)\b/gi, "$1\\$2 ")
      .replace(/(^|[^A-Za-z\\])(lambda)\b/gi, "$1\\lambda ")
      .replace(/°/g, "^{\\circ}")
      .replace(/\^([+-]?\d+)/g, "^{$1}")
      .replace(/\b(cm|mm|km|m)\^\{?([23])\}?\b/gi, "\\mathrm{$1}^{$2}")
      .replace(/\b(cm|mm|km|ml|litres?|liters?|kg|rad|mins?|hrs?)\b/gi, "\\mathrm{$1}")
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

  function isDisplaySafe(value) {
    var answer = clean(value);
    if (!answer || answer.length > 180) return false;
    if (/\\|\b(?:mathrm|circ|ldots|cdots)\b|\^\s*$|\/\s*\/|sqrt\s*(?!\()|root\s*(?!\()/i.test(answer)
      || RAW_LATEX_COMMAND_PATTERN.test(answer)) return false;
    if (/sqrt\(\s*-/.test(answer) || !parenthesesAreBalanced(answer)) return false;
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
      candidates = [number + direction * 2, number - direction * 3, direction * (magnitude * 2 + 1), number / 2, -number];
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
        "=": ["≠", "≤"],
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
    parts.forEach(function (part, partIndex) {
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
      local.slice(0, 4).forEach(function (replacement) {
        var changed = parts.slice();
        changed[partIndex] = replacement;
        addCandidate(list, changed.join("; "));
      });
    });
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
    if (options.some(function (option) { return !isDisplaySafe(option); })) return false;
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

  function generateChoiceSet(acceptedAnswers, seed) {
    var accepted = (Array.isArray(acceptedAnswers) ? acceptedAnswers : []).map(clean).filter(isDisplaySafe);
    if (!accepted.length) return null;
    var correct = accepted[0];
    var candidates = [];
    fractionCandidates(correct, candidates);
    simpleNumberCandidates(correct, candidates);
    radicalCandidates(correct, candidates);
    signedRadicalEquationCandidates(correct, candidates);
    functionValueCandidates(correct, candidates);
    categoricalCandidates(correct, candidates);
    implicitProductCandidates(correct, candidates);
    seriesCandidates(correct, candidates);
    compositeCandidates(correct, candidates);
    mutateNumberTokens(correct, candidates);
    relationMutationCandidates(correct, candidates);
    intervalCandidates(correct, candidates);
    setMembershipCandidates(correct, candidates);
    symbolicCandidates(correct, candidates);
    var distractors = candidates.filter(function (candidate) {
      return !accepted.some(function (answer) { return equivalent(candidate, answer); });
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
    if (!/\bodd\b[\s\S]*\beven\b|\beven\b[\s\S]*\bodd\b/i.test(plainText(prompt))) return null;
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

  function generateConceptChoiceSet(rows, prompt, seed) {
    var question = plainText(prompt);
    var answer = (Array.isArray(rows) ? rows : []).map(function (row) {
      return plainText(latexToPlain(Array.isArray(row) ? row[0] : row));
    }).join(" ");
    var correct = "";
    var options = [];
    if (/\bstate the central limit theorem\b/i.test(question) && /\b(?:large|infinity|n\s*[≥>])\b[\s\S]*\bapproximately normally distributed\b/i.test(answer)) {
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

  function toLatex(value) {
    var answer = clean(value);
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
    generateParityChoiceSet: generateParityChoiceSet,
    isDisplaySafe: isDisplaySafe,
    latexToPlain: latexToPlain,
    renderAnswer: renderAnswer,
    shuffled: shuffled,
    toLatex: toLatex,
    validateChoiceSet: validateChoiceSet,
  };
}));
