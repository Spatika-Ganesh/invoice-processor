import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getInvoiceFileById } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const file = await getInvoiceFileById(params.id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Verify the file belongs to the user
    if (file.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set the appropriate content type based on file kind
    const contentType = file.kind === 'pdf' ? 'application/pdf' : 'image/jpeg';

    // Decode base64 content to binary
    const binaryContent = Buffer.from(file.content, 'base64');

    // Create response with the decoded file content
    const response = new NextResponse(binaryContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${file.title}"`,
        'Content-Length': binaryContent.length.toString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Failed to download invoice file:', error);
    return NextResponse.json(
      { error: 'Failed to download invoice file' },
      { status: 500 }
    );
  }
} 