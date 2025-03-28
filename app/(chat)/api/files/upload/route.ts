import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { validateInvoicePrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai/models';
import { streamObject, generateObject } from 'ai';
import { LanguageModelV1Prompt } from 'ai';
import { checkDuplicateInvoiceFile, createInvoiceFile } from '@/lib/db/queries';
// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type), {
        message: 'File type should be JPEG, PNG, or PDF',
      },
    ),
});

async function validateInvoiceContent(content: string): Promise<boolean> {
  const model = myProvider.languageModel('pdf-model');
  try {
    const { object } = await generateObject({
      model,
      system: validateInvoicePrompt,
      prompt: content,
      schema: z.object({
        isValid: z.boolean()
      }),
    });

    return object.isValid;
  } catch (error) {
    console.error("Error validating invoice content", error);
    return false;
  }
}
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    const base64Content = buffer.toString('base64');

    try {
      
      
      // Generate unique filename with timestamp

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}`;

      // Create data URL for immediate preview
      const dataURL = `data:${file.type};base64,${base64Content}`;

      // TODO: If duplicate file, return that file id and allow to query maybe
      // const isDuplicate = await checkDuplicateInvoiceFile({ userId: session.user.id, content: base64Content });

      // if (isDuplicate) {
      //   return NextResponse.json({ error: 'File already processed' }, { status: 400 });
      // }

      // TODO: Validate invoice content - commented out for rate limiting errors
      // const isInvoice = await validateInvoiceContent(base64Content);

      // if (!isInvoice) {
      //   return NextResponse.json({ error: 'File is not an invoice' }, { status: 400 });
      // }

      const invoiceFile = await createInvoiceFile({
        userId: session.user.id,
        title: filename,
        kind: file.type.startsWith('image/') ? 'image' : 'pdf',
        content: base64Content,
      });
      return NextResponse.json({
        url: dataURL,
        pathname: `/uploads/${uniqueFilename}`,
        contentType: file.type,
        invoiceFileId: invoiceFile.id,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
