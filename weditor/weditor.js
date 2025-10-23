(function(){
  "use strict";
  const WCfg=(function(){
    const A4W=794, A4H=1123, HDR_H=84, FTR_H=64, PAD=0;
    const HDR_MIN=24, FTR_MIN=20;
    const UI={ brand:"#0f6cbd", brandHover:"#0b5aa1", border:"#e1dfdd", borderSubtle:"#c8c6c4", text:"#323130", textDim:"#605e5c", surface:"#ffffff", canvas:"#f3f2f1" };
    const DEBOUNCE_PREVIEW=280, MOBILE_BP=900, PREVIEW_MAX_SCALE=1;
    const innerHFWidth = A4W - 36;
    const Style={
      shell:{ margin:"16px 0", padding:"0", background:"#fff", border:"1px solid "+UI.border, borderRadius:"8px", boxShadow:"0 6px 18px rgba(0,0,0,.06)" },
      toolbarWrap:{ position:"sticky", top:"0", zIndex:"3", background:"#fff" },
      bar:{ display:"flex", flexDirection:"column", gap:"10px", alignItems:"stretch", justifyContent:"flex-start", padding:"12px 16px 14px", background:"#fff", borderBottom:"1px solid "+UI.border },
      tabHeader:{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:"10px" },
      tabList:{ display:"flex", gap:"6px", flexWrap:"wrap", alignItems:"center", flex:"1 1 auto" },
      tabQuickActions:{ display:"flex", gap:"8px", marginLeft:"auto", alignItems:"center" },
      fsSaveCloseWrap:{ position:"fixed", top:"18px", right:"24px", zIndex:"2147483200", display:"flex" },
      tabButton:{ padding:"6px 14px", borderRadius:"999px", border:"1px solid "+UI.borderSubtle, background:"#f6f6f6", color:UI.textDim, cursor:"pointer", font:"13px/1.3 Segoe UI,system-ui", transition:"all .18s ease" },
      tabPanels:{ display:"flex", flexDirection:"column", gap:"12px" },
      tabPanel:{ display:"flex", flexWrap:"wrap", gap:"8px", alignItems:"center" },
      btn:{ padding:"8px 12px", border:"1px solid "+UI.borderSubtle, background:"#fff", color:UI.text, borderRadius:"4px", cursor:"pointer", font:"14px/1.2 Segoe UI,system-ui" },
      btnPri:{ padding:"8px 12px", border:"1px solid "+UI.brand, background:UI.brand, color:"#fff", borderRadius:"4px", cursor:"pointer", font:"14px/1.2 Segoe UI,system-ui" },
      toggle:{ padding:"6px 10px", border:"1px solid "+UI.borderSubtle, background:"#fff", color:UI.text, borderRadius:"999px", cursor:"pointer", font:"12px/1.2 Segoe UI,system-ui" },
      controlWrap:{ display:"inline-flex", alignItems:"center", gap:"6px", font:"12px/1.3 Segoe UI,system-ui", color:UI.textDim },
      controlSelect:{ padding:"6px 10px", border:"1px solid "+UI.borderSubtle, borderRadius:"4px", background:"#fff", color:UI.text, font:"13px/1.3 Segoe UI,system-ui", cursor:"pointer" },
      controlLabel:{ font:"12px/1.3 Segoe UI,system-ui", color:UI.textDim },
      editor:{ minHeight:"260px", border:"1px solid "+UI.borderSubtle, borderRadius:"6px", margin:"12px", padding:"14px", background:"#fff", font:"15px/1.6 Segoe UI,system-ui" },
      title:{ font:"13px Segoe UI,system-ui", color:UI.textDim, padding:"8px 12px", background:"#fafafa", borderBottom:"1px solid "+UI.border },
      modalBg:{ position:"fixed", left:"0", top:"0", width:"100vw", height:"100vh", background:"rgba(0,0,0,.35)", zIndex:"2147483000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 16px", boxSizing:"border-box", opacity:"0", transition:"opacity .2s ease", overflowY:"auto" },
      modal:{ width:"100%", maxWidth:"none", height:"100%", background:"#fff", display:"flex", flexDirection:"column", borderRadius:"0", boxShadow:"none", overflow:"hidden" },
      split:{ flex:"1", minHeight:"0", display:"flex", background:"#fff" },
      left:{ flex:"1", minWidth:"0", padding:"48px 36px", display:"grid", gridTemplateColumns:"minmax(0,1fr)", gap:"28px", justifyItems:"center", alignContent:"start", background:"linear-gradient(180deg,#f6f4f3 0%,#ecebea 100%)", overflowX:"hidden", overflowY:"auto", boxSizing:"border-box" },
      previewStage:{ display:"grid", justifyItems:"center", gap:"32px", width:"100%", maxWidth:"min(100%, "+Math.round(A4W*PREVIEW_MAX_SCALE+120)+"px)", margin:"0 auto", padding:"12px 0 48px", boxSizing:"border-box" },
      pageDivider:{ width:"100%", textAlign:"center", color:UI.textDim, font:"12px/1.4 Segoe UI,system-ui", borderTop:"1px dashed "+UI.borderSubtle, padding:"14px 0 0", opacity:"0.75" },
      breakMarker:{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", margin:"18px 0", padding:"10px 12px", border:"1px dashed "+UI.borderSubtle, borderRadius:"6px", background:"#f8fbff", color:UI.brand, font:"12px/1.3 Segoe UI,system-ui", letterSpacing:".08em", textTransform:"uppercase", userSelect:"none", cursor:"default" },
      rightWrap:{ width:"min(46vw, 720px)", minWidth:"360px", maxWidth:"720px", height:"100%", display:"flex", flexDirection:"column", background:"#fff" },
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
      hfAlignRow:{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", padding:"4px 2px 0" },
      hfAlignGroup:{ display:"inline-flex", border:"1px solid "+UI.borderSubtle, borderRadius:"999px", overflow:"hidden", background:"#fff" },
      hfAlignBtn:{ border:"0", background:"transparent", padding:"6px 12px", font:"12px/1.2 Segoe UI,system-ui", color:UI.textDim, cursor:"pointer", transition:"all .2s ease", minWidth:"48px" },
      hfEditable:{ width:"100%", minHeight:"96px", border:"1px solid "+UI.borderSubtle, borderRadius:"8px", padding:"0", font:"14px/1.5 Segoe UI,system-ui", color:UI.text, background:"#fff", boxSizing:"border-box", outline:"none", overflowY:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word", position:"relative" },
      hfCanvas:{ display:"flex", flexDirection:"column", gap:"8px", alignItems:"stretch" },
      hfCanvasGuide:{ font:"11px/1.4 Segoe UI,system-ui", color:UI.textDim, textTransform:"uppercase", letterSpacing:".08em" },
      hfCanvasStage:{ position:"relative", width:"100%", display:"flex", justifyContent:"center" },
      hfCanvasPage:{ position:"relative", width:"100%", maxWidth:innerHFWidth+"px", background:"#fff", border:"1px dashed "+UI.borderSubtle, borderRadius:"10px", padding:"12px", boxSizing:"border-box", boxShadow:"inset 0 0 0 1px rgba(15,108,189,.08)" },
      hfHint:{ font:"12px/1.4 Segoe UI,system-ui", color:UI.textDim },
      hfTokenRow:{ display:"flex", flexWrap:"wrap", gap:"8px", alignItems:"center" },
      hfTokenLabel:{ font:"12px/1.4 Segoe UI,system-ui", color:UI.textDim },
      hfTokenChip:{ borderRadius:"999px", border:"1px solid "+UI.borderSubtle, padding:"4px 10px", background:"#fff", color:UI.text, font:"12px/1.3 Segoe UI,system-ui", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:"6px", transition:"all .18s ease" },
      hfTemplateSection:{ display:"flex", flexDirection:"column", gap:"10px", background:"#fff", border:"1px solid "+UI.borderSubtle, borderRadius:"10px", padding:"12px" },
      hfTemplateHeader:{ font:"12px/1.4 Segoe UI,system-ui", fontWeight:"600", color:UI.text },
      hfTemplateHint:{ font:"11px/1.4 Segoe UI,system-ui", color:UI.textDim },
      hfTemplateGrid:{ display:"grid", gap:"8px", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))" },
      hfTemplateCard:{ borderRadius:"8px", border:"1px solid "+UI.borderSubtle, background:"#fafafa", padding:"10px 12px", display:"flex", flexDirection:"column", gap:"6px", textAlign:"left", cursor:"pointer", transition:"all .18s ease" },
      hfTemplateCardTitle:{ font:"12px/1.4 Segoe UI,system-ui", fontWeight:"600", color:UI.text },
      hfTemplateCardPreview:{ font:"11px/1.4 Segoe UI,system-ui", color:UI.textDim, display:"flex", flexDirection:"column", gap:"2px" },
      hfPreviewSection:{ display:"flex", flexDirection:"column", gap:"12px", border:"1px solid "+UI.borderSubtle, borderRadius:"12px", padding:"16px", background:"#fff" },
      hfPreviewTitle:{ font:"12px/1.4 Segoe UI,system-ui", fontWeight:"600", color:UI.text },
      hfPreviewHint:{ font:"11px/1.4 Segoe UI,system-ui", color:UI.textDim },
      hfPreviewCanvas:{ position:"relative", width:"100%", display:"flex", justifyContent:"center" },
      hfPreviewPage:{ width:"min(560px, 100%)", maxWidth:innerHFWidth+"px", borderRadius:"12px", border:"1px solid "+UI.borderSubtle, background:"#fff", boxShadow:"0 8px 20px rgba(0,0,0,.08)", padding:"22px 24px 18px", boxSizing:"border-box", display:"flex", flexDirection:"column", gap:"20px" },
      hfPreviewHeader:{ minHeight:"58px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"18px", padding:"4px 0", borderBottom:"1px dashed "+UI.borderSubtle, width:"100%" },
      hfPreviewFooter:{ minHeight:"52px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"18px", padding:"4px 0", borderTop:"1px dashed "+UI.borderSubtle, width:"100%" },
      hfPreviewBody:{ flex:"1", display:"flex", flexDirection:"column", gap:"10px", justifyContent:"center", font:"11px/1.5 Segoe UI,system-ui", color:UI.textDim, width:"100%" },
      hfFooter:{ padding:"16px 22px", borderTop:"1px solid "+UI.border, display:"flex", justifyContent:"flex-end", gap:"12px", flexWrap:"wrap" }
    };
    return { UI,A4W,A4H,HDR_H,FTR_H,HDR_MIN,FTR_MIN,PAD,DEBOUNCE_PREVIEW,MOBILE_BP,PREVIEW_MAX_SCALE,Style };
  })();
  function applyStyles(el, styles){ for(const k in styles){ el.style[k]=styles[k]; } }
  const StyleMirror=(function(){
    const FALLBACK={
      fontFamily:'"Segoe UI", system-ui, -apple-system, Arial, sans-serif',
      fontSize:'15px',
      lineHeight:'1.6',
      color:WCfg.UI.text,
      letterSpacing:'normal'
    };
    function cloneDefaults(){ return { fontFamily:FALLBACK.fontFamily, fontSize:FALLBACK.fontSize, lineHeight:FALLBACK.lineHeight, color:FALLBACK.color, letterSpacing:FALLBACK.letterSpacing }; }
    function capture(el){
      const style=cloneDefaults();
      if(!el || !window.getComputedStyle){ return style; }
      const computed=window.getComputedStyle(el);
      if(computed.fontFamily && computed.fontFamily.trim()){ style.fontFamily=computed.fontFamily; }
      if(computed.fontSize && computed.fontSize.trim()){ style.fontSize=computed.fontSize; }
      const lh=computed.lineHeight && computed.lineHeight.trim();
      if(lh && lh!=="normal" && lh!=="0") style.lineHeight=lh;
      const color=computed.color && computed.color.trim();
      if(color) style.color=color;
      const letterSpacing=computed.letterSpacing && computed.letterSpacing.trim();
      if(letterSpacing && letterSpacing!=="normal" && letterSpacing!=="0px") style.letterSpacing=letterSpacing;
      return style;
    }
    function apply(target, style){
      if(!target || !style) return;
      if(style.fontFamily) target.style.fontFamily=style.fontFamily;
      if(style.fontSize) target.style.fontSize=style.fontSize;
      if(style.lineHeight) target.style.lineHeight=style.lineHeight;
      if(style.color) target.style.color=style.color;
      if(style.letterSpacing){ target.style.letterSpacing=style.letterSpacing; }
    }
    function merge(base, override){
      const merged=cloneDefaults();
      if(base && typeof base==="object"){
        if(base.fontFamily) merged.fontFamily=base.fontFamily;
        if(base.fontSize) merged.fontSize=base.fontSize;
        if(base.lineHeight) merged.lineHeight=base.lineHeight;
        if(base.color) merged.color=base.color;
        if(base.letterSpacing) merged.letterSpacing=base.letterSpacing;
      }
      if(override && typeof override==="object"){
        if(override.fontFamily) merged.fontFamily=override.fontFamily;
        if(override.fontSize) merged.fontSize=override.fontSize;
        if(override.lineHeight) merged.lineHeight=override.lineHeight;
        if(override.color) merged.color=override.color;
        if(override.letterSpacing) merged.letterSpacing=override.letterSpacing;
      }
      return merged;
    }
    return { capture, apply, merge, defaults:cloneDefaults };
  })();
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
    function isBreakCommentNode(node){
      if(!node || node.nodeType!==8) return false;
      return String(node.nodeValue||"").trim().toLowerCase()==="page:break";
    }
    function convertWordLists(container){
      let node=container.firstChild; let activeList=null; let activeType="";
      while(node){ const next=node.nextSibling;
        if(node.nodeType===8){
          if(isBreakCommentNode(node)){ node=next; continue; }
          container.removeChild(node); node=next; continue;
        }
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
  const HFAlign=(function(){
    const allowed={ left:"left", center:"center", right:"right" };
    function normalize(value){
      const key=(value==null?"":String(value)).toLowerCase();
      return allowed[key] || "left";
    }
    function flexJustify(norm){
      if(norm==="center") return "center";
      if(norm==="right") return "flex-end";
      return "flex-start";
    }
    function applyHeader(node, align){
      if(!node || !node.style) return;
      const norm=normalize(align);
      node.style.justifyContent=flexJustify(norm);
      node.style.textAlign=norm;
    }
    function applyEditor(node, align){
      if(!node || !node.style) return;
      node.style.textAlign=normalize(align);
    }
    function applyFooter(node, align){
      if(!node || !node.style) return;
      node.style.textAlign=normalize(align);
    }
    return { normalize, applyHeader, applyEditor, applyFooter };
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
    const PLACEHOLDER_ATTR="data-weditor-break-placeholder";
    function isBreakComment(node){ return node && node.nodeType===8 && String(node.nodeValue).trim().toLowerCase()==="page:break"; }
    function isWhitespace(node){ return node && node.nodeType===3 && !node.nodeValue.trim(); }
    function isPlaceholder(node){ return node && node.nodeType===1 && node.getAttribute && node.getAttribute(PLACEHOLDER_ATTR); }
    function createPlaceholder(){
      const marker=document.createElement("div");
      marker.setAttribute(PLACEHOLDER_ATTR,"1");
      marker.setAttribute("contenteditable","false");
      marker.setAttribute("role","separator");
      marker.setAttribute("aria-label","Page break");
      marker.setAttribute("tabindex","0");
      applyStyles(marker, WCfg.Style.breakMarker);
      const label=document.createElement("span");
      label.textContent="Page Break 分頁線";
      marker.appendChild(label);
      return marker;
    }
    function attachPlaceholder(comment){
      if(!isBreakComment(comment) || !comment.parentNode) return null;
      let next=comment.nextSibling;
      while(isWhitespace(next)) next=next.nextSibling;
      if(isPlaceholder(next)) return next;
      const marker=createPlaceholder();
      if(comment.nextSibling){ comment.parentNode.insertBefore(marker, comment.nextSibling); }
      else { comment.parentNode.appendChild(marker); }
      return marker;
    }
    function removePlaceholderFor(comment){
      if(!comment || !comment.parentNode) return;
      let next=comment.nextSibling;
      while(isWhitespace(next)) next=next.nextSibling;
      if(isPlaceholder(next)){ next.parentNode && next.parentNode.removeChild(next); return; }
      let prev=comment.previousSibling;
      while(isWhitespace(prev)) prev=prev.previousSibling;
      if(isPlaceholder(prev)){ prev.parentNode && prev.parentNode.removeChild(prev); }
    }
    function ensurePlaceholders(root){
      if(!root || !document.createTreeWalker) return;
      const walker=document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null, false); let node;
      while((node=walker.nextNode())){ if(isBreakComment(node)) attachPlaceholder(node); }
    }
    function stripPlaceholders(root){
      if(!root || !root.querySelectorAll) return;
      const nodes=root.querySelectorAll("["+PLACEHOLDER_ATTR+"]");
      for(let i=0;i<nodes.length;i++){ const n=nodes[i]; if(n && n.parentNode) n.parentNode.removeChild(n); }
    }
    function serialize(root){
      if(!root) return "";
      if(typeof root==="string") return root;
      const clone=root.cloneNode(true);
      if(clone.nodeType===11){ const wrap=document.createElement("div"); wrap.appendChild(clone); stripPlaceholders(wrap); return wrap.innerHTML; }
      stripPlaceholders(clone);
      return clone.innerHTML;
    }
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
      attachPlaceholder(comment);
      function nextContentSibling(node){
        let current=node.nextSibling;
        while(current){
          if(isBreakComment(current)){
            current=current.nextSibling;
            continue;
          }
          if(isPlaceholder(current)){
            current=current.nextSibling;
            continue;
          }
          if(current.nodeType===3 && !current.nodeValue.trim()){
            const removable=current;
            current=current.nextSibling;
            removable.parentNode && removable.parentNode.removeChild(removable);
            continue;
          }
          return current;
        }
        return null;
      }
      function firstCaretPosition(node){
        if(!node) return null;
        if(node.nodeType===3){
          return { node, offset:0 };
        }
        if(node.nodeType===1){
          if(node.childNodes && node.childNodes.length){
            for(let i=0;i<node.childNodes.length;i++){
              const child=node.childNodes[i];
              const found=firstCaretPosition(child);
              if(found) return found;
            }
          }
          return { node, offset:0 };
        }
        return null;
      }
      function placeCaret(position){
        if(!position) return;
        const selection=window.getSelection ? window.getSelection() : null;
        if(!selection || !document.createRange) return;
        const range=document.createRange();
        range.setStart(position.node, position.offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      let caretTarget=nextContentSibling(comment);
      if(!caretTarget){
        const placeholder=document.createElement("p");
        const text=document.createTextNode("");
        placeholder.appendChild(text);
        targetEl.appendChild(placeholder);
        caretTarget=text;
      }
      if(targetEl && typeof targetEl.focus==="function") targetEl.focus();
      placeCaret(firstCaretPosition(caretTarget));
    }
    function remove(targetEl){
      const sel=window.getSelection ? window.getSelection() : null; let node=(sel && sel.rangeCount) ? sel.anchorNode : null;
      if(!node || !targetEl.contains(node)){
        for(let i=targetEl.childNodes.length-1;i>=0;i--){ const n=targetEl.childNodes[i]; if(isBreakComment(n)){ removePlaceholderFor(n); n.remove(); return true; } }
        alert("No page break found near cursor."); return false;
      }
      while(node && node.parentNode!==targetEl){ node=node.parentNode; }
      let f=node.nextSibling; while(isWhitespace(f)) f=f.nextSibling; if(isBreakComment(f)){ removePlaceholderFor(f); f.remove(); return true; }
      let b=node.previousSibling; while(isWhitespace(b)) b=b.previousSibling; if(isBreakComment(b)){ removePlaceholderFor(b); b.remove(); return true; }
      alert("No page break found next to the cursor."); return false;
    }
    return { insert, remove, ensurePlaceholders, stripPlaceholders, serialize };
  })();
  const Paginator=(function(){
    const HEADER_BASE_STYLE="padding:0;border-bottom:1px solid "+WCfg.UI.border+";background:#fff;color:"+WCfg.UI.text+";font:14px Segoe UI,system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;row-gap:6px;box-sizing:border-box;";
    const FOOTER_BASE_STYLE="padding:0;border-top:1px solid "+WCfg.UI.border+";background:#fff;color:"+WCfg.UI.text+";font:12px Segoe UI,system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;row-gap:6px;box-sizing:border-box;";
    function makePage(pageNo, opts){
      const headerEnabled=opts.headerEnabled, footerEnabled=opts.footerEnabled, headerHTML=opts.headerHTML, footerHTML=opts.footerHTML;
      const headerAlign=HFAlign.normalize(opts.headerAlign);
      const footerAlign=HFAlign.normalize(opts.footerAlign);
      const headerHeight=opts.headerHeight!=null ? opts.headerHeight : (headerEnabled?WCfg.HDR_H:0);
      const footerHeight=opts.footerHeight!=null ? opts.footerHeight : (footerEnabled?WCfg.FTR_H:0);
      const {A4W,A4H,PAD,UI,Style}=WCfg;
      const textStyle=StyleMirror.merge(null, opts.textStyle);
      const page=document.createElement("div");
      page.setAttribute("data-page", String(pageNo));
      page.style.cssText="width:"+A4W+"px;height:"+A4H+"px;"+Style.pageFrame+";";
      if(pageNo===1){
        page.style.pageBreakBefore="auto";
        page.style.breakBefore="auto";
      } else {
        page.style.pageBreakBefore="always";
        page.style.breakBefore="page";
      }
      let header=null, footer=null;
      if(headerEnabled){
        header=document.createElement("div");
        header.className="weditor_page-header";
        const minHeaderHeight=Math.max(WCfg.HDR_MIN, headerHeight);
        header.style.cssText="position:absolute;left:0;right:0;top:0;"+HEADER_BASE_STYLE+"min-height:"+minHeaderHeight+"px;";
        header.innerHTML=headerHTML;
        HFAlign.applyHeader(header, headerAlign);
        page.appendChild(header);
      }
      const content=document.createElement("div");
      content.className="weditor_page-content";
      content.style.position="absolute";
      content.style.left="0";
      content.style.right="0";
      content.style.top=(headerEnabled?headerHeight:0)+"px";
      content.style.bottom=(footerEnabled?footerHeight:0)+"px";
      content.style.padding=PAD+"px";
      content.style.overflow="hidden";
      StyleMirror.apply(content, textStyle);
      page.appendChild(content);
      if(footerEnabled){
        footer=document.createElement("div");
        footer.className="weditor_page-footer";
        const minFooterHeight=Math.max(WCfg.FTR_MIN, footerHeight);
        footer.style.cssText="position:absolute;left:0;right:0;bottom:0;"+FOOTER_BASE_STYLE+"min-height:"+minFooterHeight+"px;";
        const fl=document.createElement("div");
        fl.className="weditor_page-footer-left";
        fl.style.cssText="flex:1 1 auto;min-width:160px";
        fl.innerHTML=footerHTML;
        HFAlign.applyFooter(fl, footerAlign);
        footer.appendChild(fl);
        page.appendChild(footer);
      }
      return { page, content, headerNode:header, footerNode:footer, explicit:false, headerHeight, footerHeight };
    }
    function substituteTokensForMeasure(html){
      if(!html) return "";
      return String(html)
        .replace(/{{\s*page\s*}}/gi, "888")
        .replace(/{{\s*total\s*}}/gi, "888")
        .replace(/{{\s*date\s*}}/gi, "2025-12-31");
    }
    function enforceHFImageSizing(root){
      const imgs=root.querySelectorAll ? root.querySelectorAll("img") : [];
      for(let i=0;i<imgs.length;i++){
        const img=imgs[i];
        if(!img.style.maxWidth) img.style.maxWidth="100%";
        if(!img.style.height || img.style.height==="auto") img.style.height="auto";
        if(!img.style.objectFit) img.style.objectFit="contain";
      }
    }
    function measureSection(kind, html, align){
      const host=document.createElement("div");
      host.style.cssText="position:absolute;left:-99999px;top:-99999px;width:"+WCfg.A4W+"px;visibility:hidden;pointer-events:none;opacity:0;";
      const box=document.createElement("div");
      const minHeight=kind==="header"?WCfg.HDR_MIN:WCfg.FTR_MIN;
      const fallbackHeight=kind==="header"?WCfg.HDR_H:WCfg.FTR_H;
      box.style.cssText=(kind==="header"?HEADER_BASE_STYLE:FOOTER_BASE_STYLE)+"min-height:"+minHeight+"px;width:"+WCfg.A4W+"px;";
      if(kind==="footer"){
        box.style.display="flex";
        const left=document.createElement("div");
        left.style.cssText="flex:1 1 auto;min-width:160px";
        left.innerHTML=html;
        enforceHFImageSizing(left);
        HFAlign.applyFooter(left, align);
        box.appendChild(left);
      }else{
        box.innerHTML=html;
        enforceHFImageSizing(box);
        HFAlign.applyHeader(box, align);
      }
      host.appendChild(box);
      document.body.appendChild(host);
      const rect=box.getBoundingClientRect();
      let height=Math.ceil(rect.height||0);
      if(!height || !isFinite(height)) height=fallbackHeight;
      document.body.removeChild(host);
      return Math.max(minHeight, height);
    }
    function measureLayout(headerEnabled, headerHTML, footerEnabled, footerHTML, headerAlign, footerAlign){
      const headerHeight = headerEnabled ? measureSection("header", substituteTokensForMeasure(headerHTML||""), headerAlign) : 0;
      const footerHeight = footerEnabled ? measureSection("footer", substituteTokensForMeasure(footerHTML||""), footerAlign) : 0;
      return { headerHeight, footerHeight };
    }
    function paginate(rawHTML, state){
      const {headerEnabled, footerEnabled, headerHTML, footerHTML}=state;
      const headerAlign=HFAlign.normalize(state.headerAlign);
      const footerAlign=HFAlign.normalize(state.footerAlign);
      const {A4W,A4H,PAD,UI,Style}=WCfg;
      const textStyle=StyleMirror.capture(state && state.el ? state.el : null);
      const layout=measureLayout(headerEnabled, headerHTML, footerEnabled, footerHTML, headerAlign, footerAlign);
      const headerHeight=layout.headerHeight;
      const footerHeight=layout.footerHeight;
      const AVAIL=Math.max(64, A4H - headerHeight - footerHeight - 2*PAD);
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
      const measPage=makePage(1, {headerEnabled, footerEnabled, headerHTML, footerHTML, headerHeight, footerHeight, headerAlign, footerAlign, textStyle});
      const measContent=measPage.content; measWrap.appendChild(measPage.page);
      const pages=[]; let cur=makePage(1, {headerEnabled, footerEnabled, headerHTML, footerHTML, headerHeight, footerHeight, headerAlign, footerAlign, textStyle}); let used=0;
      function hasContent(pg){
        if(!pg || !pg.content) return false;
        const text=(pg.content.textContent||"").replace(/\u00a0/g," ").replace(/\u200b/g,"").trim();
        if(text) return true;
        if(!pg.content.querySelector) return false;
        return !!pg.content.querySelector("img,table,svg,canvas,video,figure,ul,ol,li,blockquote,hr,pre,code");
      }
      function push(force){ if(force || hasContent(cur)){ pages.push(cur); } }
      function next(force){ push(!!force); cur=makePage(pages.length+1, {headerEnabled, footerEnabled, headerHTML, footerHTML, headerHeight, footerHeight, headerAlign, footerAlign, textStyle}); used=0; }
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
        if(headerEnabled && pg.headerNode) Tokens.apply(pg.headerNode, {page:i+1,total,date:dateStr});
        if(footerEnabled && pg.footerNode) Tokens.apply(pg.footerNode, {page:i+1,total,date:dateStr});
        let topOffset=Math.max(WCfg.HDR_MIN, headerHeight);
        if(headerEnabled && pg.headerNode){
          const rect=pg.headerNode.getBoundingClientRect();
          const actual=Math.max(Math.ceil(rect.height||0), WCfg.HDR_MIN);
          topOffset=Math.max(headerHeight, actual);
          pg.headerNode.style.minHeight=Math.max(actual, WCfg.HDR_MIN)+"px";
        }
        let bottomOffset=Math.max(WCfg.FTR_MIN, footerHeight);
        if(footerEnabled && pg.footerNode){
          const rect=pg.footerNode.getBoundingClientRect();
          const actual=Math.max(Math.ceil(rect.height||0), WCfg.FTR_MIN);
          bottomOffset=Math.max(footerHeight, actual);
          pg.footerNode.style.minHeight=Math.max(actual, WCfg.FTR_MIN)+"px";
        }
        if(pg.content){
          pg.content.style.top = (headerEnabled?topOffset:0)+"px";
          pg.content.style.bottom = (footerEnabled?bottomOffset:0)+"px";
        }
      }
      let pagesHTML=""; for(let i=0;i<pages.length;i++){ pagesHTML+=pages[i].page.outerHTML; }
      measWrap.parentNode.removeChild(measWrap);
      return { pages: pages.map(function(p){ return p.page; }), pagesHTML };
    }
    function pagesHTML(inst){ return paginate(Breaks.serialize(inst.el), inst).pagesHTML; }
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
  const PAGED_PRINT_STYLES = "div[data-page]{border-radius:0!important;box-shadow:none!important;border:none!important;outline:none!important;}div[data-page]:not([data-page=\"1\"]){page-break-before:always;break-before:page;}div[data-page=\"1\"]{page-break-before:auto;break-before:auto;}.weditor_page-header,.weditor_page-footer{border:none!important;box-shadow:none!important;}.weditor_page-header{border-bottom:0!important;}.weditor_page-footer{border-top:0!important;}";
  const PrintUI=(function(){
    function open(pagedHTML){
      const w=WDom.openBlank(); if(!w) return;
      const html="<!DOCTYPE html><html><head><meta charset='utf-8'>"+
               "<style>"+PAGED_PRINT_STYLES+"</style>"+
               "</head><body style='margin:0;background:#fff;font-family:Segoe UI,system-ui,-apple-system,Arial' onload='window.print();window.onafterprint=function(){window.close();}'>"+
               pagedHTML+
               "</body></html>";
      w.document.open(); w.document.write(html); w.document.close();
    }
    return { open };
  })();
  const HFEditor=(function(){
    function enableImageResizer(editor){
      if(!editor) return;
      if(editor.__weditorImageResizer){
        const overlay=editor.__weditorImageOverlay;
        if(overlay && !editor.contains(overlay)){
          editor.appendChild(overlay);
          if(editor.__weditorHideOverlay) editor.__weditorHideOverlay();
        }
        return;
      }
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
      const readout=document.createElement("div");
      readout.setAttribute("data-weditor-overlay","1");
      readout.style.position="absolute";
      readout.style.right="0";
      readout.style.top="-26px";
      readout.style.padding="2px 6px";
      readout.style.font="11px/1.4 Segoe UI,system-ui";
      readout.style.color="#fff";
      readout.style.background=WCfg.UI.brand;
      readout.style.borderRadius="6px";
      readout.style.boxShadow="0 2px 6px rgba(0,0,0,.18)";
      readout.style.whiteSpace="nowrap";
      readout.style.pointerEvents="none";
      overlay.appendChild(readout);
      editor.appendChild(overlay);
      editor.__weditorImageOverlay = overlay;
      let activeImg=null;
      let raf=null;
      function hideOverlay(){
        overlay.style.display="none";
        readout.textContent="";
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
        const widthPx=Math.round(rect.width);
        const totalWidth=Math.max(1, editor.getBoundingClientRect().width);
        const percent=Math.min(999, Math.round((widthPx/totalWidth)*100));
        readout.textContent=widthPx+"px · "+percent+"%";
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
      editor.__weditorCleanup=function(){ if(raf) cancelAnimationFrame(raf); window.removeEventListener("resize", scheduleOverlay); observer.disconnect(); if(overlay.parentNode) overlay.parentNode.removeChild(overlay); editor.__weditorImageOverlay=null; editor.__weditorImageResizer=false; };
    }
    let uid=0;
    const TOKEN_OPTIONS=[
      { value:"{{date}}", label:"{{date}}" },
      { value:"{{page}}", label:"{{page}}" },
      { value:"{{total}}", label:"{{total}}" }
    ];
    const TOKEN_LOOKUP=TOKEN_OPTIONS.reduce(function(acc,opt){ acc[opt.value]=opt; return acc; },{});
    function escapeRegExp(str){ return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
    const TOKEN_REGEX=new RegExp("("+TOKEN_OPTIONS.map(function(opt){ return escapeRegExp(opt.value); }).join("|")+")","g");
    function createTokenChip(value){
      const meta=TOKEN_LOOKUP[value]||{ label:value };
      const chip=document.createElement("span");
      chip.setAttribute("data-weditor-token", value);
      chip.setAttribute("contenteditable","false");
      chip.textContent=meta.label;
      chip.style.display="inline-flex";
      chip.style.alignItems="center";
      chip.style.justifyContent="center";
      chip.style.padding="2px 8px";
      chip.style.margin="0 2px";
      chip.style.borderRadius="999px";
      chip.style.border="1px solid "+WCfg.UI.borderSubtle;
      chip.style.background="#e6f2fb";
      chip.style.color=WCfg.UI.brand;
      chip.style.font="12px/1.2 Segoe UI,system-ui";
      chip.style.whiteSpace="nowrap";
      return chip;
    }
    function decorateTokens(root){
      if(!root) return;
      const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      const targets=[]; let node;
      while((node=walker.nextNode())){
        if(!node.nodeValue) continue;
        const parent=node.parentNode;
        if(parent && parent.nodeType===1 && parent.hasAttribute && parent.hasAttribute("data-weditor-token")) continue;
        if(parent && parent.closest && parent.closest('[data-weditor-token]')) continue;
        if(node.nodeValue.indexOf('{{')===-1) continue;
        targets.push(node);
      }
      for(let i=0;i<targets.length;i++){
        const textNode=targets[i];
        const original=textNode.nodeValue||"";
        const parts=original.split(TOKEN_REGEX);
        if(parts.length<=1) continue;
        const frag=document.createDocumentFragment();
        for(let j=0;j<parts.length;j++){
          const part=parts[j];
          if(!part) continue;
          if(Object.prototype.hasOwnProperty.call(TOKEN_LOOKUP, part)) frag.appendChild(createTokenChip(part));
          else frag.appendChild(document.createTextNode(part));
        }
        if(textNode.parentNode) textNode.parentNode.replaceChild(frag, textNode);
      }
    }
    function unwrapTokenChips(root){
      if(!root || !root.querySelectorAll) return;
      const chips=root.querySelectorAll('[data-weditor-token]');
      for(let i=0;i<chips.length;i++){
        const chip=chips[i];
        const token=chip.getAttribute("data-weditor-token") || chip.textContent || "";
        const text=document.createTextNode(token);
        chip.parentNode.replaceChild(text, chip);
      }
    }
    const TEMPLATE_LIBRARY={
      header:[
        {
          id:"letterhead",
          label:"🏢 Company Letterhead",
          preview:'<strong>Acme Corp</strong><span>123 Market St · {{date}}</span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;">'+
            '<div style="display:flex;align-items:center;gap:12px;">'+
              '<img src="https://picsum.photos/seed/weditor-letterhead/48/48" alt="Company logo" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">'+
              '<div>'+
                '<div style="font-size:16px;font-weight:600;">Acme Corporation</div>'+
                '<div style="font-size:12px;color:#666;">123 Market Street · San Francisco, CA</div>'+
              '</div>'+
            '</div>'+
            '<div style="text-align:right;font-size:12px;line-height:1.5;color:#666;">'+
              '<div>{{date}}</div>'+
              '<div>+1 (555) 010-2000</div>'+
              '<div>hello@acme.com</div>'+
            '</div>'+
          '</div>',
          align:"left"
        },
        {
          id:"report",
          label:"📊 Company Report",
          preview:'<span>Q4 Business Review</span><span>Confidential · {{date}}</span>',
          html:'<div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;">'+
            '<div style="font-size:16px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;">Q4 Business Review</div>'+
            '<div style="font-size:12px;color:#666;">Confidential · {{date}}</div>'+
          '</div>',
          align:"center"
        },
        {
          id:"project",
          label:"🗂️ Project Brief",
          preview:'<span>Project Phoenix</span><span>Version {{page}} · {{date}}</span>',
          html:'<div style="display:flex;flex-direction:column;gap:4px;width:100%;">'+
            '<div style="font-size:15px;font-weight:600;">Project Phoenix</div>'+
            '<div style="font-size:12px;color:#666;">Sprint Summary · Version {{page}} · {{date}}</div>'+
          '</div>',
          align:"left"
        },
        {
          id:"minutes",
          label:"📝 Meeting Minutes",
          preview:'<span>Weekly Sync</span><span>{{date}} · 10:00 AM</span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;">'+
            '<div>'+
              '<div style="font-size:15px;font-weight:600;">Weekly Sync</div>'+
              '<div style="font-size:12px;color:#666;">Prepared by Operations</div>'+
            '</div>'+
            '<div style="text-align:right;font-size:12px;color:#666;">'+
              '<div>{{date}}</div>'+
              '<div>10:00 AM · Zoom</div>'+
            '</div>'+
          '</div>',
          align:"left"
        }
      ],
      footer:[
        {
          id:"invoice",
          label:"🧾 Invoice / Quotation",
          preview:'<span>Acme Finance</span><span>Page {{page}} of {{total}}</span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;font-size:12px;">'+
            '<div>Acme Finance · Accounts Payable</div>'+
            '<div style="text-align:right;">Page {{page}} of {{total}}</div>'+
          '</div>',
          align:"left"
        },
        {
          id:"confidential",
          label:"🔒 Confidential Notice",
          preview:'<span>Confidential · Internal Use Only</span>',
          html:'<div style="width:100%;text-align:center;font-size:12px;">Confidential · Internal Use Only · {{date}}</div>',
          align:"center"
        },
        {
          id:"delivery",
          label:"🚚 Delivery Order",
          preview:'<span>Logistics Hotline</span><span>{{page}}/{{total}}</span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;font-size:12px;">'+
            '<div>Logistics Hotline · +65 6100 1234</div>'+
            '<div style="text-align:center;">Page {{page}} / {{total}}</div>'+
            '<div style="text-align:right;">www.acme-shipping.com</div>'+
          '</div>',
          align:"left"
        },
        {
          id:"contract",
          label:"📄 Contract Footer",
          preview:'<span>Prepared for Client</span><span>{{date}}</span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;font-size:12px;">'+
            '<div>Prepared by Legal Team</div>'+
            '<div style="text-align:right;">Version {{page}} · {{date}}</div>'+
          '</div>',
          align:"left"
        }
      ]
    };
    const PREVIEW_TOKEN_VALUES={ "{{date}}":"Aug 18, 2024", "{{page}}":"3", "{{total}}":"12" };
    function replacePreviewTokens(html){
      let out=html||"";
      for(const key in PREVIEW_TOKEN_VALUES){
        if(Object.prototype.hasOwnProperty.call(PREVIEW_TOKEN_VALUES, key)){
      const pattern=new RegExp(escapeRegExp(key),"g");
          out=out.replace(pattern, PREVIEW_TOKEN_VALUES[key]);
        }
      }
      return out;
    }
    function section(kind, titleText, description, enabled, html, align){
      const changeHandlers=[];
      function notifyChange(){ for(let i=0;i<changeHandlers.length;i++){ changeHandlers[i](); } }
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
      decorateTokens(editor);
      let alignValue=HFAlign.normalize(align);
      function enforceImageSizing(target){
        const imgs=target.querySelectorAll ? target.querySelectorAll("img") : [];
        for(let i=0;i<imgs.length;i++){
          const img=imgs[i];
          if(!img.style.maxWidth) img.style.maxWidth="100%";
          if(!img.style.height || img.style.height==="auto") img.style.height="auto";
          if(!img.style.objectFit) img.style.objectFit="contain";
        }
      }
      enforceImageSizing(editor);
      editor.addEventListener("paste", function(){ window.setTimeout(function(){ Normalizer.fixStructure(editor); enforceImageSizing(editor); decorateTokens(editor); notifyChange(); }, 0); });
      let decorateTimer=null;
      editor.addEventListener("input", function(){
        enforceImageSizing(editor);
        if(decorateTimer){ window.clearTimeout(decorateTimer); }
        decorateTimer=window.setTimeout(function(){ decorateTokens(editor); notifyChange(); }, 120);
      });
      const tokenRow=document.createElement("div"); applyStyles(tokenRow, WCfg.Style.hfTokenRow);
      const tokenLabel=document.createElement("span"); applyStyles(tokenLabel, WCfg.Style.hfTokenLabel); tokenLabel.textContent="🧩 Smart Tokens 智慧變量";
      tokenRow.appendChild(tokenLabel);
      const tokenButtons=[];
      for(let i=0;i<TOKEN_OPTIONS.length;i++){
        const opt=TOKEN_OPTIONS[i];
        const chip=document.createElement("button");
        chip.type="button";
        applyStyles(chip, WCfg.Style.hfTokenChip);
        chip.textContent=opt.label;
        chip.setAttribute("data-token", opt.value);
        chip.addEventListener("mouseenter", function(){ if(!chip.disabled) chip.style.background="#f3f2f1"; });
        chip.addEventListener("mouseleave", function(){ chip.style.background="#fff"; });
        chip.addEventListener("click", function(){ if(chip.disabled) return; if(!toggle.checked){ toggle.checked=true; sync(); }
          insertContent(createTokenChip(opt.value));
        });
        tokenButtons.push(chip);
        tokenRow.appendChild(chip);
      }
      wrap.appendChild(tokenRow);
      const alignRow=document.createElement("div"); applyStyles(alignRow, WCfg.Style.hfAlignRow);
      const alignLabel=document.createElement("span");
      alignLabel.textContent="Align 對齊";
      alignLabel.style.font="12px/1.4 Segoe UI,system-ui";
      alignLabel.style.color=WCfg.UI.textDim;
      const alignGroup=document.createElement("div"); applyStyles(alignGroup, WCfg.Style.hfAlignGroup);
      alignGroup.setAttribute("role","group");
      alignGroup.setAttribute("aria-label", titleText+" alignment controls");
      const alignButtons=[];
      const alignOptions=[
        { value:"left", label:"Left", title:"Align left / 靠左" },
        { value:"center", label:"Center", title:"Align center / 置中" },
        { value:"right", label:"Right", title:"Align right / 靠右" }
      ];
      for(let i=0;i<alignOptions.length;i++){
        const opt=alignOptions[i];
        const btn=document.createElement("button");
        btn.type="button";
        applyStyles(btn, WCfg.Style.hfAlignBtn);
        btn.textContent=opt.label;
        btn.title=opt.title;
        btn.setAttribute("data-align", opt.value);
        btn.setAttribute("aria-pressed","false");
        if(i<alignOptions.length-1) btn.style.borderRight="1px solid "+WCfg.UI.borderSubtle;
        btn.addEventListener("click", function(){ if(!toggle.checked) return; setAlign(opt.value); });
        alignGroup.appendChild(btn);
        alignButtons.push({ value:opt.value, button:btn });
      }
      alignRow.appendChild(alignLabel);
      alignRow.appendChild(alignGroup);
      wrap.appendChild(alignRow);
      const templateButtons=[];
      const templates=TEMPLATE_LIBRARY[kind]||[];
      if(templates.length){
        const templateBox=document.createElement("div"); applyStyles(templateBox, WCfg.Style.hfTemplateSection);
        const templateTitle=document.createElement("div"); applyStyles(templateTitle, WCfg.Style.hfTemplateHeader); templateTitle.textContent="Template Library 模板庫";
        const templateHint=document.createElement("div"); applyStyles(templateHint, WCfg.Style.hfTemplateHint); templateHint.textContent="點擊直接套用常見商務樣式";
        const templateGrid=document.createElement("div"); applyStyles(templateGrid, WCfg.Style.hfTemplateGrid);
        for(let i=0;i<templates.length;i++){
          const tpl=templates[i];
          const card=document.createElement("button"); card.type="button"; applyStyles(card, WCfg.Style.hfTemplateCard);
          const cardTitle=document.createElement("div"); applyStyles(cardTitle, WCfg.Style.hfTemplateCardTitle); cardTitle.textContent=tpl.label;
          const cardPreview=document.createElement("div"); applyStyles(cardPreview, WCfg.Style.hfTemplateCardPreview);
          cardPreview.innerHTML=Sanitizer.clean(tpl.preview||tpl.html||"");
          decorateTokens(cardPreview);
          card.appendChild(cardTitle);
          card.appendChild(cardPreview);
          card.addEventListener("mouseenter", function(){ if(!card.disabled) card.style.background="#f3f2f1"; });
          card.addEventListener("mouseleave", function(){ card.style.background="#fafafa"; });
          card.addEventListener("click", function(){
            if(card.disabled) return;
            if(!toggle.checked){ toggle.checked=true; sync(); }
            editor.innerHTML=Sanitizer.clean(tpl.html||"");
            reattachImageOverlay();
            if(editor.__weditorHideOverlay) editor.__weditorHideOverlay();
            decorateTokens(editor);
            Normalizer.fixStructure(editor);
            enforceImageSizing(editor);
            setAlign(tpl.align || "left");
            WDom.placeCaretAtEnd(editor);
            notifyChange();
          });
          templateButtons.push(card);
          templateGrid.appendChild(card);
        }
        templateBox.appendChild(templateTitle);
        templateBox.appendChild(templateHint);
        templateBox.appendChild(templateGrid);
        wrap.appendChild(templateBox);
      }
      function updateAlignUI(){
        HFAlign.applyEditor(editor, alignValue);
        for(let i=0;i<alignButtons.length;i++){
          const item=alignButtons[i];
          const active=item.value===alignValue;
          item.button.setAttribute("aria-pressed", active?"true":"false");
          item.button.style.background=active?"#e6f2fb":"#fff";
          item.button.style.color=active?WCfg.UI.brand:WCfg.UI.textDim;
          item.button.style.fontWeight=active?"600":"400";
        }
        notifyChange();
      }
      function setAlign(next){
        const norm=HFAlign.normalize(next);
        alignValue=norm;
        updateAlignUI();
      }
      updateAlignUI();
      const canvas=document.createElement("div"); applyStyles(canvas, WCfg.Style.hfCanvas);
      const guide=document.createElement("div"); applyStyles(guide, WCfg.Style.hfCanvasGuide);
      guide.textContent="EDITABLE AREA · 寬度約 "+(WCfg.A4W-36)+"px";
      canvas.appendChild(guide);
      const stage=document.createElement("div"); applyStyles(stage, WCfg.Style.hfCanvasStage);
      const pageBox=document.createElement("div"); applyStyles(pageBox, WCfg.Style.hfCanvasPage);
      pageBox.appendChild(editor);
      stage.appendChild(pageBox);
      canvas.appendChild(stage);
      wrap.appendChild(canvas);
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
      function reattachImageOverlay(){
        const overlay=editor.__weditorImageOverlay;
        if(overlay && !editor.contains(overlay)) editor.appendChild(overlay);
      }
      function insertContent(content){
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
        const frag=document.createDocumentFragment();
        let lastInserted=null;
        if(typeof content==="string"){
          const temp=document.createElement("div"); temp.innerHTML=content;
          let node;
          while((node=temp.firstChild)){ lastInserted=node; frag.appendChild(node); }
        } else if(content){
          lastInserted=content;
          frag.appendChild(content);
        }
        range.deleteContents(); range.insertNode(frag);
        if(lastInserted){
          range.setStartAfter(lastInserted);
          range.setEndAfter(lastInserted);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        Normalizer.fixStructure(editor);
        decorateTokens(editor);
        reattachImageOverlay();
        if(editor.__weditorHideOverlay) editor.__weditorHideOverlay();
        notifyChange();
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
          const snippet='<img src="'+dataUrl+'" alt="'+alt+'" style="max-width:100%;height:auto;object-fit:contain;">';
          insertContent(snippet);
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
        for(let k=0;k<tokenButtons.length;k++){
          const chip=tokenButtons[k];
          chip.disabled=!on;
          chip.style.opacity=on?"1":"0.55";
          chip.style.cursor=on?"pointer":"not-allowed";
        }
        for(let t=0;t<templateButtons.length;t++){
          const btn=templateButtons[t];
          btn.disabled=!on;
          btn.style.opacity=on?"1":"0.55";
          btn.style.cursor=on?"pointer":"not-allowed";
        }
        status.textContent = on?"Enabled":"Disabled";
        for(let i=0;i<alignButtons.length;i++){
          const btn=alignButtons[i].button;
          btn.disabled=!on;
          btn.style.opacity=on?"1":"0.55";
          btn.style.cursor=on?"pointer":"not-allowed";
        }
        updateAlignUI();
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
          unwrapTokenChips(clone);
          return clone.innerHTML;
        },
        getPreviewHTML:function(){
          const clone=editor.cloneNode(true);
          const overlays=clone.querySelectorAll('[data-weditor-overlay]');
          for(let i=0;i<overlays.length;i++){ const el=overlays[i]; if(el && el.parentNode) el.parentNode.removeChild(el); }
          const actives=clone.querySelectorAll('.weditor-hf-img-active');
          for(let j=0;j<actives.length;j++){ actives[j].classList.remove('weditor-hf-img-active'); }
          unwrapTokenChips(clone);
          return Sanitizer.clean(clone.innerHTML);
        },
        getAlign:function(){ return alignValue; },
        onChange:function(cb){ if(typeof cb==="function") changeHandlers.push(cb); }
      };
    }
    function open(inst, ctx){
      const existing=document.querySelector('[data-weditor-modal="hf"]');
      if(existing){
        if(typeof existing.__weditorClose === "function"){ existing.__weditorClose(); }
        else if(existing.parentNode){ existing.parentNode.removeChild(existing); }
      }
      A11y.lockScroll();
      const bg=document.createElement("div"); applyStyles(bg, WCfg.Style.modalBg);
      bg.setAttribute("data-weditor-modal","hf");
      if(inst && typeof inst.uid !== "undefined"){ bg.setAttribute("data-weditor-owner", String(inst.uid)); }
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
      const tokenHint="Smart tokens: <code>{{page}}</code> <code>{{total}}</code> <code>{{date}}</code>";
      const headerSection=section("header","Header", tokenHint, inst.headerEnabled, inst.headerHTML, inst.headerAlign);
      const footerSection=section("footer","Footer", tokenHint+" · Use tokens to add page counter manually", inst.footerEnabled, inst.footerHTML, inst.footerAlign);
      body.appendChild(headerSection.el);
      body.appendChild(footerSection.el);
      const previewSection=document.createElement("section"); applyStyles(previewSection, WCfg.Style.hfPreviewSection);
      const previewTitle=document.createElement("div"); applyStyles(previewTitle, WCfg.Style.hfPreviewTitle); previewTitle.textContent="Live Preview 即時預覽";
      const previewHint=document.createElement("div"); applyStyles(previewHint, WCfg.Style.hfPreviewHint); previewHint.textContent="依照目前模板與 token 值即時呈現";
      const previewCanvas=document.createElement("div"); applyStyles(previewCanvas, WCfg.Style.hfPreviewCanvas);
      const previewPage=document.createElement("div"); applyStyles(previewPage, WCfg.Style.hfPreviewPage);
      const previewHeader=document.createElement("div"); applyStyles(previewHeader, WCfg.Style.hfPreviewHeader);
      const previewBody=document.createElement("div"); applyStyles(previewBody, WCfg.Style.hfPreviewBody);
      for(let i=0;i<4;i++){
        const line=document.createElement("div");
        line.style.height="6px";
        line.style.borderRadius="999px";
        line.style.background="#e1dfdd";
        line.style.opacity=String(0.85 - i*0.15);
        previewBody.appendChild(line);
      }
      const previewFooter=document.createElement("div"); applyStyles(previewFooter, WCfg.Style.hfPreviewFooter);
      previewPage.appendChild(previewHeader);
      previewPage.appendChild(previewBody);
      previewPage.appendChild(previewFooter);
      previewCanvas.appendChild(previewPage);
      previewSection.appendChild(previewTitle);
      previewSection.appendChild(previewHint);
      previewSection.appendChild(previewCanvas);
      function setPreviewMessage(target, message){
        target.innerHTML="";
        target.style.justifyContent="center";
        target.style.textAlign="center";
        const msg=document.createElement("div");
        msg.textContent=message;
        msg.style.font="11px/1.4 Segoe UI,system-ui";
        msg.style.color=WCfg.UI.textDim;
        msg.style.width="100%";
        target.appendChild(msg);
      }
      function applyFooterAlign(node, align){
        const norm=HFAlign.normalize(align);
        if(!node || !node.style) return;
        if(norm==="center"){ node.style.justifyContent="center"; }
        else if(norm==="right"){ node.style.justifyContent="flex-end"; }
        else { node.style.justifyContent="flex-start"; }
        node.style.textAlign=norm;
      }
      function renderPreview(){
        const headerEnabled=!!headerSection.toggle.checked;
        const footerEnabled=!!footerSection.toggle.checked;
        const headerHTML=(headerSection.getPreviewHTML()||"").trim();
        const footerHTML=(footerSection.getPreviewHTML()||"").trim();
        if(headerEnabled && headerHTML){
          previewHeader.style.justifyContent="";
          previewHeader.style.textAlign="";
          previewHeader.innerHTML=Sanitizer.clean(replacePreviewTokens(headerHTML));
          HFAlign.applyHeader(previewHeader, headerSection.getAlign());
        } else if(headerEnabled){
          setPreviewMessage(previewHeader, "Header 無內容 · 請在左側編輯區輸入");
        } else {
          setPreviewMessage(previewHeader, "Header disabled · 尚未啟用");
        }
        if(footerEnabled && footerHTML){
          previewFooter.style.justifyContent="";
          previewFooter.style.textAlign="";
          previewFooter.innerHTML=Sanitizer.clean(replacePreviewTokens(footerHTML));
          applyFooterAlign(previewFooter, footerSection.getAlign());
        } else if(footerEnabled){
          setPreviewMessage(previewFooter, "Footer 無內容 · 請在左側編輯區輸入");
        } else {
          setPreviewMessage(previewFooter, "Footer disabled · 尚未啟用");
        }
      }
      headerSection.onChange(renderPreview);
      footerSection.onChange(renderPreview);
      body.appendChild(previewSection);
      panel.appendChild(body);
      renderPreview();
      const footer=document.createElement("div"); applyStyles(footer, WCfg.Style.hfFooter);
      const cancel=WDom.btn("Cancel", false, "Dismiss without saving");
      const save=WDom.btn("Save changes", true, "Apply header and footer");
      footer.appendChild(cancel);
      footer.appendChild(save);
      panel.appendChild(footer);
      bg.appendChild(panel);
      document.body.appendChild(bg);
      const baseModalStyle=WCfg.Style.hfModal || {};
      function applyLayout(){
        const compact=window.innerWidth < WCfg.MOBILE_BP;
        if(compact){
          bg.style.alignItems="stretch";
          bg.style.justifyContent="flex-start";
          bg.style.padding="0";
          panel.style.maxWidth="none";
          panel.style.width="100%";
          panel.style.maxHeight="none";
          panel.style.height="100%";
          panel.style.borderRadius="0";
          panel.style.boxShadow="none";
        } else {
          bg.style.alignItems="center";
          bg.style.justifyContent="center";
          bg.style.padding="32px 16px";
          panel.style.maxWidth="720px";
          panel.style.width="100%";
          panel.style.maxHeight="92vh";
          panel.style.height="auto";
          panel.style.borderRadius=baseModalStyle.borderRadius||"14px";
          panel.style.boxShadow=baseModalStyle.boxShadow||"0 20px 44px rgba(0,0,0,.18)";
        }
      }
      applyLayout();
      const onResize=function(){ applyLayout(); };
      window.addEventListener("resize", onResize);
      window.requestAnimationFrame(function(){ bg.style.opacity = "1"; panel.focus(); });
      let closing=false;
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
      function close(){
        if(closing) return;
        closing=true;
        cleanupEditors();
        bg.style.pointerEvents="none";
        bg.style.opacity = "0";
        window.setTimeout(function(){ if(bg.parentNode) bg.parentNode.removeChild(bg); }, 200);
        A11y.unlockScroll();
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
        bg.removeAttribute("data-weditor-modal");
        bg.removeAttribute("data-weditor-owner");
        bg.__weditorClose = null;
      }
      bg.__weditorClose = close;
      function saveAndClose(){
        inst.headerEnabled = !!headerSection.toggle.checked;
        inst.footerEnabled = !!footerSection.toggle.checked;
        inst.headerHTML = Sanitizer.clean(headerSection.getHTML());
        inst.footerHTML = Sanitizer.clean(footerSection.getHTML());
        inst.headerAlign = headerSection.getAlign();
        inst.footerAlign = footerSection.getAlign();
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
      if(inst.outputMode==="paged"){ inst.outputEl.value = "<style>"+PAGED_PRINT_STYLES+"</style>\n"+Paginator.pagesHTML(inst); }
      else { inst.outputEl.value = Breaks.serialize(inst.el); }
    }
    const timers=new WeakMap();
    function syncDebounced(inst){
      const t=timers.get(inst); if(t) window.clearTimeout(t);
      timers.set(inst, window.setTimeout(function(){ sync(inst); }, 200));
    }
    return { resolve, sync, syncDebounced };
  })();
  const ToolbarFactory=(function(){
    function createCommandButton(id, inst, ctx){
      const meta=Commands[id]; if(!meta) return null;
      if(typeof meta.render==="function"){ return meta.render(inst, ctx); }
      if(meta.kind==="select"){
        const wrap=document.createElement("label"); applyStyles(wrap, WCfg.Style.controlWrap);
        if(meta.label){
          const lbl=document.createElement("span"); lbl.textContent=meta.label; applyStyles(lbl, WCfg.Style.controlLabel); wrap.appendChild(lbl);
        }
        const select=document.createElement("select"); applyStyles(select, WCfg.Style.controlSelect);
        select.setAttribute("data-command", id);
        select.setAttribute("aria-label", meta.ariaLabel || meta.label || "Select");
        if(meta.placeholder){
          const placeholder=document.createElement("option"); placeholder.value=""; placeholder.textContent=meta.placeholder; placeholder.disabled=true; placeholder.selected=true; select.appendChild(placeholder);
        }
        const opts=meta.options || [];
        for(let i=0;i<opts.length;i++){
          const opt=document.createElement("option"); opt.value=opts[i].value; opt.textContent=opts[i].label; select.appendChild(opt);
        }
        if(meta.getValue){
          const current=meta.getValue(inst, ctx);
          if(current){ select.value=current; }
        }
        select.onchange=function(e){
          if(meta.run) meta.run(inst, { event:e, ctx, value:select.value });
        };
        wrap.appendChild(select);
        return wrap;
      }
      const isToggle = meta.kind==="toggle";
      const btn = isToggle ? WDom.toggle(meta.label, !!meta.getActive(inst)) : WDom.btn(meta.label, !!meta.primary, meta.title||"");
      btn.setAttribute("data-command", id);
      btn.setAttribute("aria-label", meta.ariaLabel || meta.label);
      btn.onclick = function(e){
        meta.run(inst, { event:e, ctx });
        if(isToggle){
          const active = !!meta.getActive(inst);
          btn.setAttribute("data-active", active?"1":"0");
          btn.textContent = meta.label + (active?": On":": Off");
          btn.style.background = active ? "#e6f2fb" : "#fff";
          btn.style.borderColor = active ? WCfg.UI.brand : "#c8c6c4";
        }
      };
      if(typeof meta.decorate==="function"){ meta.decorate(btn); }
      return btn;
    }
    function build(container, config, inst, ctx){
      if(Array.isArray(config)){ config={ tabs:[{ id:"actions", label:"Actions", items:config }] }; }
      const tabs=(config && config.tabs) ? config.tabs.slice() : [];
      if(!tabs.length){ return null; }
      const bar=document.createElement("div"); applyStyles(bar, WCfg.Style.bar);
      const tabList=document.createElement("div"); applyStyles(tabList, WCfg.Style.tabList);
      const headerRow=document.createElement("div"); applyStyles(headerRow, WCfg.Style.tabHeader);
      headerRow.appendChild(tabList);
      const panelsWrap=document.createElement("div"); applyStyles(panelsWrap, WCfg.Style.tabPanels);
      const tabButtons=[]; const tabPanels=[];
      const quickActionIds = Array.isArray(config && config.quickActions) ? config.quickActions.slice() : [];
      let quickWrap=null;
      function setActive(index){
        if(index<0 || index>=tabButtons.length){ return; }
        for(let i=0;i<tabButtons.length;i++){
          const btn=tabButtons[i]; const panel=tabPanels[i];
          const isActive = (i===index);
          btn.setAttribute("data-active", isActive?"1":"0");
          btn.setAttribute("aria-selected", isActive?"true":"false");
          btn.setAttribute("tabindex", isActive?"0":"-1");
          if(isActive){
            btn.style.background = WCfg.UI.brand;
            btn.style.color = "#fff";
            btn.style.border = "1px solid "+WCfg.UI.brand;
          } else {
            btn.style.background = WCfg.Style.tabButton.background;
            btn.style.color = WCfg.Style.tabButton.color;
            btn.style.border = WCfg.Style.tabButton.border;
          }
          panel.style.display = isActive ? "flex" : "none";
          panel.setAttribute("aria-hidden", isActive?"false":"true");
        }
      }
      for(let i=0;i<tabs.length;i++){
        const tab=tabs[i];
        const tabBtn=document.createElement("button"); tabBtn.type="button"; tabBtn.textContent = tab.label || "Tab";
        applyStyles(tabBtn, WCfg.Style.tabButton);
        tabBtn.setAttribute("data-active", "0");
        tabBtn.setAttribute("aria-selected","false");
        tabBtn.setAttribute("tabindex","-1");
        tabBtn.onmouseenter=function(){
          if(tabBtn.getAttribute("data-active") === "1"){
            tabBtn.style.background = WCfg.UI.brandHover;
            tabBtn.style.border = "1px solid "+WCfg.UI.brand;
            tabBtn.style.color = "#fff";
          } else {
            tabBtn.style.background = "#fff";
            tabBtn.style.border = WCfg.Style.tabButton.border;
            tabBtn.style.color = WCfg.UI.text;
          }
        };
        tabBtn.onmouseleave=function(){
          if(tabBtn.getAttribute("data-active") === "1"){
            tabBtn.style.background = WCfg.UI.brand;
            tabBtn.style.border = "1px solid "+WCfg.UI.brand;
            tabBtn.style.color = "#fff";
          } else {
            tabBtn.style.background = WCfg.Style.tabButton.background;
            tabBtn.style.border = WCfg.Style.tabButton.border;
            tabBtn.style.color = WCfg.Style.tabButton.color;
          }
        };
        const panel=document.createElement("div"); applyStyles(panel, WCfg.Style.tabPanel);
        panel.style.display="none";
        panel.setAttribute("role","tabpanel");
        panel.setAttribute("aria-hidden","true");
        const items=tab.items || [];
        for(let j=0;j<items.length;j++){
          const cmdBtn=createCommandButton(items[j], inst, ctx);
          if(cmdBtn) panel.appendChild(cmdBtn);
        }
        tabBtn.onclick=(function(idx){ return function(){ setActive(idx); tabButtons[idx].focus(); }; })(i);
        tabBtn.onkeydown=(function(idx){
          return function(e){
            let targetIndex = null;
            if(e.key === "ArrowRight" || e.key === "ArrowDown"){
              targetIndex = (idx+1) % tabButtons.length;
            } else if(e.key === "ArrowLeft" || e.key === "ArrowUp"){
              targetIndex = (idx-1+tabButtons.length) % tabButtons.length;
            } else if(e.key === "Home"){
              targetIndex = 0;
            } else if(e.key === "End"){
              targetIndex = tabButtons.length-1;
            } else if(e.key === "Enter" || e.key === " "){
              targetIndex = idx;
            }
            if(targetIndex!==null){
              e.preventDefault();
              setActive(targetIndex);
              tabButtons[targetIndex].focus();
            }
          };
        })(i);
        tabButtons.push(tabBtn); tabPanels.push(panel);
        tabList.appendChild(tabBtn); panelsWrap.appendChild(panel);
      }
      tabList.setAttribute("role","tablist");
      for(let i=0;i<tabButtons.length;i++){
        const btn=tabButtons[i]; const panel=tabPanels[i];
        const tabId = (config && config.idPrefix ? config.idPrefix : "weditor-tab")+"-"+i+"-"+Math.floor(Math.random()*1e4);
        btn.id = tabId+"-btn";
        btn.setAttribute("role","tab");
        btn.setAttribute("aria-controls", tabId+"-panel");
        panel.id = tabId+"-panel";
        panel.setAttribute("aria-labelledby", btn.id);
      }
      if(quickActionIds.length){
        for(let i=0;i<quickActionIds.length;i++){
          const cmdId=quickActionIds[i];
          const quickBtn=createCommandButton(cmdId, inst, ctx);
          if(quickBtn){
            if(!quickWrap){ quickWrap=document.createElement("div"); applyStyles(quickWrap, WCfg.Style.tabQuickActions); }
            quickWrap.appendChild(quickBtn);
          }
        }
      }
      if(quickWrap && quickWrap.childNodes.length){
        headerRow.appendChild(quickWrap);
      }
      bar.appendChild(headerRow); bar.appendChild(panelsWrap);
      container.appendChild(bar);
      setActive(0);
      return bar;
    }
    return { build };
  })();
  const Fullscreen=(function(){
    function open(inst){
      A11y.lockScroll();
      const bg=document.createElement("div"); applyStyles(bg, WCfg.Style.modalBg); bg.setAttribute("role","dialog"); bg.setAttribute("aria-modal","true");
      bg.setAttribute("data-weditor-modal","fs");
      bg.style.background="#fff";
      bg.style.alignItems="stretch";
      bg.style.justifyContent="flex-start";
      bg.style.padding="0";
      bg.style.overflowY="hidden";
      const modal=document.createElement("div"); applyStyles(modal, WCfg.Style.modal);
      const cmdBarWrap=document.createElement("div"); applyStyles(cmdBarWrap, WCfg.Style.toolbarWrap);
      const split=document.createElement("div"); applyStyles(split, WCfg.Style.split);
      const left=document.createElement("div"); applyStyles(left, WCfg.Style.left);
      const rightWrap=document.createElement("div"); applyStyles(rightWrap, WCfg.Style.rightWrap);
      rightWrap.appendChild(WDom.title("Editor"));
      const area=document.createElement("div");
      area.contentEditable="true";
      applyStyles(area, WCfg.Style.area);
      area.innerHTML=Breaks.serialize(inst.el);
      Breaks.ensurePlaceholders(area);
      rightWrap.appendChild(area);
      const ctx={
        area,
        refreshPreview:render,
        writeBack:function(){
          const html=Breaks.serialize(area);
          const clean=Sanitizer.clean(html);
          inst.el.innerHTML = clean;
          Breaks.ensurePlaceholders(inst.el);
          area.innerHTML = clean;
          Breaks.ensurePlaceholders(area);
          OutputBinding.sync(inst);
          return true;
        },
        close:cleanup,
        saveClose:function(){ ctx.writeBack(); cleanup(); }
      };
      ToolbarFactory.build(cmdBarWrap, TOOLBAR_FS, inst, ctx);
      const saveCloseWrap=document.createElement("div"); applyStyles(saveCloseWrap, WCfg.Style.fsSaveCloseWrap);
      const saveCloseBtn=WDom.btn("Close", true, "Save changes and close fullscreen");
      saveCloseBtn.setAttribute("aria-label","Save changes and close fullscreen editor");
      saveCloseBtn.addEventListener("click", function(){ ctx.saveClose(); });
      saveCloseWrap.appendChild(saveCloseBtn);
      function layout(){
        const isColumn = window.innerWidth < WCfg.MOBILE_BP;
        split.style.flexDirection = isColumn ? "column" : "row";
        rightWrap.style.width = isColumn ? "100%" : "min(46vw, 720px)";
      }
      modal.appendChild(cmdBarWrap); modal.appendChild(split); modal.appendChild(saveCloseWrap); split.appendChild(left); split.appendChild(rightWrap); bg.appendChild(modal); document.body.appendChild(bg);
      window.requestAnimationFrame(function(){ bg.style.opacity = "1"; });
      window.setTimeout(function(){ area.focus(); },0);
      layout(); const onR=function(){ layout(); render(); }; window.addEventListener("resize", onR);
      area.addEventListener("paste", function(){ window.setTimeout(function(){ Normalizer.fixStructure(area); Breaks.ensurePlaceholders(area); }, 0); });
      let t=null; area.addEventListener("input", function(){ Breaks.ensurePlaceholders(area); if(t) window.clearTimeout(t); t=window.setTimeout(render, WCfg.DEBOUNCE_PREVIEW); });
      render();
      function render(attempt){
        attempt = attempt || 0;
        const sourceHTML=Breaks.serialize(area);
        const out=Paginator.paginate(sourceHTML, inst);
        const computed=window.getComputedStyle(left);
        const paddingLeft=parseFloat(computed.paddingLeft||"0")||0;
        const paddingRight=parseFloat(computed.paddingRight||"0")||0;
        const available=Math.max(0, left.clientWidth - paddingLeft - paddingRight);
        const fitScale=available>0 ? Math.min(1, available / WCfg.A4W) : 1;
        let scale=fitScale;
        if(WCfg.PREVIEW_MAX_SCALE && scale>WCfg.PREVIEW_MAX_SCALE){ scale=WCfg.PREVIEW_MAX_SCALE; }
        if(!isFinite(scale) || scale<=0){ scale=1; }
        const scaledWidth=Math.max(1, Math.round(WCfg.A4W * scale));
        const scaledHeight=Math.max(1, Math.round(WCfg.A4H * scale));
        const stage=document.createElement("div");
        applyStyles(stage, WCfg.Style.previewStage);
        for(let i=0;i<out.pages.length;i++){
          const page=out.pages[i];
          page.style.margin="0";
          page.style.transform="";
          page.style.transformOrigin="";
          const wrap=document.createElement("div");
          wrap.style.width=scaledWidth+"px";
          wrap.style.height=scaledHeight+"px";
          wrap.style.display="block";
          wrap.style.position="relative";
          wrap.style.maxWidth="100%";
          wrap.style.overflow="visible";
          const outer=document.createElement("div");
          outer.style.width=scaledWidth+"px";
          outer.style.height=scaledHeight+"px";
          outer.style.display="block";
          outer.style.position="relative";
          outer.style.maxWidth="100%";
          outer.style.margin="0 auto";
          outer.style.overflow="visible";
          page.style.transformOrigin="top left";
          page.style.transform="scale("+scale+")";
          page.style.position="absolute";
          page.style.left="0";
          page.style.top="0";
          page.style.width=WCfg.A4W+"px";
          page.style.height=WCfg.A4H+"px";
          outer.appendChild(wrap);
          wrap.appendChild(page);
          stage.appendChild(outer);
          if(i<out.pages.length-1){
            const br=document.createElement("div");
            br.textContent="Page Break";
            applyStyles(br, WCfg.Style.pageDivider);
            br.style.maxWidth=scaledWidth+"px";
            stage.appendChild(br);
          }
        }
        const frag=document.createDocumentFragment();
        frag.appendChild(stage);
        left.innerHTML="";
        left.appendChild(frag);
        if(attempt>=2){ return; }
        window.requestAnimationFrame(function(){
          const adjustedAvailable=Math.max(0, left.clientWidth - paddingLeft - paddingRight);
          if(Math.abs(adjustedAvailable - available)>0.5){
            render(attempt+1);
          }
        });
      }
      function cleanup(){
        window.removeEventListener("resize", onR);
        A11y.unlockScroll();
        bg.style.pointerEvents="none";
        bg.style.opacity = "0";
        window.setTimeout(function(){ if(bg.parentNode){ bg.parentNode.removeChild(bg); } }, 200);
        bg.removeAttribute("data-weditor-modal");
      }
      bg.__weditorClose = cleanup;
    }
    return { open };
  })();
  const Formatting=(function(){
    const FONT_FAMILIES=[
      { label:"Arial", value:"Arial, Helvetica, sans-serif" },
      { label:"Calibri", value:"Calibri, 'Segoe UI', sans-serif" },
      { label:"Cambria", value:"Cambria, 'Times New Roman', serif" },
      { label:"Courier New", value:"'Courier New', Courier, monospace" },
      { label:"Georgia", value:"Georgia, 'Times New Roman', serif" },
      { label:"Segoe UI", value:"'Segoe UI', system-ui, -apple-system, sans-serif" },
      { label:"Times New Roman", value:"'Times New Roman', Times, serif" }
    ];
    const FONT_SIZES=[
      { label:"10", px:"10px", exec:"2" },
      { label:"12", px:"12px", exec:"3" },
      { label:"14", px:"14px", exec:"4" },
      { label:"16", px:"16px", exec:"5" },
      { label:"18", px:"18px", exec:"6" },
      { label:"24", px:"24px", exec:"7" }
    ];
    const HIGHLIGHT_COLORS=[
      { label:"Yellow", value:"#fff59d" },
      { label:"Bright Green", value:"#c8facc" },
      { label:"Turquoise", value:"#a9eff2" },
      { label:"Pink", value:"#ffd6f2" },
      { label:"Blue", value:"#bae6ff" },
      { label:"Red", value:"#ffc1c1" },
      { label:"Dark Blue", value:"#8ea2ff" },
      { label:"Teal", value:"#95f0df" },
      { label:"Green", value:"#bde3a1" },
      { label:"Purple", value:"#e3d3ff" },
      { label:"Dark Red", value:"#f4a6a1" },
      { label:"Dark Yellow", value:"#ffe197" },
      { label:"Gray", value:"#d6d6d6" },
      { label:"Black", value:"#444444" }
    ];
    function resolveTarget(inst, ctx){ return (ctx && ctx.area) ? ctx.area : inst ? inst.el : null; }
    function focusTarget(target){ if(target && typeof target.focus==="function"){ try{ target.focus({ preventScroll:true }); } catch(e){ target.focus(); } } }
    function ensureSelectionInfo(target){
      if(!target || !target.ownerDocument) return null;
      const sel=target.ownerDocument.defaultView ? target.ownerDocument.defaultView.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0) return null;
      const range=sel.getRangeAt(0);
      let container=range.commonAncestorContainer;
      if(container && container.nodeType===3){ container=container.parentNode; }
      if(container && container!==target && !target.contains(container)){ return null; }
      if(range.collapsed){ return null; }
      return { sel, range };
    }
    function getRangeConstant(range, key, fallback){
      if(typeof Range!=="undefined" && typeof Range[key]!=="undefined"){ return Range[key]; }
      const ctor=range && range.constructor; if(ctor && typeof ctor[key]!=="undefined") return ctor[key];
      return fallback;
    }
    function intersectsRange(range, node){
      if(!range || !node) return false;
      if(typeof range.intersectsNode==="function"){ try{ return range.intersectsNode(node); } catch(e){} }
      const doc=node.ownerDocument || document;
      if(!doc || !doc.createRange) return false;
      const test=doc.createRange();
      try{ test.selectNode(node); }
      catch(err){
        try{ test.selectNodeContents(node); }
        catch(err2){ return false; }
      }
      const END_TO_START=getRangeConstant(range, "END_TO_START", 2);
      const START_TO_END=getRangeConstant(range, "START_TO_END", 3);
      const beforeEnd=range.compareBoundaryPoints(END_TO_START, test) < 0;
      const afterStart=range.compareBoundaryPoints(START_TO_END, test) > 0;
      return beforeEnd && afterStart;
    }
    function fallbackApplyHighlight(target, color){
      const info=ensureSelectionInfo(target); if(!info) return false;
      const doc=target.ownerDocument || document;
      const span=doc.createElement("span");
      span.style.backgroundColor=color;
      const contents=info.range.extractContents();
      span.appendChild(contents);
      info.range.insertNode(span);
      info.sel.removeAllRanges();
      const newRange=doc.createRange();
      newRange.selectNodeContents(span);
      info.sel.addRange(newRange);
      return true;
    }
    function fallbackClearHighlight(target){
      const info=ensureSelectionInfo(target); if(!info) return false;
      const { range }=info;
      const doc=target.ownerDocument || document;
      const nodes=[];
      if(range.commonAncestorContainer && range.commonAncestorContainer.nodeType===1 && target.contains(range.commonAncestorContainer)){
        nodes.push(range.commonAncestorContainer);
      }
      if(doc && doc.createTreeWalker){
        const walker=doc.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_ELEMENT, null);
        let current=walker.currentNode;
        if(current && current!==range.commonAncestorContainer && target.contains(current) && intersectsRange(range, current)){
          nodes.push(current);
        }
        while((current=walker.nextNode())){
          if(!target.contains(current)) continue;
          if(!intersectsRange(range, current)) continue;
          nodes.push(current);
        }
      }
      let changed=false;
      const unwrap=[];
      for(let i=0;i<nodes.length;i++){
        const el=nodes[i];
        if(!el || el.nodeType!==1) continue;
        let modified=false;
        if(el.style && el.style.backgroundColor){
          el.style.backgroundColor="";
          if(el.getAttribute && el.getAttribute("style")==="") el.removeAttribute("style");
          modified=true;
        }
        if(el.hasAttribute && el.hasAttribute("bgcolor")){ el.removeAttribute("bgcolor"); modified=true; }
        if(modified) changed=true;
        if(el.nodeName==="SPAN" && el.attributes && el.attributes.length===0){ unwrap.push(el); }
      }
      for(let i=0;i<unwrap.length;i++){
        const span=unwrap[i];
        const parent=span.parentNode;
        if(!parent) continue;
        while(span.firstChild){ parent.insertBefore(span.firstChild, span); }
        parent.removeChild(span);
      }
      return changed;
    }
    function execCommand(target, command, value, useCss){
      if(!target){ return false; }
      focusTarget(target);
      if(useCss){ try{ document.execCommand("styleWithCSS", false, true); } catch(e){}
      }
      let result=false;
      try{ result=document.execCommand(command, false, value); } catch(e){ result=false; }
      if(useCss){ try{ document.execCommand("styleWithCSS", false, false); } catch(e){} }
      return result;
    }
    function applyFontFamily(inst, ctx, family){
      if(!family){ return; }
      const target=resolveTarget(inst, ctx); if(!target) return;
      execCommand(target, "fontName", family, true);
    }
    function convertFontTags(target, execValue, px){
      if(!target){ return; }
      const selector="font[size=\""+execValue+"\"]";
      const fonts=target.querySelectorAll(selector);
      for(let i=0;i<fonts.length;i++){
        const fontEl=fonts[i];
        const span=target.ownerDocument.createElement("span");
        span.style.fontSize = px;
        while(fontEl.firstChild){ span.appendChild(fontEl.firstChild); }
        fontEl.parentNode.replaceChild(span, fontEl);
      }
    }
    function applyFontSize(inst, ctx, sizeLabel){
      const target=resolveTarget(inst, ctx); if(!target) return;
      const meta=FONT_SIZES.find(function(item){ return item.label===sizeLabel; }); if(!meta) return;
      execCommand(target, "fontSize", meta.exec, true);
      convertFontTags(target, meta.exec, meta.px);
    }
    function applyHighlight(inst, ctx, color){
      if(!color){ return clearHighlight(inst, ctx); }
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      let success=false;
      try{ document.execCommand("styleWithCSS", false, true); } catch(e){}
      try{ success=document.execCommand("hiliteColor", false, color); }
      catch(err){ success=false; }
      if(!success){
        try{ success=document.execCommand("backColor", false, color); }
        catch(err2){ success=false; }
      }
      try{ document.execCommand("styleWithCSS", false, false); } catch(e){}
      if(!success){ success=fallbackApplyHighlight(target, color); }
      if(success && inst){ inst.highlightColor=color; }
      return success;
    }
    function clearHighlight(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      let success=false;
      try{ document.execCommand("styleWithCSS", false, true); } catch(e){}
      try{ success=document.execCommand("hiliteColor", false, "transparent"); }
      catch(err){ success=false; }
      if(!success){
        try{ success=document.execCommand("backColor", false, "transparent"); }
        catch(err2){ success=false; }
      }
      try{ document.execCommand("styleWithCSS", false, false); } catch(e){}
      if(fallbackClearHighlight(target)) success=true;
      if(success && inst){ inst.highlightColor=null; }
      return success;
    }
    function applyUnderline(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return;
      execCommand(target, "underline", null, true);
      const style = inst && inst.underlineStyle ? inst.underlineStyle : null;
      if(style){ applyDecorationStyle(inst, ctx, style); }
    }
    function applyDecorationStyle(inst, ctx, style){
      if(!style){ return; }
      const target=resolveTarget(inst, ctx); if(!target) return;
      focusTarget(target);
      const sel=window.getSelection();
      if(!sel || sel.rangeCount===0){ return; }
      const range=sel.getRangeAt(0);
      if(!target.contains(range.commonAncestorContainer)){ return; }
      if(range.collapsed){ return; }
      const doc=target.ownerDocument || document;
      try{
        const span=doc.createElement("span");
        span.style.textDecorationLine="underline";
        span.style.textDecorationStyle=style;
        range.surroundContents(span);
        sel.removeAllRanges();
        const newRange=doc.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
        return;
      } catch(err){}
      const walker=doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
        acceptNode:function(node){ return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
      });
      const updates=[]; let node;
      while((node=walker.nextNode())){ updates.push(node); }
      for(let i=0;i<updates.length;i++){
        const el=updates[i];
        const computed=window.getComputedStyle(el);
        const hasUnderline=(computed && computed.textDecorationLine && computed.textDecorationLine.indexOf("underline")>-1);
        if(hasUnderline){
          el.style.textDecorationLine="underline";
          el.style.textDecorationStyle=style;
        }
      }
    }
    function applySimple(inst, ctx, command){
      const target=resolveTarget(inst, ctx); if(!target) return;
      execCommand(target, command, null, true);
    }
    return {
      FONT_FAMILIES,
      FONT_SIZES,
      HIGHLIGHT_COLORS,
      applyFontFamily,
      applyFontSize,
      applyHighlight,
      clearHighlight,
      applyUnderline,
      applyDecorationStyle,
      applySimple
    };
  })();
  const HighlightUI=(function(){
    const NO_COLOR_PATTERN="linear-gradient(135deg,#ffffff 45%,#d13438 45%,#d13438 55%,#ffffff 55%)";
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-flex";
      container.style.alignItems="center";
      const button=WDom.btn("", false, "Text Highlight Color (文字底色 / 文本荧光笔)");
      button.setAttribute("title","Text Highlight Color (文字底色 / 文本荧光笔)");
      button.setAttribute("data-command","format.highlight");
      button.setAttribute("aria-label","Text Highlight Color (文字底色 / 文本荧光笔)");
      button.setAttribute("aria-haspopup","true");
      button.setAttribute("aria-expanded","false");
      button.style.display="inline-flex";
      button.style.alignItems="center";
      button.style.justifyContent="center";
      button.style.gap="8px";
      button.style.minWidth="44px";
      button.style.padding="3px 12px";
      const iconWrap=document.createElement("span");
      iconWrap.style.display="flex";
      iconWrap.style.flexDirection="column";
      iconWrap.style.alignItems="center";
      iconWrap.style.lineHeight="1";
      const pencil=document.createElement("span");
      pencil.textContent="🖊️";
      pencil.setAttribute("aria-hidden","true");
      pencil.style.fontSize="18px";
      const underline=document.createElement("span");
      underline.style.marginTop="4px";
      underline.style.width="20px";
      underline.style.height="4px";
      underline.style.borderRadius="4px";
      underline.style.background="#fff59d";
      underline.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
      iconWrap.appendChild(pencil);
      iconWrap.appendChild(underline);
      const arrow=document.createElement("span");
      arrow.textContent="▼";
      arrow.setAttribute("aria-hidden","true");
      arrow.style.fontSize="11px";
      arrow.style.color=WCfg.UI.textDim;
      button.textContent="";
      button.appendChild(iconWrap);
      button.appendChild(arrow);
      const palette=document.createElement("div");
      palette.style.position="absolute";
      palette.style.top="calc(100% + 6px)";
      palette.style.left="0";
      palette.style.display="none";
      palette.style.background="#fff";
      palette.style.border="1px solid "+WCfg.UI.borderSubtle;
      palette.style.borderRadius="8px";
      palette.style.boxShadow="0 8px 20px rgba(0,0,0,.12)";
      palette.style.padding="12px";
      palette.style.zIndex="20";
      palette.style.gap="8px";
      palette.style.gridTemplateColumns="repeat(5, 28px)";
      palette.style.alignItems="center";
      palette.style.justifyItems="center";
      palette.setAttribute("role","menu");
      palette.setAttribute("aria-hidden","true");
      const colors=Formatting.HIGHLIGHT_COLORS || [];
      let currentColor;
      if(inst && typeof inst.highlightColor!=="undefined"){ currentColor=inst.highlightColor; }
      else if(colors.length){ currentColor=colors[0].value; if(inst) inst.highlightColor=currentColor; }
      else { currentColor=null; }
      function updatePreview(color){
        if(color){
          underline.style.background=color;
          underline.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
        } else {
          underline.style.background=NO_COLOR_PATTERN;
          underline.style.boxShadow="0 0 0 1px "+WCfg.UI.borderSubtle;
        }
      }
      const colorButtons=[];
      const doc=button.ownerDocument || document;
      function updateSelectionUI(selected){
        for(let i=0;i<colorButtons.length;i++){
          const entry=colorButtons[i];
          const isActive=selected===entry.value;
          entry.el.style.borderColor = isActive ? WCfg.UI.brand : WCfg.UI.borderSubtle;
          entry.el.style.boxShadow = isActive ? "0 0 0 2px "+WCfg.UI.brand : "none";
        }
      }
      function pickColor(value){
        setOpen(false);
        let changed=false;
        if(value){
          changed=!!Formatting.applyHighlight(inst, ctx, value);
          if(changed) currentColor=value;
        } else {
          changed=!!Formatting.clearHighlight(inst, ctx);
          if(changed) currentColor=null;
        }
        if(changed){
          updatePreview(currentColor);
          updateSelectionUI(currentColor);
          updateNoColorState(currentColor);
          if(inst) OutputBinding.syncDebounced(inst);
        }
      }
      for(let i=0;i<colors.length;i++){
        const swatch=doc.createElement("button");
        swatch.type="button";
        swatch.setAttribute("role","menuitem");
        swatch.setAttribute("data-color", colors[i].value);
        swatch.setAttribute("aria-label", colors[i].label+" highlight");
        swatch.title=colors[i].label;
        swatch.style.width="28px";
        swatch.style.height="28px";
        swatch.style.border="1px solid "+WCfg.UI.borderSubtle;
        swatch.style.borderRadius="4px";
        swatch.style.background=colors[i].value;
        swatch.style.cursor="pointer";
        swatch.style.padding="0";
        swatch.style.display="inline-flex";
        swatch.style.alignItems="center";
        swatch.style.justifyContent="center";
        swatch.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); pickColor(colors[i].value); });
        swatch.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); button.focus(); } });
        palette.appendChild(swatch);
        colorButtons.push({ value:colors[i].value, el:swatch });
      }
      const noColorBtn=doc.createElement("button");
      noColorBtn.type="button";
      noColorBtn.setAttribute("role","menuitem");
      noColorBtn.textContent="No Color";
      noColorBtn.setAttribute("aria-label","Remove highlight");
      noColorBtn.style.gridColumn="1 / -1";
      noColorBtn.style.marginTop="4px";
      noColorBtn.style.padding="6px 8px";
      noColorBtn.style.font="12px/1.4 Segoe UI,system-ui";
      noColorBtn.style.background="#fff";
      noColorBtn.style.border="1px solid "+WCfg.UI.borderSubtle;
      noColorBtn.style.borderRadius="4px";
      noColorBtn.style.cursor="pointer";
      noColorBtn.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); pickColor(null); });
      noColorBtn.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); button.focus(); } });
      palette.appendChild(noColorBtn);
      function updateNoColorState(selected){
        const active=selected===null || typeof selected==="undefined";
        noColorBtn.style.borderColor = active ? WCfg.UI.brand : WCfg.UI.borderSubtle;
        noColorBtn.style.boxShadow = active ? "0 0 0 2px "+WCfg.UI.brand : "none";
      }
      function setOpen(state){
        if(open===state) return;
        open=state;
        if(state){
          palette.style.display="grid";
          palette.setAttribute("aria-hidden","false");
          doc.addEventListener("mousedown", onDocPointer, true);
          doc.addEventListener("keydown", onDocKey);
          window.setTimeout(function(){
            if(doc.activeElement===button){
              const first=palette.querySelector("button");
              if(first) first.focus();
            }
          }, 0);
        } else {
          palette.style.display="none";
          palette.setAttribute("aria-hidden","true");
          doc.removeEventListener("mousedown", onDocPointer, true);
          doc.removeEventListener("keydown", onDocKey);
        }
      }
      function onDocPointer(e){ if(!container.contains(e.target)){ setOpen(false); } }
      function onDocKey(e){ if(e.key==="Escape"){ setOpen(false); button.focus(); } }
      let open=false;
      button.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); setOpen(!open); });
      button.addEventListener("keydown", function(e){ if(e.key==="ArrowDown" || e.key==="Enter" || e.key===" "){ e.preventDefault(); setOpen(true); } });
      palette.addEventListener("click", function(e){ e.stopPropagation(); });
      palette.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); button.focus(); } });
      updatePreview(currentColor);
      updateSelectionUI(currentColor);
      updateNoColorState(currentColor);
      container.appendChild(button);
      container.appendChild(palette);
      return container;
    }
    return { create };
  })();
  const Commands={
    "format.fontFamily":{
      label:"Font",
      kind:"select",
      ariaLabel:"Select font family",
      placeholder:"Font",
      options:Formatting.FONT_FAMILIES.map(function(item){ return { label:item.label, value:item.value }; }),
      run:function(inst, arg){
        const value=(arg && arg.value) || (arg && arg.event && arg.event.target && arg.event.target.value);
        if(!value) return;
        Formatting.applyFontFamily(inst, arg && arg.ctx, value);
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.fontSize":{
      label:"Size",
      kind:"select",
      ariaLabel:"Select font size",
      placeholder:"Size",
      options:Formatting.FONT_SIZES.map(function(item){ return { label:item.label, value:item.label }; }),
      run:function(inst, arg){
        const value=(arg && arg.value) || (arg && arg.event && arg.event.target && arg.event.target.value);
        if(!value) return;
        Formatting.applyFontSize(inst, arg && arg.ctx, value);
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.bold":{
      label:"B",
      kind:"button",
      ariaLabel:"Bold",
      title:"Bold (Ctrl+B)",
      decorate:function(btn){ btn.style.fontWeight="700"; },
      run:function(inst, arg){ Formatting.applySimple(inst, arg && arg.ctx, "bold"); OutputBinding.syncDebounced(inst); }
    },
    "format.italic":{
      label:"I",
      kind:"button",
      ariaLabel:"Italic",
      title:"Italic (Ctrl+I)",
      decorate:function(btn){ btn.style.fontStyle="italic"; },
      run:function(inst, arg){ Formatting.applySimple(inst, arg && arg.ctx, "italic"); OutputBinding.syncDebounced(inst); }
    },
    "format.underline":{
      label:"U",
      kind:"button",
      ariaLabel:"Underline",
      title:"Underline (Ctrl+U)",
      decorate:function(btn){ btn.style.textDecoration="underline"; },
      run:function(inst, arg){ Formatting.applyUnderline(inst, arg && arg.ctx); OutputBinding.syncDebounced(inst); }
    },
    "format.underlineStyle":{
      label:"Style",
      kind:"select",
      ariaLabel:"Underline style",
      options:[
        { label:"Solid", value:"solid" },
        { label:"Double", value:"double" },
        { label:"Dotted", value:"dotted" },
        { label:"Dashed", value:"dashed" },
        { label:"Wavy", value:"wavy" }
      ],
      getValue:function(inst){ return inst && inst.underlineStyle ? inst.underlineStyle : "solid"; },
      run:function(inst, arg){
        const value=(arg && arg.value) || (arg && arg.event && arg.event.target && arg.event.target.value);
        if(!value) return;
        inst.underlineStyle = value;
        Formatting.applyDecorationStyle(inst, arg && arg.ctx, value);
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.highlight":{
      kind:"custom",
      ariaLabel:"Text Highlight Color (文字底色 / 文本荧光笔)",
      render:function(inst, ctx){ return HighlightUI.create(inst, ctx); }
    },
    "format.strike":{
      label:"ab",
      kind:"button",
      ariaLabel:"Strikethrough",
      title:"Strikethrough",
      decorate:function(btn){ btn.style.textDecoration="line-through"; btn.style.textDecorationThickness="2px"; },
      run:function(inst, arg){ Formatting.applySimple(inst, arg && arg.ctx, "strikeThrough"); OutputBinding.syncDebounced(inst); }
    },
    "format.subscript":{
      label:"x₂",
      kind:"button",
      ariaLabel:"Subscript",
      title:"Subscript",
      run:function(inst, arg){ Formatting.applySimple(inst, arg && arg.ctx, "subscript"); OutputBinding.syncDebounced(inst); }
    },
    "format.superscript":{
      label:"x²",
      kind:"button",
      ariaLabel:"Superscript",
      title:"Superscript",
      run:function(inst, arg){ Formatting.applySimple(inst, arg && arg.ctx, "superscript"); OutputBinding.syncDebounced(inst); }
    },
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
    "export":{ label:"Export", kind:"button", ariaLabel:"Export HTML", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.writeBack) arg.ctx.writeBack(); const html=Paginator.pagesHTML(inst); ExportUI.open(html, Sanitizer.clean(Breaks.serialize(inst.el))); } },
    "fullscreen.close":{ label:"Close", kind:"button", ariaLabel:"Close fullscreen", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.close) arg.ctx.close(); } },
    "fullscreen.saveClose":{ label:"Close", primary:true, kind:"button", ariaLabel:"Save changes and close", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.saveClose) arg.ctx.saveClose(); } }
  };
  const TOOLBAR_PAGE={
    idPrefix:"weditor-page",
    tabs:[
      { id:"format", label:"Format", items:["format.fontFamily","format.fontSize","format.bold","format.italic","format.underline","format.underlineStyle","format.highlight","format.strike","format.subscript","format.superscript"] },
      { id:"editing", label:"Editing", items:["break.insert","break.remove","hf.edit"] },
      { id:"layout", label:"Layout", items:["toggle.header","toggle.footer"] },
      { id:"output", label:"Output", items:["print","export"] }
    ],
    quickActions:["fullscreen.open"]
  };
  const TOOLBAR_FS={
    idPrefix:"weditor-fs",
    tabs:[
      { id:"format", label:"Format", items:["format.fontFamily","format.fontSize","format.bold","format.italic","format.underline","format.underlineStyle","format.highlight","format.strike","format.subscript","format.superscript"] },
      { id:"editing", label:"Editing", items:["hf.edit","break.insert","break.remove","reflow"] },
      { id:"layout", label:"Layout", items:["toggle.header","toggle.footer"] },
      { id:"output", label:"Output", items:["print","export"] },
      { id:"session", label:"Session", items:["fullscreen.saveClose","fullscreen.close"] }
    ]
  };
  let INSTANCE_SEQ=0;
  function WEditorInstance(editorEl){
    this.uid = ++INSTANCE_SEQ;
    this.el = editorEl;
    this.el.setAttribute("data-weditor-instance", String(this.uid));
    this.headerHTML = "Demo Header — {{date}} · Page {{page}} / {{total}}";
    this.footerHTML = "Confidential · {{date}}";
    this.headerAlign = HFAlign.normalize(editorEl.getAttribute("data-header-align"));
    this.footerAlign = HFAlign.normalize(editorEl.getAttribute("data-footer-align"));
    this.headerEnabled = !editorEl.classList.contains("weditor--no-header");
    this.footerEnabled = !editorEl.classList.contains("weditor--no-footer");
    this.outputEl = OutputBinding.resolve(editorEl);
    this.outputMode = editorEl.classList.contains("weditor--paged") ? "paged" : "raw";
    this.underlineStyle = "solid";
    this.highlightColor = (Formatting && Formatting.HIGHLIGHT_COLORS && Formatting.HIGHLIGHT_COLORS.length ? Formatting.HIGHLIGHT_COLORS[0].value : null);
    this._mount();
    OutputBinding.syncDebounced(this);
  }
  WEditorInstance.prototype._mount=function(){
    const shell=document.createElement("div"); applyStyles(shell, WCfg.Style.shell);
    const toolbarWrap=document.createElement("div"); applyStyles(toolbarWrap, WCfg.Style.toolbarWrap);
    ToolbarFactory.build(toolbarWrap, TOOLBAR_PAGE, this, null);
    applyStyles(this.el, WCfg.Style.editor);
    this.el.setAttribute("contenteditable","true");
    Breaks.ensurePlaceholders(this.el);
    this.el.addEventListener("paste", function(self){ return function(){ window.setTimeout(function(){ Normalizer.fixStructure(self.el); Breaks.ensurePlaceholders(self.el); },0); }; }(this));
    const parent=this.el.parentNode; parent.replaceChild(shell, this.el);
    shell.appendChild(toolbarWrap); shell.appendChild(this.el);
    this.el.addEventListener("input", (function(self){ return function(){ Breaks.ensurePlaceholders(self.el); OutputBinding.syncDebounced(self); }; })(this));
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
