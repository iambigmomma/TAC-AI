import { ArrowRight } from 'lucide-react';
import { Globe, Database, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState, Fragment } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import Attach from './MessageInputActions/Attach';
import { File as FileType, SearchMode } from './ChatWindow';

const searchModeOptions = [
  {
    id: 'web',
    name: 'Web',
    description: 'Search the internet',
    icon: Globe,
    searchMode: 'web' as SearchMode,
  },
  {
    id: 'docs',
    name: '聯合百科',
    description: '臺灣學術經典平臺',
    icon: Database,
    searchMode: 'docs' as SearchMode,
  },
];

const EmptyChatMessageInput = ({
  sendMessage,
  fileIds,
  setFileIds,
  files,
  setFiles,
  searchMode,
}: {
  sendMessage: (message: string) => void;
  fileIds: string[];
  setFileIds: (fileIds: string[]) => void;
  files: FileType[];
  setFiles: (files: FileType[]) => void;
  searchMode: SearchMode;
}) => {
  const [input, setInput] = useState('');

  const handleInputSubmit = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  const selectedModeOption =
    searchModeOptions.find((opt) => opt.searchMode === searchMode) ||
    searchModeOptions[0];

  return (
    <div className="w-full max-w-2xl px-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleInputSubmit();
        }}
        className="bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 rounded-lg p-4 flex flex-col items-center space-y-4"
      >
        <TextareaAutosize
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleInputSubmit();
            }
          }}
          className="transition bg-transparent dark:placeholder:text-white/50 placeholder:text-sm text-sm dark:text-white resize-none focus:outline-none w-full px-2 flex-grow flex-shrink"
          placeholder="Ask anything..."
          rows={1}
        />
        <div className="flex flex-row items-center justify-between w-full">
          <div className="flex flex-row items-center space-x-2">
            <div className="flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              <selectedModeOption.icon
                className="mr-1.5 h-4 w-4"
                aria-hidden="true"
              />
              <span>{selectedModeOption.name}</span>
            </div>
            <Attach
              fileIds={fileIds}
              setFileIds={setFileIds}
              files={files}
              setFiles={setFiles}
              showText={true}
            />
          </div>
          <button
            type="submit"
            disabled={input.trim().length === 0}
            className="bg-[#24A0ED] text-white disabled:text-black/50 dark:disabled:text-white/50 hover:bg-opacity-85 transition duration-100 disabled:bg-[#e0e0dc79] dark:disabled:bg-[#ececec21] rounded-full p-2"
          >
            <ArrowUp className="bg-background" size={17} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmptyChatMessageInput;
