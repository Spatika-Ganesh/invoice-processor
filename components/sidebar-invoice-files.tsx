'use client';

import { ChevronDown, ChevronUp, DownloadIcon, FileIcon } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { InvoiceFile } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

const FileItem = ({ file }: { file: InvoiceFile }) => {
  const { setOpenMobile } = useSidebar();

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/files/download/${file.id}`);
      if (!response.ok) throw new Error('Download failed');

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = file.title;
      
      // Append to body, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton>
        <FileIcon className="h-4 w-4" />
        <span className="truncate">{file.title}</span>
      </SidebarMenuButton>
      <button
        onClick={handleDownload}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-sidebar-accent rounded-md"
      >
        <DownloadIcon className="h-4 w-4" />
      </button>
    </SidebarMenuItem>
  );
};

export function SidebarInvoiceFiles() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data, error, isLoading } = useSWR<{ files: InvoiceFile[] }>(
    '/api/files/list',
    fetcher
  );

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Loading files...
        </div>
      </SidebarGroup>
    );
  }

  if (error) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-red-500">
          Failed to load files
        </div>
      </SidebarGroup>
    );
  }

  if (!data?.files || data.files.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            No invoice files uploaded yet
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground"
      >
        <span>Invoice Files</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isExpanded && (
        <SidebarGroupContent>
          <SidebarMenu>
            {data.files.map((file) => (
              <FileItem key={file.id} file={file} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
} 