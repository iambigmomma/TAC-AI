import {
  Globe,
  GraduationCap,
  Database,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';
import React, { Fragment, useState } from 'react';
import { File as FileType } from './ChatWindow';
import { toast } from 'sonner';
import { SearchMode } from './ChatWindow';
import { Menu, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import EmptyChatMessageInput from './EmptyChatMessageInput';

const focusOptions = [
  {
    id: 'webSearch',
    name: '全網',
    description: '整個互聯網',
    icon: Globe,
    searchMode: 'web' as SearchMode,
  },
  {
    id: 'udpDatabase',
    name: '聯合百科',
    description: '臺灣學術經典平臺',
    icon: Database,
    searchMode: 'docs' as SearchMode,
  },
  {
    id: 'academicSearch',
    name: '學術',
    description: '中英論文庫',
    icon: GraduationCap,
    searchMode: 'web' as SearchMode,
  },
];

const EmptyChat = ({
  sendMessage,
  focusMode,
  setFocusMode,
  optimizationMode,
  setOptimizationMode,
  fileIds,
  setFileIds,
  files,
  setFiles,
  searchMode,
  setSearchMode,
}: {
  sendMessage: (message: string) => void;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  optimizationMode: string;
  setOptimizationMode: (mode: string) => void;
  fileIds: string[];
  setFileIds: (fileIds: string[]) => void;
  files: FileType[];
  setFiles: (files: FileType[]) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleInputSubmit = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="relative">
      <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
        <Link href="/settings">
          <Globe className="cursor-pointer lg:hidden" />
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-8">
        <h2 className="text-black/70 dark:text-white/70 text-3xl font-medium -mt-8">
          Research begins here.
        </h2>
        <EmptyChatMessageInput
          sendMessage={sendMessage}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          optimizationMode={optimizationMode}
          setOptimizationMode={setOptimizationMode}
          fileIds={fileIds}
          setFileIds={setFileIds}
          files={files}
          setFiles={setFiles}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
        />
      </div>
    </div>
  );
};

export default EmptyChat;
