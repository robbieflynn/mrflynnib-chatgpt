const superscripts: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  "⁺": "+", "⁻": "-",
};

function plainMathToLatex(value: string) {
  return value
    .trim()
    .replace(/([A-Za-z0-9})\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g, (_match, base, power: string) => `${base}^{${Array.from(power).map((character) => superscripts[character] || character).join("")}}`)
    .replace(/\^\(\s*(-?\d+)\s*\/\s*(-?\d+)\s*\)/g, String.raw`^{\frac{$1}{$2}}`)
    .replace(/\^\(\s*([^()]+)\s*\)/g, "^{$1}")
    .replace(/\^([A-Za-z]|-?\d+)/g, "^{$1}")
    .replace(/\b([A-Za-z])(\d+)\b/g, "$1_{$2}")
    .replace(/√\s*\(\s*([^()]+)\s*\)/g, String.raw`\sqrt{$1}`)
    .replace(/√\s*([A-Za-z0-9.+\-−]+)/g, String.raw`\sqrt{$1}`)
    .replace(/(-?\d+)\s*\/\s*\(([^()]+)\)(\^\{[^{}]+\})?/g, (_match, numerator, denominator, power = "") => String.raw`\frac{${numerator}}{(${denominator})${power}}`)
    .replace(/\b(ln|log|sin|cos|tan)\s+([A-Za-z])\s*\/\s*([A-Za-z])\b/g, (_match, fn, numerator, denominator) => "\\frac{\\" + fn + " " + numerator + "}{" + denominator + "}")
    .replace(/\b(-?\d+)\s*\/\s*(-?\d+)\b/g, String.raw`\frac{$1}{$2}`)
    .replace(/\b([A-Za-zπ]{1,3}|-?\d+)\s*\/\s*([A-Za-zπ]{1,3}|-?\d+)\b/g, String.raw`\frac{$1}{$2}`)
    .replace(/(?<!\\)\b(ln|log|sin|cos|tan|exp)\b/g, (_match, fn) => `\\${fn}`)
    .replace(/−/g, "-")
    .replace(/×/g, String.raw`\times `)
    .replace(/÷/g, String.raw`\div `)
    .replace(/≤/g, String.raw`\le `)
    .replace(/≥/g, String.raw`\ge `)
    .replace(/≠/g, String.raw`\ne `)
    .replace(/π/g, String.raw`\pi `)
    .replace(/∞/g, String.raw`\infty `);
}

