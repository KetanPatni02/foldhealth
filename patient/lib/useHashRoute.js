import { useEffect, useState } from 'react';

const read = (fallback) => window.location.hash.replace(/^#\/?/, '').split('/')[0] || fallback;

export function useHashRoute(fallback) {
  const [route, setRoute] = useState(() => read(fallback));
  useEffect(() => {
    const onChange = () => setRoute(read(fallback));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [fallback]);
  return [route, (next) => { window.location.hash = `/${next}`; }];
}
