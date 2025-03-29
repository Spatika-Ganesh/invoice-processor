import { tool, generateObject } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import { myProvider } from '@/lib/ai/models';
import { checkDuplicateInvoice, createInvoice, saveMessages } from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

const lineItemSchema = z.object({
  description: z.string().describe('Description of the item'),
  quantity: z.number().describe('Quantity of items'),
  unitPrice: z.number().describe('Price per unit in smallest currency unit'),
  total: z.number().describe('Total price for this line item')
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().describe('Invoice number from the document'),
  vendorName: z.string().describe('Name of the vendor/company issuing the invoice'),
  customerName: z.string().optional().describe('Name of the customer/recipient'),
  invoiceDate: z.string().describe('Date when invoice was issued (YYYY-MM-DD)'),
  dueDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
  amount: z.number().describe('Total amount in the smallest currency unit (cents)'),
  currency: z.string().default('USD').describe('Three-letter currency code'),
  lineItems: z.array(lineItemSchema).describe('Individual items in the invoice')
});

interface ProcessInvoiceProps {
  session: Session;
  chatId: string;
  invoiceFileId?: string;
  chatModel: string;
}

export const processInvoice = ({ session, chatId, invoiceFileId, chatModel }: ProcessInvoiceProps) =>
  tool({
    description: 'Process an invoice document and extract structured information.',
    parameters: z.object({
      fileId: z.string().describe('ID of the invoice file to process'),
      content: z.string().describe('Content of the invoice to process'),
    }),
    execute: async ({ fileId, content }) => {
      try {
        const { object } = await generateObject({
          model: myProvider.languageModel(chatModel),
          system: 'Extract structured information from the invoice content. Return a JSON object with the specified schema.',
          prompt: content,
          schema: invoiceSchema,
        });

        if (session.user?.id) {
          // Save the extracted data as a message
          await saveMessages({
            messages: [{
              id: generateUUID(),
              chatId,
              role: 'assistant',
              content: JSON.stringify(object),
              createdAt: new Date(),
            }]
          });

          const existingInvoice = await checkDuplicateInvoice({
            userId: session.user.id,
            invoiceNumber: object.invoiceNumber,
            vendorName: object.vendorName,
            amount: object.amount
          });

          if (existingInvoice) {
            return {
              success: true,
              message: 'Invoice already exists',
            };
          }
          // Save the invoice to the database
          await createInvoice({
            userId: session.user.id,
            chatId,
            customerName: object.customerName,
            vendorName: object.vendorName,
            invoiceNumber: object.invoiceNumber,
            invoiceDate: object.invoiceDate ? new Date(object.invoiceDate) : undefined,
            dueDate: object.dueDate ? new Date(object.dueDate) : undefined,
            amount: object.amount,
            currency: object.currency,
            lineItems: JSON.stringify(object.lineItems),
            rawExtractedText: content,
            confidenceScore: 100,
            status: 'completed',
            
          });
        }

        return {
          success: true,
          message: 'Invoice processed successfully',
          data: object
        };
      } catch (error) {
        console.error('Failed to process invoice:', error);
        return {
          success: false,
          message: 'Failed to process invoice',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
  }); 