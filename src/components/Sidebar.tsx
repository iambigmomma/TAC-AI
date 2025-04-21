'use client';

import { cn, formatTimeDifference } from '@/lib/utils';
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  History,
  Home,
  Search,
  Settings,
  Star,
  LogIn,
  LogOut,
  User as UserIcon,
  BookText,
  PanelLeftClose,
  PanelRightClose,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import React, { useState, type ReactNode, Fragment, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Menu, Transition } from '@headlessui/react';
import { type Chat } from '@/app/history/page';

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, error: userError, isLoading: userLoading } = useUser();
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !userLoading) {
      const fetchChats = async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
          const res = await fetch(`/api/chats`);
          if (!res.ok) {
            throw new Error('Failed to fetch chat history');
          }
          const data = await res.json();
          const sortedChats = data.chats.sort(
            (a: Chat, b: Chat) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setChatHistory(sortedChats);
        } catch (err: any) {
          console.error('History fetch error:', err);
          setHistoryError(err.message || 'Could not load history.');
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchChats();
    } else if (!userLoading) {
      setChatHistory([]);
    }
  }, [user, userLoading]);

  const getLinkClasses = (
    href: string,
    isExact = true,
    isCollapsed = isSidebarCollapsed,
  ) => {
    const isActive = isExact ? pathname === href : pathname.startsWith(href);
    return cn(
      'group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
      isActive
        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        : 'text-gray-600 dark:text-gray-400',
      isCollapsed ? 'justify-center' : '',
    );
  };

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  return (
    <div>
      <div
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-secondary transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
        )}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto px-4 py-4">
          <div
            className={cn(
              'flex h-16 shrink-0 items-center',
              isSidebarCollapsed ? 'justify-center' : 'justify-between',
            )}
          >
            {!isSidebarCollapsed && (
              <Image
                src="https://tac-ai-translation.fra1.cdn.digitaloceanspaces.com/udp%20logo.png"
                alt="Company Logo"
                width={128}
                height={32}
                priority
                className="transition-opacity duration-300 ease-in-out"
              />
            )}
            <button
              onClick={toggleSidebar}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-md"
            >
              {isSidebarCollapsed ? (
                <PanelRightClose className="h-6 w-6" />
              ) : (
                <PanelLeftClose className="h-6 w-6" />
              )}
            </button>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              <li>
                <Link href="/" className={getLinkClasses('/')}>
                  <Search
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      !isSidebarCollapsed && 'mr-3',
                    )}
                  />
                  {!isSidebarCollapsed && (
                    <>
                      Search
                      <span className="ml-auto inline-block whitespace-nowrap rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        ⌘K
                      </span>
                    </>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  href="/favorites"
                  className={getLinkClasses('/favorites')}
                >
                  <Star
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      !isSidebarCollapsed && 'mr-3',
                    )}
                  />
                  {!isSidebarCollapsed && 'Favorites'}
                </Link>
              </li>
              <li>
                <div className="space-y-1">
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    disabled={isSidebarCollapsed}
                    className={cn(
                      getLinkClasses('/history', false),
                      'w-full flex items-center cursor-pointer',
                      isSidebarCollapsed ? 'justify-center' : 'justify-between',
                      isSidebarCollapsed && 'cursor-default',
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center',
                        isSidebarCollapsed && 'justify-center w-full',
                      )}
                    >
                      <History
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          !isSidebarCollapsed && 'mr-3',
                        )}
                      />
                      {!isSidebarCollapsed && 'History'}
                    </div>
                    {!isSidebarCollapsed &&
                      (isHistoryOpen ? (
                        <ChevronUp className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 flex-shrink-0" />
                      ))}
                  </button>

                  {!isSidebarCollapsed && isHistoryOpen && (
                    <ul className="mt-1 space-y-1 pl-5 border-l border-gray-200 dark:border-gray-700 ml-4 mr-1 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                      {historyLoading && (
                        <li className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                          Loading history...
                        </li>
                      )}
                      {historyError && (
                        <li className="px-3 py-1 text-xs text-red-500 dark:text-red-400">
                          Error: {historyError}
                        </li>
                      )}
                      {!historyLoading &&
                        !historyError &&
                        chatHistory.length === 0 &&
                        user && (
                          <li className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                            No history yet.
                          </li>
                        )}
                      {!historyLoading &&
                        !historyError &&
                        chatHistory.map((chat) => (
                          <li key={chat.id}>
                            <Link
                              href={`/c/${chat.id}`}
                              title={chat.title}
                              className={cn(
                                getLinkClasses(`/c/${chat.id}`, false, false),
                                'text-xs block truncate',
                              )}
                            >
                              {truncateText(chat.title, 25)}
                            </Link>
                          </li>
                        ))}
                      {!user && !userLoading && (
                        <li className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                          Login to see history.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </li>

              <li
                className={cn(isSidebarCollapsed ? 'mt-auto' : 'mt-auto pb-4')}
              >
                <Link href="/settings" className={getLinkClasses('/settings')}>
                  <Settings
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      !isSidebarCollapsed && 'mr-3',
                    )}
                  />
                  {!isSidebarCollapsed && 'Settings'}
                </Link>
              </li>

              <li
                className={cn(
                  '-mx-4 border-t border-gray-200 dark:border-gray-700',
                  isSidebarCollapsed ? 'mt-2' : 'mt-auto',
                )}
              >
                {userLoading ? (
                  <div
                    className={cn(
                      'flex items-center justify-center h-14',
                      isSidebarCollapsed ? 'px-1' : 'px-4 py-3',
                    )}
                  >
                    {!isSidebarCollapsed && (
                      <p className="text-sm text-gray-500">Loading...</p>
                    )}
                  </div>
                ) : userError ? (
                  <div
                    className={cn(
                      'text-sm text-red-600 flex items-center justify-center h-14',
                      isSidebarCollapsed ? 'px-1' : 'px-4 py-3',
                    )}
                  >
                    {!isSidebarCollapsed && <p className="truncate">Error</p>}
                    {isSidebarCollapsed && (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                ) : user ? (
                  <Menu as="div" className="relative">
                    <Menu.Button
                      className={cn(
                        'flex w-full items-center gap-x-3 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800',
                        isSidebarCollapsed
                          ? 'justify-center px-2 py-3 h-14'
                          : 'px-4 py-3',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700',
                          isSidebarCollapsed ? 'h-8 w-8' : 'h-8 w-8',
                        )}
                      >
                        {user.picture ? (
                          <Image
                            src={user.picture}
                            alt={user.name || 'User Avatar'}
                            width={32}
                            height={32}
                            className="h-full w-full"
                          />
                        ) : (
                          <UserIcon className="h-full w-full text-gray-300 dark:text-gray-500 p-1" />
                        )}
                      </span>
                      {!isSidebarCollapsed && (
                        <span className="truncate">
                          {user.name || user.email}
                        </span>
                      )}
                    </Menu.Button>

                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items
                        className={cn(
                          'absolute left-4 mb-2 w-56 origin-bottom-left rounded-md bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
                          isSidebarCollapsed
                            ? 'bottom-full left-full ml-2'
                            : 'bottom-full left-4',
                        )}
                      >
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href="/api/auth/logout"
                              className={cn(
                                active ? 'bg-red-100 dark:bg-red-700' : '',
                                'flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-300',
                              )}
                            >
                              <LogOut
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Logout
                            </a>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <Link
                    href="/api/auth/login"
                    className={cn(
                      'flex items-center gap-x-3 text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800',
                      isSidebarCollapsed
                        ? 'justify-center px-2 py-3 h-14'
                        : 'px-4 py-3',
                    )}
                  >
                    <LogIn
                      className={cn(
                        'h-6 w-6',
                        isSidebarCollapsed ? 'text-gray-400' : 'text-gray-400',
                      )}
                    />
                    {!isSidebarCollapsed && 'Login / Register'}
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64',
        )}
      >
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Sidebar;
