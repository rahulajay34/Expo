/**
 * Server-side PDF Generation API Route
 * Uses Puppeteer to generate PDFs from markdown content
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import MarkdownIt from 'markdown-it';

// Initialize markdown parser with plugins
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: true
});

// Enable GitHub Flavored Markdown features
md.enable(['table', 'strikethrough', 'blockquote']);

interface PDFRequestBody {
    content: string;
    title?: string;
    author?: string;
    filename?: string;
    styling?: {
        headerColor?: string;
        fontSize?: number;
        lineHeight?: number;
    };
}

/**
 * Generate PDF styles with Tailwind-like prose styling
 */
function generatePDFStyles(): string {
    return `
    <style>
        @page {
            size: A4;
            margin: 2cm 1.5cm;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.7;
            color: #1a1a1a;
            font-size: 11pt;
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        /* Typography Scale */
        h1 {
            font-size: 24pt;
            font-weight: 700;
            color: #1a365d;
            border-bottom: 2px solid #3182ce;
            padding-bottom: 0.5em;
            margin-top: 0;
            margin-bottom: 0.8em;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 18pt;
            font-weight: 600;
            color: #2c5282;
            margin-top: 1.5em;
            margin-bottom: 0.6em;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 14pt;
            font-weight: 600;
            color: #2d3748;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
        }
        
        h4 {
            font-size: 12pt;
            font-weight: 600;
            color: #4a5568;
            margin-top: 1em;
            margin-bottom: 0.4em;
        }
        
        h5, h6 {
            font-size: 11pt;
            font-weight: 600;
            color: #4a5568;
            margin-top: 0.8em;
            margin-bottom: 0.4em;
        }
        
        p {
            margin: 0.8em 0;
            text-align: justify;
            orphans: 3;
            widows: 3;
        }
        
        /* Inline Code */
        code {
            background: #edf2f7;
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 0.9em;
            color: #1a202c;
        }
        
        /* Code Blocks */
        pre {
            background: #1a202c;
            color: #f7fafc;
            padding: 1em;
            border-radius: 8px;
            overflow-x: auto;
            page-break-inside: avoid;
            font-family: 'Consolas', 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 10pt;
            line-height: 1.5;
            margin: 1em 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: #f7fafc;
            font-size: inherit;
            border-radius: 0;
        }
        
        /* Syntax highlighting colors */
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
            color: #a0aec0;
        }
        
        .token.punctuation {
            color: #cbd5e0;
        }
        
        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
            color: #fc8181;
        }
        
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
            color: #68d391;
        }
        
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
            color: #f6ad55;
        }
        
        .token.atrule,
        .token.attr-value,
        .token.keyword {
            color: #63b3ed;
        }
        
        .token.function,
        .token.class-name {
            color: #f6e05e;
        }
        
        .token.regex,
        .token.important,
        .token.variable {
            color: #f687b3;
        }
        
        /* Lists */
        ul, ol {
            margin: 0.8em 0;
            padding-left: 1.5em;
        }
        
        li {
            margin: 0.4em 0;
        }
        
        li > p {
            margin: 0.4em 0;
        }
        
        ul ul, ul ol, ol ul, ol ol {
            margin: 0.3em 0;
        }
        
        /* Blockquotes */
        blockquote {
            border-left: 4px solid #3182ce;
            margin: 1em 0;
            padding: 0.5em 1em;
            background: #ebf8ff;
            font-style: italic;
            page-break-inside: avoid;
        }
        
        blockquote p:first-child {
            margin-top: 0;
        }
        
        blockquote p:last-child {
            margin-bottom: 0;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            page-break-inside: avoid;
            font-size: 10pt;
        }
        
        thead {
            display: table-header-group;
        }
        
        th, td {
            border: 1px solid #e2e8f0;
            padding: 0.6em;
            text-align: left;
            vertical-align: top;
        }
        
        th {
            background: #edf2f7;
            font-weight: 600;
            color: #2d3748;
        }
        
        tr:nth-child(even) {
            background: #f7fafc;
        }
        
        /* Links */
        a {
            color: #3182ce;
            text-decoration: underline;
        }
        
        a:hover {
            color: #2c5282;
        }
        
        /* Horizontal Rules */
        hr {
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 2em 0;
        }
        
        /* Images */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
            page-break-inside: avoid;
        }
        
        /* Strong and Emphasis */
        strong {
            font-weight: 700;
            color: #1a202c;
        }
        
        em {
            font-style: italic;
        }
        
        /* Strikethrough */
        s, strike, del {
            text-decoration: line-through;
            color: #718096;
        }
        
        /* Math equations */
        .math {
            font-family: 'Cambria Math', 'Times New Roman', serif;
            font-style: italic;
        }
        
        .math-display {
            display: block;
            text-align: center;
            margin: 1em 0;
            page-break-inside: avoid;
        }
        
        /* Definition Lists */
        dl {
            margin: 1em 0;
        }
        
        dt {
            font-weight: 600;
            margin-top: 0.5em;
        }
        
        dd {
            margin-left: 1.5em;
            margin-bottom: 0.5em;
        }
        
        /* Print-specific styles */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            pre {
                background: #1a202c !important;
                color: #f7fafc !important;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            
            pre code, pre * {
                color: #f7fafc !important;
            }
            
            a {
                text-decoration: underline;
            }
            
            a[href]:after {
                content: " (" attr(href) ")";
                font-size: 0.8em;
                color: #718096;
            }
        }
        
        /* Page breaks */
        .page-break {
            page-break-after: always;
        }
        
        .no-break {
            page-break-inside: avoid;
        }
    </style>
    `;
}

/**
 * Generate HTML document for PDF rendering
 */
function generateHTMLDocument(content: string, title: string): string {
    const htmlContent = md.render(content);
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${generatePDFStyles()}
    </head>
    <body>
        <div class="content">
            ${htmlContent}
        </div>
    </body>
    </html>
    `;
}

/**
 * POST handler for PDF generation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    let browser = null;
    
    try {
        // Parse request body
        const body: PDFRequestBody = await request.json();
        
        // Validate required fields
        if (!body.content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            );
        }
        
        const {
          content,
          title = 'Document',
          filename = 'document.pdf'
        } = body;
        
        // Launch Puppeteer browser
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
        
        // Create new page
        const page = await browser.newPage();
        
        // Generate HTML content
        const htmlContent = generateHTMLDocument(content, title);
        
        // Set page content
        await page.setContent(htmlContent, {
            waitUntil: ['networkidle0', 'domcontentloaded']
        });
        
        // Wait for fonts to load
        await page.evaluateHandle('document.fonts.ready');
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '2cm',
                right: '1.5cm',
                bottom: '2cm',
                left: '1.5cm'
            },
            preferCSSPageSize: true
        });
        
        // Close browser
        await browser.close();
        browser = null;
        
        // Return PDF as downloadable response
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename.endsWith('.pdf') ? filename : filename + '.pdf'}"`,
                'Content-Length': pdfBuffer.length.toString()
            }
        });
        
    } catch (error) {
        // Ensure browser is closed on error
        if (browser) {
            await browser.close();
        }
        
        console.error('PDF Generation Error:', error);
        
        return NextResponse.json(
            { 
                error: 'Failed to generate PDF',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

/**
 * GET handler for health check
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        status: 'ok',
        service: 'PDF Generation API',
        version: '1.0.0'
    });
}
