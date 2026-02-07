/**
 * Multi-Format Export API Endpoint
 * 
 * Converts markdown content to various document formats using Pandoc.
 * 
 * POST /api/export
 * Body: { content: string, format: 'pdf' | 'docx' | 'html' | 'latex', title?: string, options?: object }
 * Returns: Binary file download
 */

import { NextRequest, NextResponse } from 'next/server';
import { convertDocument, ExportFormat, ConversionOptions, isPandocInstalled, getSupportedFormats } from '@/lib/mcp/pandoc-service';

// GET: Check supported formats and Pandoc status
export async function GET() {
    const pandocInstalled = isPandocInstalled();
    const formats = getSupportedFormats();

    return NextResponse.json({
        pandocInstalled,
        formats: pandocInstalled ? formats : [],
        message: pandocInstalled
            ? 'Export service ready'
            : 'Pandoc not installed. Export features limited to browser-based methods.'
    });
}

// POST: Convert content to specified format
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { content, format, title, options = {} } = body as {
            content: string;
            format: ExportFormat;
            title?: string;
            options?: ConversionOptions;
        };

        // Validation
        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { error: 'Content is required and must be a string' },
                { status: 400 }
            );
        }

        if (!format) {
            return NextResponse.json(
                { error: 'Format is required (pdf, docx, html, latex, epub, odt, rtf)' },
                { status: 400 }
            );
        }

        const validFormats: ExportFormat[] = ['pdf', 'docx', 'html', 'latex', 'rtf', 'epub', 'odt', 'markdown'];
        if (!validFormats.includes(format)) {
            return NextResponse.json(
                { error: `Invalid format. Supported: ${validFormats.join(', ')}` },
                { status: 400 }
            );
        }

        // Check Pandoc availability
        if (!isPandocInstalled()) {
            return NextResponse.json(
                {
                    error: 'Pandoc not installed on server',
                    suggestion: 'Use client-side export for PDF, or install Pandoc for additional formats'
                },
                { status: 503 }
            );
        }

        // Set default options
        const conversionOptions: ConversionOptions = {
            title: title || 'Educational Content',
            author: 'GCCP',
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            standalone: true,
            highlight: true,
            ...options
        };

        // Perform conversion
        console.log(`[Export API] Converting ${content.length} chars to ${format}`);
        const result = await convertDocument(content, format, conversionOptions);

        if (!result.success || !result.outputBuffer) {
            console.error('[Export API] Conversion failed:', result.error);
            return NextResponse.json(
                { error: result.error || 'Conversion failed' },
                { status: 500 }
            );
        }

        // Determine content type
        const contentTypes: Record<ExportFormat, string> = {
            pdf: 'application/pdf',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            html: 'text/html',
            latex: 'application/x-latex',
            rtf: 'application/rtf',
            epub: 'application/epub+zip',
            odt: 'application/vnd.oasis.opendocument.text',
            markdown: 'text/markdown'
        };

        const extensions: Record<ExportFormat, string> = {
            pdf: 'pdf',
            docx: 'docx',
            html: 'html',
            latex: 'tex',
            rtf: 'rtf',
            epub: 'epub',
            odt: 'odt',
            markdown: 'md'
        };

        // Build filename
        const sanitizedTitle = (title || 'export')
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .slice(0, 50);
        const filename = `${sanitizedTitle}.${extensions[format]}`;

        console.log(`[Export API] Success: ${filename} (${result.outputBuffer.length} bytes)`);

        // Return file download - convert Buffer to Uint8Array for NextResponse compatibility
        return new NextResponse(Uint8Array.from(result.outputBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentTypes[format],
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': result.outputBuffer.length.toString(),
                'X-Conversion-Time': result.metadata?.conversionTime?.toString() || '0'
            }
        });

    } catch (error: any) {
        console.error('[Export API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
