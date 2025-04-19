import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'zh-TW'] as const,

  // Used when no locale matches
  defaultLocale: 'en', // Your default locale

  // Optional: localePrefix configuration
  // localePrefix: 'as-needed', // Default: 'always'

  // Optional: domain configuration for domain-based routing
  // domains: [
  //   {
  //     domain: 'example.com',
  //     defaultLocale: 'en'
  //   },
  //   {
  //     domain: 'example.tw',
  //     defaultLocale: 'zh-TW'
  //   }
  // ]
});
