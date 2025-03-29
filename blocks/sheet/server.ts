import { myProvider } from '@/lib/ai/models';
import { sheetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/blocks/server';
import { streamObject } from 'ai';
import { z } from 'zod';
import { getInvoicesByUserId, updateInvoice } from '@/lib/db/queries';
import { parse, ParseResult } from 'papaparse';

// Add line item schema for validation
const lineItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  total: z.number().optional()
});

// Helper function to validate and format line items
function formatLineItems(lineItemsStr: string | undefined): string | undefined {
  if (!lineItemsStr) return undefined;
  
  try {
    // Try to parse the string as JSON
    const parsed = JSON.parse(lineItemsStr);
    
    // Validate that it's an array
    if (!Array.isArray(parsed)) {
      console.error('Line items must be an array');
      return undefined;
    }
    
    // Validate each line item
    const validatedItems = parsed.map(item => {
      try {
        return lineItemSchema.parse(item);
      } catch (error) {
        console.error('Invalid line item format:', error);
        return null;
      }
    }).filter(Boolean);
    
    // Return the validated items as a JSON string
    return JSON.stringify(validatedItems);
  } catch (error) {
    console.error('Failed to parse line items:', error);
    return undefined;
  }
}

// Helper function to escape CSV fields
const escapeCSVField = (field: string) => {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    // Replace any double quotes with two double quotes (standard CSV escaping)
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return field;
};

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, dataStream, session }) => {
    let draftContent = '';

    // Check if this is a request to view invoices
    if (title.toLowerCase().includes('invoice') && session?.user?.id) {
      // Fetch invoices for the user
      const invoices = await getInvoicesByUserId({ userId: session.user.id });
      
      // Convert invoices to CSV format
      const headers = [
        'ID', // Added ID column for tracking updates
        'Invoice Number',
        'Vendor Name',
        'Customer Name',
        'Invoice Date',
        'Due Date',
        'Amount',
        'Currency',
        'Status',
        'Line Items',
        'Created At'
      ];

      const rows = invoices.map(invoice => [
        invoice.id,
        escapeCSVField(invoice.invoiceNumber || ''),
        escapeCSVField(invoice.vendorName || ''),
        escapeCSVField(invoice.customerName || ''),
        invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
        invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        invoice.amount ? (invoice.amount / 100).toFixed(2) : '', // Convert cents to dollars
        invoice.currency || 'USD',
        invoice.status,
        invoice.lineItems || '',
        new Date(invoice.createdAt).toISOString().split('T')[0]
      ]);

      // Create CSV content with escaped fields
      draftContent = [
        headers.map(escapeCSVField).join(','),
        ...rows.map(row => row.map(field => escapeCSVField(String(field))).join(','))
      ].join('\n');

      // Stream the content to the client
      dataStream.writeData({
        type: 'sheet-delta',
        content: draftContent,
      });
    } else {
      // Default behavior for other sheet requests
      const { fullStream } = streamObject({
        model: myProvider.languageModel('block-model'),
        system: sheetPrompt,
        prompt: title,
        schema: z.object({
          csv: z.string().describe('CSV data'),
        }),
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === 'object') {
          const { object } = delta;
          const { csv } = object;

          if (csv) {
            dataStream.writeData({
              type: 'sheet-delta',
              content: csv,
            });

            draftContent = csv;
          }
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, session }) => {
    let draftContent = document.content || '';

    // Check if this is an invoice sheet
    if (document.title.toLowerCase().includes('invoice') && session?.user?.id) {
      // Parse the current CSV content
      const parsedResult: ParseResult<string[]> = parse(draftContent, { skipEmptyLines: true });
      if (!parsedResult.data || parsedResult.data.length < 2) {
        return draftContent;
      }

      const [headers, ...rows] = parsedResult.data;
      if (!Array.isArray(headers)) {
        return draftContent;
      }

      // Find the column indices
      const idIndex = headers.indexOf('ID');
      const invoiceNumberIndex = headers.indexOf('Invoice Number');
      const vendorNameIndex = headers.indexOf('Vendor Name');
      const customerNameIndex = headers.indexOf('Customer Name');
      const invoiceDateIndex = headers.indexOf('Invoice Date');
      const dueDateIndex = headers.indexOf('Due Date');
      const amountIndex = headers.indexOf('Amount');
      const currencyIndex = headers.indexOf('Currency');
      const statusIndex = headers.indexOf('Status');
      const lineItemsIndex = headers.indexOf('Line Items');

      // Update each modified row in the database
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        
        const id = row[idIndex];
        if (!id) continue;

        // Convert amount back to cents for storage
        const amount = row[amountIndex] ? Math.round(parseFloat(row[amountIndex]) * 100) : undefined;

        // Format and validate line items
        const formattedLineItems = formatLineItems(row[lineItemsIndex]);

        await updateInvoice({
          id,
          userId: session.user.id,
          invoiceNumber: row[invoiceNumberIndex] || undefined,
          vendorName: row[vendorNameIndex] || undefined,
          customerName: row[customerNameIndex] || undefined,
          invoiceDate: row[invoiceDateIndex] ? new Date(row[invoiceDateIndex]) : undefined,
          dueDate: row[dueDateIndex] ? new Date(row[dueDateIndex]) : undefined,
          amount,
          currency: row[currencyIndex] || undefined,
          status: row[statusIndex] as 'processing' | 'completed' | 'error' || undefined,
          lineItems: formattedLineItems,
        });
        console.log('Invoice updated:', id);
      }

      // Fetch fresh data after updates
      const invoices = await getInvoicesByUserId({ userId: session.user.id });
      
      // Convert invoices to CSV format
      const updatedRows = invoices.map(invoice => [
        invoice.id,
        escapeCSVField(invoice.invoiceNumber || ''),
        escapeCSVField(invoice.vendorName || ''),
        escapeCSVField(invoice.customerName || ''),
        invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : '',
        invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        invoice.amount ? (invoice.amount / 100).toFixed(2) : '',
        invoice.currency || 'USD',
        invoice.status,
        invoice.lineItems || '',
        new Date(invoice.createdAt).toISOString().split('T')[0]
      ]);

      // Create updated CSV content
      draftContent = [
        headers.map(escapeCSVField).join(','),
        ...updatedRows.map(row => row.map(field => escapeCSVField(String(field))).join(','))
      ].join('\n');

      // Stream the updated content to the client
      dataStream.writeData({
        type: 'sheet-delta',
        content: draftContent,
      });
    } else {
      // Default update behavior for non-invoice sheets
      const { fullStream } = streamObject({
        model: myProvider.languageModel('block-model'),
        system: updateDocumentPrompt(document.content, 'sheet'),
        prompt: description,
        schema: z.object({
          csv: z.string(),
        }),
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === 'object') {
          const { object } = delta;
          const { csv } = object;

          if (csv) {
            dataStream.writeData({
              type: 'sheet-delta',
              content: csv,
            });

            draftContent = csv;
          }
        }
      }
    }

    return draftContent;
  },
});
