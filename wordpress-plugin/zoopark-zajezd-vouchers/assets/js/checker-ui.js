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
    const el = {status:$('#zvc-status'),list:$('#zvc-list'),result:$('#zvc-result'),summary:$('#zvc-summary'),orderInput:$('#zvc-order-input'),orderBtn:$('#zvc-order-find'),codeInput:$('#zvc-code-input'),codeBtn:$('#zvc-code-check'),scanBtn:$('#zvc-start-scan'),scanHelp:$('#zvc-scan-help'),reader:$('#zvc-reader'),redeemAll:$('#zvc-redeem-all'),actions:$('#zvc-actions-bottom')};

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

    // Jednotný stav naskenované vstupenky — barva + text pro baner i horní řádek
    function scannedState(item){
        const st=(item.status_label||item.status||'').toLowerCase();
        if(st==='active'){
            if(item.redeemable!==false)
                return {cls:'zvc-hero-ok', text:'✓ Vstupenka je v pořádku — nezapomeňte „Uplatnit"', tone:'ok', beep:'ok'};
            return {cls:'zvc-hero-ok', text:'✓ '+(item.redeem_note||'Platné — opakovaný vstup'), tone:'ok', beep:'ok'};
        }
        if(st==='redeemed'||st==='used'){
            if(isRedeemedToday(item))
                return {cls:'zvc-hero-ok', text:'✓ Vstupenka uplatněna DNES'+(item.redeemed_at?' v '+fmtTime(item.redeemed_at):'')+' — Vstup povolen', tone:'ok', beep:'ok'};
            return {cls:'zvc-hero-bad', text:'Vstupenka již uplatněna'+(item.redeemed_at?' '+fmtDate(item.redeemed_at):'')+' — VSTUP NEPOVOLEN', tone:'err', beep:'error'};
        }
        if(st==='expired') return {cls:'zvc-hero-bad', text:'Vstupenka vypršela — VSTUP NEPOVOLEN', tone:'err', beep:'error'};
        return {cls:'zvc-hero-bad', text:'Vstupenka neplatná — VSTUP NEPOVOLEN', tone:'err', beep:'error'};
    }

    function cardHtml(item,opts){
        opts=opts||{};
        const label=productLabel(item.product_id,item.product);
        const key=itemKey(item);
        const st=(item.status_label||item.status||'').toLowerCase();
        const isActive=st==='active';
        const redeemedToday=isRedeemedToday(item)&&!PARKING_IDS.has(Number(item.product_id));
        const canRedeem=isActive&&item.redeemable!==false;

        // Naskenovaná karta: neutrální rámeček, barvu nese baner (scannedState)
        let cls=opts.scanned?'zvc-box zvc-box-scanned':boxClass(item);

        // Výrazný baner jen u naskenované vstupenky
        let hero='';
        if(opts.scanned){
            const s=scannedState(item);
            hero='<div class="zvc-hero '+s.cls+'">'+s.text+'</div>';
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

    // Aktivní uplatnitelné vstupenky (pro tlačítko „Uplatnit vše" + souhrn)
    function activeRedeemable(){
        return current.siblings.filter(x=>x.redeemable!==false&&(x.status_label||x.status||'').toLowerCase()==='active');
    }
    function updateBulkButton(){
        const act=activeRedeemable();
        if(!el.actions) return;
        if(act.length>=2){
            el.actions.style.display='block';
            if(el.redeemAll) el.redeemAll.textContent='⚡ Uplatnit všechny aktivní vstupenky ('+act.length+')';
        }else{
            el.actions.style.display='none';
        }
    }

    function renderList(){
        if(!current.siblings.length){
            el.list.innerHTML='<div class="zvc-empty">Žádné vstupenky v objednávce.</div>';
            el.result.style.display='block';
            updateBulkButton();
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
        updateBulkButton();
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

    async function fetchByOrder(orderId,keepScannedKey){setStatus('Hledám objednávku…','');try{const res=await fetch(ZVC.restBase+'/order?order_id='+encodeURIComponent(orderId),{headers:{'X-WP-Nonce':ZVC.nonce}});const data=await res.json();if(!data.ok){setStatus(data.message||'Objednávka nenalezena.','err');beep('error');el.list.innerHTML='';return;}current.order_id=data.group.order_id||null;current.counts=data.group.counts||{total:0,parking:0};current.siblings=Array.isArray(data.siblings)?data.siblings:[];current.scannedKey=keepScannedKey||null;renderSummary();renderList();if(keepScannedKey){const _si=current.siblings.find(x=>itemKey(x)===keepScannedKey);if(_si){const s=scannedState(_si);setStatus(s.text,s.tone);beep(s.beep);}}else{setStatus('Objednávka #'+current.order_id+' — '+current.siblings.length+' vstupenek','ok');beep('ok');}}catch(e){setStatus('Chyba spojení: '+e.message,'err');beep('error');}}

    async function checkCode(code){
        if(lock){setStatus('Nejdřív dokončete aktuální vstupenku — Uplatnit nebo Zrušit.','warn');return;}
        if(!code){setStatus('Zadej kód voucheru.','warn');return;}
        setStatus('Ověřuji…','');
        try{
            const res=await fetch(ZVC.restBase+'/check-voucher',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':ZVC.nonce},body:JSON.stringify({code})});
            const data=await res.json();
            if(el.codeInput)el.codeInput.value='';
            if(data&&data.siblings&&data.group){
                current.order_id=data.group.order_id||null;current.counts=data.group.counts||{total:0,parking:0};
                current.siblings=Array.isArray(data.siblings)?data.siblings:[];current.scannedKey=data.scanned||null;
                renderSummary();renderList();
                const si=current.scannedKey?current.siblings.find(x=>itemKey(x)===current.scannedKey):null;
                if(si&&(si.status_label||si.status||'').toLowerCase()==='active'&&si.redeemable!==false){
                    beep('warn');showPending(si);                       // uplatnitelná → vyžádat rozhodnutí (blokuje další sken)
                }else if(si){
                    const s=scannedState(si);beep(s.beep);showInfo(s.cls,s.text);   // použitá / expirovaná / permanentka
                }else if(data.status==='noredeem'){
                    beep('warn');showInfo('zvc-hero-warn','ℹ '+(data.message||'Tento voucher se na pokladně neuplatňuje.'));
                }else{
                    beep('error');showInfo('zvc-hero-bad',data.message||'Voucher nenalezen.');
                }
            }else{
                beep('error');showInfo('zvc-hero-bad',(data&&data.message)||'Voucher nenalezen.');
            }
        }catch(e){setStatus('Chyba spojení: '+e.message,'err');beep('error');}
    }

    async function redeemAll(){
        const items=activeRedeemable();
        if(!items.length){alert('Žádné aktivní vstupenky k uplatnění.');return;}
        // Souhrn po typech — pokladní ověří u zákazníka, než uplatní vše naráz
        const groups={};
        items.forEach(it=>{const label=productLabel(it.product_id,it.product);groups[label]=(groups[label]||0)+1;});
        const lines=Object.keys(groups).map(k=>'   • '+groups[k]+'× '+k).join('\n');
        const msg='OVĚŘTE U ZÁKAZNÍKA:\n\nChcete dnes uplatnit všechny tyto vstupy?\n\n'
            +lines+'\n\nCelkem: '+items.length+' vstupenek\n\n'
            +'Potvrdit uplatnění VŠECH naráz?';
        if(!confirm(msg))return;
        await redeemItems(items.map(itemKey));
    }

    function stopScanner(){try{if(html5QrCode){html5QrCode.stop().then(()=>{try{html5QrCode.clear();}catch(_){}}).catch(()=>{});}}catch(_){}el.reader.style.display='none';if(el.scanBtn)el.scanBtn.textContent='📷 QR';}

    function startScanner(){
        // Přesná diagnostika místo obecného „nepodporováno"
        if(typeof Html5Qrcode==='undefined'){setStatus('Skener se nenačetl — obnovte stránku (na mobilu potáhněte dolů / Ctrl+F5).','err');beep('warn');return;}
        if(!window.isSecureContext){setStatus('Kamera funguje jen přes zabezpečené https:// spojení. Otevřete stránku přes https.','err');beep('warn');return;}
        if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){setStatus('Tento prohlížeč nepovoluje přístup ke kameře.','err');beep('warn');return;}
        try{
            html5QrCode=new Html5Qrcode('zvc-reader');
            el.reader.style.display='block';
            html5QrCode.start({facingMode:'environment'},{fps:10,qrbox:260},async(decodedText)=>{await html5QrCode.stop();try{html5QrCode.clear();}catch(_){}el.reader.style.display='none';if(el.scanBtn)el.scanBtn.textContent='📷 QR';checkCode(decodedText.trim());},(_)=>{})
              .then(()=>{setStatus('Skenuji — namiř kameru na QR kód…','');if(el.scanBtn)el.scanBtn.textContent='✕ Zastavit skener';})
              .catch(e=>{el.reader.style.display='none';const m=String((e&&e.name)||e||'');if(m.indexOf('NotAllowed')>=0)setStatus('Přístup ke kameře byl zamítnut. Povolte kameru pro tuto stránku v prohlížeči.','err');else if(m.indexOf('NotFound')>=0||m.indexOf('Overconstrained')>=0)setStatus('Nenalezena žádná kamera.','err');else setStatus('Nelze spustit kameru: '+m,'err');beep('warn');});
        }catch(e){setStatus('Kameru nelze spustit: '+((e&&e.message)||e),'err');beep('warn');}
    }

    function toggleScanner(){if(el.reader&&el.reader.style.display==='block'){stopScanner();setStatus('Skener zastaven.','');}else{startScanner();}}

    /* ─────────── Blokující rozhodnutí (Uplatnit / Zrušit) + potvrzení ─────────── */
    let lock=false;

    function modalLayer(){
        let m=document.getElementById('zvc-modal');
        if(!m){m=document.createElement('div');m.id='zvc-modal';m.className='zvc-modal';m.style.display='none';m.innerHTML='<div class="zvc-modal-card" id="zvc-modal-card"></div>';document.body.appendChild(m);}
        return m;
    }
    function openModal(html){const m=modalLayer();document.getElementById('zvc-modal-card').innerHTML=html;m.style.display='flex';}
    function closeModal(){const m=document.getElementById('zvc-modal');if(m)m.style.display='none';}

    function setLocked(dis){[el.codeInput,el.orderInput,el.codeBtn,el.orderBtn].forEach(x=>{if(x)x.disabled=dis;});}
    function lockScanning(){lock=true;if(el.reader&&el.reader.style.display==='block')stopScanner();setLocked(true);}
    function resetAll(){current={order_id:null,siblings:[],counts:{total:0,parking:0},scannedKey:null};el.summary.innerHTML='';el.list.innerHTML='';el.result.style.display='none';if(el.actions)el.actions.style.display='none';}
    function finishReset(){resetAll();lock=false;setLocked(false);closeModal();setStatus('Připraveno — načtěte další vstupenku.','');if(el.codeInput)el.codeInput.focus();}

    // Uplatnitelná vstupenka → vynucené rozhodnutí, blokuje další sken
    function showPending(item){
        lockScanning();
        setStatus('⚠ ROZHODNĚTE: Uplatnit vstupenku, nebo Zrušit.','warn');
        const html='<div class="zvc-hero zvc-hero-ok">✓ VSTUPENKA JE V POŘÁDKU</div>'
            +'<div class="zvc-m-body">'
            +'<div class="zvc-m-code">'+(item.number||'')+'</div>'
            +'<div class="zvc-m-type">'+productLabel(item.product_id,item.product)+'</div>'
            +'<p class="zvc-m-instr">Pro vpuštění návštěvníka klikněte na <b>Uplatnit</b>. Dokud nerozhodnete, nelze načíst další.</p>'
            +'<div class="zvc-m-btns">'
            +'<button class="zvc-m-btn zvc-m-cancel" id="zvc-m-cancel">✕ Zrušit</button>'
            +'<button class="zvc-m-btn zvc-m-ok" id="zvc-m-ok">⚡ Uplatnit vstupenku</button>'
            +'</div></div>';
        openModal(html);
        document.getElementById('zvc-m-cancel').onclick=function(){setStatus('Uplatnění zrušeno.','');finishReset();};
        document.getElementById('zvc-m-ok').onclick=async function(){
            const b=this;b.disabled=true;b.textContent='Uplatňuji…';
            try{
                const res=await fetch(ZVC.restBase+'/redeem',{method:'POST',headers:{'Content-Type':'application/json','X-WP-Nonce':ZVC.nonce},body:JSON.stringify({items:[{source:item.source||'zoo',id:item.id}]})});
                const data=await res.json();
                if(data&&data.ok&&(data.updated||[]).length){beep('ok');showDone([item]);}
                else{beep('error');b.disabled=false;b.textContent='⚡ Uplatnit vstupenku';alert('Uplatnění se nezdařilo, zkuste znovu.');}
            }catch(e){beep('error');b.disabled=false;b.textContent='⚡ Uplatnit vstupenku';alert('Chyba spojení: '+e.message);}
        };
    }

    // Potvrzení po uplatnění + seznam uplatněných → OK připraví na další sken
    function showDone(list){
        const rows=list.map(it=>'<div class="zvc-done-row"><span class="zvc-done-code">'+(it.number||'')+'</span><span class="zvc-done-type">'+productLabel(it.product_id,it.product)+'</span></div>').join('');
        const html='<div class="zvc-hero zvc-hero-ok">✓ UPLATNĚNO — VSTUP POVOLEN</div>'
            +'<div class="zvc-m-body"><div class="zvc-done-list">'+rows+'</div>'
            +'<p class="zvc-m-instr">Uplatněno '+list.length+' vstupenek. Klikněte OK a načtěte další.</p>'
            +'<div class="zvc-m-btns"><button class="zvc-m-btn zvc-m-ok" id="zvc-m-done">OK — DALŠÍ</button></div></div>';
        openModal(html);
        setStatus('✓ Uplatněno. Připraveno na další.','ok');
        document.getElementById('zvc-m-done').onclick=function(){finishReset();};
    }

    // Neuplatnitelný výsledek (použitá/expirovaná/permanentka/nenalezeno) → potvrdit OK
    function showInfo(heroCls,text){
        lockScanning();
        const html='<div class="zvc-hero '+heroCls+'">'+text+'</div>'
            +'<div class="zvc-m-body"><div class="zvc-m-btns"><button class="zvc-m-btn zvc-m-ok" id="zvc-m-info">OK — DALŠÍ</button></div></div>';
        openModal(html);
        document.getElementById('zvc-m-info').onclick=function(){finishReset();};
    }

    /* ─────────── Vestavěný zámek stránky (bez WP cookies) ─────────── */
    function initGate(cb){
        const code=(ZVC.gateCode||'').trim();
        if(!code){cb();return;}
        try{if(localStorage.getItem('zvc_gate_ok')==='1'){cb();return;}}catch(_){}
        const ov=document.createElement('div');ov.className='zvc-gate';
        ov.innerHTML='<div class="zvc-gate-card"><div class="zvc-gate-icon">🔒</div><h2>Přístup k pokladně</h2>'
            +'<p>Zadejte přístupový kód.</p>'
            +'<input type="password" id="zvc-gate-input" autocomplete="off" autocapitalize="off" placeholder="Kód…">'
            +'<button id="zvc-gate-btn">Vstoupit</button>'
            +'<div id="zvc-gate-err" class="zvc-gate-err"></div></div>';
        document.body.appendChild(ov);
        const inp=ov.querySelector('#zvc-gate-input'),btn=ov.querySelector('#zvc-gate-btn'),err=ov.querySelector('#zvc-gate-err');
        function tryOpen(){
            if(inp.value===code){try{localStorage.setItem('zvc_gate_ok','1');}catch(_){}ov.parentNode&&ov.parentNode.removeChild(ov);cb();}
            else{err.textContent='Nesprávný kód.';inp.value='';inp.focus();}
        }
        btn.addEventListener('click',tryOpen);
        inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();tryOpen();}});
        inp.focus();
    }

    function init(){if(isMobileLike()&&el.scanBtn){el.scanBtn.style.display='inline-block';if(el.scanHelp)el.scanHelp.style.display='block';}setStatus('Připraveno — zadej ID objednávky nebo naskenuj voucher.','');el.orderBtn&&el.orderBtn.addEventListener('click',()=>{const v=String(el.orderInput.value||'').trim();if(!/^[0-9]+$/.test(v)){setStatus('Zadej platné číslo objednávky.','warn');return;}fetchByOrder(v);});el.orderInput&&el.orderInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();el.orderBtn.click();}});el.codeBtn&&el.codeBtn.addEventListener('click',()=>{checkCode(String(el.codeInput.value||'').trim());});el.codeInput&&el.codeInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();el.codeBtn.click();}});el.scanBtn&&el.scanBtn.addEventListener('click',toggleScanner);el.redeemAll&&el.redeemAll.addEventListener('click',redeemAll);if(el.codeInput)el.codeInput.focus();}

    function boot(){initGate(init);}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
