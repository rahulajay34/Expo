import JSZip from 'jszip';

export async function extractPPTXText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideTexts: string[] = [];
  const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/;

  const slideFiles = Object.keys(zip.files)
    .filter(name => slideRegex.test(name))
    .sort((a, b) => {
      const numA = parseInt(slideRegex.exec(a)![1]);
      const numB = parseInt(slideRegex.exec(b)![1]);
      return numA - numB;
    });

  for (const slidePath of slideFiles) {
    const xmlContent = await zip.file(slidePath)?.async('string');
    if (!xmlContent) continue;

    // Extract all text from the slide XML
    const textMatches = xmlContent.match(/<a:t>([^<]+)<\/a:t>/g) || [];
    const slideText = textMatches
      .map(m => m.replace(/<a:t>|<\/a:t>/g, ''))
      .join(' ');
    const slideNum = slideRegex.exec(slidePath)![1];
    if (slideText.trim()) {
      slideTexts.push(`[Slide ${slideNum}]\n${slideText}`);
    }
  }

  return slideTexts.join('\n\n--- Slide Break ---\n\n');
}
