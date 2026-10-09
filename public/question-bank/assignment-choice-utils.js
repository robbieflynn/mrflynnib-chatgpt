(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MrFlynnAssignmentChoices = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clean(value) {
    return String(value == null ? "" : value)
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/\bpi\b/gi, "π")
      .replace(/\s+/g, " ")
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
      .replace(/(?:°|%|rad|cm|mm|km|kg|minutes?|hours?|mins?|hrs?|m|g|s)$/i, "");
    if (/^-?\d+(?:\.\d+)?$/.test(compact)) return Number(compact);
    var fraction = compact.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
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

  function addCandidate(list, candidate) {
    var value = clean(candidate);
    if (!value || value.length > 180) return;
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

  function fractionCandidates(correct, list) {
    var match = correct.match(/^(.*?)(-?\d+)\s*\/\s*(-?\d+)(.*)$/);
    if (!match) return;
    var prefix = match[1];
    var numerator = Number(match[2]);
    var denominator = Number(match[3]);
    var suffix = match[4];
    if (!denominator) return;
    [
      [-numerator, denominator],
      [denominator, numerator || 1],
      [numerator + (numerator >= 0 ? 1 : -1), denominator],
      [numerator, denominator + (denominator >= 0 ? 1 : -1)],
      [numerator - (numerator >= 0 ? 1 : -1), denominator],
      [numerator, denominator - (denominator > 1 ? 1 : -1)],
    ].forEach(function (pair) {
      var fraction = formatFraction(pair[0], pair[1]);
      if (fraction) addCandidate(list, prefix + fraction + suffix);
    });
  }

  function simpleNumberCandidates(correct, list) {
    var match = correct.match(/^(.*?)(-?\d+(?:\.\d+)?)(\s*(?:%|°|degrees?|rad|cm|mm|km|kg|minutes?|hours?|mins?|hrs?|m|g|s)?)$/i);
    if (!match) return;
    var prefix = match[1];
    var rawNumber = match[2];
    var suffix = match[3];
    var number = Number(rawNumber);
    var places = decimalPlaces(rawNumber);
    var step = places ? Math.pow(10, -places) : 1;
    var values = number === 0
      ? [1, -1, 2, -2, 10, .5]
      : [-number, number + step, number - step, number * 2, number / 2, 1 / number, number * 1.1, number * .9];
    values.forEach(function (value) {
      var formatted = formatNumber(value, places || (Math.abs(value % 1) > 1e-10 ? 2 : 0));
      if (formatted) addCandidate(list, prefix + formatted + suffix);
    });
  }

  function mutateNumberTokens(correct, list) {
    var matches = [];
    var pattern = /-?\d+(?:\.\d+)?/g;
    var match;
    while ((match = pattern.exec(correct)) && matches.length < 4) matches.push({ index: match.index, value: match[0] });
    matches.forEach(function (token) {
      var number = Number(token.value);
      var places = decimalPlaces(token.value);
      var step = places ? Math.pow(10, -places) : 1;
      [number + step, number - step, number === 0 ? 1 : -number].forEach(function (replacement) {
        var formatted = formatNumber(replacement, places);
        if (!formatted) return;
        addCandidate(list, correct.slice(0, token.index) + formatted + correct.slice(token.index + token.value.length));
      });
    });
  }

  function symbolicCandidates(correct, list) {
    if (!/[=+\-*/^π√]|(?:sin|cos|tan|ln|log|exp)\s*\(|\b[xyznt]\b/i.test(correct) || correct.length > 110) return;
    addCandidate(list, "-(" + correct + ")");
    addCandidate(list, "1/(" + correct + ")");
    addCandidate(list, "(" + correct + ") + 1");
    addCandidate(list, "(" + correct + ") - 1");
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
    if (options.some(function (option) { return !clean(option); })) return false;
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
    var accepted = (Array.isArray(acceptedAnswers) ? acceptedAnswers : []).map(clean).filter(Boolean);
    if (!accepted.length) return null;
    var correct = accepted[0];
    var candidates = [];
    fractionCandidates(correct, candidates);
    simpleNumberCandidates(correct, candidates);
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

  return {
    canonical: canonical,
    equivalent: equivalent,
    generateChoiceSet: generateChoiceSet,
    shuffled: shuffled,
    validateChoiceSet: validateChoiceSet,
  };
}));
