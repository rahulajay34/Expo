const AGENT_MARKER_PATTERNS: RegExp[] = [
  /<<<<<<< SEARCH\n?/g,
  /=======\n?/g,
  />>>>>>>\n?/g,
  /<<<<<<</g,
  />>>>>>>/g,
  /NO_CHANGES_NEEDED\n?/g,
  /<{3,}\s*SEARCH/gi,
  />{3,}/g,
];

const FORBIDDEN_PATTERNS: RegExp[] = [
  /according to the (transcript|topic|lecture|material|subtopic|content)/gi,
  /based on (the |what )?(we|I|you) (discussed|covered|provided|mentioned)/gi,
  /as (we |I )?(mentioned|discussed|covered|noted|stated) (earlier|above|before|previously)/gi,
  /in (this|the) (lecture|session|module|pre-?read|transcript)/gi,
  /from the (transcript|lecture|material|content)/gi,
  /as an AI( language model| assistant)?/gi,
  /I('ve| have) (created|generated|written|prepared|compiled)/gi,
  /I (can|will|would) (help you|assist you|provide)/gi,
  /if you (want|need|would like) (me to|I can)/gi,
  /let me know if you('d| would) like/gi,
  /feel free to (ask|reach out|contact)/gi,
  /this (section|module|lesson|content) (covers|explains|discusses)/gi,
  /in this (section|module|lesson), you('ll| will) learn/gi,
  /the following (section|content|material) (will|is going to)/gi,
  /now (let's|we will|we'll) (look at|explore|discuss|examine)/gi,
  /it('s| is) important to note that/gi,
  /it('s| is) worth (mentioning|noting) that/gi,
  /please note that/gi,
  /it should be noted that/gi,
  /let's dive (in|into)/gi,
  /let's explore/gi,
  /let's take a (look|closer look)/gi,
  /without further ado/gi,
  /in conclusion,?/gi,
  /to summarize,?/gi,
  /^(it is )?(crucial|essential|fundamental|imperative|vital) (to|that)/gim,
];

const REPLACEMENTS: [RegExp, string][] = [
  [/\blet's\b/gi, "we'll"],
  [/\bI'd like to\b/gi, ''],
  [/\bwe've seen that\b/gi, ''],
  [/\bas we can see,?\b/gi, ''],
  [/\bfirstly,?\b/gi, 'First,'],
  [/\bsecondly,?\b/gi, 'Second,'],
  [/\bthirdly,?\b/gi, 'Third,'],
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat the end of the day\b/gi, 'ultimately'],
  [/\bin today's world\b/gi, 'today'],
  [/\bgoing forward\b/gi, ''],
];

export function stripAgentMarkers(content: string): string {
  let result = content;
  for (const pattern of AGENT_MARKER_PATTERNS) {
    result = result.replace(pattern, '');
  }
  result = result.replace(/\n{3,}/g, '\n\n');
  return result;
}

export function sanitizeAIPatterns(content: string): string {
  let result = stripAgentMarkers(content);

  FORBIDDEN_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, '');
  });

  REPLACEMENTS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  result = result
    .replace(/  +/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*\./g, '.')
    .replace(/^\s*,\s*/gm, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\. ([a-z])/g, (_, char: string) => `. ${char.toUpperCase()}`)
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  return result;
}

export function fixFormattingInsideHtmlTags(content: string): string {
  const htmlTagPattern = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;

  const processHtmlContent = (htmlContent: string): string => {
    let processed = htmlContent;
    processed = processed.replace(/(?<!\\)\\(\$)/g, '$1');
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    return processed;
  };

  const processRecursively = (text: string): string => {
    let processed = text;
    let previousResult = '';

    while (processed !== previousResult) {
      previousResult = processed;
      processed = processed.replace(
        htmlTagPattern,
        (match, tagName: string, attributes: string, innerContent: string) => {
          if (['script', 'style', 'code', 'pre'].includes(tagName.toLowerCase())) {
            return match;
          }
          const fixedContent = processHtmlContent(innerContent);
          const recursivelyFixed = processRecursively(fixedContent);
          return `<${tagName}${attributes}>${recursivelyFixed}</${tagName}>`;
        }
      );
    }

    return processed;
  };

  return processRecursively(content);
}
