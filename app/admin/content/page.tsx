'use client';

import { AboutEditor } from '@components/admin/content/about-editor';
import { AboutPreview } from '@components/admin/content/about-preview';
import { ContentTabs } from '@components/admin/content/content-tabs';
import { EditorSkeleton } from '@components/admin/content/editor-skeleton';
import { HomePreviewDynamic } from '@components/admin/content/home-preview-dynamic';
import { PreviewToolbar } from '@components/admin/content/preview-toolbar';
import { ResizableSplitPane } from '@components/ui/resizable-split-pane';
import type { SupportedLocale } from '@lib/config/language-config';
import { getCurrentLocaleFromCookie } from '@lib/config/language-config';
import { clearTranslationCache } from '@lib/hooks/use-dynamic-translations';
import { useTheme } from '@lib/hooks/use-theme';
import { TranslationService } from '@lib/services/admin/content/translation-service';
import { useAboutEditorStore } from '@lib/stores/about-editor-store';
import { useHomeEditorStore } from '@lib/stores/home-editor-store';
import type {
  AboutTranslationData,
  PageContent,
} from '@lib/types/about-page-components';
import {
  isDynamicFormat,
  migrateAboutTranslationData,
} from '@lib/types/about-page-components';
import { cn } from '@lib/utils';
import type { HomeTranslationData } from '@lib/utils/data-migration';
import {
  isHomeDynamicFormat,
  migrateHomeTranslationData,
} from '@lib/utils/data-migration';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';