export function mathematicalSummaryTitle(value: string) {
  const expressions: string[] = [];
  const stash = (expression: string, alreadyLatex = false) => {
    const resolved = expression.replace(/\uE000(\d+)\uE001/g, (_match, index) => expressions[Number(index)] || "");
    expressions.push(alreadyLatex ? resolved : plainMathToLatex(resolved));
    return `\uE000${expressions.length - 1}\uE001`;
  };

  let text = value.replace(/\\\(([\s\S]*?)\\\)/g, (_match, expression) => stash(expression, true));
  text = text.replace(/\b(cos|sin|tan)\s+([A-Z]{1,4})\s*=\s*(-?\d+)\s*\/\s*(-?\d+)/g, (_match, fn, points, numerator, denominator) => stash(`\\${fn} ${points} = \\frac{${numerator}}{${denominator}}`, true));
  text = text.replace(/\b(cos|sin|tan)\s+([A-Z]{1,4})\b/g, (_match, fn, points) => stash(`\\${fn} ${points}`, true));
  // Keep the word "angle" case-insensitive while requiring point labels to be
  // genuinely uppercase. Using the /i flag here caused ordinary title phrases
  // such as "Angle in a semicircle" to be misread as the expression ∠in.
  const angleWord = String.raw`[Aa][Nn][Gg][Ll][Ee]`;
  text = text.replace(new RegExp(`\\b${angleWord}\\s+([A-Z]{2,4})\\s*=\\s*(-?\\d+(?:\\.\\d+)?)°`, "g"), (_match, points, angle) => stash(String.raw`\angle ${points} = ${angle}^{\circ}`, true));
  text = text.replace(new RegExp(`\\b${angleWord}\\s+([A-Z]{2,4})\\b`, "g"), (_match, points) => stash(String.raw`\angle ${points}`, true));
  text = text.replace(/\b([A-Za-z]{1,3}\([^():;]*[+\-−×÷/][^():;]*\)(?:[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+|\^(?:\([^()]+\)|-?\d+))?)/g, (maths) => stash(maths));
  const plainExponent = "(?:[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+|\\^(?:\\([^()]+\\)|-?\\d+))?";
  text = text.replace(new RegExp(`\\b(\\d+\\s*\\/\\s*\\([^()]+\\)${plainExponent})`, "g"), (maths) => stash(maths));
  text = text.replace(new RegExp("\\b([A-Za-z]\\^\\([^()]+\\))", "g"), (maths) => stash(maths));
  text = text.replace(new RegExp(`(\\([^()]+\\)${plainExponent})`, "g"), (maths) => /[⁰¹²³⁴⁵⁶⁷⁸⁹^]/.test(maths) ? stash(maths) : maths);
  const powerCharacters = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻";
  const exponent = `(?:[${powerCharacters}]+|\\^(?:\\([^()]+\\)|-?\\d+))?`;
  const variableProduct = `(?:\\d+(?:\\.\\d+)?)?(?:[A-Za-zπ]${exponent}){1,3}`;
  const namedFunction = `(?:ln|log|sin|cos|tan|exp)\\s*(?:[A-Za-zπ]${exponent}|\\([^()]+\\))${exponent}`;
  const parentheses = `\\([^()]+\\)${exponent}`;
  const atom = `(?:${namedFunction}|[A-Za-z]{1,3}\\([^()]+\\)${exponent}|[A-Z]{2,4}|${variableProduct}|${parentheses}|-?\\d+(?:\\.\\d+)?)`;
  const expression = new RegExp(`(^|[^A-Za-z0-9])(${atom}(?:\\s*[+\\-−×÷/=≤≥<>]\\s*${atom})+)(?![A-Za-z0-9])`, "g");
  text = text.replace(expression, (_match, prefix, maths) => {
    // A hyphen between ordinary words is punctuation, not subtraction. Without
    // this guard, titles such as "A two-stage game" were rendered as maths and
    // switched to the KaTeX italic font in the middle of a sentence.
    if (/^[A-Za-z]{2,}\s*-\s*[A-Za-z]{2,}$/.test(maths)) return prefix + maths;
    return prefix + stash(maths);
  });

  text = text.replace(/\b([A-Za-z]{1,3}\([A-Za-z]\))/g, (maths) => stash(maths));

  text = text.replace(/(-?\d*)√\s*\(?\s*([A-Za-z0-9.+\-−]+)\s*\)?/g, (_match, coefficient, radicand) => stash(`${coefficient}√${radicand}`));
  text = text.replace(/\b(-?\d+)\s*\/\s*(-?\d+)\b/g, (fraction) => stash(fraction));
  text = text.replace(/\b(-?\d+(?:\.\d+)?)°/g, (_match, angle) => stash(String.raw`${angle}^{\circ}`, true));
  text = text.replace(/\b([A-Za-z])(\d+)\b/g, (subscripted) => stash(subscripted));
  text = text.replace(/\b([A-Za-z0-9](?:[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+|\^(?:\([^()]+\)|[A-Za-z]|-?\d+)))(?=\s|[,:;.)]|$)/g, (powered) => stash(powered));

  const textAcronyms = new Set(["AA", "AI", "CDF", "GDC", "HL", "IB", "IQR", "LHS", "PDF", "RHS", "SL"]);
  text = text.replace(/\b([A-Z]{2,4})\b/g, (token) => textAcronyms.has(token) ? token : stash(token));
  text = text.replace(/\b([b-z]|[A-Z])\b/g, (variable, _captured, offset) => {
    // Keep the opening indefinite article in prose. Mathematical uses such as
    // "A = 12" have already been captured by the expression pass above.
    if (variable === "A" && offset === 0 && /^A\s+[a-z]/.test(text)) return variable;
    return stash(variable);
  });
  text = text.replace(/\b(find|value of|constant|coefficient)\s+(a)\b/gi, (_match, prefix, variable) => `${prefix} ${stash(variable)}`);

  return text.replace(/\uE000(\d+)\uE001/g, (_match, index) => String.raw`\(${expressions[Number(index)]}\)`);
}
