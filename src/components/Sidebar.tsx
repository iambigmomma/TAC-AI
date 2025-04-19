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
  User,
  LogIn,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import React, { type ReactNode } from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import UserProfileDropdown from './UserProfileDropdown';
import { headers } from 'next/headers';
import { useTranslations } from 'next-intl';
// Re-comment HistorySection import due to unresolved path
// import HistorySection from './HistorySection';

const Sidebar = async ({ children }: { children: React.ReactNode }) => {
  // Initialize translations for the 'Sidebar' namespace
  const t = useTranslations('Sidebar');

  const session = await getSession();
  const user = session?.user;

  // Get pathname from headers inside the component
  const headersList = await headers();
  const pathnameHeader =
    headersList.get('x-next-pathname') || headersList.get('next-url'); // Fallback for different environments
  const currentPathname = pathnameHeader
    ? new URL(pathnameHeader, 'http://localhost').pathname
    : '/'; // Parse URL to get pathname

  // Comment out HistorySection state logic as well if it existed
  // const isHistoryOpen = true; // Assuming this was related

  const getLinkClasses = (href: string, isExact = true) => {
    // Add safety check: Ensure currentPathname is a string before using string methods
    const safePathname =
      typeof currentPathname === 'string' ? currentPathname : '/';

    const isActive = isExact
      ? safePathname === href // Use safePathname
      : safePathname.startsWith(href); // Use safePathname
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
                  {t('search')}
                  <span className="ml-auto inline-block whitespace-nowrap rounded border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    ⌘K
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  href="/favorites"
                  className={getLinkClasses('/favorites')}
                >
                  <Star className="mr-3 h-5 w-5 flex-shrink-0" />
                  {t('favorites')}
                </Link>
              </li>
              {user && (
                <li>
                  <Link href="/history" className={getLinkClasses('/history')}>
                    <History className="mr-3 h-5 w-5 flex-shrink-0" />
                    {t('history')}
                  </Link>
                </li>
              )}
              <li className="-mx-4 border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto">
                {user ? (
                  <div className="px-1 py-1">
                    <UserProfileDropdown user={user} />
                  </div>
                ) : (
                  <div className="px-4 py-2">
                    <a
                      href="/api/auth/login"
                      className={getLinkClasses('/api/auth/login', false)}
                    >
                      <LogIn className="mr-3 h-5 w-5 flex-shrink-0" />
                      {t('loginRegister')}
                    </a>
                  </div>
                )}
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
