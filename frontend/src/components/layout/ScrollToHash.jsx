
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;

    const targetId = decodeURIComponent(hash.slice(1));
    let secondFrame;

    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const target = document.getElementById(targetId);

        target?.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        });
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);

      if (secondFrame !== undefined) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [pathname, hash]);

  return null;
}

export default ScrollToHash;
