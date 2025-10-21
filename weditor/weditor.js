(function(){
  "use strict";
  const WCfg=(function(){
    const A4W=794, A4H=1123, HDR_H=84, FTR_H=64, PAD=28;
    const UI={ brand:"#0f6cbd", brandHover:"#0b5aa1", border:"#e1dfdd", borderSubtle:"#c8c6c4", text:"#323130", textDim:"#605e5c", surface:"#ffffff", canvas:"#f3f2f1" };
    const DEBOUNCE_PREVIEW=280, MOBILE_BP=900;
    const Style={
      shell:{ margin:"16px 0", padding:"0", background:"#fff", border:"1px solid "+UI.border, borderRadius:"8px", boxShadow:"0 6px 18px rgba(0,0,0,.06)" },
      bar:{ position:"sticky", top:"0", zIndex:"2", display:"flex", gap:"8px", alignItems:"center", justifyContent:"flex-start", padding:"8px 12px", background:"#fff", borderBottom:"1px solid "+UI.border },
      btn:{ padding:"8px 12px", border:"1px solid "+UI.borderSubtle, background:"#fff", color:UI.text, borderRadius:"4px", cursor:"pointer", font:"14px/1.2 Segoe UI,system-ui" },
      btnPri:{ padding:"8px 12px", border:"1px solid "+UI.brand, background:UI.brand, color:"#fff", borderRadius:"4px", cursor:"pointer", font:"14px/1.2 Segoe UI,system-ui" },
      toggle:{ padding:"6px 10px", border:"1px solid "+UI.borderSubtle, background:"#fff", color:UI.text, borderRadius:"999px", cursor:"pointer", font:"12px/1.2 Segoe UI,system-ui" },
      editor:{ minHeight:"260px", border:"1px solid "+UI.borderSubtle, borderRadius:"6px", margin:"12px", padding:"14px", background:"#fff", font:"15px/1.6 Segoe UI,system-ui" },
      title:{ font:"13px Segoe UI,system-ui", color:UI.textDim, padding:"8px 12px", background:"#fafafa", borderBottom:"1px solid "+UI.border },
      modalBg:{ position:"fixed", left:"0", top:"0", width:"100vw", height:"100vh", background:"rgba(0,0,0,.45)", zIndex:"9999", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 2vw" },
      modal:{ width:"100%", maxWidth:"1240px", height:"92vh", background:"#fff", display:"flex", flexDirection:"column", borderRadius:"12px", overflow:"hidden" },
      split:{ flex:"1", minHeight:"0", display:"flex", background:UI.canvas },
      left:{ flex:"1", minWidth:"0", overflow:"auto", padding:"20px", display:"grid", gridTemplateColumns:"1fr", gap:"18px", justifyItems:"center", background:UI.canvas },
      rightWrap:{ width:"46vw", minWidth:"360px", maxWidth:"720px", height:"100%", display:"flex", flexDirection:"column", borderLeft:"1px solid "+UI.border, background:"#fff" },
      area:{ flex:"1", minHeight:"0", overflow:"auto", padding:"18px", outline:"none", font:"15px/1.6 Segoe UI,system-ui", background:"#fff" },
      pageFrame:"background:#fff;border:1px solid "+UI.border+";border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.08);position:relative;overflow:hidden;margin:0 auto",
      hfModal:{ width:"100%", maxWidth:"720px", background:"#fff", borderRadius:"14px", boxShadow:"0 20px 44px rgba(0,0,0,.18)", display:"flex", flexDirection:"column", maxHeight:"92vh", overflow:"hidden" },
      hfHead:{ padding:"18px 22px", borderBottom:"1px solid "+UI.border, display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", flexWrap:"wrap" },
      hfTitle:{ font:"18px/1.3 Segoe UI,system-ui", color:UI.text, margin:"0" },
      hfClose:{ border:"0", background:"transparent", color:UI.textDim, font:"20px/1 Segoe UI,system-ui", cursor:"pointer", padding:"4px", borderRadius:"6px" },
      hfBody:{ padding:"20px", display:"grid", gap:"18px", overflowY:"auto", flex:"1", minHeight:"0" },
      hfSection:{ display:"flex", flexDirection:"column", gap:"10px", padding:"16px", border:"1px solid "+UI.borderSubtle, borderRadius:"10px", background:"#faf9f8" },
      hfToggleRow:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", flexWrap:"wrap" },
      hfToggleLabel:{ font:"14px/1.4 Segoe UI,system-ui", color:UI.text, display:"flex", alignItems:"center", gap:"8px", cursor:"pointer" },
      hfEditable:{ width:"100%", minHeight:"96px", border:"1px solid "+UI.borderSubtle, borderRadius:"8px", padding:"10px 12px", font:"14px/1.5 Segoe UI,system-ui", color:UI.text, background:"#fff", boxSizing:"border-box", outline:"none", overflowY:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word", position:"relative" },
      hfHint:{ font:"12px/1.4 Segoe UI,system-ui", color:UI.textDim },
      hfFooter:{ padding:"16px 22px", borderTop:"1px solid "+UI.border, display:"flex", justifyContent:"flex-end", gap:"12px", flexWrap:"wrap" }
    };
    return { UI,A4W,A4H,HDR_H,FTR_H,PAD,DEBOUNCE_PREVIEW,MOBILE_BP,Style };
  })();
  function applyStyles(el, styles){ for(const k in styles){ el.style[k]=styles[k]; } }
  const WDom=(function(){
    function btn(label, primary, title){
      const b=document.createElement("button"); b.type="button"; b.textContent=label; if(title) b.title=title;
      applyStyles(b, primary?WCfg.Style.btnPri:WCfg.Style.btn);
      b.onmouseenter=function(){ b.style.background = primary? WCfg.UI.brandHover : WCfg.UI.canvas; };
      b.onmouseleave=function(){ b.style.background = primary? WCfg.UI.brand : "#fff"; };
      return b;
    }
    function toggle(label, active){
      const b=document.createElement("button"); b.type="button"; b.textContent=label+(active?": On":": Off");
      applyStyles(b, WCfg.Style.toggle); b.setAttribute("data-active", active?"1":"0");
      b.style.background = active?"#e6f2fb":"#fff"; b.style.borderColor = active?WCfg.UI.brand:"#c8c6c4";
      return b;
    }
    function title(text){ const d=document.createElement("div"); d.textContent=text; applyStyles(d, WCfg.Style.title); return d; }
    function placeCaretAtEnd(el){ el.focus(); const r=document.createRange(); r.selectNodeContents(el); r.collapse(false); const s=window.getSelection(); s.removeAllRanges(); s.addRange(r); }
    function openBlank(){ const w=window.open("","_blank"); if(!w) alert("Please allow popups."); return w; }
    return { btn,toggle,title,placeCaretAtEnd,openBlank };
  })();
  const A11y=(function(){
    let locks=0, prev="";
    function lockScroll(){ locks++; if(locks===1){ prev=document.body.style.overflow||""; document.body.style.overflow="hidden"; } }
    function unlockScroll(){ if(locks>0){ locks--; if(locks===0){ document.body.style.overflow=prev; } } }
    return { lockScroll, unlockScroll };
  })();
  const Sanitizer=(function(){
    const BAD={"script":1,"style":1,"iframe":1,"object":1,"embed":1,"link":1,"meta":1};
    function clean(html){
      const c=document.createElement("div"); c.innerHTML=html;
      const walker=document.createTreeWalker(c, NodeFilter.SHOW_ELEMENT); let node;
      while((node=walker.nextNode())){
        const tag=(node.tagName||"").toLowerCase();
        if(BAD[tag]){ node.parentNode.removeChild(node); continue; }
        const attrs=Array.prototype.slice.call(node.attributes||[]);
        for(let i=0;i<attrs.length;i++){
          const attr=attrs[i]; const name=attr.name.toLowerCase(); const value=(attr.value||"").trim();
          if(name.indexOf("on")===0) node.removeAttribute(attr.name);
          if((name==="src"||name==="href") && /^javascript:/i.test(value)) node.removeAttribute(attr.name);
        }
      }
      return c.innerHTML;
    }
    return { clean };
  })();
  const Normalizer=(function(){
    const BLOCK=/^(P|DIV|UL|OL|LI|H1|H2|H3|H4|H5|H6|TABLE|BLOCKQUOTE|HR|IMG)$/i;
    function isBlock(el){ return el && el.nodeType===1 && BLOCK.test(el.tagName); }
    const WORD_LIST_RE=/mso-list\s*:/i;
    const WORD_CLASS_RE=/^mso/i;
    const WORD_LIST_CLASS_RE=/^mso(listparagraph|listcontinue)/i;
    const BULLET_RE=/^[\s\u00a0\u2022\u00b7\u25aa\u25cf\-]+$/;
    const ORDERED_MARK_RE=/^(\(*([0-9]+|[ivxlcdm]+)\)|([0-9]+|[ivxlcdm]+))[\.|\)]\s*/i;
    const TAB_STOP_RE=/tab-stops?/i;
    function prepareWordArtifacts(root){
      function walk(node){
        if(!node || node.nodeType!==1) return;
        if(/^(O:P)$/i.test(node.tagName||"")){
          const parent=node.parentNode; if(parent){
            let child=node.firstChild;
            while(child){ const next=child.nextSibling; if(child.nodeType===1) walk(child); parent.insertBefore(child, node); child=next; }
            parent.removeChild(node);
          }
          return;
        }
        if(node.tagName==="SPAN"){ const style=(node.getAttribute("style")||"");
          if(/mso-list\s*:\s*ignore/i.test(style)){ const parent=node.parentNode; if(parent){
              let child=node.firstChild;
              while(child){ const next=child.nextSibling; if(child.nodeType===1) walk(child); parent.insertBefore(child, node); child=next; }
              parent.removeChild(node);
            }
            return; }
        }
        let child=node.firstChild;
        while(child){ const next=child.nextSibling; if(child.nodeType===1) walk(child); child=next; }
      }
      walk(root);
    }
    function cleanWordArtifacts(root){
      function walk(node){
        if(!node || node.nodeType!==1) return;
        const cls=(node.getAttribute("class")||"").split(/\s+/).filter(function(token){ return token && !WORD_CLASS_RE.test(token); });
        if(cls.length){ node.setAttribute("class", cls.join(" ")); } else { node.removeAttribute("class"); }
        const style=node.getAttribute("style");
        if(style){
          const cleaned=style.split(";").map(function(rule){ return rule.trim(); }).filter(function(rule){
            if(!rule) return false;
            if(/^mso-/i.test(rule)) return false;
            if(TAB_STOP_RE.test(rule)) return false;
            return true;
          });
          if(cleaned.length){ node.setAttribute("style", cleaned.join("; ")); }
          else { node.removeAttribute("style"); }
        }
        let child=node.firstChild;
        while(child){ const next=child.nextSibling; if(child.nodeType===1) walk(child); child=next; }
      }
      walk(root);
    }
    function isWordListPara(node){ if(!node || node.nodeType!==1 || node.tagName!=="P") return false;
      const cls=node.getAttribute("class")||"";
      if(WORD_LIST_RE.test(node.getAttribute("style")||"")) return true;
      if(cls && cls.split(/\s+/).some(function(token){ return WORD_LIST_CLASS_RE.test(token); })) return true;
      return false;
    }
    function detectListType(node){ const text=(node.textContent||"").trim(); if(ORDERED_MARK_RE.test(text)) return "ol"; return "ul"; }
    function stripLeadingBullets(li){
      function pruneEmpty(node){
        while(node && node!==li && node.nodeType===1 && !node.firstChild){
          const parent=node.parentNode;
          if(!parent) break;
          parent.removeChild(node);
          node=parent;
        }
      }
      function stripFromText(textNode){
        if(!textNode) return false;
        let value=textNode.nodeValue||"";
        const original=value;
        value=value.replace(/^[\s\u00a0\u2022\u00b7\u25aa\u25cf\-]+/, "");
        value=value.replace(ORDERED_MARK_RE, "");
        if(value===original) return false;
        if(value.length){ textNode.nodeValue=value; }
        else {
          const parent=textNode.parentNode;
          if(parent) parent.removeChild(textNode);
          pruneEmpty(parent);
        }
        return true;
      }
      function findFirstText(node){
        if(!node) return null;
        if(node.nodeType===3 && (node.nodeValue||"").length) return node;
        if(node.nodeType!==1) return null;
        let child=node.firstChild;
        while(child){
          const found=findFirstText(child);
          if(found) return found;
          child=child.nextSibling;
        }
        return null;
      }
      while(li.firstChild && li.firstChild.nodeType===3 && BULLET_RE.test(li.firstChild.nodeValue||"")){ li.removeChild(li.firstChild); }
      if(li.firstChild && li.firstChild.nodeType===3){
        stripFromText(li.firstChild);
      } else if(li.firstChild && li.firstChild.nodeType===1){
        const textNode=findFirstText(li.firstChild);
        if(textNode) stripFromText(textNode);
      }
      while(li.firstChild && li.firstChild.nodeType===3 && !(li.firstChild.nodeValue||"").trim()){ li.removeChild(li.firstChild); }
    }
    function convertWordLists(container){
      let node=container.firstChild; let activeList=null; let activeType="";
      while(node){ const next=node.nextSibling;
        if(node.nodeType===8){ container.removeChild(node); node=next; continue; }
        if(node.nodeType===3 && !(node.nodeValue||"").trim()){ container.removeChild(node); node=next; continue; }
        if(node.nodeType===1 && node.tagName==="P" && isWordListPara(node)){
          const type=detectListType(node);
          if(!activeList || activeType!==type){
            activeList=document.createElement(type);
            container.insertBefore(activeList, node);
            activeType=type;
          }
          const li=document.createElement("li");
          while(node.firstChild){ li.appendChild(node.firstChild); }
          stripLeadingBullets(li);
          activeList.appendChild(li);
          container.removeChild(node);
          node=next;
          continue;
        }
        activeList=null; activeType="";
        if(node && node.nodeType===1) convertWordLists(node);
        node=next;
      }
    }
    function fixStructure(root){
      if(!root) return;
      prepareWordArtifacts(root);
      convertWordLists(root);
      cleanWordArtifacts(root);
      const nodes=[]; const cn=root.childNodes;
      for(let i=0;i<cn.length;i++){ const nd=cn[i]; if(nd.nodeType===1 || (nd.nodeType===3 && nd.nodeValue.trim())) nodes.push(nd); }
      if(nodes.length===1 && nodes[0].nodeType===1 && /^H[1-6]$/.test(nodes[0].tagName)){
        const h=nodes[0];
        let hasBlock=false;
        for(let i=0;i<h.children.length;i++){ if(isBlock(h.children[i])){ hasBlock=true; break; } }
        if(hasBlock){
          const headingOnly=h.cloneNode(false); headingOnly.textContent=h.textContent||"";
          const after=document.createDocumentFragment();
          const kids=Array.prototype.slice.call(h.childNodes);
          for(let i=0;i<kids.length;i++){ const ch=kids[i]; if(ch.nodeType===1 && isBlock(ch)) after.appendChild(ch); }
          h.replaceWith(headingOnly, after);
        }
      }
      const hs=root.querySelectorAll ? root.querySelectorAll("h1,h2,h3,h4,h5,h6") : [];
      for(let i=0;i<hs.length;i++){
        const hh=hs[i], blocks=[];
        for(let j=0;j<hh.children.length;j++){ const cc=hh.children[j]; if(isBlock(cc)) blocks.push(cc); }
        if(blocks.length){
          const frag=document.createDocumentFragment();
          for(let j=0;j<blocks.length;j++) frag.appendChild(blocks[j]);
          hh.parentNode.insertBefore(frag, hh.nextSibling);
        }
      }
    }
    return { fixStructure };
  })();
  const Tokens=(function(){
    function apply(root, ctx){
      function repl(s){ return s.replace(/\{\{page\}\}/g, String(ctx.page)).replace(/\{\{total\}\}/g, String(ctx.total)).replace(/\{\{date\}\}/g, ctx.date); }
      const tw=document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
      while((n=tw.nextNode())){ n.nodeValue=repl(n.nodeValue); }
    }
    return { apply };
  })();
  const Breaks=(function(){
    function insert(targetEl){
      function liftNodeToTarget(node){
        while(node.parentNode && node.parentNode!==targetEl){
          const parent=node.parentNode;
          const clone=parent.cloneNode(false);
          let sib=node.nextSibling;
          while(sib){ const next=sib.nextSibling; clone.appendChild(sib); sib=next; }
          const host=parent.parentNode;
          if(!host) break;
          if(clone.childNodes.length){ host.insertBefore(clone, parent.nextSibling); }
          const ref=clone.childNodes.length ? clone : parent.nextSibling;
          host.insertBefore(node, ref);
          if(!parent.hasChildNodes()) parent.remove();
          if(clone.childNodes.length===0 && clone.parentNode) clone.remove();
        }
      }
      let sel=window.getSelection ? window.getSelection() : null;
      if(!sel || sel.rangeCount===0 || !targetEl.contains(sel.anchorNode)){
        WDom.placeCaretAtEnd(targetEl);
      }
      Normalizer.fixStructure(targetEl);
      const sel2=window.getSelection ? window.getSelection() : null;
      const baseRange=(sel2 && sel2.rangeCount) ? sel2.getRangeAt(0).cloneRange() : null;
      const comment=document.createComment("page:break");
      if(baseRange){
        const range=baseRange.cloneRange();
        range.collapse(true);
        range.insertNode(comment);
        liftNodeToTarget(comment);
        if(comment.previousSibling && comment.previousSibling.nodeType===3 && !comment.previousSibling.nodeValue.trim()){
          comment.parentNode.removeChild(comment.previousSibling);
        }
      }else{
        targetEl.appendChild(comment);
      }
      const p=document.createElement("p"); p.innerHTML="<br>";
      if(comment.nextSibling) targetEl.insertBefore(p, comment.nextSibling); else targetEl.appendChild(p);
      WDom.placeCaretAtEnd(p);
    }
    function remove(targetEl){
      const sel=window.getSelection ? window.getSelection() : null; let node=(sel && sel.rangeCount) ? sel.anchorNode : null;
      if(!node || !targetEl.contains(node)){
        for(let i=targetEl.childNodes.length-1;i>=0;i--){ const n=targetEl.childNodes[i]; if(n.nodeType===8 && String(n.nodeValue).trim().toLowerCase()==="page:break"){ n.remove(); return true; } }
        alert("No page break found near cursor."); return false;
      }
      while(node && node.parentNode!==targetEl){ node=node.parentNode; }
      function isWS(n){ return n && n.nodeType===3 && !n.nodeValue.trim(); }
      let f=node.nextSibling; while(isWS(f)) f=f.nextSibling; if(f && f.nodeType===8 && String(f.nodeValue).trim().toLowerCase()==="page:break"){ f.remove(); return true; }
      let b=node.previousSibling; while(isWS(b)) b=b.previousSibling; if(b && b.nodeType===8 && String(b.nodeValue).trim().toLowerCase()==="page:break"){ b.remove(); return true; }
      alert("No page break found next to the cursor."); return false;
    }
    return { insert, remove };
  })();
  const Paginator=(function(){
    function makePage(pageNo, opts){
      const headerEnabled=opts.headerEnabled, footerEnabled=opts.footerEnabled, headerHTML=opts.headerHTML, footerHTML=opts.footerHTML;
      const {A4W,A4H,HDR_H,FTR_H,PAD,UI,Style}=WCfg;
      const effH=headerEnabled?HDR_H:0, effF=footerEnabled?FTR_H:0;
      const page=document.createElement("div");
      page.setAttribute("data-page", String(pageNo));
      page.style.cssText="width:"+A4W+"px;height:"+A4H+"px;"+Style.pageFrame+";";
      let header=null, footer=null, footerRight=null;
      if(headerEnabled){
        header=document.createElement("div");
        header.className="weditor_page-header";
        header.style.cssText="position:absolute;left:0;right:0;top:0;height:"+effH+"px;padding:12px 18px;border-bottom:1px solid "+UI.border+";background:#fff;color:"+UI.text+";font:14px Segoe UI,system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;row-gap:6px;box-sizing:border-box";
        header.innerHTML=headerHTML;
        page.appendChild(header);
      }
      const content=document.createElement("div");
      content.className="weditor_page-content";
      content.style.cssText="position:absolute;left:0;right:0;top:"+(headerEnabled?effH:0)+"px;bottom:"+(footerEnabled?effF:0)+"px;padding:"+PAD+"px;overflow:hidden;font:14px/1.6 Segoe UI,system-ui;color:"+UI.text;
      page.appendChild(content);
      if(footerEnabled){
        footer=document.createElement("div");
        footer.className="weditor_page-footer";
        footer.style.cssText="position:absolute;left:0;right:0;bottom:0;height:"+effF+"px;padding:10px 18px;border-top:1px solid "+UI.border+";background:#fff;color:"+UI.text+";font:12px Segoe UI,system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;row-gap:6px;box-sizing:border-box";
        const fl=document.createElement("div"); fl.className="weditor_page-footer-left"; fl.style.cssText="flex:1 1 auto;min-width:160px"; fl.innerHTML=footerHTML;
        footerRight=document.createElement("div"); footerRight.className="weditor_page-footer-right"; footerRight.style.cssText="color:"+UI.textDim+";font:12px Segoe UI,system-ui;flex:0 0 auto"; footerRight.textContent="Page "+pageNo;
        footer.appendChild(fl); footer.appendChild(footerRight);
        page.appendChild(footer);
      }
      return { page, content, headerNode:header, footerNode:footer, footerRight, explicit:false };
    }
    function paginate(rawHTML, state){
      const {headerEnabled, footerEnabled, headerHTML, footerHTML}=state;
      const {A4W,A4H,HDR_H,FTR_H,PAD,UI,Style}=WCfg;
      const AVAIL=A4H - (headerEnabled?HDR_H:0) - (footerEnabled?FTR_H:0) - 2*PAD;
      const sourceHTML=Sanitizer.clean(rawHTML);
      const src=document.createElement("div"); src.innerHTML=sourceHTML;
      function para(htmlOrText){
        const p=document.createElement("p"); p.style.cssText="margin:.6em 0";
        if(typeof htmlOrText==="string") p.innerHTML=htmlOrText; else p.textContent=htmlOrText;
        return p;
      }
      const linear=[];
      for(let i=0;i<src.childNodes.length;i++){
        const n=src.childNodes[i];
        if(n.nodeType===8){
          const t=(n.nodeValue||"").trim().toLowerCase();
          if(t==="page:break") linear.push({t:"break"});
        }else if(n.nodeType===3){
          const txt=n.nodeValue.trim(); if(txt) linear.push({t:"block", node:para(txt)});
        }else if(n.nodeType===1){
          if(n.tagName==="DIV" && n.childNodes.length===1 && n.firstChild.nodeName==="BR"){ linear.push({t:"block", node:para("&nbsp;")}); }
          else if(n.tagName==="DIV" && n.innerHTML.trim()===""){ linear.push({t:"block", node:para("&nbsp;")}); }
          else { const wrap=document.createElement("div"); wrap.style.cssText="margin:.6em 0"; wrap.appendChild(n.cloneNode(true)); linear.push({t:"block", node:wrap}); }
        }
      }
      const CONTENT_WIDTH=A4W - 2*PAD;
      const measWrap=document.createElement("div"); measWrap.style.cssText="position:absolute;left:-99999px;top:-99999px;visibility:hidden;width:"+A4W+"px";
      document.body.appendChild(measWrap);
      const measPage=makePage(1, {headerEnabled, footerEnabled, headerHTML, footerHTML});
      const measContent=measPage.content; measWrap.appendChild(measPage.page);
      const pages=[]; let cur=makePage(1, {headerEnabled, footerEnabled, headerHTML, footerHTML}); let used=0;
      function hasContent(pg){ return pg && pg.content && pg.content.childNodes && pg.content.childNodes.length>0; }
      function push(force){ if(force || hasContent(cur) || cur.explicit){ pages.push(cur); } }
      function next(force){ push(!!force); cur=makePage(pages.length+1, {headerEnabled, footerEnabled, headerHTML, footerHTML}); cur.explicit=!!force; used=0; }
      function ensureMeasuredBlock(block, containerWidth){
        const imgs=block.querySelectorAll ? block.querySelectorAll("img") : null; if(!imgs) return;
        for(let k=0;k<imgs.length;k++){
          const img=imgs[k]; img.loading="eager"; img.style.maxWidth="100%";
          if(img.naturalWidth && img.naturalHeight){
            const scale=Math.min(1, containerWidth / img.naturalWidth);
            const expected=Math.round(img.naturalHeight * scale);
            img.style.height=expected+"px"; img.style.maxHeight=expected+"px";
          }
        }
      }
      for(let i=0;i<linear.length;i++){
        const it=linear[i];
        if(it.t==="break"){ next(true); continue; }
        const block=it.node;
        ensureMeasuredBlock(block, CONTENT_WIDTH);
        measContent.innerHTML=""; const probe=block.cloneNode(true); probe.style.margin="0"; ensureMeasuredBlock(probe, CONTENT_WIDTH);
        measContent.appendChild(probe);
        const rect=probe.getBoundingClientRect(); const bh=rect && rect.height ? rect.height : 18;
        if(used>0 && used+bh>AVAIL) next(false);
        cur.content.appendChild(block); used+=bh;
        if(used>AVAIL){
          const imgs=cur.content.lastChild.querySelectorAll ? cur.content.lastChild.querySelectorAll("img") : [];
          const remaining=AVAIL - (used - bh) - 10;
          for(let z=0;z<imgs.length;z++){ if(remaining>0){ imgs[z].style.maxHeight=remaining+"px"; imgs[z].style.height="auto"; imgs[z].style.maxWidth="100%"; } }
          measContent.innerHTML=""; const probe2=cur.content.lastChild.cloneNode(true); probe2.style.margin="0"; ensureMeasuredBlock(probe2, CONTENT_WIDTH);
          measContent.appendChild(probe2);
          const rect2=probe2.getBoundingClientRect(); const h2=rect2 && rect2.height ? rect2.height : (AVAIL-1);
          used=Math.min(AVAIL-1, h2 + (used - bh));
        }
      }
      push(false);
      if(!pages.length){ pages.push(cur); }
      const total=pages.length, dateStr=(new Date()).toISOString().slice(0,10);
      for(let i=0;i<pages.length;i++){
        const pg=pages[i];
        if(footerEnabled && pg.footerRight) pg.footerRight.textContent="Page "+(i+1)+" of "+total;
        if(headerEnabled && pg.headerNode) Tokens.apply(pg.headerNode, {page:i+1,total,date:dateStr});
        if(footerEnabled && pg.footerNode) Tokens.apply(pg.footerNode, {page:i+1,total,date:dateStr});
      }
      let pagesHTML=""; for(let i=0;i<pages.length;i++){ pagesHTML+=pages[i].page.outerHTML; }
      measWrap.parentNode.removeChild(measWrap);
      return { pages: pages.map(function(p){ return p.page; }), pagesHTML };
    }
    function pagesHTML(inst){ return paginate(inst.el.innerHTML, inst).pagesHTML; }
    return { paginate, pagesHTML };
  })();
  const ExportUI=(function(){
    function open(pagedHTML, rawHTML){
      const w=WDom.openBlank(); if(!w) return;
      function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
      const html="<!DOCTYPE html><meta charset='utf-8'>"+
        "<body style='margin:0;font-family:Segoe UI,system-ui,-apple-system,Arial'>"+
        "<div style='display:flex;gap:12px;padding:12px;align-items:center;border-bottom:1px solid #c8c6c4;background:#fafafa'>"+
          "<strong style='font-size:14px'>Export</strong>"+
          "<span style='font-size:12px;color:#605e5c'>Tip: Select all (Ctrl/Cmd+A) and copy.</span>"+
        "</div>"+
        "<div style='display:flex;height:calc(100vh - 50px)'>"+
          "<div style='flex:1;display:flex;flex-direction:column;border-right:1px solid #e1dfdd'>"+
            "<div style='padding:8px 12px;font:12px Segoe UI;color:#605e5c;background:#fff;border-bottom:1px solid #e1dfdd'>Paged HTML</div>"+
            "<textarea style='flex:1;border:0;outline:none;padding:12px;font:12px/1.4 ui-monospace,monospace'>"+esc(pagedHTML)+"</textarea>"+
          "</div>"+
          "<div style='flex:1;display:flex;flex-direction:column'>"+
            "<div style='padding:8px 12px;font:12px Segoe UI;color:#605e5c;background:#fff;border-bottom:1px solid #e1dfdd'>Raw HTML</div>"+
            "<textarea style='flex:1;border:0;outline:none;padding:12px;font:12px/1.4 ui-monospace,monospace'>"+esc(rawHTML)+"</textarea>"+
          "</div>"+
        "</div>"+
        "</body>";
      w.document.open(); w.document.write(html); w.document.close();
    }
    return { open };
  })();
  const PrintUI=(function(){
    function open(pagedHTML){
      const w=WDom.openBlank(); if(!w) return;
      const html="<!DOCTYPE html><meta charset='utf-8'>"+
               "<body style='margin:0;background:#fff;font-family:Segoe UI,system-ui,-apple-system,Arial' onload='window.print();window.onafterprint=function(){window.close();}'>"+
               pagedHTML+
               "</body>";
      w.document.open(); w.document.write(html); w.document.close();
    }
    return { open };
  })();
  const HFEditor=(function(){
    function enableImageResizer(editor){
      if(!editor || editor.__weditorImageResizer) return;
      editor.__weditorImageResizer = true;
      if(!document.getElementById("weditor-hf-img-style")){
        const style=document.createElement("style");
        style.id="weditor-hf-img-style";
        style.textContent=".weditor-hf-img-active{outline:2px solid "+WCfg.UI.brand+";outline-offset:2px;}";
        document.head.appendChild(style);
      }
      const computed=window.getComputedStyle(editor);
      if(computed.position === "static") editor.style.position="relative";
      const overlay=document.createElement("div");
      overlay.setAttribute("data-weditor-overlay","1");
      overlay.style.position="absolute";
      overlay.style.border="1px dashed "+WCfg.UI.brand;
      overlay.style.borderRadius="4px";
      overlay.style.boxSizing="border-box";
      overlay.style.pointerEvents="none";
      overlay.style.display="none";
      overlay.style.zIndex="10";
      overlay.style.left="0";
      overlay.style.top="0";
      const handle=document.createElement("div");
      handle.setAttribute("data-weditor-overlay","1");
      handle.style.position="absolute";
      handle.style.width="14px";
      handle.style.height="14px";
      handle.style.borderRadius="50%";
      handle.style.background=WCfg.UI.brand;
      handle.style.border="2px solid #fff";
      handle.style.boxShadow="0 1px 4px rgba(0,0,0,.3)";
      handle.style.right="-7px";
      handle.style.bottom="-7px";
      handle.style.cursor="nwse-resize";
      handle.style.pointerEvents="auto";
      overlay.appendChild(handle);
      editor.appendChild(overlay);
      let activeImg=null;
      let raf=null;
      function hideOverlay(){
        overlay.style.display="none";
        if(activeImg){ activeImg.classList.remove("weditor-hf-img-active"); activeImg=null; }
      }
      function updateOverlay(){
        if(!activeImg || !editor.contains(activeImg)){ hideOverlay(); return; }
        const rect=activeImg.getBoundingClientRect();
        const hostRect=editor.getBoundingClientRect();
        const clientLeft=editor.clientLeft||0;
        const clientTop=editor.clientTop||0;
        const left=rect.left-hostRect.left+editor.scrollLeft-clientLeft;
        const top=rect.top-hostRect.top+editor.scrollTop-clientTop;
        overlay.style.transform="translate("+left+"px,"+top+"px)";
        overlay.style.width=rect.width+"px";
        overlay.style.height=rect.height+"px";
        overlay.style.display="block";
      }
      function scheduleOverlay(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(updateOverlay); }
      function selectImage(img){
        if(activeImg===img){ scheduleOverlay(); return; }
        if(activeImg) activeImg.classList.remove("weditor-hf-img-active");
        activeImg=img;
        if(activeImg){
          activeImg.classList.add("weditor-hf-img-active");
          if(activeImg.complete){ scheduleOverlay(); }
          else {
            activeImg.addEventListener("load", scheduleOverlay, { once:true });
            scheduleOverlay();
          }
        } else {
          hideOverlay();
        }
      }
      editor.addEventListener("click", function(ev){
        const target=ev.target;
        if(target && target.tagName==="IMG"){ selectImage(target); }
        else if(!overlay.contains(target)){ hideOverlay(); }
      });
      editor.addEventListener("input", function(){ if(activeImg && !editor.contains(activeImg)){ hideOverlay(); } scheduleOverlay(); });
      editor.addEventListener("scroll", scheduleOverlay, { passive:true });
      window.addEventListener("resize", scheduleOverlay);
      editor.addEventListener("blur", hideOverlay);
      editor.addEventListener("keydown", function(ev){ if(ev.key==="Escape") hideOverlay(); });
      const observer=new MutationObserver(function(records){
        let relevant=false;
        for(let i=0;i<records.length;i++){
          const target=records[i].target;
          if(!target) continue;
          if(target.nodeType===1 && target.getAttribute && target.getAttribute("data-weditor-overlay")){ continue; }
          if(overlay.contains(target)){ continue; }
          relevant=true; break;
        }
        if(!relevant) return;
        if(activeImg && !editor.contains(activeImg)) hideOverlay();
        scheduleOverlay();
      });
      observer.observe(editor, { childList:true, subtree:true, attributes:true });
      let resizing=false;
      handle.addEventListener("pointerdown", function(ev){
        if(!activeImg){ return; }
        resizing=true;
        ev.preventDefault();
        ev.stopPropagation();
        const startX=ev.clientX;
        const startY=ev.clientY;
        const startWidth=activeImg.getBoundingClientRect().width;
        const startHeight=activeImg.getBoundingClientRect().height || 1;
        const ratio=(activeImg.naturalWidth&&activeImg.naturalHeight)?(activeImg.naturalWidth/activeImg.naturalHeight):(startWidth/Math.max(startHeight,1));
        const pointerId=ev.pointerId;
        try { handle.setPointerCapture(pointerId); } catch(e){}
        function applySize(width){
          const safeWidth=Math.max(24, width);
          const calcHeight=safeWidth/ratio;
          activeImg.style.maxWidth="";
          activeImg.style.maxHeight="";
          activeImg.style.width=Math.round(safeWidth)+"px";
          activeImg.style.height=Math.round(calcHeight)+"px";
          if(!activeImg.style.objectFit) activeImg.style.objectFit="contain";
          scheduleOverlay();
        }
        function onMove(moveEv){
          if(!resizing) return;
          moveEv.preventDefault();
          const deltaX=moveEv.clientX-startX;
          const deltaY=moveEv.clientY-startY;
          const delta=Math.abs(deltaX)>Math.abs(deltaY)?deltaX:deltaY;
          applySize(startWidth+delta);
        }
        function finish(upEv){
          resizing=false;
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", finish);
          document.removeEventListener("pointercancel", finish);
          if(handle.hasPointerCapture && handle.hasPointerCapture(pointerId)){
            try { handle.releasePointerCapture(pointerId); } catch(e){}
          }
          if(upEv) upEv.preventDefault();
          scheduleOverlay();
        }
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", finish, { once:false });
        document.addEventListener("pointercancel", finish, { once:false });
      });
      editor.addEventListener("mousedown", function(ev){ if(ev.target!==handle) scheduleOverlay(); });
      editor.addEventListener("focus", scheduleOverlay);
      editor.addEventListener("dragstart", function(ev){ if(resizing){ ev.preventDefault(); ev.stopPropagation(); } });
      editor.__weditorHideOverlay=hideOverlay;
      editor.__weditorCleanup=function(){ if(raf) cancelAnimationFrame(raf); window.removeEventListener("resize", scheduleOverlay); observer.disconnect(); if(overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    }
    let uid=0;
    function section(kind, titleText, description, enabled, html){
      const wrap=document.createElement("section"); applyStyles(wrap, WCfg.Style.hfSection);
      const toggleRow=document.createElement("div"); applyStyles(toggleRow, WCfg.Style.hfToggleRow); wrap.appendChild(toggleRow);
      const toggleId="weditor-hf-"+kind+"-"+(++uid);
      const toggle=document.createElement("input"); toggle.type="checkbox"; toggle.id=toggleId; toggle.checked=!!enabled; toggle.style.transform="scale(1.2)"; toggle.style.marginRight="2px";
      const labelWrap=document.createElement("label"); applyStyles(labelWrap, WCfg.Style.hfToggleLabel); labelWrap.setAttribute("for", toggleId);
      labelWrap.appendChild(toggle);
      const labelSpan=document.createElement("span"); labelSpan.textContent=titleText; labelWrap.appendChild(labelSpan);
      toggleRow.appendChild(labelWrap);
      const status=document.createElement("span"); status.style.cssText="font:12px/1.4 Segoe UI,system-ui;color:"+WCfg.UI.textDim+";text-transform:uppercase;letter-spacing:.04em"; toggleRow.appendChild(status);
      const editor=document.createElement("div"); applyStyles(editor, WCfg.Style.hfEditable);
      editor.setAttribute("role","textbox");
      editor.setAttribute("aria-label", titleText+" content");
      editor.setAttribute("aria-multiline","true");
      editor.contentEditable="true";
      editor.tabIndex=0;
      editor.innerHTML = Sanitizer.clean(html || "");
      editor.addEventListener("paste", function(){ window.setTimeout(function(){ Normalizer.fixStructure(editor); }, 0); });
      wrap.appendChild(editor);
      const uploaderRow=document.createElement("div");
      uploaderRow.style.display="flex";
      uploaderRow.style.alignItems="center";
      uploaderRow.style.flexWrap="wrap";
      uploaderRow.style.gap="10px";
      uploaderRow.style.marginTop="6px";
      const uploadBtn=WDom.btn("Insert image", false, "Upload PNG or JPG");
      uploadBtn.style.padding="6px 10px";
      uploadBtn.style.fontSize="12px";
      uploadBtn.style.lineHeight="1.2";
      uploadBtn.style.alignSelf="flex-start";
      const fileInput=document.createElement("input");
      fileInput.type="file";
      fileInput.accept="image/png,image/jpeg";
      fileInput.style.display="none";
      const tip=document.createElement("div");
      tip.textContent="Upload .png / .jpg 會自動插入 <img>，可直接在上方編輯區拖曳調整";
      tip.style.font="12px/1.4 Segoe UI,system-ui";
      tip.style.color=WCfg.UI.textDim;
      uploaderRow.appendChild(uploadBtn);
      uploaderRow.appendChild(tip);
      wrap.appendChild(uploaderRow);
      wrap.appendChild(fileInput);
      enableImageResizer(editor);
      function insertSnippet(snippet){
        editor.focus();
        const sel=window.getSelection();
        if(!sel) return;
        let range=null;
        if(sel.rangeCount>0){
          range=sel.getRangeAt(0);
          if(!editor.contains(range.commonAncestorContainer)){
            range=document.createRange();
            range.selectNodeContents(editor);
            range.collapse(false);
          }
        } else {
          range=document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
        }
        if(!range){ return; }
        const temp=document.createElement("div"); temp.innerHTML=snippet;
        const frag=document.createDocumentFragment(); let last=null; let node;
        while((node=temp.firstChild)){ last=node; frag.appendChild(node); }
        range.deleteContents(); range.insertNode(frag);
        if(last){
          range.setStartAfter(last);
          range.setEndAfter(last);
          sel.removeAllRanges(); sel.addRange(range);
        }
        Normalizer.fixStructure(editor);
      }
      function toAltText(name){
        if(!name) return "Uploaded image";
        return name.replace(/\.[^.]+$/,"").replace(/[^a-z0-9\s_-]/gi," ").trim()||"Uploaded image";
      }
      uploadBtn.addEventListener("click", function(){ fileInput.value=""; fileInput.click(); });
      fileInput.addEventListener("change", function(){
        const file=(fileInput.files&&fileInput.files[0])||null;
        if(!file) return;
        if(file.type && !(file.type==="image/png" || file.type==="image/jpeg")) return;
        const reader=new FileReader();
        reader.onload=function(){
          const dataUrl=reader.result;
          if(typeof dataUrl!=="string") return;
          const alt=toAltText(file.name||"");
          const snippet='<img src="'+dataUrl+'" alt="'+alt+'" style="max-height:40px;object-fit:contain;">';
          insertSnippet(snippet);
        };
        reader.readAsDataURL(file);
      });
      if(description){
        const hint=document.createElement("div"); applyStyles(hint, WCfg.Style.hfHint); hint.innerHTML=description;
        const codes=hint.querySelectorAll("code");
        for(let i=0;i<codes.length;i++){ const code=codes[i]; code.style.background="#f3f2f1"; code.style.borderRadius="4px"; code.style.padding="2px 6px"; code.style.fontFamily="ui-monospace,monospace"; code.style.fontSize="12px"; }
        wrap.appendChild(hint);
      }
      function sync(){
        const on=!!toggle.checked;
        editor.setAttribute("contenteditable", on?"true":"false");
        editor.setAttribute("aria-disabled", on?"false":"true");
        editor.tabIndex = on ? 0 : -1;
        editor.style.opacity=on?"1":"0.55";
        editor.style.pointerEvents=on?"auto":"none";
        if(!on && editor.__weditorHideOverlay) editor.__weditorHideOverlay();
        uploadBtn.disabled=!on;
        uploadBtn.style.opacity=on?"1":"0.55";
        uploadBtn.style.cursor=on?"pointer":"not-allowed";
        fileInput.disabled=!on;
        status.textContent = on?"Enabled":"Disabled";
      }
      toggle.addEventListener("change", sync);
      sync();
      return {
        el:wrap,
        toggle,
        editor,
        focus:function(){ if(toggle.checked){ WDom.placeCaretAtEnd(editor); } else { editor.blur(); } },
        getHTML:function(){
          Normalizer.fixStructure(editor);
          const clone=editor.cloneNode(true);
          const overlays=clone.querySelectorAll('[data-weditor-overlay]');
          for(let i=0;i<overlays.length;i++){ const el=overlays[i]; if(el && el.parentNode) el.parentNode.removeChild(el); }
          const actives=clone.querySelectorAll('.weditor-hf-img-active');
          for(let j=0;j<actives.length;j++){ actives[j].classList.remove('weditor-hf-img-active'); }
          return clone.innerHTML;
        }
      };
    }
    function open(inst, ctx){
      A11y.lockScroll();
      const bg=document.createElement("div"); applyStyles(bg, WCfg.Style.modalBg);
      const panel=document.createElement("div"); applyStyles(panel, WCfg.Style.hfModal); panel.setAttribute("role","dialog"); panel.setAttribute("aria-modal","true"); panel.setAttribute("tabindex","-1");
      const head=document.createElement("div"); applyStyles(head, WCfg.Style.hfHead);
      const title=document.createElement("h2"); applyStyles(title, WCfg.Style.hfTitle); title.id="weditor-hf-title"; title.textContent="Header & Footer";
      head.appendChild(title);
      const closeBtn=document.createElement("button"); closeBtn.type="button"; closeBtn.innerHTML="&times;"; applyStyles(closeBtn, WCfg.Style.hfClose); closeBtn.setAttribute("aria-label","Close header and footer dialog");
      closeBtn.onmouseenter=function(){ closeBtn.style.background="#f3f2f1"; };
      closeBtn.onmouseleave=function(){ closeBtn.style.background="transparent"; };
      head.appendChild(closeBtn);
      panel.appendChild(head);
      panel.setAttribute("aria-labelledby", title.id);
      const body=document.createElement("div"); applyStyles(body, WCfg.Style.hfBody);
      const tokenHint="Tokens: <code>{{page}}</code> <code>{{total}}</code> <code>{{date}}</code>";
      const headerSection=section("header","Header", tokenHint, inst.headerEnabled, inst.headerHTML);
      const footerSection=section("footer","Footer", tokenHint+" · Right slot auto shows page counter", inst.footerEnabled, inst.footerHTML);
      body.appendChild(headerSection.el);
      body.appendChild(footerSection.el);
      panel.appendChild(body);
      const footer=document.createElement("div"); applyStyles(footer, WCfg.Style.hfFooter);
      const cancel=WDom.btn("Cancel", false, "Dismiss without saving");
      const save=WDom.btn("Save changes", true, "Apply header and footer");
      footer.appendChild(cancel);
      footer.appendChild(save);
      panel.appendChild(footer);
      bg.appendChild(panel);
      document.body.appendChild(bg);
      panel.focus();
      function cleanupEditors(){
        if(headerSection && headerSection.editor){
          if(headerSection.editor.__weditorHideOverlay) headerSection.editor.__weditorHideOverlay();
          if(headerSection.editor.__weditorCleanup){ headerSection.editor.__weditorCleanup(); headerSection.editor.__weditorCleanup=null; }
        }
        if(footerSection && footerSection.editor){
          if(footerSection.editor.__weditorHideOverlay) footerSection.editor.__weditorHideOverlay();
          if(footerSection.editor.__weditorCleanup){ footerSection.editor.__weditorCleanup(); footerSection.editor.__weditorCleanup=null; }
        }
      }
      function close(){ cleanupEditors(); if(bg.parentNode) bg.parentNode.removeChild(bg); A11y.unlockScroll(); document.removeEventListener("keydown", onKey); }
      function saveAndClose(){
        inst.headerEnabled = !!headerSection.toggle.checked;
        inst.footerEnabled = !!footerSection.toggle.checked;
        inst.headerHTML = Sanitizer.clean(headerSection.getHTML());
        inst.footerHTML = Sanitizer.clean(footerSection.getHTML());
        if(ctx && ctx.refreshPreview) ctx.refreshPreview();
        OutputBinding.syncDebounced(inst);
        close();
      }
      function onKey(ev){ if(ev.key === "Escape"){ ev.preventDefault(); close(); } if(ev.key === "Enter" && (ev.metaKey||ev.ctrlKey)){ ev.preventDefault(); saveAndClose(); } }
      document.addEventListener("keydown", onKey);
      closeBtn.onclick=function(){ close(); };
      cancel.onclick=function(){ close(); };
      save.onclick=function(){ saveAndClose(); };
      bg.addEventListener("click", function(e){ if(e.target===bg) close(); });
      window.setTimeout(function(){
        if(headerSection.toggle.checked){
          headerSection.focus();
        } else if(footerSection.toggle.checked){
          footerSection.focus();
        }
      }, 0);
    }
    return { open };
  })();
  const OutputBinding=(function(){
    function isOut(el){
      return el && el.tagName === "TEXTAREA" &&
        (el.classList.contains("weditor_output") || el.classList.contains("w-editor_output"));
    }
    function resolve(editorEl){
      let sib = editorEl.nextElementSibling;
      while(sib){
        if(isOut(sib)) return sib;
        if(sib.classList && sib.classList.contains("weditor")) break;
        sib = sib.nextElementSibling;
      }
      sib = editorEl.previousElementSibling;
      while(sib){
        if(isOut(sib)) return sib;
        if(sib.classList && sib.classList.contains("weditor")) break;
        sib = sib.previousElementSibling;
      }
      const parent = editorEl.parentElement;
      if(parent){
        const editors = Array.prototype.slice.call(parent.querySelectorAll(".weditor, .w-editor"));
        const outputs = Array.prototype.slice.call(parent.querySelectorAll("textarea.weditor_output, textarea.w-editor_output"));
        const idx = editors.indexOf(editorEl);
        if(idx > -1 && outputs[idx]) return outputs[idx];
      }
      return null;
    }
    function sync(inst){
      if(!inst.outputEl) return;
      if(inst.outputMode==="paged"){ inst.outputEl.value = Paginator.pagesHTML(inst); }
      else { inst.outputEl.value = inst.el.innerHTML; }
    }
    const timers=new WeakMap();
    function syncDebounced(inst){
      const t=timers.get(inst); if(t) window.clearTimeout(t);
      timers.set(inst, window.setTimeout(function(){ sync(inst); }, 200));
    }
    return { resolve, sync, syncDebounced };
  })();
  const ToolbarFactory=(function(){
    function build(container, items, inst, ctx){
      const bar=document.createElement("div"); applyStyles(bar, WCfg.Style.bar);
      for(let i=0;i<items.length;i++){
        const id=items[i]; const meta=Commands[id]; if(!meta) continue;
        const isToggle = meta.kind==="toggle";
        const btn = isToggle ? WDom.toggle(meta.label, !!meta.getActive(inst)) : WDom.btn(meta.label, !!meta.primary, meta.title||"");
        btn.setAttribute("data-command", id);
        btn.setAttribute("aria-label", meta.ariaLabel || meta.label);
        btn.onclick = (function(meta, btn){
          return function(e){
            meta.run(inst, { event:e, ctx });
            if(isToggle){
              const active = !!meta.getActive(inst);
              btn.setAttribute("data-active", active?"1":"0");
              btn.textContent = meta.label + (active?": On":": Off");
              btn.style.background = active ? "#e6f2fb" : "#fff";
              btn.style.borderColor = active ? WCfg.UI.brand : "#c8c6c4";
            }
          };
        })(meta, btn);
        bar.appendChild(btn);
      }
      container.appendChild(bar);
      return bar;
    }
    return { build };
  })();
  const Fullscreen=(function(){
    function open(inst){
      A11y.lockScroll();
      const bg=document.createElement("div"); applyStyles(bg, WCfg.Style.modalBg); bg.setAttribute("role","dialog"); bg.setAttribute("aria-modal","true");
      const modal=document.createElement("div"); applyStyles(modal, WCfg.Style.modal);
      const cmdBarWrap=document.createElement("div");
      const split=document.createElement("div"); applyStyles(split, WCfg.Style.split);
      const left=document.createElement("div"); applyStyles(left, WCfg.Style.left);
      const rightWrap=document.createElement("div"); applyStyles(rightWrap, WCfg.Style.rightWrap);
      rightWrap.appendChild(WDom.title("Editor"));
      const area=document.createElement("div"); area.contentEditable="true"; applyStyles(area, WCfg.Style.area); area.innerHTML=inst.el.innerHTML; rightWrap.appendChild(area);
      const ctx={
        area,
        refreshPreview:render,
        writeBack:function(){ inst.el.innerHTML = Sanitizer.clean(area.innerHTML); OutputBinding.sync(inst); return true; },
        close:cleanup,
        saveClose:function(){ ctx.writeBack(); cleanup(); }
      };
      ToolbarFactory.build(cmdBarWrap, TOOLBAR_FS, inst, ctx);
      function layout(){ split.style.flexDirection = (window.innerWidth<WCfg.MOBILE_BP) ? "column" : "row"; }
      modal.appendChild(cmdBarWrap); modal.appendChild(split); split.appendChild(left); split.appendChild(rightWrap); bg.appendChild(modal); document.body.appendChild(bg);
      window.setTimeout(function(){ area.focus(); },0);
      layout(); const onR=function(){ layout(); }; window.addEventListener("resize", onR);
      area.addEventListener("paste", function(){ window.setTimeout(function(){ Normalizer.fixStructure(area); }, 0); });
      let t=null; area.addEventListener("input", function(){ if(t) window.clearTimeout(t); t=window.setTimeout(render, WCfg.DEBOUNCE_PREVIEW); });
      render();
      function render(){
        left.innerHTML="";
        const out=Paginator.paginate(area.innerHTML, inst);
        for(let i=0;i<out.pages.length;i++){
          left.appendChild(out.pages[i]);
          if(i<out.pages.length-1){
            const br=document.createElement("div");
            br.textContent="Page Break";
            br.style.cssText="width:"+WCfg.A4W+"px;text-align:center;color:"+WCfg.UI.textDim+";font:12px Segoe UI,system-ui;margin:6px 0 2px 0;border-top:1px dashed "+WCfg.UI.borderSubtle+";opacity:.7";
            left.appendChild(br);
          }
        }
      }
      function cleanup(){
        window.removeEventListener("resize", onR);
        A11y.unlockScroll();
        bg.parentNode.removeChild(bg);
      }
    }
    return { open };
  })();
  const Commands={
    "fullscreen.open":{ label:"Fullscreen", primary:true, kind:"button", ariaLabel:"Open fullscreen editor", run:function(inst){ Fullscreen.open(inst); } },
    "break.insert":{ label:"Insert Break", kind:"button", ariaLabel:"Insert page break",
      run:function(inst, arg){ const target=(arg && arg.ctx && arg.ctx.area) ? arg.ctx.area : inst.el; Breaks.insert(target); if(arg && arg.ctx && arg.ctx.refreshPreview) arg.ctx.refreshPreview(); OutputBinding.syncDebounced(inst); } },
    "break.remove":{ label:"Remove Break", kind:"button", ariaLabel:"Remove page break",
      run:function(inst, arg){ const target=(arg && arg.ctx && arg.ctx.area) ? arg.ctx.area : inst.el; if(Breaks.remove(target)){ if(arg && arg.ctx && arg.ctx.refreshPreview) arg.ctx.refreshPreview(); OutputBinding.syncDebounced(inst); } } },
    "hf.edit":{ label:"Header & Footer", kind:"button", ariaLabel:"Edit header and footer",
      run:function(inst, arg){ HFEditor.open(inst, arg && arg.ctx); } },
    "toggle.header":{ label:"Header", kind:"toggle", ariaLabel:"Toggle header", getActive:function(inst){ return !!inst.headerEnabled; },
      run:function(inst){ inst.headerEnabled = !inst.headerEnabled; OutputBinding.syncDebounced(inst); } },
    "toggle.footer":{ label:"Footer", kind:"toggle", ariaLabel:"Toggle footer", getActive:function(inst){ return !!inst.footerEnabled; },
      run:function(inst){ inst.footerEnabled = !inst.footerEnabled; OutputBinding.syncDebounced(inst); } },
    "reflow":{ label:"Reflow", kind:"button", ariaLabel:"Write changes back to editor", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.writeBack){ arg.ctx.writeBack(); if(arg.ctx.refreshPreview) arg.ctx.refreshPreview(); } } },
    "print":{ label:"Print", kind:"button", ariaLabel:"Print paged HTML", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.writeBack) arg.ctx.writeBack(); const html=Paginator.pagesHTML(inst); PrintUI.open(html); } },
    "export":{ label:"Export", kind:"button", ariaLabel:"Export HTML", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.writeBack) arg.ctx.writeBack(); const html=Paginator.pagesHTML(inst); ExportUI.open(html, Sanitizer.clean(inst.el.innerHTML)); } },
    "fullscreen.close":{ label:"Close", kind:"button", ariaLabel:"Close fullscreen", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.close) arg.ctx.close(); } },
    "fullscreen.saveClose":{ label:"Save & Close", primary:true, kind:"button", ariaLabel:"Save changes and close", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.saveClose) arg.ctx.saveClose(); } }
  };
  const TOOLBAR_PAGE=["fullscreen.open","break.insert","break.remove","hf.edit","print","export","toggle.header","toggle.footer"];
  const TOOLBAR_FS=["hf.edit","break.insert","break.remove","reflow","print","export","toggle.header","toggle.footer","fullscreen.close","fullscreen.saveClose"];
  function WEditorInstance(editorEl){
    this.el = editorEl;
    this.headerHTML = "Demo Header — {{date}} · Page {{page}} / {{total}}";
    this.footerHTML = "Confidential · {{date}}";
    this.headerEnabled = !editorEl.classList.contains("weditor--no-header");
    this.footerEnabled = !editorEl.classList.contains("weditor--no-footer");
    this.outputEl = OutputBinding.resolve(editorEl);
    this.outputMode = editorEl.classList.contains("weditor--paged") ? "paged" : "raw";
    this._mount();
    OutputBinding.syncDebounced(this);
  }
  WEditorInstance.prototype._mount=function(){
    const shell=document.createElement("div"); applyStyles(shell, WCfg.Style.shell);
    const toolbarWrap=document.createElement("div");
    ToolbarFactory.build(toolbarWrap, TOOLBAR_PAGE, this, null);
    applyStyles(this.el, WCfg.Style.editor);
    this.el.setAttribute("contenteditable","true");
    this.el.addEventListener("paste", function(self){ return function(){ window.setTimeout(function(){ Normalizer.fixStructure(self.el); },0); }; }(this));
    const parent=this.el.parentNode; parent.replaceChild(shell, this.el);
    shell.appendChild(toolbarWrap); shell.appendChild(this.el);
    this.el.addEventListener("input", (function(self){ return function(){ OutputBinding.syncDebounced(self); }; })(this));
    this.el.__winst = this;
  };
  const WEditor=(function(){
    function initAll(selectors){ selectors = selectors || [".weditor", ".w-editor"]; const nodes=[];
      for(let i=0;i<selectors.length;i++){ const list=document.querySelectorAll(selectors[i]); for(let j=0;j<list.length;j++){ if(nodes.indexOf(list[j])<0) nodes.push(list[j]); } }
      const instances=[]; for(let k=0;k<nodes.length;k++){ instances.push(new WEditorInstance(nodes[k])); } return instances;
    }
    function from(el){ return new WEditorInstance(el); }
    return { initAll, from, version:"1.7.0" };
  })();
  window.WEditor=WEditor;
  document.addEventListener("DOMContentLoaded", function(){ WEditor.initAll(); });
})();
