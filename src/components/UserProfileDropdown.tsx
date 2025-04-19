'use client';

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // Assuming you have this utility
import { useTranslations, useLocale } from 'next-intl'; // Import useTranslations and useLocale
import { useRouter, usePathname, Link as CustomLink } from '@/i18n/navigation'; // Import routing hooks directly from next/navigation
import {
  Sun, // Icon for light mode
  Moon, // Icon for dark mode
  User, // Default user icon
  LogOut, // Logout icon
  MessageSquare, // Icon for Contact Us (example)
  Settings, // Add Settings icon
  ChevronDown, // Optional: indicator for dropdown
  Globe, // Add Globe icon for language
  Check, // Add Check icon for selected language
} from 'lucide-react';
import type { UserProfile } from '@auth0/nextjs-auth0/client'; // Import UserProfile type
import { routing } from '@/i18n/routing'; // Import the routing object which contains locales and defaultLocale

interface UserProfileDropdownProps {
  user: UserProfile;
}

export default function UserProfileDropdown({
  user,
}: UserProfileDropdownProps) {
  const t = useTranslations('UserProfileDropdown'); // Initialize translations
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname(); // Gets the path *without* locale
  const currentLocale = useLocale();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Determine display name: prefer name, fallback to email, then 'User'
  const displayName = user.name || user.email || 'User';

  const changeLocale = (newLocale: (typeof routing.locales)[number]) => {
    // Use router.replace provided by next-intl/navigation
    // It automatically handles the locale
    router.replace(pathname, { locale: newLocale });
    // Note: The second argument { locale: newLocale } IS supported by the router from createNavigation
  };

  return (
    <Menu as="div" className="relative inline-block text-left w-full">
      <div>
        <Menu.Button className="group w-full rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
          <div className="flex w-full items-center justify-between">
            <div className="flex min-w-0 items-center justify-between space-x-3">
              {user.picture ? (
                <Image
                  className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-300"
                  src={user.picture}
                  alt={displayName}
                  width={32}
                  height={32}
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </span>
              )}
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {displayName}
              </span>
            </div>
            {/* Optional: Add dropdown indicator */}
            {/* <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" /> */}
          </div>
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
        <Menu.Items className="absolute bottom-full left-0 mb-2 w-56 origin-bottom-left divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-1 py-1 ">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={toggleTheme}
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                    active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  {theme === 'dark' ? (
                    <Sun className="mr-2 h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Moon className="mr-2 h-5 w-5" aria-hidden="true" />
                  )}
                  {theme === 'dark' ? t('toggleToLight') : t('toggleToDark')}
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <CustomLink
                  href="/settings"
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                    active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  <Settings className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('settings')}
                </CustomLink>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <CustomLink
                  href="#" // Placeholder link
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                    active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  <MessageSquare className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('contactUs')}
                </CustomLink>
              )}
            </Menu.Item>
          </div>
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => changeLocale('en')}
                  disabled={currentLocale === 'en'}
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                    active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300',
                    currentLocale === 'en'
                      ? 'opacity-50 cursor-not-allowed'
                      : '',
                  )}
                >
                  <Globe className="mr-2 h-5 w-5" aria-hidden="true" />
                  English
                  {currentLocale === 'en' && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => changeLocale('zh-TW')}
                  disabled={currentLocale === 'zh-TW'}
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm',
                    active
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300',
                    currentLocale === 'zh-TW'
                      ? 'opacity-50 cursor-not-allowed'
                      : '',
                  )}
                >
                  <Globe className="mr-2 h-5 w-5" aria-hidden="true" />
                  繁體中文
                  {currentLocale === 'zh-TW' && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </button>
              )}
            </Menu.Item>
          </div>
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="/api/auth/logout"
                  className={cn(
                    'group flex w-full items-center rounded-md px-2 py-2 text-sm text-red-600 dark:text-red-500',
                    active ? 'bg-red-50 dark:bg-red-900/20' : '',
                  )}
                >
                  <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                  {t('logout')}
                </a>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
