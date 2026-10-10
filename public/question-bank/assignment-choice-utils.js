(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MrFlynnAssignmentChoices = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var UNIT_PATTERN = "(?:°|%|rad|cm(?:\\^[23])?|mm(?:\\^[23])?|km(?:\\^[23])?|m(?:\\^[23])?|kg|g|s|minutes?|hours?|mins?|hrs?)";
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
    var commandPattern = /^\\(mathbf|boldsymbol|bm|vec|overrightarrow|mathbb|mathcal|mathrm|mathit|mathsf|mathtt|mathnormal|operatorname|textbf|textit|text)/;
    for (var index = 0; index < source.length;) {
      var command = source.slice(index).match(commandPattern);
      if (!command) { result += source[index]; index += 1; continue; }
      var argument = readLatexArgument(source, index + command[0].length);
      if (!argument) { result += source[index]; index += 1; continue; }
      var inner = replaceLatexDecorators(argument.value);
      if (/^(?:mathbf|boldsymbol|bm)$/.test(command[1])) result += "bold(" + inner + ")";
      else if (/^(?:vec|overrightarrow)$/.test(command[1])) result += "vec(" + inner + ")";
      else if (command[1] === "mathbb") result += "blackboard(" + inner + ")";
      else if (command[1] === "mathcal") result += "cal(" + inner + ")";
      else result += inner;
      index = argument.end;
    }
    return result;
  }

  function replaceLatexMatrices(value) {
    return String(value || "").replace(/\\begin\{(?:p|b|B|v|V)?matrix\}([\s\S]*?)\\end\{(?:p|b|B|v|V)?matrix\}/g, function (_match, body) {
      var rows = body.split(/\\\\/).map(function (row) {
        return row.split("&").map(function (cell) { return cell.trim(); }).join(",");
      });
      return "matrix(" + rows.join(";") + ")";
    });
  }

  function replaceLatexSuperscripts(value) {
    var source = String(value || "");
    var result = "";
    for (var index = 0; index < source.length;) {
      if (source[index] !== "^") { result += source[index]; index += 1; continue; }
      if (source[index + 1] !== "{") { result += source[index]; index += 1; continue; }
      var argument = readLatexArgument(source, index + 1);
      if (!argument) { result += source[index]; index += 1; continue; }
      var exponent = argument.value.trim();
      result += /^[-+]?\d+$/.test(exponent) ? "^" + exponent : "^(" + exponent + ")";
      index = argument.end;
    }
    return result;
  }

  function latexToPlain(value) {
    return plainText(replaceLatexSuperscripts(replaceLatexDecorators(replaceLatexFractions(replaceLatexMatrices(String(value || "")))))
      .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
      .replace(/\\left|\\right/g, "")
      .replace(/\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle|limits|nolimits)\b/g, "")
      .replace(/\\int\b/g, "∫")
      .replace(/\\sum\b/g, "∑")
      .replace(/\\prod\b/g, "∏")
      .replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]+)\}/g, "root($1,$2)")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\operatorname\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\(?:ldots|cdots|dots)\b/g, "…")
      .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
      .replace(/\^\s*\\circ/g, "°").replace(/\\circ/g, "∘")
      .replace(/\\approx/g, "≈").replace(/\\(?:neq|ne)(?=[^A-Za-z]|$)/g, "≠")
      .replace(/\\notin\b/g, "∉").replace(/\\in\b/g, "∈")
      .replace(/\\pm/g, "±").replace(/\\infty/g, "∞").replace(/\\pounds\b/g, "£")
      .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
      .replace(/\\therefore|\\Rightarrow|\\implies/g, "")
      .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "").replace(/\\(?=\s)/g, " ")
      .replace(/\\([A-Za-z]+)/g, "$1")
      .replace(/[{}]/g, ""))
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
      .replace(/\\sqrt\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/\bpi\b/gi, "π")
      .replace(/±\s+/g, "±")
      .replace(/\+\s*-/g, "-")
      .replace(/-\s*-/g, "+")
      .replace(/(^|[=+(\-])(-?)1(?=[A-Za-z])/g, "$1$2")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/(^|[=+\-])(\d+)\/(\d+)(x\^\d+)/g, function (_match, sign, numerator, denominator, power) {
        return sign + (numerator === "1" ? "" : numerator + "*") + power + "/" + denominator;
      })
      .replace(/\s*\(\s*((?:cm|mm|km|m)\s*\^[23])\s*\)\s*$/i, " $1")
      .replace(/\s*\+\s*(?:…|\.\.\.)\s*$/, "")
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
    var startsWithEquality = /^\s*=/.test(String(value || "").replace(/\\left|\\right/g, ""));
    var answer = clean(latexToPlain(value)).replace(/\\(?=\s|\(|\)|$)/g, "").replace(/[.;,]+$/, "").trim();
    if (!answer || answer.length > 140) return;
    if (/\b(method|attempt|award|working|substitution|curve|diagram|sketch|proof|explanation)\b/i.test(answer)) return;
    if (/^(?:or\s+)?equivalent$|^oe$/i.test(answer)) return;
    if (/^(?:[a-df-hj-z]|theta|alpha|beta|gamma|dx|dy\/dx|dm\/dt|cos\s*theta|sin\s*theta)$/i.test(answer)) return;
    var workingPrecision = answer.match(/^(.+?)\s*\(\s*[-+]?\d+\.\d{3,}(?:…)?(?:\s*°)?\s*\)\s*(rad|°)?$/i);
    if (workingPrecision && /\d/.test(workingPrecision[1])) {
      answer = clean(workingPrecision[1] + (workingPrecision[2] && workingPrecision[1].indexOf(workingPrecision[2]) === -1 ? " " + workingPrecision[2] : ""));
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

    function addUnique(candidate) {
      var cleaned = clean(candidate);
      if (!cleaned || !isDisplaySafe(cleaned)) return;
      if (!list.some(function (item) { return equivalent(item, cleaned); })) list.push(cleaned);
      var keyboardForm = cleaned.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/π/g, "pi").replace(/×|·/g, "*");
      if (keyboardForm !== cleaned && !list.some(function (item) { return equivalent(item, keyboardForm); })) list.push(keyboardForm);
    }

    var equalityCount = (answer.match(/=/g) || []).length;
    if ((equalityCount > 1 || (startsWithEquality && equalityCount > 0)) && !/[<>&≤≥]/.test(answer)) {
      var finalRightSide = answer.slice(answer.lastIndexOf("=") + 1).trim();
      var firstLeftSide = answer.slice(0, answer.indexOf("=")).trim();
      if (firstLeftSide && shouldKeepWholeEquality(prompt, firstLeftSide + "=" + finalRightSide)) addUnique(firstLeftSide + "=" + finalRightSide);
      addUnique(finalRightSide);
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
    if (/\bprobability\b|\bp\s*\(/.test(question) && /\bp\s*\(/.test(answer)) score += 25;
    if (/∫|\bintegral\b/.test(question) && /∫/.test(answer)) score += 25;
    var target = question.match(/\b(?:value|expression)\s+(?:of|for)\s+([a-z]+)\b/);
    if (target && new RegExp("(?:^|[^a-z])" + target[1] + "\\s*=", "i").test(answer)) score += 50;
    return score;
  }

  function extractAcceptedAnswers(rows, prompt) {
    if (!Array.isArray(rows) || requiresWhiteboard(prompt)) return [];
    if (/\bmaximum or minimum\b|\bminimum or maximum\b/i.test(plainText(prompt))) {
      var classificationText = rows.map(function (row) { return plainText(Array.isArray(row) ? row[0] : row); }).join(" ");
      var classification = classificationText.match(/\bhas a (minimum|maximum)\b/i);
      if (classification) return [classification[1][0].toUpperCase() + classification[1].slice(1).toLowerCase()];
    }
    var answerRows = rows.filter(function (row) {
      return Array.isArray(row)
        && /(?:A\d|B\d|G\d|N\d|E\d|AG)/.test(String(row[1] || ""))
        && (mathFragments(row[0]).length || /(?:^|\s)[-+]?\d+(?:\.\d+)?(?:\s|$|[),])/i.test(plainText(row[0])));
    });
    if (!answerRows.length) return [];
    var answers = [];
    var promptText = plainText(prompt);
    var wantsCollection = /\b(coordinates?|roots?|solutions?|values?|intercepts?|turning points?|local max(?:imum)?|local min(?:imum)?)\b/i.test(promptText);
    var wantsCoordinateCollection = /\bcoordinates?\b|\blocal max(?:imum)?\b|\blocal min(?:imum)?\b/i.test(promptText);
    var coordinateCollection = [];
    if (wantsCoordinateCollection) {
      answerRows.forEach(function (row) {
        mathFragments(row[0]).forEach(function (fragment) {
          var coordinate = clean(latexToPlain(fragment));
          if (/^\(\s*[^,;]+\s*,\s*[^,;]+\s*\)$/.test(coordinate)) coordinateCollection.push(coordinate);
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
        return plain && !/^[a-z]\s*=$/i.test(plain);
      });
    }
    function isPrimaryWithParentheticalEquivalent(alternative) {
      var maths = meaningfulMaths(alternative);
      return maths.length === 2 && (/^\s*\(?\s*=/.test(maths[1]) || /\baccept\s*\\\(/i.test(alternative));
    }
    var unsafeAlternative = coordinateCollection.length < 2 && alternatives.some(function (alternative) {
      var maths = meaningfulMaths(alternative);
      return (maths.length > 1 && !wantsCollection && !isSignedExactAndDecimalPair(alternative) && !isPrimaryWithParentheticalEquivalent(alternative))
        || (maths.length === 1 && (maths[0].match(/=/g) || []).length > 3);
    });
    if (unsafeAlternative) return [];
    if (coordinateCollection.length >= 2) addAcceptedAnswer(answers, coordinateCollection.join("; "), prompt);
    else alternatives.forEach(function (alternative) {
      var maths = meaningfulMaths(alternative);
      if (isSignedExactAndDecimalPair(alternative)) {
        maths.forEach(function (fragment) { addAcceptedAnswer(answers, fragment, prompt); });
      } else if (isPrimaryWithParentheticalEquivalent(alternative)) {
        var unitCopy = plainText(alternative);
        addAcceptedAnswer(answers, maths[0] + (/radians?\b/i.test(unitCopy) ? " rad" : ""), prompt);
        addAcceptedAnswer(answers, maths[1], prompt);
      } else if (wantsCollection && maths.length > 1) {
        addAcceptedAnswer(answers, maths.map(function (fragment) { return clean(latexToPlain(fragment)); }).join("; "), prompt);
      } else if (maths.length === 1 && !/^[a-z]$/i.test(latexToPlain(maths[0]))) addAcceptedAnswer(answers, maths[0], prompt);
      else if (maths.length === 0 || (maths.length === 1 && /^[a-z]$/i.test(latexToPlain(maths[0])))) {
        var textAnswer = plainText(alternative);
        var numbers = textAnswer.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/g) || [];
        if (numbers.length === 1) addAcceptedAnswer(answers, numbers[0], prompt);
        else addAcceptedAnswer(answers, textAnswer, prompt);
      }
    });
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
      if (value[index] === "(") depth += 1;
      else if (value[index] === ")") depth -= 1;
      else if (depth === 0 && matcher(value[index], index)) positions.push(index);
    }
    return positions;
  }

  function atomToLatex(value) {
    return value
      .replace(/matrix\(([^()]*)\)/gi, function (_match, body) {
        return "\\begin{pmatrix}" + body.split(";").map(function (row) { return row.split(",").join("&"); }).join("\\\\") + "\\end{pmatrix}";
      })
      .replace(/bold\(([^()]+)\)/gi, "\\mathbf{$1}")
      .replace(/vec\(([^()]+)\)/gi, "\\overrightarrow{$1}")
      .replace(/blackboard\(([^()]+)\)/gi, "\\mathbb{$1}")
      .replace(/cal\(([^()]+)\)/gi, "\\mathcal{$1}")
      .replace(/\^\(([^()]*)\)/g, "^{$1}")
      .replace(/root\(([^,()]+),([^()]+)\)/gi, "\\sqrt[$1]{$2}")
      .replace(/sqrt\(([^()]+)\)/gi, "\\sqrt{$1}")
      .replace(/π/g, "\\pi ")
      .replace(/∞/g, "\\infty ")
      .replace(/≤/g, "\\le ")
      .replace(/≥/g, "\\ge ")
      .replace(/≠/g, "\\ne ")
      .replace(/±/g, "\\pm ")
      .replace(/∫/g, "\\int ")
      .replace(/∑/g, "\\sum ")
      .replace(/∏/g, "\\prod ")
      .replace(/\*/g, "\\times ")
      .replace(/(^|[^\\])(sin|cos|tan|ln|log|exp)(?=[A-Za-z]|\b)/gi, "$1\\$2 ")
      .replace(/(^|[^A-Za-z\\])(mu|sigma|theta|alpha|beta|gamma)\b/gi, "$1\\$2 ")
      .replace(/°/g, "^{\\circ}")
      .replace(/\^([+-]?\d+)/g, "^{$1}")
      .replace(/\b(cm|mm|km|m)\^\{?([23])\}?\b/gi, "\\mathrm{$1}^{$2}")
      .replace(/\b(cm|mm|km|kg|rad|mins?|hrs?)\b/gi, "\\mathrm{$1}");
  }

  function expressionToLatex(value) {
    var expression = String(value || "").trim();
    if (!expression || !parenthesesAreBalanced(expression)) return null;
    if (wrapsWholeExpression(expression)) {
      var inner = expressionToLatex(expression.slice(1, -1));
      return inner ? "\\left(" + inner + "\\right)" : null;
    }

    var functionMatch = expression.match(/^(sqrt|sin|cos|tan|ln|log|exp)\((.*)\)$/i);
    if (functionMatch && parenthesesAreBalanced(functionMatch[2])) {
      var functionArgument = expressionToLatex(functionMatch[2]);
      if (!functionArgument) return null;
      return functionMatch[1].toLowerCase() === "sqrt"
        ? "\\sqrt{" + functionArgument + "}"
        : "\\" + functionMatch[1].toLowerCase() + "\\left(" + functionArgument + "\\right)";
    }

    var relationPositions = topLevelPositions(expression, function (character) { return /[=≤≥≠<>]/.test(character); });
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
      if (index === 0 || (character !== "+" && character !== "-")) return false;
      return !/[=+\-*/^(,]/.test(expression[index - 1] || "");
    });
    if (additivePositions.length) {
      var renderedTerms = [];
      var termStart = 0;
      additivePositions.forEach(function (position) {
        renderedTerms.push(expressionToLatex(expression.slice(termStart, position)));
        renderedTerms.push(expression[position]);
        termStart = position + 1;
      });
      renderedTerms.push(expressionToLatex(expression.slice(termStart)));
      return renderedTerms.every(Boolean) ? renderedTerms.join("") : null;
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
    if (/\\|\b(?:mathrm|circ|ldots|cdots)\b|…|\^\s*$|\/\s*\/|sqrt\s*(?!\()|root\s*(?!\()/i.test(answer)
      || RAW_LATEX_COMMAND_PATTERN.test(answer)) return false;
    if (/sqrt\(\s*-/.test(answer) || !parenthesesAreBalanced(answer)) return false;
    if (/^(?:Odd|Even), because f\(-x\) = -?f\(x\)$/i.test(answer)
      || /^Neither, because f\(-x\) ≠ f\(x\) and f\(-x\) ≠ -f\(x\)$/i.test(answer)) return true;
    var rendered = expressionToLatex(answer);
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
      [number + spread, number - spread, number === 0 ? 3 : -number].forEach(function (replacement) {
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
    var alternatives = {
      minimum: ["Maximum", "Neither", "Point of inflexion", "Cannot be determined"],
      maximum: ["Minimum", "Neither", "Point of inflexion", "Cannot be determined"],
    }[clean(correct).toLowerCase()];
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
    mutateNumberTokens(correct, candidates);
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
    var direct = text.match(/\b(?:is|so|therefore|hence)\s+(odd|even|neither)\b/i);
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

  function unitToLatex(unit) {
    if (!unit) return "";
    if (unit === "°") return "^{\\circ}";
    if (unit === "%") return "\\%";
    var power = unit.match(/^([a-z]+)\^([23])$/i);
    return power ? "\\,\\mathrm{" + power[1] + "}^{" + power[2] + "}" : "\\,\\mathrm{" + unit + "}";
  }

  function toLatex(value) {
    var answer = clean(value);
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
    generateParityChoiceSet: generateParityChoiceSet,
    isDisplaySafe: isDisplaySafe,
    latexToPlain: latexToPlain,
    renderAnswer: renderAnswer,
    shuffled: shuffled,
    toLatex: toLatex,
    validateChoiceSet: validateChoiceSet,
  };
}));
