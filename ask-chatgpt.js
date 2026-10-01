/* Public-page question handoff. No API, account token, storage or page-body collection. */
(function () {
  'use strict';
  const products = {
    menufits: {
      name: 'MenuFits', origin: 'https://menufits.kokokikaku.com', accent: '#1e1c17', soft: '#f7f5f0',
      ja: { title: 'メニューづくり、もう少し詳しく。', intro: '使い方の疑問を、自分のChatGPTに聞いてみる。', about: 'ブラウザで飲食店のメニューを編集し、A4のPDFを作るツール。無料で試せる範囲と買い切りProがある。料金と機能は公式ページで確認する。', questions: ['初めてメニューを作る手順を教えて', '料理名や価格を更新するときのコツは？', '無料でできることとProの違いは？'], guides: [['使い方', '/guide.html'], ['よくある質問', '/faq.html'], ['料金・機能', '/pro.html']] },
      en: { title: 'A little help with your next menu.', intro: 'Take a question to your own ChatGPT.', about: 'A browser-based restaurant menu editor with A4 PDF output, a free tier and a one-time Pro upgrade. Check the official pages for current features and pricing.', questions: ['How do I make my first menu?', 'How can I keep menu prices easy to update?', 'What can I do for free, and what needs Pro?'], guides: [['Getting started', '/en/'], ['Features and pricing', '/en/']] }
    },
    misefits: {
      name: 'MiseFits', origin: 'https://misefits.kokokikaku.com', accent: '#0066cc', soft: '#e8f2ff',
      ja: { title: '配置の疑問を、ひとつずつ。', intro: '使い方や寸法の考え方を、自分のChatGPTに聞いてみる。', about: 'PDF・画像の図面や白紙の上に、什器を実寸mmで配置するブラウザツール。通路幅や席数を検討できる。法令適合や設計の保証を行うものではない。', questions: ['図面を読み込んで縮尺を合わせるには？', '通路幅や什器の寸法はどう考える？', '配置を保存して見直す手順を教えて'], guides: [['使い方', '/guide.html'], ['よくある質問', '/faq.html'], ['什器の寸法', '/fixture-sizes.html']] },
      en: { title: 'Think through your space.', intro: 'Ask your own ChatGPT about the tool and planning basics.', about: 'A browser tool for placing fixtures at real dimensions in mm on a PDF/image floor plan or a blank sheet. It helps explore layouts; it does not certify building-code compliance or replace a qualified designer.', questions: ['How do I import a floor plan and set its scale?', 'How should I think about aisles and fixture sizes?', 'How do I save and revisit a layout?'], guides: [['Getting started', '/en/'], ['Restaurant floor plans', '/en/restaurant-floor-plan.html'], ['Fixture sizes', '/en/fixture-sizes.html']] }
    },
    pitch: {
      name: 'ピッチの辞書 / PITCH DICTIONARY', origin: 'https://pitch.kokokikaku.com', accent: '#111c36', soft: '#fff8df',
      ja: { title: 'そのプレー、もう少し知りたい。', intro: '用語や戦術の見方を、自分のChatGPTで深める。', about: 'サッカーの用語を短い説明と独自の動く戦術ボードで学べる日英の無料辞書。', questions: ['このページの用語を初心者向けに説明して', '実際のプレーを見るときの注目点は？', '関連する用語も比べながら教えて'], guides: [['用語一覧', '/terms/'], ['英語の用語一覧', '/en/terms/']] },
      en: { title: 'Read the game a little deeper.', intro: 'Explore football terms with your own ChatGPT.', about: 'A free bilingual football glossary with short explanations and original animated tactics boards.', questions: ['Explain the term on this page for a beginner', 'What should I watch for during a match?', 'Compare this with related football terms'], guides: [['Football glossary', '/en/terms/'], ['Japanese glossary', '/terms/']] }
    },
    kabufits: {
      name: 'KabuFits', origin: 'https://kabufits.com', accent: '#0f6e6a', soft: '#eaf6f3',
      ja: { title: 'わからない言葉を、学びに変える。', intro: '用語や制度の一般的な説明を、自分のChatGPTに聞く。', about: '初心者向けの資産運用の学習サイト。用語・制度・架空例の体験ツールを提供する。個別銘柄の推奨や売買判断、個人向けの投資助言は提供しない。', questions: ['このページの内容を初心者向けに説明して', '用語の違いを架空の例で教えて', '理解を確かめる練習問題を出して'], guides: [['はじめる', '/start/'], ['用語集', '/glossary/'], ['制度と税金', '/rules/']] }
    },
    kininarumono: {
      name: '気になるモノ手帖', origin: 'https://kininarumono.jp', accent: '#003eba', soft: '#e4ecff',
      ja: { title: '気になる理由を、言葉にしてみる。', intro: '読みものや選び方を、自分のChatGPTで考える。', about: '日々の暮らしをデザインの視点で見つめる、雑貨・インテリア・ファッションなどのキュレーション媒体。掲載情報は購入や効果を保証するものではなく、現在の仕様は販売元で確認する。', questions: ['このページの選び方のポイントを整理して', '暮らしに取り入れるときの考え方は？', '関連する読みものを探したい'], guides: [['読みもの', '/read/'], ['運営について', '/about']] }
    },
    company: {
      name: 'スタジオここ企画 / Studio Kokokikaku', origin: 'https://kokokikaku.com', accent: '#1d1b1a', soft: '#fdefd8',
      ja: { title: 'ここ企画のサービスを、もっと知る。', intro: '製品の使い分けや記事を、自分のChatGPTに聞いてみる。', about: 'スタジオここ企画の会社・製品紹介サイト。MiseFits、MenuFits、ピッチの辞書などの公開サービスと、業務支援の情報を掲載。問い合わせは公式フォームから行う。', questions: ['MiseFitsとMenuFitsはどう使い分ける？', '自分に合う公開サービスを知りたい', 'このページの内容をわかりやすく説明して'], guides: [['Webサービス', '/services/web'], ['特集記事', '/column/']] },
      en: { title: 'Find the right tool for your idea.', intro: 'Explore our public products with your own ChatGPT.', about: 'Studio Kokokikaku builds browser-based tools including MiseFits, MenuFits and PITCH DICTIONARY. Use the official contact form for inquiries.', questions: ['How are MiseFits and MenuFits different?', 'Which public tool fits my needs?', 'Explain this page in plain language'], guides: [['Products', '/en/']] }
    }
  };
  const ui = {
    ja: { ask: 'ChatGPTに聞く', eyebrow: 'QUESTION GUIDE', heading: '何を知りたいですか？', close: '閉じる', choose: '質問を選ぶ', question: '質問文', placeholder: '聞きたいことを書いてもOK', preview: 'コピーする内容を見る', copy: '1. 質問をコピー', open: '2. ChatGPTを開く ↗', help: 'コピーした文面をChatGPTに貼り付けて送信してください。ログインや利用上限はご自身のアカウントに準じます。', privacy: 'コピーするのは質問文と公開ページの案内です。入力済みのメニュー・図面・学習記録は含みません。', copied: 'コピーしました。ChatGPTで貼り付けて送信できます。', failed: 'コピーできませんでした。下の文面を選択してコピーしてください。', empty: '質問を選ぶか、質問文を入力してください。', manual: '手動コピー用の文面', links: '公式ページで読む', external: 'ChatGPT（外部サービス）に移動します。', terms: 'AIの回答は、元のページと照らし合わせて確認してください。' },
    en: { ask: 'Ask ChatGPT', eyebrow: 'QUESTION GUIDE', heading: 'What would you like to know?', close: 'Close', choose: 'Choose a question', question: 'Your question', placeholder: 'Or write your own question', preview: 'Preview what will be copied', copy: '1. Copy question', open: '2. Open ChatGPT ↗', help: 'Paste the copied text into ChatGPT and send it. Sign-in and usage limits depend on your own account.', privacy: 'Only your question and public page references are copied. Your menu, floor plan and saved learning records are not included.', copied: 'Copied. Paste it into ChatGPT and send when ready.', failed: 'Could not copy. Select and copy the text below instead.', empty: 'Choose a question or enter your own.', manual: 'Text to copy manually', links: 'Read the official guides', external: 'Opens ChatGPT, an external service.', terms: 'Check AI answers against the original pages.' }
  };
  function cleanUrl(value, product) {
    try {
      const url = new URL(value, product.origin);
      if (url.protocol !== 'https:' || url.origin !== product.origin || url.username || url.password) return product.origin + '/';
      url.search = ''; url.hash = '';
      return url.href;
    } catch (_) { return product.origin + '/'; }
  }
  function makePrompt(productId, language, pageUrl, question) {
    const p = products[productId];
    if (!p) throw new Error('Unknown public product');
    const en = language === 'en' && !!p.en;
    const copy = en ? p.en : p.ja;
    const q = String(question || '').trim().slice(0, 600);
    const refs = [[en ? 'Current page' : '今見ている公開ページ', cleanUrl(pageUrl, p)], ...copy.guides.map(([label, path]) => [label, cleanUrl(path, p)])];
    return [
      en ? `My question about ${p.name}: ${q}` : `${p.name}についての質問：${q}`,
      '', copy.about, '',
      en ? 'Official public sources:' : '公式の公開情報：',
      ...refs.map(([label, url]) => `${label}: ${url}`), '',
      en ? 'Read the relevant sources if available. Explain simply and link back to the actual official page for each key point. If you cannot access a source, say so; distinguish general background from facts verified on these pages. Do not invent product features, prices or links.' : '参照できる範囲で公式ページを読み、初心者にもわかるように説明してください。主な説明には対応する公式ページへのリンクを添えてください。ページを読めない場合はその旨を伝え、一般論と確認できた事実を区別してください。機能・料金・URLを推測で補わないでください。',
      productId === 'kabufits' ? '一般的な学習の説明に限り、銘柄の推奨・売買判断や個別の投資相談には踏み込まないでください。' : ''
    ].filter((line, i, arr) => line !== '' || arr[i - 1] !== '').join('\n').trim();
  }
  function pageContext(productId, language, href, canonical) {
    const p = products[productId];
    const current = new URL(href);
    let url = cleanUrl(canonical || p.origin + current.pathname, p);
    if (language === 'en' && current.pathname === '/') url = p.origin + '/en/';
    return url;
  }
  async function copyPrompt(write, prompt) {
    if (!write) return false;
    try { await write(prompt); return true; } catch (_) { return false; }
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { products, makePrompt, cleanUrl, pageContext, copyPrompt };
    return;
  }
  const script = document.currentScript;
  const productId = script && script.dataset.product;
  const product = products[productId];
  if (!product) return;
  const style = `
  .koko-ask,.koko-ask-dialog{box-sizing:border-box;color:#20242c;font:inherit;line-height:1.65;text-align:left;letter-spacing:normal}
  .koko-ask *, .koko-ask-dialog *{box-sizing:border-box}
  .koko-ask{width:calc(100% - 32px);max-width:960px;margin:32px auto;padding:24px 28px;background:var(--ask-soft);border:1px solid var(--ask-accent);border-radius:12px;display:flex;align-items:center;gap:24px;justify-content:space-between}
  .koko-ask p{margin:4px 0 0;font-size:14px}.koko-ask h2{font:inherit;font-size:clamp(19px,3vw,24px);font-weight:750;margin:4px 0;color:#20242c;line-height:1.4}
  .koko-ask small,.koko-ask-dialog small{display:block;font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--ask-accent)}
  .koko-ask button,.koko-ask-dialog button,.koko-ask-dialog a.koko-ask-open{appearance:none;font:inherit;cursor:pointer;min-height:44px;border-radius:8px;padding:10px 16px;line-height:1.4;text-decoration:none}
  .koko-ask button,.koko-ask-copy{background:var(--ask-accent);border:1px solid var(--ask-accent);color:#fff;font-weight:700;white-space:nowrap}
  .koko-ask-dialog{width:min(620px,calc(100% - 24px));max-height:calc(100dvh - 40px);padding:26px;border:1px solid #d6d9df;border-radius:16px;background:#fff;box-shadow:0 24px 72px #10182844;overflow:auto;overscroll-behavior:contain;position:fixed;margin:auto}
  .koko-ask-dialog::backdrop{background:#15202b88}
  .koko-ask-dialog h2{font:inherit;font-size:24px;font-weight:750;margin:6px 0 12px;line-height:1.35;color:inherit;padding-right:58px}
  .koko-ask-close{position:absolute;right:14px;top:14px;background:transparent;color:inherit;border:1px solid #d6d9df;font-size:12px!important}
  .koko-ask-dialog>small{padding-right:74px;overflow-wrap:anywhere}
  .koko-ask-questions{display:grid;gap:8px;margin:12px 0 18px}
  .koko-ask-questions button{width:100%;text-align:left;background:var(--ask-soft);border:1px solid #d6d9df;color:#20242c;white-space:normal}
  .koko-ask-questions button[aria-pressed=true]{border-color:var(--ask-accent);box-shadow:inset 4px 0 var(--ask-accent);font-weight:700}
  .koko-ask-dialog label{font-size:13px;font-weight:700;display:block;margin:0 0 6px}
  .koko-ask-dialog textarea{display:block;font:inherit;font-size:16px;line-height:1.5;background:#fff;color:#20242c;border:1px solid #9ba3af;border-radius:8px;padding:12px;width:100%;max-width:100%;min-height:88px;resize:vertical;text-align:left}
  .koko-ask-dialog details{font-size:13px;margin:14px 0}.koko-ask-dialog summary{cursor:pointer;min-height:44px;padding:10px 0;font-weight:700}
  .koko-ask-dialog pre{font:inherit;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f5f7;padding:12px;border-radius:8px;color:#303844}
  .koko-ask-actions{display:flex;flex-wrap:wrap;gap:10px}.koko-ask-dialog a.koko-ask-open{background:#fff;border:1px solid var(--ask-accent);color:var(--ask-accent);display:inline-flex;align-items:center;font-weight:700}
  .koko-ask-dialog a{color:var(--ask-accent)}.koko-ask-status{font-size:13px;min-height:1.7em;margin:10px 0;color:var(--ask-accent);font-weight:700}
  .koko-ask-help,.koko-ask-privacy{font-size:12px;margin:8px 0;color:#46505f}.koko-ask-links{border-top:1px solid #d6d9df;padding-top:14px;margin-top:18px;font-size:13px;display:flex;gap:12px;flex-wrap:wrap}.koko-ask-links a{min-height:44px;display:inline-flex;align-items:center;text-underline-offset:3px}.koko-ask-links b{flex-basis:100%}
  .koko-ask-dialog [hidden]{display:none!important}.koko-ask button:focus-visible,.koko-ask-dialog :is(button,a,textarea,summary):focus-visible{outline:3px solid var(--ask-accent);outline-offset:3px}
  .koko-ask-app-trigger{min-height:44px!important;color:var(--ask-accent)!important;border-color:var(--ask-accent)!important}
  .koko-ask-app-row{margin-top:8px;min-width:0}.koko-ask-app-row .koko-ask-app-trigger{width:100%;white-space:normal!important}
  .koko-threads-share{display:inline-flex!important;align-items:center;justify-content:center;min-height:40px;padding:8px 14px;border:1px solid currentColor;border-radius:8px;color:inherit!important;background:transparent;font:inherit;font-size:13px;font-weight:700;text-decoration:none!important;line-height:1.3;white-space:nowrap;flex-shrink:0}
  .koko-threads-share:hover{opacity:.75}.koko-threads-share:focus-visible{outline:3px solid currentColor;outline-offset:3px}
  .share[data-share] .koko-threads-share{border-radius:999px;border-width:1.5px;background:var(--paper);font-family:var(--jp,inherit);font-weight:900}
  [data-page-share] .koko-threads-share{background:var(--surface);border-color:var(--line);border-radius:var(--radius-sm);color:var(--ink)!important}
  .koko-ask[data-product=kininarumono],.koko-ask-dialog[data-product=kininarumono]{border-radius:6px;box-shadow:4px 4px 0 #282039}
  .koko-ask[data-product=kininarumono] h2,.koko-ask-dialog[data-product=kininarumono] h2{font-family:var(--jp,inherit);font-weight:900}
  .koko-ask[data-product=company],.koko-ask-dialog[data-product=company]{border-top:4px solid #ff5a3c}
  @media(max-width:600px){.koko-ask{padding:20px;display:block;margin-block:24px}.koko-ask button{margin-top:16px;width:100%}.koko-ask-dialog{padding:20px}.koko-ask-actions>*{width:100%;justify-content:center;text-align:center}.koko-ask-dialog h2{font-size:21px}}
  @media(prefers-reduced-motion:reduce){.koko-ask,.koko-ask-dialog,.koko-ask-dialog *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
  `;
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function mount() {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots && /noindex/i.test(robots.content)) return;
    if (/\/(?:pro-unlock|404|google[^/]*)(?:\.html|\/|$)/i.test(location.pathname)) return;
    if (document.querySelector('.koko-ask,.koko-ask-dialog')) return;
    const footer = document.querySelector('footer');
    if (!footer || typeof HTMLDialogElement === 'undefined') return;
    const en = !!product.en && /^en/i.test(document.documentElement.lang);
    const language = en ? 'en' : 'ja', words = ui[language], content = product[language];
    const canonical = document.querySelector('link[rel="canonical"]');
    const page = pageContext(productId, language, location.href, canonical && canonical.href);
    const theme = `--ask-accent:${product.accent};--ask-soft:${product.soft}`;
    const css = element('style'); css.textContent = style; css.dataset.kokoAskStyle = 'true'; document.head.append(css);
    const root = element('section', 'koko-ask'); root.dataset.product = productId; root.setAttribute('aria-label', words.ask); root.style.cssText = theme;
    const intro = element('div'); intro.append(element('small', '', words.eyebrow), element('h2', '', content.title), element('p', '', content.intro));
    const trigger = element('button', '', words.ask + ' ↗'); trigger.type = 'button'; trigger.setAttribute('aria-haspopup', 'dialog');
    root.append(intro, trigger); footer.before(root);
    const dialog = element('dialog', 'koko-ask-dialog'); dialog.dataset.product = productId; dialog.style.cssText = theme; dialog.id = 'koko-ask-dialog'; dialog.setAttribute('aria-labelledby', 'koko-ask-title');
    trigger.setAttribute('aria-controls', dialog.id);
    const close = element('button', 'koko-ask-close', words.close); close.type = 'button';
    const title = element('h2', '', words.heading); title.id = 'koko-ask-title';
    dialog.append(close, element('small', '', product.name), title);
    const questions = element('div', 'koko-ask-questions'); questions.setAttribute('role', 'group'); questions.setAttribute('aria-label', words.choose);
    const label = element('label', '', words.question); label.htmlFor = 'koko-ask-question';
    const input = element('textarea'); input.id = 'koko-ask-question'; input.maxLength = 600; input.rows = 3; input.placeholder = words.placeholder; input.value = content.questions[0];
    const questionButtons = content.questions.map((q, i) => {
      const button = element('button', '', q); button.type = 'button'; button.setAttribute('aria-pressed', String(i === 0)); questions.append(button);
      button.addEventListener('click', () => { input.value = q; update(); }); return button;
    });
    const details = element('details'); const summary = element('summary', '', words.preview); const preview = element('pre'); details.append(summary, preview);
    const actions = element('div', 'koko-ask-actions'); const copy = element('button', 'koko-ask-copy', words.copy); copy.type = 'button';
    const open = element('a', 'koko-ask-open', words.open); open.href = 'https://chatgpt.com/'; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.referrerPolicy = 'no-referrer'; open.setAttribute('aria-label', words.open + ' — ' + words.external);
    actions.append(copy, open);
    const status = element('p', 'koko-ask-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const manualLabel = element('label', '', words.manual); manualLabel.htmlFor = 'koko-ask-manual'; manualLabel.hidden = true;
    const manual = element('textarea'); manual.id = 'koko-ask-manual'; manual.readOnly = true; manual.rows = 8; manual.hidden = true;
    const links = element('nav', 'koko-ask-links'); links.setAttribute('aria-label', words.links); links.append(element('b', '', words.links));
    content.guides.forEach(([text, path]) => { const a = element('a', '', text); a.href = cleanUrl(path, product); links.append(a); });
    dialog.append(questions, label, input, details, actions, status, manualLabel, manual, element('p', 'koko-ask-help', words.help), element('p', 'koko-ask-privacy', words.privacy), element('p', 'koko-ask-help', words.terms), links);
    document.body.append(dialog);
    function update() {
      preview.textContent = makePrompt(productId, language, page, input.value);
      questionButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(input.value === content.questions[i])));
      status.textContent = ''; manual.hidden = true; manualLabel.hidden = true;
    }
    input.addEventListener('input', update); update();
    let lastTrigger = trigger;
    function show(event) { lastTrigger = event.currentTarget; dialog.showModal(); }
    trigger.addEventListener('click', show);
    const help = productId === 'menufits' && document.getElementById('helpBtn');
    const spaceGuide = productId === 'misefits' && document.querySelector('.sidebar-intro .intro-guide');
    let appTrigger = null;
    let appRow = null;
    if (help || spaceGuide) {
      appTrigger = element('button', (spaceGuide ? 'intro-guide' : 'btn') + ' koko-ask-app-trigger', words.ask);
      appTrigger.type = 'button'; appTrigger.style.cssText = theme;
      appTrigger.setAttribute('aria-haspopup', 'dialog'); appTrigger.setAttribute('aria-controls', dialog.id);
      if (spaceGuide) {
        appTrigger.style.width = '100%'; spaceGuide.after(appTrigger); root.remove();
      } else {
        appRow = element('div', 'koko-ask-app-row'); appRow.append(appTrigger);
        (help.closest('.row') || help).after(appRow);
      }
      appTrigger.addEventListener('click', show);
    }
    // Share only published references. Never include editor state, query strings or fragments.
    // Meta's documented web intent opens a composer; the visitor chooses whether to post.
    function addThreads() {
      if (typeof document === 'undefined') return;
      const selectors = { menufits: '.lpshare,.site-sns-share', misefits: '.foot-share,.site-sns-share', pitch: '.share,.tshare,.mshare', kabufits: '[data-page-share]', kininarumono: '.share[data-share]', company: '.site-sns-share' };
      document.querySelectorAll(selectors[productId]).forEach(bar => {
        let share = bar.querySelector('.koko-threads-share');
        if (!share) {
          share = element('a', 'koko-threads-share', 'Threads');
          share.target = '_blank'; share.rel = 'noopener noreferrer'; share.referrerPolicy = 'no-referrer';
          const status = bar.querySelector('[role="status"]');
          if (status) status.before(share); else bar.append(share);
        }
        const intent = new URL('https://www.threads.com/intent/post');
        intent.searchParams.set('url', cleanUrl(bar.dataset.url || page, product));
        intent.searchParams.set('text', String(bar.dataset.title || document.querySelector('meta[property="og:title"]')?.content || product.name).slice(0, 280));
        if (share.href !== intent.href) share.href = intent.href;
        share.setAttribute('aria-label', en ? 'Share on Threads (opens a new window)' : 'Threadsでシェア（新しいウィンドウで開きます）');
      });
    }
    addThreads();
    const shareObserver = new MutationObserver(addThreads);
    if (productId === 'pitch') shareObserver.observe(document.body, { childList: true, subtree: true });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => lastTrigger.focus());
    copy.addEventListener('click', async () => {
      if (!input.value.trim()) { status.textContent = words.empty; input.focus(); return; }
      copy.disabled = true;
      const text = makePrompt(productId, language, page, input.value);
      const writer = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText.bind(navigator.clipboard) : null;
      const ok = await copyPrompt(writer, text); copy.disabled = false;
      if (ok) { status.textContent = words.copied; open.focus(); }
      else { status.textContent = words.failed; manualLabel.hidden = false; manual.hidden = false; manual.value = text; manual.focus(); manual.select(); }
    });
    const observer = new MutationObserver(() => {
      const nextEn = !!product.en && /^en/i.test(document.documentElement.lang);
      if (nextEn === en) return;
      observer.disconnect(); shareObserver.disconnect(); dialog.remove(); root.remove(); css.remove();
      if (appRow) appRow.remove(); else if (appTrigger) appTrigger.remove();
      document.querySelectorAll('.koko-threads-share').forEach(a => a.remove()); mount();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
