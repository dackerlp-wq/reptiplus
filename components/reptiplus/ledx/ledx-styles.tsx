/** Styly stránky Profi osvětlení (LEDX) — scoped pod `.ledx`. */
export const LEDX_CSS = `
.ledx{--cream:#f5f1e6;--paper:#fffdf7;--panel:#faf6ea;--panel-2:#f1ecdc;--line:#e5dfcc;--line-soft:#ece6d5;--ink:#222a1a;--charcoal:#464d3a;--muted:#8a9075;--dim:#a7ab98;--forest:#5a8a24;--forest-deep:#3f6417;--moss:#6b7f3a;--gold:#bb861f;--gold-light:#d8a94a;--glow:rgba(187,134,31,.14);--glow-green:rgba(119,173,46,.16);--sh-sm:0 1px 2px rgba(40,44,25,.05);--sh:0 2px 6px rgba(40,44,25,.05),0 16px 40px -18px rgba(40,44,25,.22);--serif:var(--font-fraunces),Georgia,serif;--sans:var(--font-inter),system-ui,sans-serif;--mono:var(--font-jetbrains),ui-monospace,Menlo,monospace;--r:14px;--r-lg:22px;background:var(--cream);color:var(--charcoal);font-family:var(--sans);line-height:1.65}
:root[data-theme="dark"] .ledx{--cream:#15180e;--paper:#1d2113;--panel:#1a1e11;--panel-2:#232819;--line:#2f3521;--line-soft:#272d1b;--ink:#eef1e2;--charcoal:#c6c9b5;--muted:#8b9177;--dim:#6d735c;--forest:#8fc63f;--forest-deep:#a6d658;--moss:#8aa04a;--gold:#d8a94a;--gold-light:#e6c069;--glow:rgba(216,169,74,.12);--glow-green:rgba(143,198,63,.13);--sh:0 2px 6px rgba(0,0,0,.3),0 18px 46px -18px rgba(0,0,0,.6)}
.ledx *{box-sizing:border-box}
.ledx img{display:block;max-width:100%}
.ledx a{color:inherit;text-decoration:none}
.ledx .shell{max-width:1160px;margin:0 auto;padding:0 24px}
.ledx h1,.ledx h2{font-family:var(--serif);color:var(--ink);letter-spacing:-.02em;font-weight:600}
.ledx .kicker{font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--forest);display:inline-flex;align-items:center;gap:10px}
.ledx .kicker.gold{color:var(--gold)}
.ledx .kicker::before{content:"";width:22px;height:2px;border-radius:2px;background:currentColor;opacity:.8}
.ledx .btn{display:inline-flex;align-items:center;gap:9px;padding:13px 22px;border-radius:999px;font-size:14.5px;font-weight:600;border:1.5px solid transparent;cursor:pointer;font-family:var(--sans);transition:transform .12s,filter .2s,border-color .2s,box-shadow .3s}
.ledx .btn svg{width:15px;height:15px}
.ledx .btn.primary{background:var(--forest);color:#fff}
:root[data-theme="dark"] .ledx .btn.primary{color:#15180e}
.ledx .btn.primary:hover{filter:brightness(1.05);transform:translateY(-2px);box-shadow:0 14px 32px -14px rgba(90,138,36,.7)}
.ledx .btn.primary:disabled{opacity:.6;cursor:default;transform:none}
.ledx .btn.ghost{border-color:rgba(255,255,255,.5);color:#fff}
.ledx .btn.ghost:hover{border-color:#fff;background:rgba(255,255,255,.1)}
.ledx .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.ledx .pill-order{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:var(--glow);border:1px solid var(--gold-light);color:var(--gold);font-size:12.5px;font-weight:600}
.ledx .pill-order::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--gold)}
.ledx .hero{padding:22px 0 0}
.ledx .hero-card{position:relative;border-radius:var(--r-lg);overflow:hidden;min-height:540px;display:flex;align-items:flex-end;box-shadow:var(--sh)}
.ledx .hero-card>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ledx .hero-veil{position:absolute;inset:0;background:radial-gradient(90% 80% at 80% 15%,rgba(216,169,74,.18),transparent 55%),linear-gradient(180deg,rgba(18,22,10,.32),rgba(18,22,10,.1) 35%,rgba(15,18,9,.84) 88%)}
.ledx .hero-inner{position:relative;padding:42px 42px 44px;max-width:760px}
@media(max-width:600px){.ledx .hero-inner{padding:26px 22px 28px}.ledx .hero-card{min-height:500px}}
.ledx .hero-inner .kicker{color:var(--gold-light)}
.ledx .hero h1{font-size:clamp(32px,5.4vw,58px);line-height:1.05;color:#fff;margin:18px 0 0;text-wrap:balance}
.ledx .hero h1 em{font-style:italic;color:var(--gold-light)}
.ledx .hero .sub{font-size:clamp(15px,1.8vw,19px);color:rgba(255,255,255,.87);margin:16px 0 0;max-width:58ch}
.ledx .hero .pill-order{margin-top:20px;background:rgba(216,169,74,.16);border-color:rgba(216,169,74,.5);color:#f0d79a}
.ledx .btn.ghost.dark{border-color:var(--line);color:var(--forest);background:var(--paper)}
.ledx .btn.ghost.dark:hover{border-color:var(--forest);background:var(--panel)}
.ledx .hero2{padding:34px 0 6px}
.ledx .hero2-grid{position:relative;overflow:hidden;display:grid;grid-template-columns:1.08fr .92fr;gap:40px;align-items:center;background:linear-gradient(135deg,var(--panel) 0%,var(--cream) 60%);border:1px solid var(--line);border-radius:var(--r-lg);padding:52px 48px;box-shadow:var(--sh)}
.ledx .hero2-grid::before{content:"";position:absolute;right:-6%;top:-40%;width:64%;height:180%;background:radial-gradient(circle at 55% 45%,var(--glow),transparent 62%);pointer-events:none}
@media(max-width:820px){.ledx .hero2-grid{grid-template-columns:1fr;padding:32px 24px;gap:22px}}
.ledx .hero2-copy{position:relative;z-index:1}
.ledx .hero2 h1{font-size:clamp(31px,4.8vw,54px);color:var(--ink);line-height:1.05;margin:16px 0 0;text-wrap:balance}
.ledx .hero2 h1 em{font-style:italic;color:var(--gold)}
.ledx .hero2 .sub{font-size:clamp(15px,1.7vw,18px);color:var(--charcoal);margin:16px 0 0;max-width:52ch}
.ledx .hero2 .pill-order{margin-top:18px}
.ledx .hero2-visual{position:relative;display:flex;align-items:center;justify-content:center;min-height:260px}
.ledx .hero2-visual .beam{position:absolute;inset:-10%;background:radial-gradient(circle at 50% 46%,rgba(255,206,120,.55),rgba(255,206,120,.14) 34%,transparent 60%);filter:blur(6px)}
.ledx .hero2-visual img{position:relative;max-height:340px;width:auto;object-fit:contain;filter:drop-shadow(0 26px 46px rgba(30,34,15,.3))}
.ledx .refs{padding:70px 0;border-top:1px solid var(--line)}
.ledx .refs-h{font-size:clamp(26px,3.4vw,38px);margin:14px 0 0}
.ledx .refgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:26px}
@media(max-width:760px){.ledx .refgrid{grid-template-columns:1fr}}
.ledx .refcard{position:relative;margin:0;border-radius:var(--r-lg);overflow:hidden;border:1px solid var(--line);box-shadow:var(--sh);aspect-ratio:4/3}
.ledx .refcard img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
.ledx .refcard:hover img{transform:scale(1.05)}
.ledx .refcard figcaption{position:absolute;left:0;right:0;bottom:0;padding:14px 16px;background:linear-gradient(0deg,rgba(15,18,9,.82),transparent);color:#fff;font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase}
.ledx .ticker{margin-top:14px}
.ledx .trow{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:720px){.ledx .trow{grid-template-columns:1fr 1fr}}
.ledx .stat{background:var(--paper);border:1px solid var(--line);border-radius:var(--r);padding:22px;box-shadow:var(--sh-sm)}
.ledx .stat .n{font-family:var(--mono);font-size:clamp(20px,2.6vw,26px);color:var(--ink);font-variant-numeric:tabular-nums}
.ledx .stat .n b{color:var(--forest);font-weight:600}
.ledx .stat .l{font-size:13px;color:var(--muted);margin-top:7px}
.ledx .intro{padding:74px 0 16px}
.ledx .intro .lead{font-family:var(--serif);font-size:clamp(23px,3.2vw,34px);line-height:1.32;color:var(--ink);max-width:22ch;font-weight:500;margin:16px 0 0}
.ledx .intro .lead .hl{color:var(--forest);font-style:italic}
.ledx .intro p{max-width:60ch;margin:22px 0 0;font-size:16.5px}
.ledx .line{padding:62px 0;border-top:1px solid var(--line)}
.ledx .lgrid{display:grid;grid-template-columns:1.02fr .98fr;gap:52px;align-items:center}
.ledx .line.flip .lgrid{direction:rtl}.ledx .line.flip .lgrid>*{direction:ltr}
@media(max-width:900px){.ledx .lgrid{grid-template-columns:1fr;gap:30px}.ledx .line.flip .lgrid{direction:ltr}}
.ledx .line-no{font-family:var(--mono);font-size:12.5px;color:var(--gold);letter-spacing:.16em}
.ledx .line-h{font-size:clamp(28px,4vw,44px);color:var(--ink);margin:12px 0 0;line-height:1.05}
.ledx .line-h span,.ledx .dtitle span{display:block;font-family:var(--sans);font-size:13px;font-weight:700;letter-spacing:.16em;color:var(--muted);text-transform:uppercase;margin-top:12px}
.ledx .tagline{font-family:var(--serif);font-style:italic;font-size:19px;color:var(--forest);margin:16px 0 0}
.ledx .desc{margin:14px 0 0;font-size:16px;max-width:52ch}
.ledx .hi-specs{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 0}
.ledx .hipill{font-family:var(--mono);font-size:12.5px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:7px 13px}
.ledx .plinth{position:relative;border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:radial-gradient(85% 70% at 50% 34%,var(--glow-green),transparent 62%),var(--panel);aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;padding:34px;box-shadow:var(--sh)}
.ledx .plinth::after{content:"";position:absolute;left:16%;right:16%;bottom:9%;height:20px;border-radius:50%;background:var(--glow);filter:blur(15px)}
.ledx .plinth img{max-height:100%;width:auto;object-fit:contain;filter:drop-shadow(0 18px 30px rgba(30,34,15,.22));position:relative}
.ledx .plinth .tag{position:absolute;top:14px;left:14px;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--forest-deep);background:var(--paper);border:1px solid var(--line);padding:6px 11px;border-radius:999px}
:root[data-theme="dark"] .ledx .plinth .tag{color:var(--forest)}
.ledx .gallery{display:flex;flex-direction:column;gap:12px}
.ledx .thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ledx .thumb{border:1.5px solid var(--line);border-radius:12px;overflow:hidden;background:radial-gradient(80% 70% at 50% 42%,var(--glow-green),transparent 60%),var(--panel);aspect-ratio:1/1;padding:8px;cursor:pointer;transition:border-color .2s,transform .12s,box-shadow .2s}
.ledx .thumb:hover{border-color:var(--forest);transform:translateY(-1px)}
.ledx .thumb.on{border-color:var(--forest);box-shadow:0 0 0 2px color-mix(in srgb,var(--forest) 30%,transparent)}
.ledx .thumb img{width:100%;height:100%;object-fit:contain}
.ledx .apps{padding:66px 0;border-top:1px solid var(--line)}
.ledx .apps h2{font-size:clamp(26px,3.4vw,38px);margin:14px 0 0}
.ledx .tagcloud{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.ledx .tagcloud span{padding:10px 17px;border:1px solid var(--line);border-radius:999px;font-size:14px;color:var(--charcoal);background:var(--paper)}
.ledx .cta{padding:34px 0 78px}
.ledx .cta .box{position:relative;overflow:hidden;border-radius:var(--r-lg);padding:60px 40px;text-align:center;background:linear-gradient(140deg,var(--forest-deep),var(--forest) 70%,var(--moss));box-shadow:var(--sh)}
.ledx .cta .box::after{content:"";position:absolute;inset:0;background:radial-gradient(60% 100% at 50% -10%,rgba(216,169,74,.28),transparent 60%)}
.ledx .cta .in{position:relative;z-index:1}
.ledx .cta .kicker{color:var(--gold-light);justify-content:center}
.ledx .cta h2{color:#fff;font-size:clamp(27px,4vw,42px);margin:14px auto 0;max-width:18ch}
.ledx .cta p{color:rgba(255,255,255,.9);max-width:54ch;margin:16px auto 0;font-size:16.5px}
.ledx .cta .cta-row{justify-content:center}
.ledx .cta .btn.primary{background:var(--gold);color:#241a06}
.ledx .backlink{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--muted);margin:24px 0 0}
.ledx .backlink:hover{color:var(--forest)}
.ledx .dhero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:center;padding:20px 0 8px}
@media(max-width:900px){.ledx .dhero-grid{grid-template-columns:1fr;gap:30px}}
.ledx .dtitle{font-size:clamp(36px,5.6vw,60px);color:var(--ink);line-height:1.02;margin:12px 0 0}
.ledx .badge-row{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 0}
.ledx .dlead{font-size:17px;margin:18px 0 0;max-width:52ch}
.ledx .dsection{padding:56px 0;border-top:1px solid var(--line)}
.ledx .dsection.alt{background:var(--panel);border-bottom:1px solid var(--line)}
.ledx .dh2{font-size:clamp(23px,3vw,32px);margin:0}
.ledx .sec-sub{max-width:60ch;margin:12px 0 0;color:var(--muted);font-size:15.5px}
.ledx .tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-lg);margin-top:26px;box-shadow:var(--sh);background:var(--paper)}
.ledx table{width:100%;border-collapse:collapse;min-width:640px;font-size:14.5px}
.ledx th,.ledx td{padding:14px 18px;text-align:left;border-bottom:1px solid var(--line-soft)}
.ledx thead th{background:var(--forest);color:#fff;font-family:var(--sans);font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:600}
:root[data-theme="dark"] .ledx thead th{color:#15180e}
.ledx thead th:first-child{background:var(--forest-deep)}
.ledx tbody th{font-weight:600;color:var(--ink);font-size:14px;font-family:var(--sans)}
.ledx tbody td{font-family:var(--mono);color:var(--charcoal);font-variant-numeric:tabular-nums}
.ledx tbody tr:last-child td,.ledx tbody tr:last-child th{border-bottom:0}
.ledx tbody tr:hover td,.ledx tbody tr:hover th{background:var(--panel)}
.ledx .paramgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:26px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden}
@media(max-width:820px){.ledx .paramgrid{grid-template-columns:1fr 1fr}}
.ledx .param{background:var(--paper);padding:16px 18px}
.ledx .param .k{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.ledx .param .v{font-family:var(--mono);font-size:14.5px;color:var(--ink);margin-top:5px;font-variant-numeric:tabular-nums}
.ledx .qwrap{max-width:860px}
.ledx .fs{border:1px solid var(--line);border-radius:var(--r-lg);background:var(--paper);padding:26px 24px 24px;margin-top:22px;box-shadow:var(--sh-sm)}
.ledx .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ledx .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
@media(max-width:640px){.ledx .grid2,.ledx .grid3{grid-template-columns:1fr}}
.ledx .field{display:flex;flex-direction:column;gap:7px}
.ledx .field label{font-size:12.5px;font-weight:600;color:var(--charcoal)}
.ledx .field label .req{color:var(--gold)}
.ledx input,.ledx select,.ledx textarea{font-family:var(--sans);font-size:15px;color:var(--ink);background:var(--cream);border:1.5px solid var(--line);border-radius:11px;padding:11px 13px;width:100%;transition:border-color .2s,box-shadow .2s}
.ledx select{cursor:pointer}
.ledx input:focus,.ledx select:focus,.ledx textarea:focus{outline:none;border-color:var(--forest);box-shadow:0 0 0 3px color-mix(in srgb,var(--forest) 18%,transparent)}
.ledx textarea{resize:vertical;min-height:92px}
.ledx input[readonly]{color:var(--muted);cursor:default}
.ledx .gdpr{display:flex;gap:11px;align-items:flex-start;font-size:13.5px;color:var(--muted);margin-top:16px}
.ledx .gdpr input{width:auto;margin-top:3px;accent-color:var(--forest)}
.ledx .form-err{color:#c0492f;font-size:14px;margin:14px 0 0;font-weight:500}
:root[data-theme="dark"] .ledx .form-err{color:#e0765a}
.ledx .form-actions{margin-top:20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.ledx .form-success{text-align:center;border:1px solid color-mix(in srgb,var(--forest) 40%,var(--line));background:color-mix(in srgb,var(--forest) 8%,var(--paper));border-radius:var(--r-lg);padding:44px 30px;box-shadow:var(--sh);margin-top:22px}
.ledx .form-success .ico{width:54px;height:54px;border-radius:50%;background:var(--forest);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
:root[data-theme="dark"] .ledx .form-success .ico{color:#15180e}
.ledx .form-success .ico svg{width:26px;height:26px}
.ledx .form-success h3{font-family:var(--serif);font-size:23px;color:var(--ink);margin:0;font-weight:600}
.ledx .form-success p{max-width:44ch;margin:12px auto 0;color:var(--charcoal)}
html:has(.ledx){scroll-behavior:smooth}
.ledx [id]{scroll-margin-top:96px}
.ledx .hp{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}
.ledx .gdpr a{color:var(--forest);text-decoration:underline}
.ledx .crumbs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--muted);margin:24px 0 0}
.ledx .crumbs a:hover{color:var(--forest)}
.ledx .others{padding:56px 0 78px;border-top:1px solid var(--line)}
.ledx .othergrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-top:24px}
.ledx .othercard{display:flex;gap:14px;align-items:center;border:1px solid var(--line);border-radius:var(--r);background:var(--paper);padding:14px;box-shadow:var(--sh-sm);transition:border-color .2s,transform .12s}
.ledx .othercard:hover{border-color:var(--forest);transform:translateY(-2px)}
.ledx .othercard .im{width:72px;height:72px;flex-shrink:0;border-radius:10px;background:radial-gradient(80% 70% at 50% 42%,var(--glow-green),transparent 60%),var(--panel);display:flex;align-items:center;justify-content:center;padding:6px}
.ledx .othercard .im img{max-height:100%;width:auto;object-fit:contain}
.ledx .othercard .nm{font-family:var(--serif);font-size:18px;color:var(--ink);font-weight:600;line-height:1.15}
.ledx .othercard .sb{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:4px}
`;

/** Obal stránky s proměnnými a styly LEDX. */
export function LedxShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ledx">
      <style>{LEDX_CSS}</style>
      {children}
    </div>
  );
}
