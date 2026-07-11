/**
 * Zoopark Zájezd Vouchers — pokladní UI (skener QR + ověření + hromadné uplatnění).
 *
 * Port prémiového rozhraní z původního pluginu "Zoo Voucher Checker", rozšířený
 * o práci se dvěma zdroji dat najednou:
 *   - source "zoo" … nové vouchery z tabulky wp_zoo_vouchers
 *   - source "sky" … starší SkyVerge PDF Product Vouchers (post_type wc_voucher)
 *
 * Každá položka nese vlastní { source, id }, aby uplatnění vědělo, kam zapsat.
 */
(function(){
    'use strict';
    let html5QrCode = null;
    let current = { order_id: null, siblings: [], counts: { total: 0, parking: 0 }, scannedKey: null };
    const PRODUCT_LABELS = {14698:'Dospělý — Do 15:00',14699:'Dospělý — Od 15:00',14696:'Dítě (od 3 let) — Do 15:00',14697:'Dítě (od 3 let) — Od 15:00',14700:'Student / senior — Do 15:00',14701:'Student / senior — Od 15:00',14702:'Dítě (do 3 let) — Do 15:00',14703:'Dítě (do 3 let) — Od 15:00',14704:'Parkování — Do 15:00',14705:'Parkování — Od 15:00'};
    const PARKING_IDS = new Set([14704,14705]);
    const $ = (sel)=>document.querySelector(sel);
    const el = {status:$('#zvc-status'),list:$('#zvc-list'),result:$('#zvc-result'),summary:$('#zvc-summary'),orderInput:$('#zvc-order-input'),orderBtn:$('#zvc-order-find'),codeInput:$('#zvc-code-input'),codeBtn:$('#zvc-code-check'),scanBtn:$('#zvc-start-scan'),scanHelp:$('#zvc-scan-help'),reader:$('#zvc-reader'),redeemAll:$('#zvc-redeem-all')};

    // Klíč položky napříč zdroji: "zoo:123" / "sky:456"
    function itemKey(item){ return (item.source||'zoo')+':'+item.id; }

    function beep(type){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);if(type==='ok'){osc.frequency.setValueAtTime(880,ctx.currentTime);osc.frequency.setValueAtTime(1100,ctx.currentTime+0.1);gain.gain.setValueAtTime(0.18,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.35);osc.start();osc.stop(ctx.currentTime+0.35);}else if(type==='warn'){osc.frequency.setValueAtTime(440,ctx.currentTime);gain.gain.setValueAtTime(0.2,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);osc.start();osc.stop(ctx.currentTime+0.5);}else{osc.type='sawtooth';osc.frequency.setValueAtTime(200,ctx.currentTime);gain.gain.setValueAtTime(0.15,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);osc.start();osc.stop(ctx.currentTime+0.4);}}catch(_){}}

    function setStatus(text,tone){if(!el.status)return;el.status.textContent=text;el.status.className='zvc-statusbar'+(tone?' is-'+tone:'');}
    function isMobileLike(){try{if(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent))return true;return window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;}catch(_){return false;}}
    function isRedeemedToday(item){if(!item.redeemed_at)return false;try{const d=new Date(item.redeemed_at),now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();}catch(_){return false;}}
    function fmtDatetime(iso){if(!iso)return '';try{const d=new Date(iso);const pad=n=>String(n).padStart(2,'0');return`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}catch(_){return iso;}}
    function productLabel(pid,fallback){return PRODUCT_LABELS[Number(pid)]||fallback||('#'+pid);}
    function boxClass(item){const st=(item.status_label||item.status||'').toLowerCase();const isParking=PARKING_IDS.has(Number(item.product_id));if(isRedeemedToday(item)&&!isParking)return 'zvc-box zvc-box-goodtoday';if(st==='redeemed')return 'zvc-box zvc-box-used';if(st==='expired')return 'zvc-box zvc-box-expired';if(st==='cancelled'||st==='voided')return 'zvc-box zvc-box-expired';if(st==='active')return 'zvc-box zvc-box-active';return 'zvc-box';}
    function statusLabel(item){const st=(item.status_label||item.status||'').toLowerCase();const isParking=PARKING_IDS.has(Number(item.product_id));if(isRedeemedToday(item)&&!isParking)return 'Dnes uplatněn';if(st==='active')return 'Aktivní';if(st==='redeemed'||st==='used')return 'Použit';if(st==='expired')return 'Expirovaný';if(st==='cancelled'||st==='voided')return 'Zrušen';return st;}

    function renderSummary(){
        const total=current.counts.total||0;
        const parking=current.counts.parking||0;
        const vstup=Math.max(0,total-parking);
        const activeVstup=current.siblings.filter(x=>!PARKING_IDS.has(Number(x.product_id))&&(x.status_label||x.status||'').toLowerCase()==='active').length;
        const redeemedVstup=current.siblings.filter(x=>!PARKING_IDS.has(Number(x.product_id))&&isRedeemedToday(x)).length;
        el.summary.innerHTML=`<div class="zvc-headline">
            <div class="zvc-pill">
                <div class="zvc-pill-icon">🎟</div>
                <div class="zvc-pill-body"><span>Vstupenky</span><b>${vstup}</b></div>
            </div>
            <div class="zvc-pill zvc-pill-active">
                <div class="zvc-pill-icon">⚡</div>
                <div class="zvc-pill-body"><span>Aktivní</span><b>${activeVstup}</b></div>
            </div>
            <div class="zvc-pill zvc-pill-done">
                <div class="zvc-pill-icon">✓</div>
                <div class="zvc-pill-body"><span>Uplatněno dnes</span><b>${redeemedVstup}</b></div>
            </div>
            <div class="zvc-pill zvc-pill-park">
                <div class="zvc-pill-icon">🅿</div>
                <div class="zvc-pill-body"><span>Parkování</span><b>${parking}</b></div>
            </div>
        </div>`;
    }

    function fmtDate(iso){if(!iso)return '';try{const d=new Date(iso);const pad=n=>String(n).padStart(2,'0');return`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;}catch(_){return iso;}}
    function fmtTime(iso){if(!iso)return '';try{const d=new Date(iso);const pad=n=>String(n).padStart(2,'0');return`${pad(d.getHours())}:${pad(d.getMinutes())}`;}catch(_){return '';}}
    function isTodayIso(iso){if(!iso)return false;try{const d=new Date(iso),now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate();}catch(_){return false;}}
    function rankSort(a,b){const rank=item=>{const st=(item.status_label||item.status||'').toLowerCase();if(st==='active')return 0;if(isRedeemedToday(item))return 1;return 2;};return rank(a)-rank(b);}

    function cardHtml(item,opts){
        opts=opts||{};
        const label=productLabel(item.product_id,item.product);
        const key=itemKey(item);
        const st=(item.status_label||item.status||'').toLowerCase();
        const isActive=st==='active';
        const redeemedToday=isRedeemedToday(item)&&!PARKING_IDS.has(Number(item.product_id));
        const canRedeem=isActive&&item.redeemable!==false;

        let cls=boxClass(item);
        if(opts.scanned) cls+=' zvc-box-scanned';

        // Výrazný baner jen u naskenované vstupenky
        let hero='';
        if(opts.scanned){
            if(redeemedToday){
                hero='<div class="zvc-hero zvc-hero-ok">✓ Vstupenka uplatněna dnes — Vstup povolen</div>';
            }else if(st==='redeemed'||st==='used'){
                hero='<div class="zvc-hero zvc-hero-bad">⚠ Vstupenka již byla uplatněna'+(item.redeemed_at?' '+fmtDate(item.redeemed_at):'')+' — NEPOVOLOVAT vstup</div>';
            }else if(st==='expired'){
                hero='<div class="zvc-hero zvc-hero-bad">✗ Vstupenka je po expiraci</div>';
            }else if(canRedeem){
                hero='<div class="zvc-hero zvc-hero-warn">⚠ Vstupenka zatím NEuplatněna — potvrďte tlačítkem „Uplatnit" ↓</div>';
            }
        }

        const badge=(!opts.scanned&&redeemedToday)?'<div class="zvc-badge-ok">✓ Vstup povolen</div>':'';
        const redAt=item.redeemed_at?'Uplatněno: '+fmtDatetime(item.redeemed_at):'';
        const stLabel=statusLabel(item);
        const redeemBtn=canRedeem
            ?`<button class="zvc-btn-single-redeem" data-key="${key}">⚡ Uplatnit vstupenku</button>`
            :(isActive&&item.redeem_note?`<span class="zvc-noredeem-note">${item.redeem_note}</span>`:'');
        return`<div class="${cls}" data-key="${key}">
            ${hero}
            <div class="zvc-row-top">
                <div class="zvc-code">${item.number||''}</div>
                <div class="zvc-status-badge">${stLabel}</div>
            </div>
            <div class="zvc-product">${label}</div>
            <div class="zvc-row-bot">
                <div class="zvc-meta">${redAt}</div>
                ${redeemBtn}
            </div>
            ${badge}
        </div>`;
    }

    function renderList(){
        if(!current.siblings.length){
            el.list.innerHTML='<div class="zvc-empty">Žádné vstupenky v objednávce.</div>';
            el.result.style.display='block';
            return;
        }
        let rest=[...current.siblings];
        let scanned=null;
        if(current.scannedKey){
            const idx=rest.findIndex(x=>itemKey(x)===current.scannedKey);
            if(idx>=0) scanned=rest.splice(idx,1)[0];
        }
        rest.sort(rankSort);

        let html='';
        if(scanned){
            html+=cardHtml(scanned,{scanned:true});
            if(rest.length) html+='<div class="zvc-section-sub">Další vstupenky v objednávce</div>';
        }
        html+=rest.map(it=>cardHtml(it,{})).join('');
        el.list.innerHTML=html;
        el.result.style.display='block';

        // Připoj listenery na jednotlivá tlačítka Uplatnit
        el.list.querySelectorAll('.zvc-btn-single-redeem').forEach(btn=>{
            btn.addEventListener('click', async function(){
                const key=this.dataset.key;
                if(!key) return;
                this.disabled=true;
                this.textContent='…';
                await redeemItems([key]);
            });
        });
    }

    // Rozloží "source:id" na {source,id}
    function parseKey(key){const idx=String(key).indexOf(':');if(idx<0)return{source:'zoo',id:parseInt(key,10)};return{source:String(key).slice(0,idx),id:parseInt(String(key).slice(idx+1),10)};}

    async function redeemItems(keys){
        const items=keys.map(parseKey).filter(x=>x.id);
        if(!items.length){setStatus('Žádné položky k uplatnění.','warn');return;}
        setStatus(items.length>1?('Uplatňuji '+items.length+' poukazů…'):'Uplatňuji voucher…','');
        try{
            const res=await fetch(ZVC.restBase+'/redeem',{
                method:'POST',
                headers:{'Content-Type':'application/json','X-WP-Nonce':ZVC.nonce},
                body:JSON.stringify({items})
            });
            const data=await res.json();
            if(data&&data.ok){
                setStatus('✓ Uplatněno '+((data.updated||[]).length)+' vstupenek. Vstup povolen.','ok');
                beep('ok');
            }else{
                setStatus('Chyba při uplatnění.','err');
                beep('error');
            }
            // U jednotlivého potvrzení nech vstupenku zvýrazněnou (zelený „Vstup povolen")
            const keep=(items.length===1)?(items[0].source+':'+items[0].id):null;
            if(current.order_id) fetchByOrder(current.order_id,keep);
        }catch(e){setStatus('Chyba spojení: '+e.message,'err');beep('error');}
    }

    async function fetchByOrder(orderId,keepScannedKey){setStatus('Hledám objednávku…','');try{const res=await fetch(ZVC.restBase+'/order?order_id='+encodeURIComponent(orderId),{headers:{'X-WP-Nonce':ZVC.nonce}});const data=await res.json();if(!data.ok){setStatus(data.message||'Objednávka nenalezena.','err');beep('error');el.list.innerHTML='';return;}current.order_id=data.group.order_id||null;current.counts=data.group.counts||{total:0,parking:0};current.siblings=Array.isArray(data.siblings)?data.siblings:[];current.scannedKey=keepScannedKey||null;renderSummary();renderList();if(!keepScannedKey){setStatus('Objednávka #'+current.order_id+' — '+current.siblings.length+' vstupenek','ok');beep('ok');}}catch(e){setStatus('Chyba spojení: '+e.message,'err');beep('error');}}

    async function checkCode(code){if(!code){setStatus('Zadej kód voucheru.','warn');return;}setStatus('Ověřuji…','');try{const res=await fetch(ZVC.restBase+'/check-voucher',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':ZVC.nonce},body:JSON.stringify({code})});const data=await res.json();if(data&&data.siblings&&data.group){current.order_id=data.group.order_id||null;current.counts=data.group.counts||{total:0,parking:0};current.siblings=Array.isArray(data.siblings)?data.siblings:[];current.scannedKey=data.scanned||null;renderSummary();renderList();const vi=data.voucher||{};const ra=vi.redeemed_at;if(data.status==='ready'){setStatus('⚠ Vstupenka platná — NEuplatněna. Potvrďte tlačítkem „Uplatnit".','warn');beep('warn');}else if(data.status==='noredeem'){setStatus('ℹ '+(data.message||'Tento voucher se na pokladně neuplatňuje.'),'warn');beep('warn');}else if(data.status==='used'){if(ra&&isTodayIso(ra)){setStatus('✓ Vstupenka uplatněna DNES v '+fmtTime(ra)+' — Vstup povolen','ok');beep('ok');}else{setStatus('🔴 Vstupenka již byla uplatněna'+(ra?' '+fmtDate(ra):'')+' — NEPOVOLOVAT vstup','err');beep('error');}}else if(data.status==='expired'){setStatus('🔴 Vstupenka vypršela'+(vi.expires?' '+vi.expires:''),'err');beep('error');}else{setStatus((data.message||'Voucher nenalezen.'),'err');beep('error');}}else{setStatus((data&&data.message)||'Voucher nenalezen.','err');beep('error');}if(el.codeInput)el.codeInput.value='';}catch(e){setStatus('Chyba spojení: '+e.message,'err');beep('error');}}

    async function redeemAll(){const actives=current.siblings.filter(x=>x.redeemable!==false&&(x.status_label||x.status||'').toLowerCase()==='active').map(itemKey);if(!actives.length){alert('Žádné aktivní vstupenky k uplatnění.');return;}const count=actives.length;if(!confirm(`Opravdu uplatnit VŠECH ${count} aktivních poukazů v objednávce #${current.order_id}?`))return;await redeemItems(actives);}

    function startScanner(){try{html5QrCode=new Html5Qrcode('zvc-reader');el.reader.style.display='block';html5QrCode.start({facingMode:'environment'},{fps:10,qrbox:260},async(decodedText)=>{await html5QrCode.stop();html5QrCode.clear();el.reader.style.display='none';checkCode(decodedText.trim());},(_)=>{}).then(()=>{setStatus('Skenuji — namiř kameru na QR kód…','');if(el.scanBtn)el.scanBtn.textContent='Zastavit skener';}).catch(e=>{setStatus('Nelze spustit kameru: '+e,'err');});}catch(e){setStatus('Kamera není podporována v tomto prohlížeči.','err');}}

    function init(){if(isMobileLike()&&el.scanBtn){el.scanBtn.style.display='inline-block';if(el.scanHelp)el.scanHelp.style.display='block';}setStatus('Připraveno — zadej ID objednávky nebo naskenuj voucher.','');el.orderBtn&&el.orderBtn.addEventListener('click',()=>{const v=String(el.orderInput.value||'').trim();if(!/^[0-9]+$/.test(v)){setStatus('Zadej platné číslo objednávky.','warn');return;}fetchByOrder(v);});el.orderInput&&el.orderInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();el.orderBtn.click();}});el.codeBtn&&el.codeBtn.addEventListener('click',()=>{checkCode(String(el.codeInput.value||'').trim());});el.codeInput&&el.codeInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();el.codeBtn.click();}});el.scanBtn&&el.scanBtn.addEventListener('click',startScanner);el.redeemAll&&el.redeemAll.addEventListener('click',redeemAll);}

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
