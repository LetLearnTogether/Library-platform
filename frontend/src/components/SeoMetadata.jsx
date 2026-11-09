import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const siteUrl = 'https://letlearntogetther.com';
const defaultDescription = 'Find past exam papers, assignments, quizzes, and study resources for students and educators in Liberia.';

const publicPages = {
  '/': {
    title: 'LetLearnTogether | Student Past Papers, Quizzes & Study Resources',
    description: 'Find past exam papers, assignments, quizzes, and study resources for students and educators in Liberia. Learn, practice, and grow with LetLearnTogether.',
  },
  '/about': {
    title: 'About LetLearnTogether | Learning Resources in Liberia',
    description: 'Learn how LetLearnTogether helps students and educators in Liberia find academic resources, past papers, and online quizzes.',
  },
  '/quizzes': {
    title: 'Online Practice Quizzes | LetLearnTogether',
    description: 'Explore online practice quizzes and study resources for students in Liberia with LetLearnTogether.',
  },
};

function updateMeta(attribute, value, content) {
  let element = document.head.querySelector(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.append(element);
  }
  element.content = content;
}

export default function SeoMetadata() {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    const page = !user && !loading ? publicPages[pathname] : null;
    const title = page?.title || 'LetLearnTogether';
    const description = page?.description || defaultDescription;
    const canonicalUrl = `${siteUrl}${page ? pathname : '/'}`;
    const robots = page ? 'index, follow' : 'noindex, nofollow';

    document.title = title;
    updateMeta('name', 'description', description);
    updateMeta('name', 'robots', robots);
    updateMeta('name', 'googlebot', robots);
    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:url', canonicalUrl);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
  }, [loading, pathname, user]);

  return null;
}
