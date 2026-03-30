// Dynamic import to avoid SSR issues
export async function downloadPDF(elementId: string, filename: string): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;
  const originalElement = document.getElementById(elementId);
  if (!originalElement) throw new Error('Element not found for PDF export');

  // Create a wrapper for the PDF purely for print formatting
  const printWrapper = document.createElement('div');
  printWrapper.className = 'pdf-export-wrapper bg-white text-text-primary';
  
  // Create a more modern professional header
  const header = document.createElement('div');
  header.style.marginBottom = '32px';
  header.style.paddingBottom = '16px';
  header.style.borderBottom = '2px solid #F3F4F6';
  header.innerHTML = `
    <h1 style="font-size: 28px; font-weight: 800; color: #111827; margin: 0; font-family: 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; line-height: 1.2;">
      ${filename.replace(/_/g, ' ')}
    </h1>
  `;

  // Inject Custom Print CSS to fix typography, spacing, Mermaid sizing, and page breaks
  const style = document.createElement('style');
  style.innerHTML = `
    .pdf-export-wrapper {
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      color: #374151 !important;
      line-height: 1.7 !important;
      font-size: 13px !important;
    }
    
    /* Typography & Spacing */
    .pdf-export-wrapper h1, .pdf-export-wrapper h2, .pdf-export-wrapper h3 {
      color: #111827 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      margin-top: 1.8em !important;
      margin-bottom: 0.6em !important;
      font-weight: 700 !important;
      display: block !important;
    }
    .pdf-export-wrapper h2 { font-size: 20px !important; border-bottom: 1px solid #F3F4F6 !important; padding-bottom: 6px !important; }
    .pdf-export-wrapper h3 { font-size: 16px !important; }
    
    .pdf-export-wrapper p, .pdf-export-wrapper li {
      margin-bottom: 0.8em !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    
    /* Code Blocks */
    .pdf-export-wrapper pre {
      display: block !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      background: #F8FAFC !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 6px !important;
      padding: 16px !important;
      font-size: 11px !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      overflow: visible !important;
    }

    /* Tables */
    .pdf-export-wrapper table {
      display: table !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 1.5em 0 !important;
    }
    .pdf-export-wrapper tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .pdf-export-wrapper th, .pdf-export-wrapper td {
      border: 1px solid #E5E7EB !important;
      padding: 12px 16px !important;
      text-align: left !important;
    }
    .pdf-export-wrapper th {
      background-color: #F9FAFB !important;
      font-weight: 600 !important;
      color: #111827 !important;
    }

    /* Blockquotes */
    .pdf-export-wrapper blockquote {
      display: block !important;
      page-break-inside: avoid;
      break-inside: avoid;
      border-left: 4px solid #6366F1 !important;
      background-color: #EEF2FF !important;
      padding: 12px 16px !important;
      margin: 1.5em 0 !important;
      color: #4F46E5 !important;
      border-radius: 0 6px 6px 0 !important;
    }

    /* Target Mermaid specifically to prevent cropping */
    .pdf-export-wrapper .my-6.flex.justify-center {
      display: block !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      width: 100% !important;
      margin: 2em 0 !important;
      background: #ffffff !important;
      border-radius: 8px !important;
      border: 1px solid #E5E7EB !important;
      padding: 24px !important;
      box-sizing: border-box !important;
      text-align: center !important;
    }
    .pdf-export-wrapper svg {
      max-width: 100% !important;
      height: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: inline-block !important; /* Prevents flexbox collapsing issues */
    }
  `;
  
  // Clone the content so we don't modify the live DOM temporarily
  const clonedContent = originalElement.cloneNode(true) as HTMLElement;
  clonedContent.id = ''; // Remove ID to prevent duplicates
  
  // Clean up ALL SVGs manually. Mermaid attaches hardcoded style widths that ignore CSS max-width.
  // We strip absolute dimensions and force them to scale proportionally via viewBox.
  const svgs = clonedContent.querySelectorAll('svg');
  svgs.forEach(svg => {
    // Read bounds before removing so we can synthesize a viewBox if it's missing
    const widthRaw = svg.getAttribute('width');
    const heightRaw = svg.getAttribute('height');
    const viewboxRaw = svg.getAttribute('viewBox');
    
    if (!viewboxRaw && widthRaw && heightRaw) {
      // If no SVG viewBox exists, invent one using its literal dimensions so it scales correctly!
      const w = widthRaw.replace(/px/g, '').replace(/%/g, '');
      const h = heightRaw.replace(/px/g, '').replace(/%/g, '');
      if (!isNaN(Number(w)) && !isNaN(Number(h))) {
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      }
    }

    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto'; // Will derive aspect ratio from viewBox automatically
  });
  
  // Enforce explicit page break blocks structurally directly on DOM nodes as a fallback shield
  const breakAvoidBlocks = clonedContent.querySelectorAll('pre, table, tr, img, blockquote, .my-6, p, h1, h2, h3, li');
  breakAvoidBlocks.forEach(block => {
    (block as HTMLElement).style.pageBreakInside = 'avoid';
    (block as HTMLElement).style.breakInside = 'avoid';
  });

  printWrapper.appendChild(style);
  printWrapper.appendChild(header);
  printWrapper.appendChild(clonedContent);
  
  // We don't need to append it to the DOM! html2pdf will handle detached elements automatically.
  // Using a pixel width of 800px acts as standard viewport for rendering cleanly.
  printWrapper.style.width = '800px'; 
  printWrapper.style.padding = '30px 40px'; // Breathing room around the doc
  printWrapper.style.backgroundColor = '#ffffff';
  printWrapper.style.boxSizing = 'border-box'; // Ensure padding doesn't widen the container

  const opt = {
    margin: [10, 10, 15, 10], // Slimmer top margin so header breathes, bigger bottom for page numbers maybe
    filename: `${filename}.pdf`,
    image: { type: 'png', quality: 1.0 }, // PNG is infinitely better for rendering sharp structural text and diagrams without artifacting!
    html2canvas: { 
      scale: 2, // High resolution ensures crisp text and SVGs
      useCORS: true, 
      letterRendering: true,
      windowWidth: 800, // matches container width for perfect ratio
      scrollY: 0,
      allowTaint: true
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { 
      // Rely solely on CSS classes which we explicitly enforced above instead of buggy layout clones
      mode: 'css'
    },
  };

  await html2pdf().set(opt).from(printWrapper).save();
}

