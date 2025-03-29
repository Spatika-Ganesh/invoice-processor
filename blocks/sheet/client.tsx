import { Block } from '@/components/create-block';
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from '@/components/icons';
import { SpreadsheetEditor } from '@/components/sheet-editor';
import { ArrowUpDownIcon } from 'lucide-react';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';

type Metadata = any;

export const sheetBlock = new Block<'sheet', Metadata>({
  kind: 'sheet',
  description: 'Useful for working with spreadsheets',
  initialize: async () => {},
  onStreamPart: ({ setBlock, streamPart }) => {
    if (streamPart.type === 'sheet-delta') {
      setBlock((draftBlock) => ({
        ...draftBlock,
        content: streamPart.content as string,
        isVisible: true,
        status: 'streaming',
      }));
    }
  },
  content: ({
    content,
    currentVersionIndex,
    isCurrentVersion,
    onSaveContent,
    status,
  }) => {
    return (
      <SpreadsheetEditor
        content={content}
        currentVersionIndex={currentVersionIndex}
        isCurrentVersion={isCurrentVersion}
        saveContent={onSaveContent}
        status={status}
      />
    );
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      // label: 'Previous',
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      // label: 'Next',
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <CopyIcon />,
      // label: 'Copy CSV',
      description: 'Copy as .csv',
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });
        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== ''),
        );
        const cleanedCsv = unparse(nonEmptyRows);
        navigator.clipboard.writeText(cleanedCsv);
        toast.success('Copied csv to clipboard!');
      },
    },
    {
      icon: <SparklesIcon size={18} />,
      // label: 'Save',
      description: 'Save Changes',
      onClick: ({ content, onSaveContent }) => {
        onSaveContent(content);
        toast.success('Changes saved successfully!');
      },
    },
    {
      icon: <ArrowUpDownIcon size={18} />,
      label: 'Date',
      description: 'Sort by Date',
      onClick: ({ content, onSaveContent }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });
        if (parsed.data.length < 2) return;
        
        const [headers, ...rows] = parsed.data;
        const dateIndex = headers.indexOf('Invoice Date');
        if (dateIndex === -1) return;

        const sortedRows = rows.sort((a, b) => {
          const dateA = new Date(a[dateIndex]).getTime();
          const dateB = new Date(b[dateIndex]).getTime();
          return dateB - dateA; // Sort in descending order (newest first)
        });

        const newContent = unparse([headers, ...sortedRows]);
        onSaveContent(newContent);
      },
    },
    {
      icon: <ArrowUpDownIcon size={18} />,
      label: 'Amount',
      description: 'Sort by Amount',
      onClick: ({ content, onSaveContent }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });
        if (parsed.data.length < 2) return;
        
        const [headers, ...rows] = parsed.data;
        const amountIndex = headers.indexOf('Amount');
        if (amountIndex === -1) return;

        const sortedRows = rows.sort((a, b) => {
          const amountA = parseFloat(a[amountIndex]) || 0;
          const amountB = parseFloat(b[amountIndex]) || 0;
          return amountB - amountA; // Sort in descending order (highest first)
        });

        const newContent = unparse([headers, ...sortedRows]);
        onSaveContent(newContent);
      },
    },
    {
      icon: <ArrowUpDownIcon size={18} />,
      label: 'Vendor',
      description: 'Sort by Vendor',
      onClick: ({ content, onSaveContent }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });
        if (parsed.data.length < 2) return;
        
        const [headers, ...rows] = parsed.data;
        const vendorIndex = headers.indexOf('Vendor Name');
        if (vendorIndex === -1) return;

        const sortedRows = rows.sort((a, b) => {
          const vendorA = (a[vendorIndex] || '').toLowerCase();
          const vendorB = (b[vendorIndex] || '').toLowerCase();
          return vendorA.localeCompare(vendorB);
        });

        const newContent = unparse([headers, ...sortedRows]);
        onSaveContent(newContent);
      },
    },
  ],
  toolbar: [
    {
      description: 'Format and clean data',
      icon: <SparklesIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Can you please format and clean the data?',
        });
      },
    },
    {
      description: 'Analyze and visualize data',
      icon: <LineChartIcon />,
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            'Can you please analyze and visualize the data by creating a new code block in python?',
        });
      },
    },
  ],
});
