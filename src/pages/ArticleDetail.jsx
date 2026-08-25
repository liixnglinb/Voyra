import React, { useLayoutEffect, useRef } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import ArticleCover from '../components/ArticleCover';
import { ARTICLES, getArticle } from '../data/articles';

export default function ArticleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const article = getArticle(slug);

  useLayoutEffect(() => {
    const scroller = rootRef.current?.parentElement;
    if (scroller) scroller.scrollTop = 0;
  }, []);

  if (!article) return <Navigate to="/?tab=articles" replace />;

  const articleIndex = ARTICLES.findIndex((item) => item.slug === article.slug);

  return (
    <article className="vr-article-page" ref={rootRef}>
      <div className="vr-article-page-inner">
        <header className="vr-article-page-top">
          <button className="vr-article-back" type="button" onClick={() => navigate('/?tab=articles')}>
            <ArrowLeft size={17} />
            <span>返回文章</span>
          </button>
          <a href="https://github.com/liixnglinb" target="_blank" rel="noreferrer" className="vr-article-github">
            GitHub <ArrowUpRight size={15} />
          </a>
        </header>

        <main className="vr-article-content">
          <div className="vr-article-detail-cover-wrap">
            <ArticleCover article={article} index={articleIndex} transition className="vr-article-detail-cover" />
          </div>
          <p className="vr-article-detail-date">{article.date}</p>
          <h1>{article.title}</h1>
          <p className="vr-article-detail-lead">{article.desc}</p>
          <div className="vr-article-detail-rule" />
          <div className="vr-article-detail-body">
            {article.sections.map(([heading, body]) => (
              <section key={heading}>
                <h2>{heading}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
        </main>
        <footer className="vr-article-page-footer">VOYRA / 2026</footer>
      </div>
    </article>
  );
}
