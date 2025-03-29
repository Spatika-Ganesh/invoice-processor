import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getInvoiceFilesByUserId } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const files = await getInvoiceFilesByUserId({ userId: session.user.id });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Failed to fetch invoice files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice files' },
      { status: 500 }
    );
  }
} 