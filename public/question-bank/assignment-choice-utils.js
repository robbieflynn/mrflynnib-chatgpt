(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MrFlynnAssignmentChoices = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  var UNIT_PATTERN = "(?:°|%|rad|cm(?:\\^[23])?|mm(?:\\^[23])?|km(?:\\^[23])?|m(?:\\^[23])?|kg|g|s|minutes?|hours?|mins?|hrs?)";

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

  function isDisplaySafe(value) {
    var answer = clean(value);
    if (!answer || answer.length > 180) return false;
    if (/\\|\b(?:mathrm|circ)\b|\^\s*$|\/\s*\/|sqrt\s*(?!\()/i.test(answer)) return false;
    if ((answer.match(/\//g) || []).length > 1) return false;
    if (/sqrt\(\s*-/.test(answer) || !parenthesesAreBalanced(answer)) return false;
    return true;
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
    return answer
      .replace(/sqrt\(([^()]+)\)/gi, "\\sqrt{$1}")
      .replace(/π/g, "\\pi ")
      .replace(/∞/g, "\\infty ")
      .replace(/≤/g, "\\le ")
      .replace(/≥/g, "\\ge ")
      .replace(/≠/g, "\\ne ")
      .replace(/±/g, "\\pm ")
      .replace(/°/g, "^{\\circ}")
      .replace(/\^([+-]?\d+)/g, "^{$1}")
      .replace(/\b(sin|cos|tan|ln|log|exp)\b/g, "\\$1")
      .replace(/\b(cm|mm|km|m)\^\{?([23])\}?\b/gi, "\\mathrm{$1}^{$2}")
      .replace(/\b(cm|mm|km|kg|rad|mins?|hrs?)\b/gi, "\\mathrm{$1}");
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
    generateChoiceSet: generateChoiceSet,
    isDisplaySafe: isDisplaySafe,
    renderAnswer: renderAnswer,
    shuffled: shuffled,
    toLatex: toLatex,
    validateChoiceSet: validateChoiceSet,
  };
}));
