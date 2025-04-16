'use client';

import { cn } from '@/lib/utils';
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  History,
  Home,
  Search,
  Settings,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useState, type ReactNode } from 'react';

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const getLinkClasses = (href: string, isExact = true) => {
    const isActive = isExact ? pathname === href : pathname.startsWith(href);
    return cn(
      'group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
      isActive
        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        : 'text-gray-600 dark:text-gray-400',
    );
  };

  return (
    <div>
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-secondary">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto px-4 py-4">
          <div className="flex h-16 shrink-0 items-center px-2">
            <Image
              src="https://tac-ai-translation.fra1.cdn.digitaloceanspaces.com/udp%20logo.png"
              alt="Company Logo"
              width={128}
              height={32}
              priority
            />
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              <li>
                <Link href="/" className={getLinkClasses('/')}>
                  <Search className="mr-3 h-5 w-5 flex-shrink-0" />
                  Search
                  <span className="ml-auto inline-block whitespace-nowrap rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    ⌘K
                  </span>
                </Link>
              </li>
              {/* <li>
                <Link href="/library" className={getLinkClasses('/library', false)}>
                  <BookOpenText className="mr-3 h-5 w-5 flex-shrink-0" />
                  知识库
                </Link>
              </li> */}
              <li>
                <Link
                  href="/favorites"
                  className={getLinkClasses('/favorites')}
                >
                  <Star className="mr-3 h-5 w-5 flex-shrink-0" />
                  Favorites
                </Link>
              </li>
              <li>
                <div className="space-y-1">
                  <Link href="/library" passHref legacyBehavior>
                    <button
                      onClick={(e) => {
                        setIsHistoryOpen(!isHistoryOpen);
                      }}
                      className={cn(
                        getLinkClasses('/history', false),
                        'w-full justify-between flex items-center',
                      )}
                    >
                      <div className="flex items-center">
                        <History className="mr-3 h-5 w-5 flex-shrink-0" />
                        History
                      </div>
                      {isHistoryOpen ? (
                        <ChevronUp className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 flex-shrink-0" />
                      )}
                    </button>
                  </Link>
                  {/* {isHistoryOpen && (
                    <ul className="ml-4 mt-1 space-y-1 pl-4 border-l border-gray-200 dark:border-gray-700">
                      <li>
                        <Link
                          href="#"
                          className={
                            getLinkClasses('#today', false) + ' text-xs'
                          }
                        >
                          如何看待读书无用论？
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="#"
                          className={
                            getLinkClasses('#7days-1', false) + ' text-xs'
                          }
                        >
                          1949年南迁對於故宫的...
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="#"
                          className={
                            getLinkClasses('#7days-2', false) + ' text-xs'
                          }
                        >
                          孙中山的情人
                        </Link>
                      </li>
                      <li className="pt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        近7天
                      </li>
                      <li>
                        <Link
                          href="#"
                          className={
                            getLinkClasses('#7days-3', false) + ' text-xs'
                          }
                        >
                          请概述「全球人口老龄...
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="#"
                          className={
                            getLinkClasses('#7days-4', false) + ' text-xs'
                          }
                        >
                          好看的武侠小说有哪些？
                        </Link>
                      </li>
                    </ul>
                  )} */}
                </div>
              </li>

              <li className="mt-auto pb-4">
                <Link href="/settings" className={getLinkClasses('/settings')}>
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </Link>
              </li>

              <li className="-mx-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-x-3 px-4 py-3 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100">
                  <span className="inline-block h-8 w-8 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <svg
                      className="h-full w-full text-gray-300 dark:text-gray-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                  <span>Jeff Fan</span>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="lg:pl-64">
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
