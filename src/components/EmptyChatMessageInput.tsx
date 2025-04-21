import { ArrowRight } from 'lucide-react';
import {
  Globe,
  GraduationCap,
  Database,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useEffect, useRef, useState, Fragment } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import CopilotToggle from './MessageInputActions/Copilot';
import Focus from './MessageInputActions/Focus';
import Optimization from './MessageInputActions/Optimization';
import Attach from './MessageInputActions/Attach';
import { File, SearchMode } from './ChatWindow';
import { Menu, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

const focusOptions = [
  {
    id: 'webSearch',
    name: 'Web',
    description: 'Search the internet',
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

const EmptyChatMessageInput = ({
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
  files: File[];
  setFiles: (files: File[]) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
}) => {
  const [copilotEnabled, setCopilotEnabled] = useState(false);
  const [message, setMessage] = useState('');

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;

      const isInputFocused =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    inputRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedFocus =
    focusOptions.find((opt) => opt.id === focusMode) || focusOptions[0];

  const handleFocusChange = (option: (typeof focusOptions)[0]) => {
    setFocusMode(option.id);
    setSearchMode(option.searchMode);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage(message);
        setMessage('');
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(message);
          setMessage('');
        }
      }}
      className="w-full"
    >
      <div className="flex flex-col bg-light-secondary dark:bg-dark-secondary px-5 pt-5 pb-2 rounded-lg w-full border border-light-200 dark:border-dark-200">
        <TextareaAutosize
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minRows={2}
          className="bg-transparent placeholder:text-black/50 dark:placeholder:text-white/50 text-sm text-black dark:text-white resize-none focus:outline-none w-full max-h-24 lg:max-h-36 xl:max-h-48"
          placeholder="Ask anything..."
        />
        <div className="flex flex-row items-center justify-between mt-4">
          <div className="flex flex-row items-center space-x-2 lg:space-x-4">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75">
                  <selectedFocus.icon
                    className="mr-1.5 h-4 w-4 text-black/50 dark:text-white/50"
                    aria-hidden="true"
                  />
                  {selectedFocus.name}
                  <ChevronDown
                    className="ml-1.5 h-4 w-4 text-black/50 dark:text-white/50"
                    aria-hidden="true"
                  />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute bottom-full left-0 mb-2 w-56 origin-bottom-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    {focusOptions.map((option) => (
                      <Menu.Item key={option.id}>
                        {({ active }) => (
                          <button
                            type="button"
                            onClick={() => handleFocusChange(option)}
                            className={cn(
                              'w-full text-left flex justify-between items-center px-4 py-2 text-sm',
                              active
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300',
                            )}
                          >
                            <div className="flex items-center">
                              <option.icon
                                className="mr-3 h-5 w-5"
                                aria-hidden="true"
                              />
                              <div>
                                <p className="font-medium">{option.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {option.description}
                                </p>
                              </div>
                            </div>
                            {focusMode === option.id && (
                              <Check
                                className="ml-3 h-5 w-5 text-blue-600"
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
            <Attach
              fileIds={fileIds}
              setFileIds={setFileIds}
              files={files}
              setFiles={setFiles}
              showText
            />
          </div>
          <div className="flex flex-row items-center space-x-1 sm:space-x-4">
            <Optimization
              optimizationMode={optimizationMode}
              setOptimizationMode={setOptimizationMode}
            />
            <button
              disabled={message.trim().length === 0}
              className="bg-[#24A0ED] text-white disabled:text-black/50 dark:disabled:text-white/50 disabled:bg-[#e0e0dc] dark:disabled:bg-[#ececec21] hover:bg-opacity-85 transition duration-100 rounded-full p-2"
            >
              <ArrowRight className="bg-background" size={17} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default EmptyChatMessageInput;
