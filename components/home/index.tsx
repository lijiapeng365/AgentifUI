'use client';

import { AdminButton } from '@components/admin/admin-button';
import { Button } from '@components/ui/button';
import { LanguageSwitcher } from '@components/ui/language-switcher';
import { PageLoader } from '@components/ui/page-loader';
import { useDynamicTranslations } from '@lib/hooks/use-dynamic-translations';
import { useTheme } from '@lib/hooks/use-theme';
import { createClient } from '@lib/supabase/client';
import { AnimatePresence, motion } from 'framer-motion';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { HomeDynamic } from './home-dynamic';

export function Home() {
  const router = useRouter();
  const { isDark } = useTheme();
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);
  const [useDynamicRender, setUseDynamicRender] = useState(false);
  const staticT = useTranslations('pages.home');
  const { t: dynamicT, isLoading } = useDynamicTranslations({
    sections: ['pages.home'],
  });

  // Enhanced translation function with dynamic/static fallback
  const t = (key: string, params?: Record<string, string | number | Date>) => {
    const dynamicValue = dynamicT(key, 'pages.home', params);
    return dynamicValue || staticT(key, params);
  };

  // Ensure client-side rendering consistency
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we should use dynamic rendering (if dynamic sections data is available)
  useEffect(() => {
    const checkForDynamicData = async () => {
      try {
        // Check if the translation data has sections (indicating dynamic format)
        const homeData = dynamicT('', 'pages.home'); // Get full section data
        if (
          homeData &&
          typeof homeData === 'object' &&
          'sections' in homeData
        ) {
          setUseDynamicRender(true);
        }
      } catch {
        console.log('Using static rendering as fallback');
        setUseDynamicRender(false);
      }
    };

    if (mounted && !isLoading) {
      checkForDynamicData();
    }
  }, [mounted, isLoading, dynamicT]);

  // If dynamic rendering is available and enabled, use it
  if (mounted && !isLoading && useDynamicRender) {
    return <HomeDynamic />;
  }

  const handleStartClick = async () => {
    try {
      // Check if user is logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // User is logged in, jump to chat page
        router.push('/chat');
      } else {
        // User is not logged in, jump to login page
        router.push('/login');
      }
    } catch (error) {
      console.error('Check login status failed:', error);
      // Default jump to login page if error occurs
      router.push('/login');
    }
  };

  const handleLearnMoreClick = () => {
    router.push('/about');
  };

  // Get colors based on theme
  const getColors = () => {
    if (isDark) {
      return {
        titleGradient: 'from-stone-300 to-stone-500',
        textColor: 'text-gray-300',
        cardBg: 'bg-stone-700',
        cardBorder: 'border-stone-600',
        cardShadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
        primaryButton: 'bg-stone-600 hover:bg-stone-500 text-gray-100',
        secondaryButton: 'border-stone-500 text-gray-200 hover:bg-stone-600',
        featureIconBg: 'bg-stone-600',
        featureTextColor: 'text-gray-300',
      };
    } else {
      return {
        titleGradient: 'from-stone-700 to-stone-900',
        textColor: 'text-stone-700',
        cardBg: 'bg-stone-100',
        cardBorder: 'border-stone-200',
        cardShadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.1)]',
        primaryButton: 'bg-stone-800 hover:bg-stone-700 text-gray-100',
        secondaryButton: 'border-stone-400 text-stone-800 hover:bg-stone-200',
        featureIconBg: 'bg-stone-200',
        featureTextColor: 'text-stone-700',
      };
    }
  };

  const colors = getColors();

  // Show loading state while mounting or dynamic translations load
  if (!mounted || isLoading) {
    return <PageLoader />;
  }

  return (
    <AnimatePresence>
      <div className="relative w-full px-4 py-12 sm:px-6 lg:px-8">
        {/* Top-right toolbar: Admin button (left) + Language switcher (right) */}
        {/* Uses absolute positioning with responsive design, hidden on mobile to avoid layout issues */}
        <div className="fixed top-4 right-4 z-50 hidden flex-col items-end gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3 lg:top-6 lg:right-6">
          <AdminButton />
          <LanguageSwitcher variant="floating" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl"
        >
          {/* Main title area */}
          <div className="mb-16 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={`bg-gradient-to-r text-5xl font-bold md:text-6xl ${colors.titleGradient} mb-6 bg-clip-text py-2 leading-normal text-transparent`}
            >
              {t('title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`text-xl md:text-2xl ${colors.textColor} mx-auto max-w-3xl font-light`}
            >
              {t('subtitle')}
            </motion.p>
          </div>

          {/* Feature card area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            {(
              staticT.raw('features') as Array<{
                title: string;
                description: string;
              }>
            ).map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className={`${colors.cardBg} ${colors.cardShadow} border ${colors.cardBorder} flex flex-col items-center rounded-xl p-6 text-center`}
              >
                <div
                  className={`${colors.featureIconBg} mb-4 flex h-12 w-12 items-center justify-center rounded-full`}
                >
                  <span className="text-xl">#{index + 1}</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className={`${colors.featureTextColor} text-sm`}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Button area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-16 flex flex-col justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              className={`${colors.primaryButton} h-auto cursor-pointer rounded-lg px-8 py-3 text-base font-medium transition-all duration-200 hover:scale-105`}
              onClick={handleStartClick}
            >
              {t('getStarted')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`${colors.secondaryButton} h-auto cursor-pointer rounded-lg px-8 py-3 text-base font-medium transition-all duration-200 hover:scale-105`}
              onClick={handleLearnMoreClick}
            >
              {t('learnMore')}
            </Button>
          </motion.div>

          {/* Bottom information */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className={`text-center ${colors.textColor} text-sm`}
          >
            <p>
              {t('copyright.prefix', { year: new Date().getFullYear() })}
              <a
                href="https://github.com/ifLabX/AgentifUI"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-all duration-200 hover:underline hover:opacity-80"
              >
                {t('copyright.linkText')}
              </a>
              {t('copyright.suffix')}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
