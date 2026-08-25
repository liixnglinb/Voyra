import React from 'react';

export default function ArticleCover({ article, index, transition = false, className = '' }) {
  return (
    <span
      className={`vr-article-cover vr-article-cover-${article.theme} ${className}`.trim()}
      style={transition ? { viewTransitionName: 'article-cover' } : undefined}
      aria-hidden="true"
    >
      <span className="vr-article-cover-kicker">VOYRA / NOTES</span>
      <span className="vr-article-cover-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="vr-article-cover-shape vr-article-cover-shape-a" />
      <span className="vr-article-cover-shape vr-article-cover-shape-b" />
      <span className="vr-article-cover-line vr-article-cover-line-a" />
      <span className="vr-article-cover-line vr-article-cover-line-b" />
    </span>
  );
}
