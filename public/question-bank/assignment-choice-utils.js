(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MrFlynnAssignmentChoices = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var UNIT_PATTERN = "(?:°|%|rad|cm(?:\\^[23])?|mm(?:\\^[23])?|km(?:\\^[23])?|m(?:\\^[23])?|kg|g|s|minutes?|hours?|mins?|hrs?)";

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

  function latexToPlain(value) {
    return plainText(replaceLatexFractions(String(value || ""))
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
      .replace(/\\(?:leq|le)/g, "≤").replace(/\\(?:geq|ge)/g, "≥")
      .replace(/\^\s*\\circ/g, "°").replace(/\\circ/g, "°")
      .replace(/\\neq/g, "≠").replace(/\\pm/g, "±").replace(/\\infty/g, "∞")
      .replace(/\\pi/g, "π").replace(/\\times/g, "×").replace(/\\cdot/g, "·")
      .replace(/\\therefore|\\Rightarrow|\\implies/g, "")
      .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "")
      .replace(/\\([A-Za-z]+)/g, "$1")
      .replace(/[{}]/g, ""))
      .replace(/^=\s*/, "")
      .replace(/^\(\s*([A-Za-z][^()]*)\s*=\s*\)\s*/, "$1 = ")
      .trim();
  }

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
      .replace(/\bmathrm(?=[a-z])/gi, "")
      .replace(/\^\s*\\?circ\b/gi, "°")
      .replace(/\\?circ\b/gi, "°")
      .replace(/√\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, "sqrt($1)")
      .replace(/\\sqrt\s*([A-Za-z0-9.]+)/g, "sqrt($1)")
      .replace(/\bpi\b/gi, "π")
      .replace(/²/g, "^2")
      .replace(/³/g, "^3")
      .replace(/\s*\(\s*((?:cm|mm|km|m)\s*\^[23])\s*\)\s*$/i, " $1")
      .replace(/\s+/g, " ")
      .replace(/\s+(?=[°%])/g, "")
      .replace(/[.;]+$/, "")
      .trim();
  }

  function mathFragments(value) {
    var fragments = [];
    var source = String(value || "");
    var match;
    var pattern = /\\\(([\s\S]*?)\\\)/g;
    while ((match = pattern.exec(source))) fragments.push(match[1]);
    return fragments;
  }

  function requiresWhiteboard(prompt) {
    return /\b(show that|prove|sketch|draw|construct|plot|explain|justify|give a reason|giving a reason|state a reason|write down the steps|show your working|describe|discuss|interpret|comment on)\b/i.test(plainText(prompt));
  }

  function shouldKeepWholeEquality(prompt, answer) {
    var question = plainText(prompt).toLowerCase();
    var leftSide = answer.slice(0, answer.indexOf("=")).trim();
    if (!leftSide || leftSide.length > 50 || /[∫∑∏]/.test(leftSide)) return false;
    if (/\bequation\b/.test(question) || /\b(?:write|express|give)\b.*\bin the form\b/.test(question)) return true;
    return /^(?:[A-Za-zα-ω](?:\([^)]*\))?|d[A-Za-z]\/d[A-Za-z])$/i.test(leftSide.replace(/\s+/g, ""));
  }

  function addAcceptedAnswer(list, value, prompt) {
    var startsWithEquality = /^\s*=/.test(String(value || "").replace(/\\left|\\right/g, ""));
    var answer = clean(latexToPlain(value)).replace(/\\(?=\s|\(|\)|$)/g, "").replace(/[.;,]+$/, "").trim();
    if (!answer || answer.length > 140) return;
    if (/\b(method|attempt|award|working|substitution|curve|diagram|sketch|proof|explanation)\b/i.test(answer)) return;
    if (/^(?:[a-df-hj-z]|theta|alpha|beta|gamma|dx|dy\/dx|dm\/dt|cos\s*theta|sin\s*theta)$/i.test(answer)) return;
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
      addUnique(answer.slice(answer.lastIndexOf("=") + 1).trim());
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

  function extractAcceptedAnswers(rows, prompt) {
    if (!Array.isArray(rows) || requiresWhiteboard(prompt)) return [];
    var answerRows = rows.filter(function (row) {
      return Array.isArray(row)
        && /(?:A\d|B\d|G\d|N\d|E\d|AG)/.test(String(row[1] || ""))
        && (mathFragments(row[0]).length || /(?:^|\s)[-+]?\d+(?:\.\d+)?(?:\s|$|[),])/i.test(plainText(row[0])));
    });
    if (!answerRows.length) return [];
    var answers = [];
    var finalContent = String(answerRows[answerRows.length - 1][0] || "");
    var alternatives = finalContent.split(/(?:<br\s*\/?>\s*<b>\s*OR\s*<\/b>\s*<br\s*\/?>|\s+or\s+)/i);
    var unsafeAlternative = alternatives.some(function (alternative) {
      var maths = mathFragments(alternative);
      return maths.length > 1 || (maths.length === 1 && (maths[0].match(/=/g) || []).length > 3);
    });
    if (unsafeAlternative) return [];
    alternatives.forEach(function (alternative) {
      var maths = mathFragments(alternative);
      if (maths.length === 1 && !/^[a-z]$/i.test(latexToPlain(maths[0]))) addAcceptedAnswer(answers, maths[0], prompt);
      else if (maths.length === 0 || (maths.length === 1 && /^[a-z]$/i.test(latexToPlain(maths[0])))) {
        var textAnswer = plainText(alternative);
        var numbers = textAnswer.match(/-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+(?:\.\d+)?)?/g) || [];
        if (numbers.length === 1) addAcceptedAnswer(answers, numbers[0], prompt);
        else addAcceptedAnswer(answers, textAnswer, prompt);
      }
    });
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
      .replace(/°/g, "^{\\circ}")
      .replace(/\^([+-]?\d+)/g, "^{$1}")
      .replace(/\b(sin|cos|tan|ln|log|exp)\b/g, "\\$1")
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

    var relationPositions = topLevelPositions(expression, function (character) { return /[=≤≥≠<>]/.test(character); });
    if (relationPositions.length) {
      if (relationPositions.length > 1) return null;
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
    if (/\\|\b(?:mathrm|circ)\b|\^\s*$|\/\s*\/|sqrt\s*(?!\()|root\s*(?!\()/i.test(answer)) return false;
    if (/sqrt\(\s*-/.test(answer) || !parenthesesAreBalanced(answer)) return false;
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

  function mutateNumberTokens(correct, list) {
    if (quantityParts(correct) || fractionParts(correct) || /^sqrt\(/i.test(clean(correct))) return;
    var matches = [];
    var pattern = /-?\d+(?:\.\d+)?/g;
    var match;
    while ((match = pattern.exec(correct)) && matches.length < 4) matches.push({ index: match.index, value: match[0] });
    matches.forEach(function (token) {
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

  function symbolicCandidates(correct, list) {
    if (!/[=+\-*/^π√]|(?:sqrt|sin|cos|tan|ln|log|exp)\s*\(|\b[xyznt]\b/i.test(correct) || correct.length > 110) return;
    addCandidate(list, "-(" + correct + ")");
    addCandidate(list, "(" + correct + ") + 2");
    addCandidate(list, "(" + correct + ") - 3");
    addCandidate(list, "(" + correct + ")^2");
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

  function unitToLatex(unit) {
    if (!unit) return "";
    if (unit === "°") return "^{\\circ}";
    if (unit === "%") return "\\%";
    var power = unit.match(/^([a-z]+)\^([23])$/i);
    return power ? "\\,\\mathrm{" + power[1] + "}^{" + power[2] + "}" : "\\,\\mathrm{" + unit + "}";
  }

  function toLatex(value) {
    var answer = clean(value);
    var quantity = quantityParts(answer);
    if (quantity) return quantity.prefix.replace(/\s/g, "") + quantity.rawNumber + unitToLatex(quantity.unit);
    var fraction = fractionParts(answer);
    if (fraction) return fraction.prefix.replace(/\s/g, "") + "\\frac{" + fraction.numerator + "}{" + fraction.denominator + "}" + unitToLatex(fraction.unit);
    return expressionToLatex(answer) || atomToLatex(answer);
  }

  function fallbackDisplay(value) {
    return clean(value)
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
    isDisplaySafe: isDisplaySafe,
    latexToPlain: latexToPlain,
    renderAnswer: renderAnswer,
    shuffled: shuffled,
    toLatex: toLatex,
    validateChoiceSet: validateChoiceSet,
  };
}));