import React, { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';

interface FeatureCard {
  title: string;
  description: string;
}

interface HomePageConfig {
  title: string;
  subtitle: string;
  getStarted: string;
  learnMore: string;
  features: FeatureCard[];
  copyright: {
    prefix: string;
    linkText: string;
    suffix: string;
  };
}

export default function ContentManagementPage() {
  const { isDark } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('pages.admin.content.page');

  // Editor stores for resetting editor state
  const { setPageContent: setAboutPageContent, reset: resetAboutEditor } =
    useAboutEditorStore();
  const { setPageContent: setHomePageContent, reset: resetHomeEditor } =
    useHomeEditorStore();

  const [activeTab, setActiveTab] = useState<'about' | 'home'>('about');
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<
    'desktop' | 'tablet' | 'mobile'
  >('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFullscreenPreview, setShowFullscreenPreview] = useState(false);

  const [aboutTranslations, setAboutTranslations] = useState<Record<
    SupportedLocale,
    AboutTranslationData
  > | null>(null);
  const [originalAboutTranslations, setOriginalAboutTranslations] =
    useState<Record<SupportedLocale, AboutTranslationData> | null>(null);

  const [homeTranslations, setHomeTranslations] = useState<Record<
    SupportedLocale,
    HomeTranslationData
  > | null>(null);
  const [originalHomeTranslations, setOriginalHomeTranslations] =
    useState<Record<SupportedLocale, HomeTranslationData> | null>(null);

  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(
    getCurrentLocaleFromCookie()
  );
  const [supportedLocales, setSupportedLocales] = useState<SupportedLocale[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'about') {
          const translations =
            await TranslationService.getAboutPageTranslations();
          setAboutTranslations(translations);
          setOriginalAboutTranslations(translations);
        } else if (activeTab === 'home') {
          const translations =
            await TranslationService.getHomePageTranslations();
          setHomeTranslations(translations);
          setOriginalHomeTranslations(translations);
        }

        // load language list only when needed
        if (supportedLocales.length === 0) {
          const locales = await TranslationService.getSupportedLanguages();
          setSupportedLocales(locales);
        }
      } catch (error) {
        console.error(`Failed to load ${activeTab} translations:`, error);
        toast.error(t('messages.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [activeTab, supportedLocales.length, t]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'about' || tab === 'home') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const aboutChanged =
      JSON.stringify(aboutTranslations) !==
      JSON.stringify(originalAboutTranslations);
    const homeChanged =
      JSON.stringify(homeTranslations) !==
      JSON.stringify(originalHomeTranslations);
    setHasChanges(aboutChanged || homeChanged);
  }, [
    aboutTranslations,
    originalAboutTranslations,
    homeTranslations,
    originalHomeTranslations,
  ]);

  const handleTabChange = (tab: 'about' | 'home') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'about' && aboutTranslations) {
        await TranslationService.updateAboutPageTranslations(aboutTranslations);
        setOriginalAboutTranslations({ ...aboutTranslations });
      } else if (activeTab === 'home' && homeTranslations) {
        await TranslationService.updateHomePageTranslations(homeTranslations);
        setOriginalHomeTranslations({ ...homeTranslations });
      }

      // clear dynamic translation cache to force refresh on frontend
      clearTranslationCache();

      toast.success(t('messages.saveSuccess'));
    } catch (error) {
      console.error('Save configuration failed:', error);
      toast.error(t('messages.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (activeTab === 'about' && originalAboutTranslations) {
      // Reset page-level state
      setAboutTranslations({ ...originalAboutTranslations });

      // Reset editor state to match the original data
      const currentTranslation = originalAboutTranslations[currentLocale] || {};
      let translation = currentTranslation;

      // Ensure it's in dynamic format
      if (!isDynamicFormat(translation)) {
        translation = migrateAboutTranslationData(translation);
      }

      if (translation.sections) {
        const content: PageContent = {
          sections: translation.sections,
          metadata: translation.metadata || {
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            author: 'admin',
          },
        };

        // Reset the editor state completely - this clears undo/redo stacks
        resetAboutEditor();
        // Set the page content to original state
        setAboutPageContent(content);
      }
    } else if (activeTab === 'home' && originalHomeTranslations) {
      // Reset page-level state for home tab
      setHomeTranslations({ ...originalHomeTranslations });

      // Reset home editor state to match the original data
      const currentTranslation = originalHomeTranslations[currentLocale] || {};
      let translation = currentTranslation;

      // Ensure it's in dynamic format
      if (!isHomeDynamicFormat(translation)) {
        translation = migrateHomeTranslationData(translation);
      }

      if (translation.sections) {
        const content: PageContent = {
          sections: translation.sections,
          metadata: translation.metadata || {
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            author: 'admin',
          },
        };

        // Reset the home editor state completely - this clears undo/redo stacks
        resetHomeEditor();
        // Set the page content to original state
        setHomePageContent(content);
      }
    }
  };

  const handleAboutTranslationsChange = (
    newTranslations: Record<SupportedLocale, AboutTranslationData>
  ) => {
    setAboutTranslations(newTranslations);
  };

  const handleHomeTranslationsChange = (
    newTranslations: Record<SupportedLocale, HomeTranslationData>
  ) => {
    setHomeTranslations(newTranslations);
  };

  const handleFullscreenPreview = () => {
    setShowFullscreenPreview(true);
  };

  const handleCloseFullscreenPreview = () => {
    setShowFullscreenPreview(false);
  };

  const transformToHomePreviewConfig = (
    translations: Record<SupportedLocale, HomeTranslationData> | null,
    locale: SupportedLocale
  ): HomePageConfig | null => {
    const t = translations?.[locale];
    if (!t) return null;

    return {
      title: t.title || '',
      subtitle: t.subtitle || '',
      getStarted: t.getStarted || '',
      learnMore: t.learnMore || '',
      features: t.features || [],
      copyright: t.copyright
        ? {
            prefix: t.copyright.prefix || '',
            linkText: t.copyright.linkText || '',
            suffix: t.copyright.suffix || '',
          }
        : { prefix: '', linkText: '', suffix: '' },
    };
  };

  const homePreviewConfig = transformToHomePreviewConfig(
    homeTranslations,
    currentLocale
  );

  const renderEditor = () => {
    if (isLoading) return <EditorSkeleton />;

    if (activeTab === 'about') {
      return aboutTranslations ? (
        <AboutEditor
          translations={aboutTranslations}
          currentLocale={currentLocale}
          supportedLocales={supportedLocales}
          onTranslationsChange={handleAboutTranslationsChange}
          onLocaleChange={setCurrentLocale}
        />
      ) : (
        <div>{t('loadingEditor.about')}</div>
      );
    }

    if (activeTab === 'home') {
      // Convert HomeTranslationData to AboutTranslationData format for dynamic editing
      const convertedHomeTranslations = homeTranslations
        ? (Object.fromEntries(
            Object.entries(homeTranslations).map(([locale, translation]) => [
              locale,
              isHomeDynamicFormat(translation)
                ? translation
                : migrateHomeTranslationData(translation),
            ])
          ) as Record<SupportedLocale, AboutTranslationData>)
        : null;

      return convertedHomeTranslations ? (
        <AboutEditor
          translations={convertedHomeTranslations}
          currentLocale={currentLocale}
          supportedLocales={supportedLocales}
          onTranslationsChange={newTranslations => {
            // Convert back to HomeTranslationData format
            const convertedBack = Object.fromEntries(
              Object.entries(newTranslations).map(([locale, translation]) => [
                locale,
                translation as HomeTranslationData,
              ])
            ) as Record<SupportedLocale, HomeTranslationData>;
            handleHomeTranslationsChange(convertedBack);
          }}
          onLocaleChange={setCurrentLocale}
        />
      ) : (
        <div>{t('loadingEditor.home')}</div>
      );
    }
    return null;
  };

  const renderPreview = () => {
    if (activeTab === 'about') {
      // Use the most up-to-date translation data that includes real-time edits
      const currentTranslation = aboutTranslations?.[currentLocale];
      return currentTranslation ? (
        <AboutPreview
          translation={currentTranslation}
          previewDevice={previewDevice}
        />
      ) : (
        <div>{t('loadingPreview')}</div>
      );
    }
    if (activeTab === 'home') {
      // Use the most up-to-date home translation data that includes real-time edits
      const currentHomeTranslation = homeTranslations?.[currentLocale];
      return currentHomeTranslation ? (
        <HomePreviewDynamic
          translation={currentHomeTranslation}
          previewDevice={previewDevice}
        />
      ) : (
        <div>{t('loadingPreview')}</div>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        'flex h-[calc(100vh-3rem)] flex-col overflow-hidden',
        isDark ? 'bg-stone-950' : 'bg-stone-100'
      )}
    >
      <div
        className={cn('flex-shrink-0', isDark ? 'bg-stone-900' : 'bg-stone-50')}
      >
        <div className="w-full px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1
                className={cn(
                  'text-xl font-semibold',
                  isDark ? 'text-stone-100' : 'text-stone-900'
                )}
              >
                {t('title')}
              </h1>
              <p
                className={cn(
                  'hidden text-sm md:block',
                  isDark ? 'text-stone-400' : 'text-stone-600'
                )}
              >
                {t('subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!showPreview && (
                <button
                  onClick={() => setShowPreview(true)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm transition-colors',
                    isDark
                      ? 'border border-stone-700 bg-stone-800 text-stone-300 hover:bg-stone-700'
                      : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                  )}
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('showPreview')}</span>
                </button>
              )}
              <ContentTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {showPreview ? (
          <ResizableSplitPane
            storageKey="content-management-split-pane"
            defaultLeftWidth={50}
            minLeftWidth={30}
            maxLeftWidth={70}
            left={
              <div
                className={cn(
                  'flex h-full flex-col',
                  isDark ? 'bg-stone-900' : 'bg-white'
                )}
              >
                <div className="flex-1 overflow-auto px-6">
                  {renderEditor()}
                </div>
                <div
                  className={cn(
                    'flex-shrink-0 p-4',
                    isDark ? 'bg-stone-900' : 'bg-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasChanges && (
                        <div
                          className={cn(
                            'flex items-center gap-2 text-sm',
                            isDark ? 'text-stone-400' : 'text-stone-500'
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-orange-500" />
                          <span>{t('saveActions.hasChanges')}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleReset}
                        disabled={!hasChanges || isSaving}
                        className={cn(
                          'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                          hasChanges && !isSaving
                            ? isDark
                              ? 'text-stone-300 hover:bg-stone-800'
                              : 'text-stone-600 hover:bg-stone-100'
                            : 'cursor-not-allowed text-stone-500'
                        )}
                      >
                        {t('saveActions.reset')}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={cn(
                          'rounded-lg px-6 py-2 text-sm font-medium shadow-sm transition-colors',
                          hasChanges && !isSaving
                            ? isDark
                              ? 'bg-stone-100 text-stone-900 hover:bg-white'
                              : 'bg-stone-900 text-white hover:bg-stone-800'
                            : isDark
                              ? 'cursor-not-allowed bg-stone-700 text-stone-400'
                              : 'cursor-not-allowed bg-stone-300 text-stone-500'
                        )}
                      >
                        {isSaving
                          ? t('saveActions.saving_')
                          : t('saveActions.save')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
            right={
              <div className="flex h-full min-w-0 flex-col">
                <PreviewToolbar
                  activeTab={activeTab}
                  previewDevice={previewDevice}
                  onDeviceChange={setPreviewDevice}
                  showPreview={showPreview}
                  onPreviewToggle={() => setShowPreview(!showPreview)}
                  onFullscreenPreview={handleFullscreenPreview}
                />
                <div className="min-h-0 flex-1 overflow-hidden">
                  {renderPreview()}
                </div>
              </div>
            }
          />
        ) : (
          <div
            className={cn(
              'relative flex-1 overflow-hidden',
              isDark ? 'bg-stone-900' : 'bg-white'
            )}
          >
            <div className="h-full overflow-auto px-6">{renderEditor()}</div>
          </div>
        )}
      </div>

      {showFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="flex h-full flex-col">
            <div
              className={cn(
                'flex flex-shrink-0 items-center justify-between px-4 py-3',
                isDark ? 'bg-stone-800/50' : 'bg-white/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full',
                    isDark ? 'bg-stone-600' : 'bg-stone-400'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-stone-300' : 'text-stone-700'
                  )}
                >
                  {t('fullscreenPreview')} -
                  {activeTab === 'about'
                    ? aboutTranslations?.[currentLocale]?.title || 'About'
                    : homePreviewConfig?.title}
                </span>
              </div>
              <button
                onClick={handleCloseFullscreenPreview}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  isDark
                    ? 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                )}
              >
                {t('closePreview')}
              </button>
            </div>
            <div className="flex-1 overflow-auto">{renderPreview()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
