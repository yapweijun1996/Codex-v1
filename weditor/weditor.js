(function(){
  "use strict";
  const FeatureFlags={
    exportButton:false
  };
  const LIST_STYLE_ATTR="data-weditor-list-style";
  const LIST_STYLE_DECIMAL_ZERO="decimal-dot-zero";
  const LIST_STYLE_DECIMAL_ZERO_STYLE_ID="weditor-list-style-decimal-dot-zero";
  const DEFAULT_LETTERHEAD_LOGO_URL="https://raw.githubusercontent.com/yapweijuntno/Test001/refs/heads/main/sample_letterhead_logo.png";
  const DEFAULT_FOOTER_LOGO_URL=DEFAULT_LETTERHEAD_LOGO_URL;
  function sanitizeImageURL(value){
    if(typeof value!=="string") return "";
    const trimmed=value.trim();
    if(!trimmed) return "";
    if(/^javascript:/i.test(trimmed)) return "";
    if(/^https?:\/\//i.test(trimmed)) return trimmed;
    const schemeMatch=trimmed.match(/^([a-z0-9+.-]+):/i);
    if(schemeMatch){
      const scheme=schemeMatch[1].toLowerCase();
      if(scheme!=="http" && scheme!=="https") return "";
      return /^https?:\/\//i.test(trimmed) ? trimmed : "";
    }
    if(trimmed.startsWith("//")) return trimmed;
    if(trimmed.startsWith("/")) return trimmed;
    if(trimmed.startsWith("./")) return trimmed;
    if(trimmed.startsWith("../")) return trimmed;
    return trimmed;
  }
  function escapeAttribute(value){
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&#39;");
  }
  const BASE_STYLE_ID="weditor-base-style";
  function ensureBaseStyles(doc){
    const targetDoc=doc || document;
    if(!targetDoc || !targetDoc.head) return;
    if(targetDoc.getElementById(BASE_STYLE_ID)) return;
    const style=targetDoc.createElement("style");
    style.id=BASE_STYLE_ID;
    style.textContent=
      ".weditor[data-weditor-instance] p,"+
      ".w-editor[data-weditor-instance] p,"+
      ".weditor_page-content p,"+
      ".weditor_fullscreen-area p{"+
        "margin:0;"+
        "margin-block-start:0;"+
        "margin-block-end:0;"+
      "}";
    targetDoc.head.appendChild(style);
  }
  function applyZeroMarginToParagraph(node){
    if(!node || !node.style) return;
    node.style.margin="0";
    node.style.marginBlockStart="0";
    node.style.marginBlockEnd="0";
  }
  function enforceZeroMargins(root){
    if(!root) return;
    function traverse(node){
      if(!node) return;
      if(node.nodeType===1){
        if((node.tagName||"").toLowerCase()==="p") applyZeroMarginToParagraph(node);
        let child=node.firstChild;
        while(child){
          traverse(child);
          child=child.nextSibling;
        }
      } else if(node.nodeType===11){
        let child=node.firstChild;
        while(child){
          traverse(child);
          child=child.nextSibling;
        }
      }
    }
    traverse(root);
  }
  const WCfg=(function(){
    const A4W=720, A4H=1050, HDR_H=84, FTR_H=64, PAD=0;
    const PREVIEW_FRAME_PADDING=20;
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
      fsSaveCloseWrap:{ position:"fixed", top:"8px", right:"24px", zIndex:"2147483200", display:"flex" },
      tabButton:{ padding:"6px 14px", borderRadius:"999px", border:"1px solid "+UI.borderSubtle, background:"#f6f6f6", color:UI.textDim, cursor:"pointer", font:"13px/1.3 Segoe UI,system-ui", transition:"all .18s ease" },
      tabPanels:{ display:"flex", flexDirection:"column", gap:"12px" },
      tabPanel:{ display:"flex", flexWrap:"wrap", gap:"12px", alignItems:"stretch" },
      btn:{ padding:"8px 12px", border:"1px solid "+UI.borderSubtle, background:"#fff", color:UI.text, borderRadius:"4px", cursor:"pointer", font:"14px/1.2 Segoe UI,system-ui" },
      btnPri:{ padding:"8px 12px", border:"1px solid "+UI.brand, background:UI.brand, color:"#fff", borderRadius:"4px", cursor:"pointer", font:"14px/1.2 Segoe UI,system-ui" },
      toggle:{ padding:"6px 10px", border:"1px solid "+UI.borderSubtle, background:"#fff", color:UI.text, borderRadius:"999px", cursor:"pointer", font:"12px/1.2 Segoe UI,system-ui" },
      controlWrap:{ display:"inline-flex", alignItems:"center", gap:"6px", font:"12px/1.3 Segoe UI,system-ui", color:UI.textDim },
      controlSelect:{ padding:"6px 10px", border:"1px solid "+UI.borderSubtle, borderRadius:"4px", background:"#fff", color:UI.text, font:"13px/1.3 Segoe UI,system-ui", cursor:"pointer" },
      controlLabel:{ font:"12px/1.3 Segoe UI,system-ui", color:UI.textDim },
      toolbarGroup:{ display:"flex", flexDirection:"column", gap:"10px", padding:"12px", border:"1px solid "+UI.borderSubtle, borderRadius:"10px", background:"#fafafa", flex:"1 1 240px", boxSizing:"border-box" },
      toolbarGroupCompact:{ flex:"1 1 180px", gap:"8px", padding:"10px" },
      toolbarGroupTitle:{ font:"12px/1.4 Segoe UI,system-ui", textTransform:"uppercase", letterSpacing:".06em", color:UI.textDim },
      toolbarGroupRow:{ display:"flex", flexWrap:"wrap", gap:"8px", alignItems:"center" },
      toolbarGroupRowCompact:{ gap:"6px" },
      editor:{ minHeight:"260px", border:"1px solid "+UI.borderSubtle, borderRadius:"6px", margin:"12px", padding:"14px", background:"#fff", font:"15px/1.6 Segoe UI,system-ui" },
      title:{ font:"13px Segoe UI,system-ui", color:UI.textDim, padding:"8px 12px", background:"#fafafa", borderBottom:"1px solid "+UI.border },
      modalBg:{ position:"fixed", left:"0", top:"0", width:"100vw", height:"100vh", background:"rgba(0,0,0,.35)", zIndex:"2147483000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 16px", boxSizing:"border-box", opacity:"0", transition:"opacity .2s ease", overflowY:"auto" },
      modal:{ width:"100%", maxWidth:"none", height:"100%", background:"#fff", display:"flex", flexDirection:"column", borderRadius:"0", boxShadow:"none", overflow:"hidden" },
      split:{ flex:"1", minHeight:"0", display:"flex", background:"#fff" },
      left:{ flex:"1", minWidth:"0", padding:"48px 36px", display:"grid", gridTemplateColumns:"minmax(0,1fr)", gap:"28px", justifyItems:"center", alignContent:"start", background:"linear-gradient(180deg,#f6f4f3 0%,#ecebea 100%)", overflowX:"hidden", overflowY:"auto", boxSizing:"border-box" },
      previewStage:{ display:"grid", justifyItems:"center", gap:"32px", width:"100%", maxWidth:"min(100%, "+Math.round(A4W*PREVIEW_MAX_SCALE+120)+"px)", margin:"0px", padding:"12px 0 48px", boxSizing:"border-box" },
      pageDivider:{ width:"100%", textAlign:"center", color:UI.textDim, font:"12px/1.4 Segoe UI,system-ui", borderTop:"1px dashed "+UI.borderSubtle, padding:"14px 0 0", opacity:"0.75" },
      breakMarker:{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", margin:"18px 0", padding:"10px 12px", border:"1px dashed "+UI.borderSubtle, borderRadius:"6px", background:"#f8fbff", color:UI.brand, font:"12px/1.3 Segoe UI,system-ui", letterSpacing:".08em", textTransform:"uppercase", userSelect:"none", cursor:"default" },
      rightWrap:{ width:"min(46vw, 720px)", minWidth:"360px", maxWidth:"720px", height:"100%", display:"flex", flexDirection:"column", background:"#fff" },
      area:{ flex:"1", minHeight:"0", overflow:"auto", padding:"18px", outline:"none", font:"15px/1.6 Segoe UI,system-ui", background:"#fff" },
      pageFrame:"background:#fff;position:relative;overflow:hidden;margin:0px",
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
    return { UI,A4W,A4H,HDR_H,FTR_H,HDR_MIN,FTR_MIN,PAD,DEBOUNCE_PREVIEW,MOBILE_BP,PREVIEW_MAX_SCALE,PREVIEW_FRAME_PADDING,Style };
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
    const BLOCK=/^(P|DIV|UL|OL|LI|H1|H2|H3|H4|H5|H6|TABLE|BLOCKQUOTE|PRE|HR|IMG)$/i;
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
      if(typeof node.querySelector==="function"){
        const inner=node.querySelector(".weditor_page-header-inner");
        if(inner && inner.style) inner.style.textAlign=norm;
      }
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
    let lastKnownBreak=null;
    function rememberBreak(comment){
      if(comment && comment.parentNode){ lastKnownBreak=comment; }
    }
    function clearRemembered(comment){
      if(lastKnownBreak===comment){ lastKnownBreak=null; }
    }
    function getRangeConstant(name, fallback){
      if(typeof Range!=="undefined" && typeof Range[name]!=="undefined"){ return Range[name]; }
      try{
        const test=document.createRange && document.createRange();
        if(test && typeof test.constructor!=="undefined" && typeof test.constructor[name]!=="undefined"){
          return test.constructor[name];
        }
      }catch(err){}
      return fallback;
    }
    const RANGE_START_TO_START=getRangeConstant("START_TO_START", 0);
    const RANGE_START_TO_END=getRangeConstant("START_TO_END", 1);
    const RANGE_END_TO_END=getRangeConstant("END_TO_END", 2);
    const RANGE_END_TO_START=getRangeConstant("END_TO_START", 3);
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
      label.textContent="Page Break";
      marker.appendChild(label);
      return marker;
    }
    function previousDeep(node, boundary){
      if(!node) return null;
      if(node.previousSibling){
        node=node.previousSibling;
        while(node && node.lastChild) node=node.lastChild;
        return node;
      }
      const parent=node.parentNode;
      if(!parent || parent===boundary) return null;
      return previousDeep(parent, boundary);
    }
    function nextDeep(node, boundary){
      if(!node) return null;
      if(node.nextSibling){
        node=node.nextSibling;
        while(node && node.firstChild) node=node.firstChild;
        return node;
      }
      const parent=node.parentNode;
      if(!parent || parent===boundary) return null;
      return nextDeep(parent, boundary);
    }
    function findCommentForPlaceholder(placeholder){
      if(!placeholder) return null;
      let node=placeholder.previousSibling;
      while(isWhitespace(node)) node=node.previousSibling;
      if(isBreakComment(node)) return node;
      node=placeholder.nextSibling;
      while(isWhitespace(node)) node=node.nextSibling;
      if(isBreakComment(node)) return node;
      return null;
    }
    function findPreviousNode(container, offset, boundary){
      if(!container) return null;
      if(container.nodeType===3){
        if(offset>0) return null;
        return previousDeep(container, boundary);
      }
      if(container.childNodes && offset>0){
        let node=container.childNodes[offset-1];
        while(node && node.lastChild) node=node.lastChild;
        return node;
      }
      if(container===boundary) return null;
      return previousDeep(container, boundary);
    }
    function findNextNode(container, offset, boundary){
      if(!container) return null;
      if(container.nodeType===3){
        const text=container.nodeValue||"";
        if(offset<text.length) return null;
        return nextDeep(container, boundary);
      }
      if(container.childNodes && offset<container.childNodes.length){
        let node=container.childNodes[offset];
        while(node && node.firstChild) node=node.firstChild;
        return node;
      }
      if(container===boundary) return null;
      return nextDeep(container, boundary);
    }
    function findCommentNearCaret(target, direction){
      const sel=window.getSelection ? window.getSelection() : null;
      if(!sel || sel.rangeCount===0) return null;
      const range=sel.getRangeAt(0);
      if(!range.collapsed) return null;
      const container=range.startContainer;
      const offset=range.startOffset;
      if(!target.contains(container)) return null;
      if(container.nodeType===3){
        const text=container.nodeValue||"";
        if(direction==="backward" && offset>0) return null;
        if(direction==="forward" && offset<text.length) return null;
      }
      let node=direction==="backward" ? findPreviousNode(container, offset, target) : findNextNode(container, offset, target);
      while(node){
        if(isWhitespace(node)){ node = direction==="backward" ? previousDeep(node, target) : nextDeep(node, target); continue; }
        if(node.nodeType===1 && isPlaceholder(node)){
          const linked=findCommentForPlaceholder(node);
          if(linked){ rememberBreak(linked); return linked; }
          return null;
        }
        if(node.parentNode && node.parentNode.nodeType===1 && isPlaceholder(node.parentNode)){
          const linked=findCommentForPlaceholder(node.parentNode);
          if(linked){ rememberBreak(linked); return linked; }
          return null;
        }
        if(node.nodeType===8){
          if(isBreakComment(node)){ rememberBreak(node); return node; }
          return null;
        }
        if(node.nodeType===3) return null;
        if(node.nodeType===1) return null;
        node = direction==="backward" ? previousDeep(node, target) : nextDeep(node, target);
      }
      return null;
    }
    function rangeTouchesNode(range, node){
      if(!range || !node) return false;
      if(typeof range.intersectsNode==="function"){ try{ return range.intersectsNode(node); } catch(err){ return false; } }
      const doc=node.ownerDocument || document;
      if(!doc || !doc.createRange) return false;
      const test=doc.createRange();
      try{ test.setStartBefore(node); test.setEndAfter(node); }
      catch(err){
        try{ test.selectNode(node); }
        catch(err2){ return false; }
      }
      try{
        return range.compareBoundaryPoints(RANGE_END_TO_START, test) < 0 && range.compareBoundaryPoints(RANGE_START_TO_END, test) > 0;
      }catch(err){ return false; }
    }
    function findCommentWithinRange(range, target){
      if(!range || !target) return null;
      const doc=target.ownerDocument || document;
      if(!doc || !doc.createTreeWalker) return null;
      let root=range.commonAncestorContainer || target;
      if(root.nodeType===3) root=root.parentNode;
      if(!root || !target.contains(root)) root=target;
      const walker=doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT, null, false);
      let node=walker.currentNode;
      if(node && node!==root && isBreakComment(node) && target.contains(node) && rangeTouchesNode(range, node)){ rememberBreak(node); return node; }
      while((node=walker.nextNode())){
        if(!isBreakComment(node)) continue;
        if(!target.contains(node)) continue;
        if(rangeTouchesNode(range, node)){ rememberBreak(node); return node; }
      }
      return null;
    }
    function findAnyBreak(target, preferLast){
      if(!target) return null;
      const doc=target.ownerDocument || document;
      if(!doc || !doc.createTreeWalker) return null;
      const walker=doc.createTreeWalker(target, NodeFilter.SHOW_COMMENT, null, false);
      let node, found=null;
      while((node=walker.nextNode())){
        if(!isBreakComment(node)) continue;
        found=node;
        if(!preferLast) break;
      }
      if(found) rememberBreak(found);
      return found;
    }
    function inferDirectionFromRange(range, comment){
      if(!range || !comment) return "forward";
      const doc=comment.ownerDocument || document;
      if(!doc || !doc.createRange) return "forward";
      try{
        const markerRange=doc.createRange();
        markerRange.setStartBefore(comment);
        markerRange.collapse(true);
        const cmp=range.compareBoundaryPoints(RANGE_START_TO_START, markerRange);
        if(cmp>0) return "backward";
      }catch(err){}
      return "forward";
    }
    function removeCommentNode(target, comment, direction){
      if(!comment || !comment.parentNode) return false;
      const parent=comment.parentNode;
      const doc=parent.ownerDocument || document;
      const selection=doc.getSelection ? doc.getSelection() : window.getSelection();
      let range=null;
      if(doc.createRange){
        try{
          range=doc.createRange();
          if(direction==="forward") range.setStartAfter(comment);
          else range.setStartBefore(comment);
          range.collapse(true);
        }catch(err){ range=null; }
      }
      removePlaceholderFor(comment);
      clearRemembered(comment);
      if(comment.parentNode) comment.parentNode.removeChild(comment);
      if(range && selection){
        try{
          selection.removeAllRanges();
          selection.addRange(range);
        }catch(err){}
      }
      if(target && typeof target.focus==="function"){
        try{ target.focus({ preventScroll:true }); }
        catch(err){ target.focus(); }
      }
      return true;
    }
    function handleKeydown(target, ev){
      if(!target || !ev) return false;
      if(ev.defaultPrevented) return false;
      if(ev.ctrlKey || ev.metaKey || ev.altKey) return false;
      const key=String(ev.key||"");
      if(key!=="Backspace" && key!=="Delete") return false;
      const direction=key==="Backspace"?"backward":"forward";
      let comment=null;
      if(ev.target && ev.target.nodeType===1 && isPlaceholder(ev.target)){
        comment=findCommentForPlaceholder(ev.target);
      }else if(ev.target && ev.target.parentNode && ev.target.parentNode.nodeType===1 && isPlaceholder(ev.target.parentNode)){
        comment=findCommentForPlaceholder(ev.target.parentNode);
      }else{
        comment=findCommentNearCaret(target, direction);
      }
      if(comment && removeCommentNode(target, comment, direction)){
        ev.preventDefault();
        ensurePlaceholders(target);
        return true;
      }
      return false;
    }
    function attachPlaceholder(comment){
      if(!isBreakComment(comment) || !comment.parentNode) return null;
      let next=comment.nextSibling;
      while(isWhitespace(next)) next=next.nextSibling;
      if(isPlaceholder(next)) return next;
      const marker=createPlaceholder();
      const bindRemember=function(){ const linked=findCommentForPlaceholder(marker); if(linked) rememberBreak(linked); };
      marker.addEventListener("focus", bindRemember);
      marker.addEventListener("mousedown", bindRemember);
      marker.addEventListener("touchstart", bindRemember);
      if(comment.nextSibling){ comment.parentNode.insertBefore(marker, comment.nextSibling); }
      else { comment.parentNode.appendChild(marker); }
      rememberBreak(comment);
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
      if(clone.nodeType===11){
        const wrap=document.createElement("div");
        wrap.appendChild(clone);
        stripPlaceholders(wrap);
        enforceZeroMargins(wrap);
        return wrap.innerHTML;
      }
      stripPlaceholders(clone);
      enforceZeroMargins(clone);
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
        applyZeroMarginToParagraph(placeholder);
        const text=document.createTextNode("");
        placeholder.appendChild(text);
        targetEl.appendChild(placeholder);
        caretTarget=text;
      }
      if(targetEl && typeof targetEl.focus==="function") targetEl.focus();
      placeCaret(firstCaretPosition(caretTarget));
    }
    function remove(targetEl){
      if(!targetEl) return false;
      let direction="forward";
      let comment=null;
      const sel=window.getSelection ? window.getSelection() : null;
      if(sel && sel.rangeCount){
        const range=sel.getRangeAt(0);
        let inTarget=false;
        if(range){
          const container=range.commonAncestorContainer;
          if(container && targetEl.contains(container)) inTarget=true;
          else if(range.startContainer && targetEl.contains(range.startContainer)) inTarget=true;
          else if(range.endContainer && targetEl.contains(range.endContainer)) inTarget=true;
        }
        if(inTarget){
          if(range.collapsed){
            comment=findCommentNearCaret(targetEl, "forward");
            if(comment){ direction="forward"; }
            else {
              comment=findCommentNearCaret(targetEl, "backward");
              if(comment) direction="backward";
            }
          }else{
            comment=findCommentWithinRange(range, targetEl);
            if(comment){ direction=inferDirectionFromRange(range, comment); }
          }
        }
      }
      if(!comment && lastKnownBreak && targetEl.contains(lastKnownBreak)){
        comment=lastKnownBreak;
        direction="backward";
      }
      if(!comment){
        comment=findAnyBreak(targetEl, true);
        if(comment) direction="backward";
      }
      if(comment && removeCommentNode(targetEl, comment, direction)){
        ensurePlaceholders(targetEl);
        return true;
      }
      alert("No page break found near cursor.");
      return false;
    }
    return { insert, remove, ensurePlaceholders, stripPlaceholders, serialize, handleKeydown };
  })();
  const Paginator=(function(){
    const HEADER_BASE_STYLE="padding:0;border-bottom:1px solid "+WCfg.UI.border+";background:#fff;color:"+WCfg.UI.text+";font:14px Segoe UI,system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;row-gap:6px;box-sizing:border-box;";
    const FOOTER_BASE_STYLE="padding:0;border-top:1px solid "+WCfg.UI.border+";background:#fff;color:"+WCfg.UI.text+";font:12px Segoe UI,system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;row-gap:6px;box-sizing:border-box;";
    function observeMedia(container, callback, waiters){
      if(!container || !container.querySelectorAll || typeof callback!=="function") return;
      const imgs=container.querySelectorAll("img");
      if(!imgs || !imgs.length) return;
      for(let i=0;i<imgs.length;i++){
        const img=imgs[i];
        if(!img) continue;
        if(img.loading==="lazy") img.loading="eager";
        let resolveWaiter=null;
        let rejectWaiter=null;
        if(waiters && typeof waiters.push==="function"){
          const promise=new Promise(function(resolve, reject){
            resolveWaiter=resolve;
            rejectWaiter=reject;
          });
          waiters.push(promise);
        }
        let settled=false;
        const run=function(){
          if(settled) return;
          settled=true;
          img.removeEventListener("load", run);
          img.removeEventListener("error", run);
          let attempts=0;
          const apply=function(){
            attempts++;
            if(container && typeof container.isConnected!=="undefined" && !container.isConnected && attempts<10){
              window.requestAnimationFrame(apply);
              return;
            }
            try {
              callback();
              if(resolveWaiter) resolveWaiter();
            } catch(err){
              if(rejectWaiter) rejectWaiter(err);
              else throw err;
            }
          };
          window.requestAnimationFrame(apply);
        };
        img.addEventListener("load", run);
        img.addEventListener("error", run);
        if(img.complete){ run(); }
      }
    }
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
      page.__weditorNaturalHeight=A4H;
      page.__weditorAdaptiveHeight=false;
      let header=null, footer=null;
      if(headerEnabled){
        header=document.createElement("div");
        header.className="weditor_page-header";
        const minHeaderHeight=Math.max(WCfg.HDR_MIN, headerHeight);
        header.style.cssText="position:relative;left:0;right:0;top:0;"+HEADER_BASE_STYLE+"min-height:"+minHeaderHeight+"px;";
        const hl=document.createElement("div");
        hl.className="weditor_page-header-inner";
        hl.style.cssText="flex:1 1 auto;min-width:160px";
        hl.innerHTML=headerHTML;
        enforceHFImageSizing(hl);
        header.appendChild(hl);
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
      return { page, content, headerNode:header, footerNode:footer, explicit:false, headerHeight, footerHeight, baseHeaderHeight:headerHeight, baseFooterHeight:footerHeight };
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
        box.style.display="flex";
        const inner=document.createElement("div");
        inner.style.cssText="flex:1 1 auto;min-width:160px";
        inner.className="weditor_page-header-inner";
        inner.innerHTML=html;
        enforceHFImageSizing(inner);
        box.appendChild(inner);
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
      const allowAdaptiveHeight=!!(state && state.fixPageHeight===false && !state.headerEnabled && !state.footerEnabled);
      const textStyle=StyleMirror.capture(state && state.el ? state.el : null);
      const layout=measureLayout(headerEnabled, headerHTML, footerEnabled, footerHTML, headerAlign, footerAlign);
      const headerHeight=layout.headerHeight;
      const footerHeight=layout.footerHeight;
      const AVAIL=Math.max(64, A4H - headerHeight - footerHeight - 2*PAD);
      const sourceHTML=Sanitizer.clean(rawHTML);
      const src=document.createElement("div"); src.innerHTML=sourceHTML; enforceZeroMargins(src);
      function para(htmlOrText){
        const p=document.createElement("p");
        applyZeroMarginToParagraph(p);
        if(typeof htmlOrText==="string") p.innerHTML=htmlOrText; else p.textContent=htmlOrText;
        return p;
      }
      const linear=[];
      let hasManualBreak=false;
      for(let i=0;i<src.childNodes.length;i++){
        const n=src.childNodes[i];
        if(n.nodeType===8){
          const t=(n.nodeValue||"").trim().toLowerCase();
          if(t==="page:break"){ hasManualBreak=true; linear.push({t:"break"}); }
        }else if(n.nodeType===3){
          const txt=n.nodeValue.trim(); if(txt) linear.push({t:"block", node:para(txt)});
        }else if(n.nodeType===1){
          if(n.tagName==="DIV" && n.childNodes.length===1 && n.firstChild.nodeName==="BR"){ linear.push({t:"block", node:para("&nbsp;")}); }
          else if(n.tagName==="DIV" && n.innerHTML.trim()===""){ linear.push({t:"block", node:para("&nbsp;")}); }
          else {
            const wrap=document.createElement("div");
            wrap.style.margin="0";
            const clone=n.cloneNode(true);
            enforceZeroMargins(clone);
            wrap.appendChild(clone);
            linear.push({t:"block", node:wrap});
          }
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
        function parseDim(value){
          if(!value && value!==0) return null;
          const num=parseFloat(value);
          return isFinite(num) && num>0 ? num : null;
        }
        for(let k=0;k<imgs.length;k++){
          const img=imgs[k];
          if(!img) continue;
          img.loading="eager";
          let width=parseDim(img.getAttribute("data-weditor-width"));
          let height=parseDim(img.getAttribute("data-weditor-height"));
          const styleWidth=parseDim(img.style.width);
          const styleHeight=parseDim(img.style.height);
          const attrWidth=parseDim(img.getAttribute("width"));
          const attrHeight=parseDim(img.getAttribute("height"));
          if(width==null) width=styleWidth!=null?styleWidth:attrWidth;
          if(height==null) height=styleHeight!=null?styleHeight:attrHeight;
          const naturalWidth=img.naturalWidth || width || containerWidth;
          const naturalHeight=img.naturalHeight || height || containerWidth;
          const naturalRatio=(naturalWidth && naturalHeight) ? (naturalHeight/naturalWidth) : (width && height ? height/width : 1);
          if(width && height){
            const scale=containerWidth>0 ? Math.min(1, containerWidth/width) : 1;
            width=Math.round(Math.max(1, width*scale));
            height=Math.round(Math.max(1, height*scale));
          } else if(width){
            const scale=containerWidth>0 ? Math.min(1, containerWidth/width) : 1;
            width=Math.round(Math.max(1, width*scale));
            if(!height){
              const ratio=naturalRatio || 1;
              height=Math.round(Math.max(1, width*ratio));
            } else {
              height=Math.round(Math.max(1, height*scale));
            }
          } else if(height){
            const ratio=naturalRatio || 1;
            width=Math.round(Math.max(1, height/ratio));
            if(containerWidth>0 && width>containerWidth){
              const scale=containerWidth/width;
              width=Math.round(Math.max(1, containerWidth));
              height=Math.round(Math.max(1, height*scale));
            } else {
              height=Math.round(Math.max(1, height));
            }
          } else if(naturalWidth && naturalHeight){
            const scale=containerWidth>0 ? Math.min(1, containerWidth/naturalWidth) : 1;
            width=Math.round(Math.max(1, naturalWidth*scale));
            height=Math.round(Math.max(1, naturalHeight*scale));
          } else {
            width=Math.round(Math.max(1, containerWidth));
            height=width;
          }
          img.style.width=width+"px";
          img.style.height=height+"px";
          img.style.maxWidth=width+"px";
          img.style.maxHeight=height+"px";
          img.setAttribute("width", String(width));
          img.setAttribute("height", String(height));
          img.setAttribute("data-weditor-width", String(width));
          img.setAttribute("data-weditor-height", String(height));
          if(!img.style.objectFit) img.style.objectFit="contain";
        }
      }
      for(let i=0;i<linear.length;i++){
        const it=linear[i];
        if(it.t==="break"){ next(true); continue; }
        const block=it.node;
        enforceZeroMargins(block);
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
      const measurePagesHost=document.createElement("div");
      measurePagesHost.style.cssText="position:absolute;left:-99999px;top:-99999px;width:"+A4W+"px;visibility:hidden;pointer-events:none;opacity:0;";
      measWrap.appendChild(measurePagesHost);
      for(let i=0;i<pages.length;i++){ measurePagesHost.appendChild(pages[i].page); }
      const total=pages.length, dateStr=(new Date()).toISOString().slice(0,10);
      const pendingMedia=[];
      if(document && document.fonts && document.fonts.ready && typeof document.fonts.ready.then==="function"){
        pendingMedia.push(document.fonts.ready.catch(function(){ return null; }));
      }
      function adjustPageOffsets(pg){
        if(!pg) return;
        const baseHeader=Math.max(0, pg.baseHeaderHeight||0);
        const baseFooter=Math.max(0, pg.baseFooterHeight||0);
        let topOffset = pg.headerNode ? Math.max(WCfg.HDR_MIN, baseHeader) : 0;
        if(pg.headerNode){
          const rect=pg.headerNode.getBoundingClientRect();
          const measuredHeight=pg.headerNode.offsetHeight;
          const rectHeight=Math.ceil(rect.height||0);
          const actual=Math.max(measuredHeight||0, rectHeight, WCfg.HDR_MIN);
          topOffset=Math.max(topOffset, actual);
          const applied=Math.max(actual, WCfg.HDR_MIN);
          pg.headerNode.style.minHeight=applied+"px";
          pg.headerNode.setAttribute("data-offset-height", String(applied));
        }
        let bottomOffset = pg.footerNode ? Math.max(WCfg.FTR_MIN, baseFooter) : 0;
        if(pg.footerNode){
          const rect=pg.footerNode.getBoundingClientRect();
          const actual=Math.max(Math.ceil(rect.height||0), WCfg.FTR_MIN);
          bottomOffset=Math.max(bottomOffset, actual);
          pg.footerNode.style.minHeight=Math.max(actual, WCfg.FTR_MIN)+"px";
        }
        pg.headerHeight = pg.headerNode ? topOffset : 0;
        pg.footerHeight = pg.footerNode ? bottomOffset : 0;
        if(pg.content){
          pg.content.style.top = pg.headerNode ? topOffset+"px" : "0px";
          pg.content.style.bottom = pg.footerNode ? bottomOffset+"px" : "0px";
        }
      }
      function applyAdaptiveSizing(){
        const adaptiveCandidate=allowAdaptiveHeight && !hasManualBreak && pages.length===1;
        for(let i=0;i<pages.length;i++){
          const pg=pages[i];
          if(!pg || !pg.page) continue;
          const pageEl=pg.page;
          const contentEl=pg.content;
          if(adaptiveCandidate && i===0){
            pageEl.__weditorAdaptiveHeight=true;
            pageEl.style.height="";
            pageEl.style.minHeight="";
            pageEl.style.maxHeight="";
            if(contentEl){
              contentEl.style.position="relative";
              contentEl.style.top="";
              contentEl.style.bottom="";
              contentEl.style.minHeight="";
              contentEl.style.height="";
            }
            const rect=pageEl.getBoundingClientRect();
            const measured=Math.max(1, Math.ceil(rect.height||0));
            pageEl.__weditorNaturalHeight = measured || A4H;
          }else{
            pageEl.__weditorAdaptiveHeight=false;
            pageEl.__weditorNaturalHeight=A4H;
            if(contentEl){
              contentEl.style.position="absolute";
              contentEl.style.top = pg.headerHeight ? pg.headerHeight+"px" : "0px";
              contentEl.style.bottom = pg.footerHeight ? pg.footerHeight+"px" : "0px";
            }
          }
        }
      }
      for(let i=0;i<pages.length;i++){
        const pg=pages[i];
        if(headerEnabled && pg.headerNode) Tokens.apply(pg.headerNode, {page:i+1,total,date:dateStr});
        if(footerEnabled && pg.footerNode) Tokens.apply(pg.footerNode, {page:i+1,total,date:dateStr});
        adjustPageOffsets(pg);
        if(pg.headerNode){ observeMedia(pg.headerNode, function(){ adjustPageOffsets(pg); }, pendingMedia); }
        if(pg.footerNode){ observeMedia(pg.footerNode, function(){ adjustPageOffsets(pg); }, pendingMedia); }
      }
      applyAdaptiveSizing();
      const pageBreakHTML='<div class="weditor_page-break" style="page-break-before: always;"></div>';
      function serializePages(){
        let html="";
        for(let i=0;i<pages.length;i++){
          if(i>0){ html+=pageBreakHTML; }
          const pageEl=pages[i] && pages[i].page;
          let originalHeight="";
          let hadHeight=false;
          if(pageEl && pageEl.__weditorAdaptiveHeight){
            originalHeight=pageEl.style.height;
            hadHeight=!!(originalHeight && originalHeight.length);
            pageEl.style.height="";
          }
          if(pageEl){ html+=pageEl.outerHTML; }
          if(pageEl && pageEl.__weditorAdaptiveHeight){
            if(hadHeight){
              pageEl.style.height=originalHeight;
            }else{
              pageEl.style.removeProperty("height");
            }
          }
        }
        return html;
      }
      const cleanup=function(){ if(measWrap && measWrap.parentNode){ measWrap.parentNode.removeChild(measWrap); } };
      const initialHTML=serializePages();
      let ready=null;
      if(pendingMedia.length){
        const waitAll=Promise.all(pendingMedia).then(function(){
          for(let i=0;i<pages.length;i++){ adjustPageOffsets(pages[i]); }
          applyAdaptiveSizing();
          return serializePages();
        });
        ready=waitAll.catch(function(){ return serializePages(); });
        ready.then(cleanup, cleanup);
      }else{
        cleanup();
        ready=Promise.resolve(initialHTML);
      }
      return { pages: pages.map(function(p){ return p.page; }), pagesHTML: initialHTML, ready };
    }
    function pagesHTML(inst){ return paginate(Breaks.serialize(inst.el), inst).pagesHTML; }
    return { paginate, pagesHTML };
  })();
  const ExportUI=(function(){
    function render(w, pagedHTML, rawHTML){
      if(!w) return;
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
    function open(pagedHTML, rawHTML, existingWindow){
      const w=existingWindow || WDom.openBlank(); if(!w) return;
      render(w, pagedHTML, rawHTML);
    }
    return { open, render };
  })();
  const PAGED_PRINT_STYLES = "div[data-page]{border-radius:0!important;box-shadow:none!important;border:none!important;outline:none!important;}"+
    ".weditor_page-break{display:block;width:100%;height:0;margin:0;padding:0;border:0;font-size:0;line-height:0;page-break-before:always;}"+
    ".weditor_page-header,.weditor_page-footer{border:none!important;box-shadow:none!important;}"+
    ".weditor_page-header{border-bottom:0!important;}"+
    ".weditor_page-footer{border-top:0!important;}"+
    ".weditor_page-content p{margin:0;margin-block-start:0;margin-block-end:0;}";
  const PrintUI=(function(){
    function render(w, pagedHTML){
      if(!w) return;
      const html="<!DOCTYPE html><html><head><meta charset='utf-8'>"+
               "<style>"+PAGED_PRINT_STYLES+"</style>"+
               "</head><body style='margin:0;background:#fff;font-family:Segoe UI,system-ui,-apple-system,Arial' onload='window.print();window.onafterprint=function(){window.close();}'>"+
               pagedHTML+
               "</body></html>";
      w.document.open(); w.document.write(html); w.document.close();
    }
    function open(pagedHTML, existingWindow){
      const w=existingWindow || WDom.openBlank(); if(!w) return;
      render(w, pagedHTML);
    }
    return { open, render };
  })();
  const ImageTools=(function(){
    const HANDLE_SPECS=[
      { dir:"nw", kind:"corner", cursor:"nwse-resize", top:"-7px", left:"-7px" },
      { dir:"n", kind:"edge", axis:"y", cursor:"ns-resize", top:"-7px", left:"calc(50% - 6px)" },
      { dir:"ne", kind:"corner", cursor:"nesw-resize", top:"-7px", right:"-7px" },
      { dir:"e", kind:"edge", axis:"x", cursor:"ew-resize", top:"calc(50% - 6px)", right:"-7px" },
      { dir:"se", kind:"corner", cursor:"nwse-resize", bottom:"-7px", right:"-7px" },
      { dir:"s", kind:"edge", axis:"y", cursor:"ns-resize", bottom:"-7px", left:"calc(50% - 6px)" },
      { dir:"sw", kind:"corner", cursor:"nesw-resize", bottom:"-7px", left:"-7px" },
      { dir:"w", kind:"edge", axis:"x", cursor:"ew-resize", top:"calc(50% - 6px)", left:"-7px" }
    ];
    const MIN_SIZE=32;
    const STYLE_ID="weditor-image-style";
    function captureDimensions(img){
      if(!img) return;
      let width=0;
      let height=0;
      if(img.getBoundingClientRect){
        const rect=img.getBoundingClientRect();
        width=Math.round(rect.width||0);
        height=Math.round(rect.height||0);
      }
      if((!width || !height) && img.naturalWidth && img.naturalHeight){
        width=Math.round(img.naturalWidth);
        height=Math.round(img.naturalHeight);
      }
      if((!width || !height) && (img.offsetWidth || img.offsetHeight)){
        width=Math.round(img.offsetWidth||0);
        height=Math.round(img.offsetHeight||0);
      }
      if(width>0){
        img.setAttribute("data-weditor-width", String(width));
        img.setAttribute("width", String(width));
      }
      if(height>0){
        img.setAttribute("data-weditor-height", String(height));
        img.setAttribute("height", String(height));
      }
    }
    function ensureStyle(){
      if(document.getElementById(STYLE_ID)) return;
      const style=document.createElement("style");
      style.id=STYLE_ID;
      style.textContent=".weditor-hf-img-active{outline:2px solid "+WCfg.UI.brand+";outline-offset:2px;}"+
        ".weditor-overlay-moving{cursor:move!important;}";
      document.head.appendChild(style);
    }
    function insideOverlay(node, overlay){
      let current=node;
      while(current){
        if(current===overlay) return true;
        if(current.nodeType===1 && current.hasAttribute && current.hasAttribute("data-weditor-overlay")) return true;
        current=current.parentNode;
      }
      return false;
    }
    function caretRangeAt(doc, x, y){
      if(doc.caretRangeFromPoint){
        const range=doc.caretRangeFromPoint(x, y);
        return range || null;
      }
      if(doc.caretPositionFromPoint){
        const pos=doc.caretPositionFromPoint(x, y);
        if(!pos) return null;
        const range=doc.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
        return range;
      }
      return null;
    }
    function clampSize(value){ return isFinite(value) ? Math.max(MIN_SIZE, value) : MIN_SIZE; }
    function formatReadout(width, height, hostWidth){
      const safeHost=Math.max(1, hostWidth||1);
      const percent=Math.min(999, Math.round((width/safeHost)*100));
      return Math.round(width)+"×"+Math.round(height)+" · "+percent+"%";
    }
    function attach(editor){
      if(!editor) return null;
      if(editor.__weditorImageTools){
        const existing=editor.__weditorImageTools;
        const overlay=existing.overlay;
        if(overlay && doc && doc.body && overlay.parentNode!==doc.body){ doc.body.appendChild(overlay); }
        editor.__weditorCleanup=existing.cleanup || editor.__weditorCleanup;
        editor.__weditorHideOverlay=existing.hide || editor.__weditorHideOverlay;
        editor.__weditorSelectImage=existing.select || editor.__weditorSelectImage;
        return existing;
      }
      ensureStyle();
      const doc=editor.ownerDocument || document;
      const computed=window.getComputedStyle(editor);
      if(computed.position === "static") editor.style.position="relative";
      const overlay=document.createElement("div");
      overlay.setAttribute("data-weditor-overlay","1");
      overlay.style.position="fixed";
      overlay.style.border="1px dashed "+WCfg.UI.brand;
      overlay.style.borderRadius="4px";
      overlay.style.boxSizing="border-box";
      overlay.style.pointerEvents="none";
      overlay.style.display="none";
      overlay.style.zIndex="2147483200";
      overlay.style.left="0";
      overlay.style.top="0";
      const moveArea=document.createElement("div");
      moveArea.setAttribute("data-weditor-overlay","1");
      moveArea.style.position="absolute";
      moveArea.style.left="0";
      moveArea.style.top="0";
      moveArea.style.width="100%";
      moveArea.style.height="100%";
      moveArea.style.cursor="move";
      moveArea.style.pointerEvents="auto";
      moveArea.style.touchAction="none";
      moveArea.style.zIndex="1";
      overlay.appendChild(moveArea);
      if(doc && doc.body){ doc.body.appendChild(overlay); }
      const handles=[];
      for(let i=0;i<HANDLE_SPECS.length;i++){
        const spec=HANDLE_SPECS[i];
        const handle=document.createElement("div");
        handle.setAttribute("data-weditor-overlay","1");
        handle.setAttribute("data-direction", spec.dir);
        handle.style.position="absolute";
        handle.style.width="12px";
        handle.style.height="12px";
        handle.style.borderRadius="50%";
        handle.style.background=WCfg.UI.brand;
        handle.style.border="2px solid #fff";
        handle.style.boxShadow="0 1px 4px rgba(0,0,0,.3)";
        handle.style.pointerEvents="auto";
        handle.style.touchAction="none";
        handle.style.cursor=spec.cursor;
        handle.style.zIndex="2";
        if(spec.top) handle.style.top=spec.top;
        if(spec.bottom) handle.style.bottom=spec.bottom;
        if(spec.left) handle.style.left=spec.left;
        if(spec.right) handle.style.right=spec.right;
        handles.push({ spec, el:handle });
        overlay.appendChild(handle);
      }
      const readout=document.createElement("div");
      readout.setAttribute("data-weditor-overlay","1");
      readout.style.position="absolute";
      readout.style.right="0";
      readout.style.top="-28px";
      readout.style.padding="2px 6px";
      readout.style.font="11px/1.4 Segoe UI,system-ui";
      readout.style.color="#fff";
      readout.style.background=WCfg.UI.brand;
      readout.style.borderRadius="6px";
      readout.style.boxShadow="0 2px 6px rgba(0,0,0,.18)";
      readout.style.whiteSpace="nowrap";
      readout.style.pointerEvents="none";
      readout.style.zIndex="3";
      overlay.appendChild(readout);
      editor.__weditorImageOverlay=overlay;
      let activeImg=null;
      let raf=null;
      let resizing=false;
      let moving=false;
      let dropRange=null;
      function getSelection(){ return doc.getSelection ? doc.getSelection() : window.getSelection(); }
      function hideOverlay(){
        overlay.style.display="none";
        readout.textContent="";
        if(activeImg){ activeImg.classList.remove("weditor-hf-img-active"); }
        activeImg=null;
      }
      function ensureImageWatcher(img){
        if(!img || img.__weditorSizeHandler) return;
        const handler=function(){ captureDimensions(img); scheduleOverlay(); };
        img.__weditorSizeHandler=handler;
        if(img.complete){
          captureDimensions(img);
        } else {
          img.addEventListener("load", handler);
        }
      }
      function refreshImageWatchers(){
        if(!editor || !editor.querySelectorAll) return;
        const imgs=editor.querySelectorAll("img");
        for(let i=0;i<imgs.length;i++){ ensureImageWatcher(imgs[i]); }
      }
      function detachImageWatchers(){
        if(!editor || !editor.querySelectorAll) return;
        const imgs=editor.querySelectorAll("img");
        for(let i=0;i<imgs.length;i++){
          const img=imgs[i];
          if(!img.__weditorSizeHandler) continue;
          img.removeEventListener("load", img.__weditorSizeHandler);
          delete img.__weditorSizeHandler;
        }
      }
      function dispatchInput(){
        if(!editor) return;
        let ev=null;
        if(typeof window!="undefined" && typeof window.InputEvent==="function"){
          try {
            ev=new InputEvent("input", { bubbles:true, cancelable:false, inputType:"insertReplacementText" });
          } catch(err){}
        }
        if(!ev){
          try {
            ev=document.createEvent("Event");
            ev.initEvent("input", true, false);
          } catch(e){ ev=new Event("input", { bubbles:true }); }
        }
        editor.dispatchEvent(ev);
        if(editor.__winst && typeof OutputBinding!=="undefined" && OutputBinding && typeof OutputBinding.syncDebounced==="function"){
          OutputBinding.syncDebounced(editor.__winst);
        }
      }
      function updateOverlay(){
        if(!activeImg || !editor.contains(activeImg)){ hideOverlay(); return; }
        const rect=activeImg.getBoundingClientRect();
        const hostRect=editor.getBoundingClientRect();
        if(doc && doc.body && overlay.parentNode!==doc.body){ doc.body.appendChild(overlay); }
        overlay.style.left=rect.left+"px";
        overlay.style.top=rect.top+"px";
        overlay.style.width=rect.width+"px";
        overlay.style.height=rect.height+"px";
        overlay.style.display="block";
        readout.textContent=formatReadout(Math.max(1, rect.width), Math.max(1, rect.height), hostRect.width);
      }
      function scheduleOverlay(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(updateOverlay); }
      function selectImage(img){
        if(activeImg===img){ scheduleOverlay(); return; }
        if(activeImg){ activeImg.classList.remove("weditor-hf-img-active"); }
        activeImg=img && editor.contains(img) ? img : null;
        if(activeImg){
          activeImg.classList.add("weditor-hf-img-active");
          ensureImageWatcher(activeImg);
          captureDimensions(activeImg);
          if(activeImg.complete){ scheduleOverlay(); }
          else { activeImg.addEventListener("load", scheduleOverlay, { once:true }); scheduleOverlay(); }
        } else {
          hideOverlay();
        }
      }
      function onClick(ev){ const target=ev.target; if(target && target.tagName==="IMG"){ selectImage(target); } else if(!insideOverlay(target, overlay)){ hideOverlay(); } }
      function onInput(){ if(activeImg && !editor.contains(activeImg)) hideOverlay(); scheduleOverlay(); }
      function onScroll(){ scheduleOverlay(); }
      function onBlur(){ hideOverlay(); }
      function onKeydown(ev){ if(ev.key==="Escape") hideOverlay(); }
      function onFocus(){ scheduleOverlay(); }
      function onMouseDown(ev){ if(!insideOverlay(ev.target, overlay)) scheduleOverlay(); }
      function onDragStart(ev){ if(resizing || moving){ ev.preventDefault(); ev.stopPropagation(); } }
      function getValidDropRange(x, y){
        let range=caretRangeAt(doc, x, y);
        if(range && insideOverlay(range.startContainer, overlay)){
          const display=overlay.style.display;
          overlay.style.display="none";
          range=caretRangeAt(doc, x, y);
          overlay.style.display=display;
        }
        if(!range || !range.startContainer) return null;
        if(!editor.contains(range.startContainer)) return null;
        if(insideOverlay(range.startContainer, overlay)) return null;
        return range;
      }
      function moveImageToRange(img, range){
        if(!img || !range) return false;
        const prevParent=img.parentNode;
        const prevNext=img.nextSibling;
        const drop=range.cloneRange();
        drop.collapse(true);
        drop.insertNode(img);
        const after=doc.createRange();
        after.setStartAfter(img);
        after.collapse(true);
        const sel=getSelection();
        if(sel){ sel.removeAllRanges(); sel.addRange(after); }
        return img.parentNode!==prevParent || img.nextSibling!==prevNext;
      }
      const observer=new MutationObserver(function(records){
        for(let i=0;i<records.length;i++){
          const rec=records[i];
          if(rec.target && insideOverlay(rec.target, overlay)) continue;
          let relevant=false;
          const added=rec.addedNodes || [];
          const removed=rec.removedNodes || [];
          for(let j=0;j<added.length;j++){ if(!insideOverlay(added[j], overlay)){ relevant=true; break; } }
          if(!relevant){
            for(let j=0;j<removed.length;j++){ if(!insideOverlay(removed[j], overlay)){ relevant=true; break; } }
          }
          if(relevant || rec.type==="attributes"){
            if(activeImg && !editor.contains(activeImg)) hideOverlay();
            scheduleOverlay();
            refreshImageWatchers();
            return;
          }
        }
      });
      observer.observe(editor, { childList:true, subtree:true, attributes:true });
      function startResize(spec, handleEl, ev){
        if(!activeImg) return;
        resizing=true;
        ev.preventDefault();
        ev.stopPropagation();
        const pointerId=ev.pointerId;
        try { handleEl.setPointerCapture(pointerId); } catch(e){}
        const rect=activeImg.getBoundingClientRect();
        const startWidth=rect.width;
        const startHeight=Math.max(1, rect.height);
        const ratio=startHeight>0?(startWidth/startHeight):1;
        const startX=ev.clientX;
        const startY=ev.clientY;
        let changed=false;
        function applySize(width, height){
          const nextWidth=clampSize(width);
          const nextHeight=clampSize(height);
          const prevWidth=isFinite(parseFloat(activeImg.style.width))?parseFloat(activeImg.style.width):activeImg.getBoundingClientRect().width;
          const prevHeight=isFinite(parseFloat(activeImg.style.height))?parseFloat(activeImg.style.height):activeImg.getBoundingClientRect().height;
          const widthPx=Math.round(nextWidth);
          const heightPx=Math.round(nextHeight);
          if(!changed && (Math.round(prevWidth)!==widthPx || Math.round(prevHeight)!==heightPx)) changed=true;
          activeImg.style.maxWidth="";
          activeImg.style.maxHeight="";
          activeImg.style.width=widthPx+"px";
          activeImg.style.height=heightPx+"px";
          activeImg.setAttribute("data-weditor-width", String(widthPx));
          activeImg.setAttribute("data-weditor-height", String(heightPx));
          activeImg.setAttribute("width", String(widthPx));
          activeImg.setAttribute("height", String(heightPx));
          if(!activeImg.style.objectFit) activeImg.style.objectFit="contain";
          captureDimensions(activeImg);
          scheduleOverlay();
        }
        function onMove(moveEv){
          if(!resizing) return;
          moveEv.preventDefault();
          const deltaX=moveEv.clientX-startX;
          const deltaY=moveEv.clientY-startY;
          let width=startWidth;
          let height=startHeight;
          if(spec.kind==="corner"){
            const signX=spec.dir.indexOf("w")>=0?-1:1;
            const signY=spec.dir.indexOf("n")>=0?-1:1;
            const widthCandidate=startWidth+deltaX*signX;
            const heightFromWidth=widthCandidate/ratio;
            const heightCandidate=startHeight+deltaY*signY;
            const widthFromHeight=heightCandidate*ratio;
            let useWidth=Math.abs(deltaX)>=Math.abs(deltaY);
            if(!isFinite(heightFromWidth) || heightFromWidth<=0){ useWidth=false; }
            if(!isFinite(widthFromHeight) || widthFromHeight<=0){ useWidth=true; }
            if(useWidth){
              width=widthCandidate;
              height=heightFromWidth;
            } else {
              height=heightCandidate;
              width=widthFromHeight;
            }
          } else if(spec.axis==="x"){
            const sign=spec.dir==="w"?-1:1;
            width=startWidth+deltaX*sign;
          } else if(spec.axis==="y"){
            const sign=spec.dir==="n"?-1:1;
            height=startHeight+deltaY*sign;
          }
          applySize(width, height);
        }
        function finish(upEv){
          if(!resizing) return;
          resizing=false;
          doc.removeEventListener("pointermove", onMove);
          doc.removeEventListener("pointerup", finish);
          doc.removeEventListener("pointercancel", finish);
          if(handleEl.hasPointerCapture && handleEl.hasPointerCapture(pointerId)){
            try { handleEl.releasePointerCapture(pointerId); } catch(e){}
          }
          if(upEv) upEv.preventDefault();
          scheduleOverlay();
          if(changed){
            dispatchInput();
          }
        }
        doc.addEventListener("pointermove", onMove);
        doc.addEventListener("pointerup", finish);
        doc.addEventListener("pointercancel", finish);
      }
      for(let i=0;i<handles.length;i++){
        const entry=handles[i];
        entry.el.addEventListener("pointerdown", function(ev){ startResize(entry.spec, entry.el, ev); });
      }
      function onMovePointerDown(ev){
        if(!activeImg || ev.button===1 || ev.button===2) return;
        moving=true;
        ev.preventDefault();
        ev.stopPropagation();
        overlay.classList.add("weditor-overlay-moving");
        moveArea.classList.add("weditor-overlay-moving");
        const pointerId=ev.pointerId;
        try { moveArea.setPointerCapture(pointerId); } catch(e){}
        const sel=getSelection();
        const originalRange=sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
        dropRange=null;
        let movedDuringDrag=false;
        function update(moveEv){
          if(!moving) return;
          moveEv.preventDefault();
          const candidate=getValidDropRange(moveEv.clientX, moveEv.clientY);
          const sel=getSelection();
          if(candidate){
            dropRange=candidate;
            if(sel){
              sel.removeAllRanges();
              const preview=candidate.cloneRange();
              preview.collapse(true);
              sel.addRange(preview);
            }
          } else if(sel){
            sel.removeAllRanges();
          }
        }
        function finish(endEv){
          if(!moving) return;
          moving=false;
          overlay.classList.remove("weditor-overlay-moving");
          moveArea.classList.remove("weditor-overlay-moving");
          doc.removeEventListener("pointermove", update);
          doc.removeEventListener("pointerup", finish);
          doc.removeEventListener("pointercancel", finish);
          if(moveArea.hasPointerCapture && moveArea.hasPointerCapture(pointerId)){
            try { moveArea.releasePointerCapture(pointerId); } catch(e){}
          }
          if(endEv){
            endEv.preventDefault();
            const finalRange=getValidDropRange(endEv.clientX, endEv.clientY);
            if(finalRange) dropRange=finalRange;
          }
          const sel=getSelection();
          if(dropRange && editor.contains(dropRange.startContainer)){
            const changed=moveImageToRange(activeImg, dropRange);
            if(changed){ movedDuringDrag=true; }
          } else if(originalRange && sel){
            sel.removeAllRanges();
            sel.addRange(originalRange);
          }
          dropRange=null;
          scheduleOverlay();
          if(movedDuringDrag){
            captureDimensions(activeImg);
            dispatchInput();
          }
        }
        doc.addEventListener("pointermove", update);
        doc.addEventListener("pointerup", finish);
        doc.addEventListener("pointercancel", finish);
      }
      moveArea.addEventListener("pointerdown", onMovePointerDown);
      editor.addEventListener("click", onClick);
      editor.addEventListener("input", onInput);
      editor.addEventListener("scroll", onScroll, { passive:true });
      window.addEventListener("resize", scheduleOverlay);
      window.addEventListener("scroll", scheduleOverlay, { passive:true, capture:true });
      editor.addEventListener("blur", onBlur);
      editor.addEventListener("focus", onFocus);
      editor.addEventListener("keydown", onKeydown);
      editor.addEventListener("mousedown", onMouseDown);
      editor.addEventListener("dragstart", onDragStart);
      const cleanup=function(){
        if(raf) cancelAnimationFrame(raf);
        window.removeEventListener("resize", scheduleOverlay);
        window.removeEventListener("scroll", scheduleOverlay, { capture:true });
        observer.disconnect();
        editor.removeEventListener("click", onClick);
        editor.removeEventListener("input", onInput);
        editor.removeEventListener("scroll", onScroll);
        editor.removeEventListener("blur", onBlur);
        editor.removeEventListener("focus", onFocus);
        editor.removeEventListener("keydown", onKeydown);
        editor.removeEventListener("mousedown", onMouseDown);
        editor.removeEventListener("dragstart", onDragStart);
        moveArea.removeEventListener("pointerdown", onMovePointerDown);
        detachImageWatchers();
        if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
        hideOverlay();
        editor.__weditorImageOverlay=null;
        editor.__weditorImageResizer=false;
        editor.__weditorHideOverlay=null;
        editor.__weditorSelectImage=null;
        editor.__weditorImageTools=null;
      };
      const tools={ overlay, hide:hideOverlay, select:selectImage, schedule:scheduleOverlay, cleanup };
      editor.__weditorImageResizer=true;
      editor.__weditorHideOverlay=hideOverlay;
      editor.__weditorSelectImage=selectImage;
      editor.__weditorCleanup=cleanup;
      editor.__weditorImageTools=tools;
      refreshImageWatchers();
      return tools;
    }
    return { attach, select:function(editor, img){ const tools=attach(editor); if(tools && typeof tools.select==="function") tools.select(img); }, capture:captureDimensions };
  })();

  const HFEditor=(function(){
    function enableImageResizer(editor){
      if(!editor) return;
      const tools=ImageTools.attach(editor);
      if(tools && typeof tools.hide==="function") tools.hide();
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
    function resolveLetterheadLogo(inst){
      if(inst && inst.customLetterheadLogoURL){
        return inst.customLetterheadLogoURL;
      }
      return DEFAULT_LETTERHEAD_LOGO_URL;
    }
    function renderBannerPreview(src, alt){
      const safeSrc=escapeAttribute(src);
      const safeAlt=escapeAttribute(alt);
      return '<div style="display:flex;align-items:center;justify-content:center;width:100%;padding:6px 0;">'+
        '<img src="'+safeSrc+'" alt="'+safeAlt+'" style="width:100%;height:auto;object-fit:contain;border-radius:6px;">'+
      '</div>';
    }
    function renderBannerHTML(src, alt){
      const safeSrc=escapeAttribute(src);
      const safeAlt=escapeAttribute(alt);
      return '<div style="width:100%;display:flex;justify-content:center;align-items:center;">'+
        '<img src="'+safeSrc+'" alt="'+safeAlt+'" style="width:100%;height:auto;object-fit:contain;display:block;">'+
      '</div>';
    }
    function renderLetterheadPreview(inst){
      return renderBannerPreview(resolveLetterheadLogo(inst), "Letterhead banner");
    }
    function renderLetterheadHTML(inst){
      return renderBannerHTML(resolveLetterheadLogo(inst), "Letterhead banner");
    }
    function renderLetterheadLogoPreview(inst){
      const src=escapeAttribute(resolveLetterheadLogo(inst));
      return '<div style="display:flex;align-items:center;gap:12px;width:100%;">'+
        '<img src="'+src+'" alt="Letterhead logo" style="width:60px;height:60px;object-fit:contain;border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.12);">'+
        '<div style="display:flex;flex-direction:column;gap:2px;font-size:12px;color:#444;">'+
          '<strong style="font-size:16px;color:#222;">Acme Industries</strong>'+
          '<span>Professional Services Division</span>'+
          '<span>{{date}}</span>'+
        '</div>'+
      '</div>';
    }
    function renderLetterheadLogoHTML(inst){
      const src=escapeAttribute(resolveLetterheadLogo(inst));
      return '<div style="width:100%;display:flex;align-items:center;gap:18px;">'+
        '<img src="'+src+'" alt="Letterhead logo" style="width:72px;height:72px;object-fit:contain;border-radius:16px;display:block;">'+
        '<div style="display:flex;flex-direction:column;gap:4px;">'+
          '<div style="font-size:18px;font-weight:600;color:#1a1a1a;">Acme Industries</div>'+
          '<div style="font-size:13px;color:#605e5c;">Professional Services Division</div>'+
          '<div style="font-size:12px;color:#605e5c;">{{date}}</div>'+
        '</div>'+
      '</div>';
    }
    function resolveFooterLogo(inst){
      if(inst && inst.customFooterLogoURL){
        return inst.customFooterLogoURL;
      }
      if(inst && inst.customLetterheadLogoURL){
        return inst.customLetterheadLogoURL;
      }
      return DEFAULT_FOOTER_LOGO_URL;
    }
    function renderFooterLogoPreview(inst){
      return renderBannerPreview(resolveFooterLogo(inst), "Footer banner");
    }
    function renderFooterLogoHTML(inst){
      return renderBannerHTML(resolveFooterLogo(inst), "Footer banner");
    }
    function renderFooterLogoWithPagePreview(inst){
      const src=escapeAttribute(resolveFooterLogo(inst));
      return '<div style="display:flex;flex-direction:column;align-items:stretch;gap:8px;width:100%;">'+
        '<div style="width:100%;display:flex;justify-content:center;align-items:center;">'+
          '<img src="'+src+'" alt="Footer banner" style="width:100%;height:auto;object-fit:contain;border-radius:6px;">'+
        '</div>'+""+
        '<div data-weditor-page-line="simple" style="width:100%;display:flex;justify-content:flex-end;align-items:center;text-align:right;">'+
          '<span data-weditor-page-number style="font-size:12px;color:#605e5c;text-align:right;">Page <span class="weditor_footer_page_num">{{page}}</span> of <span class="weditor_footer_page_num_total">{{total}}</span></span>'+
        '</div>'+
      '</div>';
    }
    function renderFooterLogoWithPageHTML(inst){
      const src=escapeAttribute(resolveFooterLogo(inst));
      return '<div style="width:100%;display:flex;flex-direction:column;align-items:stretch;gap:10px;">'+
        '<div style="width:100%;display:flex;justify-content:center;align-items:center;">'+
          '<img src="'+src+'" alt="Footer banner" style="width:100%;height:auto;object-fit:contain;display:block;border-radius:6px;">'+
        '</div>'+""+
        '<div data-weditor-page-line="simple" style="width:100%;display:flex;justify-content:flex-end;align-items:center;text-align:right;">'+
          '<span data-weditor-page-number style="font-size:12px;color:#605e5c;text-align:right;">Page <span class="weditor_footer_page_num">{{page}}</span> of <span class="weditor_footer_page_num_total">{{total}}</span></span>'+
        '</div>'+
      '</div>';
    }
    function renderFooterLogoWithMetaPreview(inst){
      const src=escapeAttribute(resolveFooterLogo(inst));
      return '<div style="display:flex;flex-direction:column;align-items:stretch;gap:8px;width:100%;">'+
        '<div style="width:100%;display:flex;justify-content:center;align-items:center;">'+
          '<img src="'+src+'" alt="Footer banner" style="width:100%;height:auto;object-fit:contain;border-radius:6px;">'+
        '</div>'+""+
        '<div data-weditor-page-line="three" style="width:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;font-size:11px;color:#605e5c;">'+
          '<span style="text-align:left;opacity:.72;">Left label</span>'+
          '<span style="text-align:center;opacity:.72;">Center message</span>'+
          '<span data-weditor-page-number style="text-align:right;justify-self:end;font-weight:600;color:#444;">Page <span class="weditor_footer_page_num">{{page}}</span> of <span class="weditor_footer_page_num_total">{{total}}</span></span>'+
        '</div>'+
      '</div>';
    }
    function renderFooterLogoWithMetaHTML(inst){
      const src=escapeAttribute(resolveFooterLogo(inst));
      return '<div style="width:100%;display:flex;flex-direction:column;align-items:stretch;gap:10px;">'+
        '<div style="width:100%;display:flex;justify-content:center;align-items:center;">'+
          '<img src="'+src+'" alt="Footer banner" style="width:100%;height:auto;object-fit:contain;display:block;border-radius:6px;">'+
        '</div>'+""+
        '<div data-weditor-page-line="three" style="width:100%;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;font-size:12px;color:#605e5c;">'+
          '<span style="text-align:left;opacity:.78;">Left label</span>'+
          '<span style="text-align:center;opacity:.78;">Center message</span>'+
          '<span data-weditor-page-number style="text-align:right;justify-self:end;font-weight:600;color:#404040;">Page <span class="weditor_footer_page_num">{{page}}</span> of <span class="weditor_footer_page_num_total">{{total}}</span></span>'+
        '</div>'+
      '</div>';
    }
    const PAGE_TOTAL_REGEX=/\{\{\s*(page|total)\s*\}\}/i;
    function wrapPageTokens(root, kind){
      if(!root) return;
      const classes=kind==="header"?
        { page:"weditor_header_page_num", total:"weditor_header_page_num_total" }:
        { page:"weditor_footer_page_num", total:"weditor_footer_page_num_total" };
      function isWrapped(node){
        if(!node || node.nodeType!==1) return false;
        if(node.getAttribute && node.getAttribute("data-weditor-token-wrap")) return true;
        if(node.classList && (node.classList.contains(classes.page) || node.classList.contains(classes.total))) return true;
        return false;
      }
      const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      const targets=[]; let node;
      while((node=walker.nextNode())){
        if(!node.nodeValue || !PAGE_TOTAL_REGEX.test(node.nodeValue)) continue;
        const parent=node.parentNode;
        let current=parent; let skip=false;
        while(current && current!==root){
          if(isWrapped(current)){ skip=true; break; }
          current=current.parentNode;
        }
        if(skip) continue;
        if(parent && parent.nodeType===1 && parent.hasAttribute && parent.hasAttribute("data-weditor-token")) continue;
        targets.push(node);
      }
      for(let i=0;i<targets.length;i++){
        const textNode=targets[i];
        const value=textNode.nodeValue||"";
        if(!PAGE_TOTAL_REGEX.test(value)) continue;
        const frag=document.createDocumentFragment();
        const regex=/\{\{\s*(page|total)\s*\}\}/gi;
        let lastIndex=0; let match;
        while((match=regex.exec(value))){
          const before=value.slice(lastIndex, match.index);
          if(before) frag.appendChild(document.createTextNode(before));
          const token=(match[1]||"").toLowerCase();
          const span=document.createElement("span");
          span.className=token==="total"?classes.total:classes.page;
          span.setAttribute("data-weditor-token-wrap", kind);
          span.textContent="{{"+token+"}}";
          frag.appendChild(span);
          lastIndex=regex.lastIndex;
        }
        if(lastIndex<value.length) frag.appendChild(document.createTextNode(value.slice(lastIndex)));
        if(frag.childNodes.length && textNode.parentNode){
          textNode.parentNode.replaceChild(frag, textNode);
        }
      }
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
          id:"letterhead_image",
          label:"🖼️ Letterhead Banner",
          preview:function(ctx){ return renderLetterheadPreview(ctx && ctx.inst); },
          html:function(ctx){ return renderLetterheadHTML(ctx && ctx.inst); },
          align:"center"
        },
        {
          id:"letterhead_logo",
          label:"🏷️ Letterhead Logo",
          preview:function(ctx){ return renderLetterheadLogoPreview(ctx && ctx.inst); },
          html:function(ctx){ return renderLetterheadLogoHTML(ctx && ctx.inst); },
          align:"left"
        },
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
          preview:'<span>Project Phoenix</span><span>Version <span class="weditor_header_page_num">{{page}}</span> · {{date}}</span>',
          html:'<div style="display:flex;flex-direction:column;gap:4px;width:100%;">'+
            '<div style="font-size:15px;font-weight:600;">Project Phoenix</div>'+
            '<div style="font-size:12px;color:#666;">Sprint Summary · Version <span class="weditor_header_page_num">{{page}}</span> · {{date}}</div>'+
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
          preview:'<span>Acme Finance</span><span>Page <span class="weditor_footer_page_num">{{page}}</span> of <span class="weditor_footer_page_num_total">{{total}}</span></span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;font-size:12px;">'+
            '<div>Acme Finance · Accounts Payable</div>'+
            '<div style="text-align:right;">Page <span class="weditor_footer_page_num">{{page}}</span> of <span class="weditor_footer_page_num_total">{{total}}</span></div>'+
          '</div>',
          align:"left"
        },
        {
          id:"delivery",
          label:"🚚 Delivery Order",
          preview:'<span>Logistics Hotline</span><span><span class="weditor_footer_page_num">{{page}}</span>/<span class="weditor_footer_page_num_total">{{total}}</span></span>',
          html:'<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;font-size:12px;">'+
            '<div>Logistics Hotline · +65 6100 1234</div>'+
            '<div style="text-align:center;">Page <span class="weditor_footer_page_num">{{page}}</span> / <span class="weditor_footer_page_num_total">{{total}}</span></div>'+
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
            '<div style="text-align:right;">Version <span class="weditor_footer_page_num">{{page}}</span> · {{date}}</div>'+
          '</div>',
          align:"left"
        },
        {
          id:"footer_logo",
          label:"🖼️ Footer Logo Banner",
          preview:function(ctx){ return renderFooterLogoPreview(ctx && ctx.inst); },
          html:function(ctx){ return renderFooterLogoHTML(ctx && ctx.inst); },
          align:"center"
        },
        {
          id:"footer_logo_page",
          label:"🖼️ Footer Logo Banner with Page No.",
          preview:function(ctx){ return renderFooterLogoWithPagePreview(ctx && ctx.inst); },
          html:function(ctx){ return renderFooterLogoWithPageHTML(ctx && ctx.inst); },
          align:"right"
        },
        {
          id:"footer_logo_page_meta",
          label:"🖼️ Footer Logo Banner · 3 Column Meta",
          preview:function(ctx){ return renderFooterLogoWithMetaPreview(ctx && ctx.inst); },
          html:function(ctx){ return renderFooterLogoWithMetaHTML(ctx && ctx.inst); },
          align:"right"
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
    function resolveTemplateValue(value, context){
      if(typeof value==="function") return value(context)||"";
      return value;
    }
    function resolveTemplates(kind, inst){
      const defs=TEMPLATE_LIBRARY[kind]||[];
      const context={ kind, inst };
      const result=[];
      for(let i=0;i<defs.length;i++){
        const tpl=defs[i];
        result.push({
          id:tpl.id,
          label:tpl.label,
          preview:resolveTemplateValue(tpl.preview, context),
          html:resolveTemplateValue(tpl.html, context),
          align:resolveTemplateValue(tpl.align, context)
        });
      }
      return result;
    }
    function section(kind, titleText, description, enabled, html, align, inst){
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
      const tokenLabel=document.createElement("span"); applyStyles(tokenLabel, WCfg.Style.hfTokenLabel); tokenLabel.textContent="🧩 Smart Tokens";
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
      alignLabel.textContent="Alignment";
      alignLabel.style.font="12px/1.4 Segoe UI,system-ui";
      alignLabel.style.color=WCfg.UI.textDim;
      const alignGroup=document.createElement("div"); applyStyles(alignGroup, WCfg.Style.hfAlignGroup);
      alignGroup.setAttribute("role","group");
      alignGroup.setAttribute("aria-label", titleText+" alignment controls");
      const alignButtons=[];
      const alignOptions=[
        { value:"left", label:"Left", title:"Align left" },
        { value:"center", label:"Center", title:"Align center" },
        { value:"right", label:"Right", title:"Align right" }
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
      const templates=resolveTemplates(kind, inst);
      if(templates.length){
        const templateBox=document.createElement("div"); applyStyles(templateBox, WCfg.Style.hfTemplateSection);
        const templateTitle=document.createElement("div"); applyStyles(templateTitle, WCfg.Style.hfTemplateHeader); templateTitle.textContent="Template Library";
        const templateHint=document.createElement("div"); applyStyles(templateHint, WCfg.Style.hfTemplateHint); templateHint.textContent="Click to instantly apply popular business layouts.";
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
      function syncTemplateAlignments(){
        const rows=editor.querySelectorAll ? editor.querySelectorAll('[data-weditor-page-line]') : [];
        for(let i=0;i<rows.length;i++){
          const row=rows[i];
          if(!row) continue;
          const mode=(row.getAttribute('data-weditor-page-line')||'').toLowerCase();
          const number=row.querySelector ? row.querySelector('[data-weditor-page-number]') : null;
          if(mode==='three'){
            if(number){
              const justify=alignValue==='left'?'start':alignValue==='right'?'end':'center';
              number.style.justifySelf=justify;
              number.style.textAlign=alignValue;
            }
          }else{
            const justify=alignValue==='left'?'flex-start':alignValue==='right'?'flex-end':'center';
            row.style.justifyContent=justify;
            if(!row.style.alignItems) row.style.alignItems='center';
            row.style.textAlign=alignValue;
            if(number){ number.style.textAlign=alignValue; }
          }
        }
      }
      function updateAlignUI(){
        HFAlign.applyEditor(editor, alignValue);
        syncTemplateAlignments();
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
      guide.textContent="EDITABLE AREA · Approximate width "+(WCfg.A4W-36)+"px";
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
      const stretchBtn=WDom.btn("Stretch images", false, "Make all images span header/footer width");
      stretchBtn.style.padding="6px 10px";
      stretchBtn.style.fontSize="12px";
      stretchBtn.style.lineHeight="1.2";
      stretchBtn.style.alignSelf="flex-start";
      const fileInput=document.createElement("input");
      fileInput.type="file";
      fileInput.accept="image/png,image/jpeg";
      fileInput.style.display="none";
      const tip=document.createElement("div");
      tip.textContent="Uploading .png or .jpg files automatically inserts an <img> element. Drag images in the editor above to reposition, or click Stretch images to make them full width.";
      tip.style.font="12px/1.4 Segoe UI,system-ui";
      tip.style.color=WCfg.UI.textDim;
      uploaderRow.appendChild(uploadBtn);
      uploaderRow.appendChild(stretchBtn);
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
      stretchBtn.addEventListener("click", function(){
        if(stretchBtn.disabled) return;
        const imgs=editor.querySelectorAll ? editor.querySelectorAll("img") : [];
        let touched=false;
        for(let i=0;i<imgs.length;i++){
          const img=imgs[i];
          if(img.style.width!=="100%"){
            img.style.width="100%";
            touched=true;
          }
          if(img.style.maxWidth!=="100%"){
            img.style.maxWidth="100%";
            touched=true;
          }
          if(img.style.height!=="auto"){
            img.style.height="auto";
            touched=true;
          }
          if(img.style.display!=="block"){
            img.style.display="block";
            touched=true;
          }
          if(img.style.objectFit!=="contain"){
            img.style.objectFit="contain";
            touched=true;
          }
        }
        if(touched){
          enforceImageSizing(editor);
          reattachImageOverlay();
          if(editor.__weditorHideOverlay) editor.__weditorHideOverlay();
          notifyChange();
        }
      });
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
        stretchBtn.disabled=!on;
        stretchBtn.style.opacity=on?"1":"0.55";
        stretchBtn.style.cursor=on?"pointer":"not-allowed";
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
          wrapPageTokens(clone, kind);
          return clone.innerHTML;
        },
        getPreviewHTML:function(){
          const clone=editor.cloneNode(true);
          const overlays=clone.querySelectorAll('[data-weditor-overlay]');
          for(let i=0;i<overlays.length;i++){ const el=overlays[i]; if(el && el.parentNode) el.parentNode.removeChild(el); }
          const actives=clone.querySelectorAll('.weditor-hf-img-active');
          for(let j=0;j<actives.length;j++){ actives[j].classList.remove('weditor-hf-img-active'); }
          unwrapTokenChips(clone);
          wrapPageTokens(clone, kind);
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
      const headerSection=section("header","Header", tokenHint, inst.headerEnabled, inst.headerHTML, inst.headerAlign, inst);
      const footerSection=section("footer","Footer", tokenHint+" · Use tokens to add page counter manually", inst.footerEnabled, inst.footerHTML, inst.footerAlign, inst);
      body.appendChild(headerSection.el);
      body.appendChild(footerSection.el);
      const previewSection=document.createElement("section"); applyStyles(previewSection, WCfg.Style.hfPreviewSection);
      const previewTitle=document.createElement("div"); applyStyles(previewTitle, WCfg.Style.hfPreviewTitle); previewTitle.textContent="Live Preview";
      const previewHint=document.createElement("div"); applyStyles(previewHint, WCfg.Style.hfPreviewHint); previewHint.textContent="Updates instantly based on the current template and token values.";
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
          setPreviewMessage(previewHeader, "Header empty · Enter text in the left editor.");
        } else {
          setPreviewMessage(previewHeader, "Header disabled · Not enabled yet.");
        }
        if(footerEnabled && footerHTML){
          previewFooter.style.justifyContent="";
          previewFooter.style.textAlign="";
          previewFooter.innerHTML=Sanitizer.clean(replacePreviewTokens(footerHTML));
          applyFooterAlign(previewFooter, footerSection.getAlign());
        } else if(footerEnabled){
          setPreviewMessage(previewFooter, "Footer empty · Enter text in the left editor.");
        } else {
          setPreviewMessage(previewFooter, "Footer disabled · Not enabled yet.");
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
        HistoryManager.record(inst, inst ? inst.el : null, { label:"Update Header & Footer", repeatable:false });
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
  const StateBinding=(function(){
    function parse(json){
      if(!json) return null;
      let data=json;
      if(typeof json==="string"){
        const trimmed=json.trim();
        if(!trimmed) return null;
        try { data=JSON.parse(trimmed); }
        catch(err){ return null; }
      }
      if(!data || typeof data!=="object") return null;
      return data;
    }
    function sanitizeHTML(html){
      if(typeof html!=="string") return "";
      return Sanitizer.clean(html);
    }
    function apply(inst, state){
      if(!inst || !inst.el) return false;
      const data=parse(state);
      if(!data) return false;
      const header=data.header || {};
      const footer=data.footer || {};
      if(typeof data.html==="string"){
        inst.el.innerHTML=sanitizeHTML(data.html);
        Breaks.ensurePlaceholders(inst.el);
      }
      if(typeof data.outputMode==="string"){
        inst.outputMode=data.outputMode.toLowerCase()==="paged"?"paged":"raw";
      }
      if(Object.prototype.hasOwnProperty.call(data, "fixPageHeight")){
        inst.fixPageHeight = data.fixPageHeight!==false;
      } else if(data.page && Object.prototype.hasOwnProperty.call(data.page, "fixHeight")){
        inst.fixPageHeight = data.page.fixHeight!==false;
      }
      const headerEnabledExplicit=typeof header.enabled==="boolean" || typeof data.headerEnabled==="boolean";
      const footerEnabledExplicit=typeof footer.enabled==="boolean" || typeof data.footerEnabled==="boolean";
      if(typeof header.enabled==="boolean") inst.headerEnabled=header.enabled;
      else if(typeof data.headerEnabled==="boolean") inst.headerEnabled=data.headerEnabled;
      if(typeof footer.enabled==="boolean") inst.footerEnabled=footer.enabled;
      else if(typeof data.footerEnabled==="boolean") inst.footerEnabled=data.footerEnabled;
      if(typeof header.html==="string") inst.headerHTML=sanitizeHTML(header.html);
      else if(typeof data.headerHTML==="string") inst.headerHTML=sanitizeHTML(data.headerHTML);
      if(typeof footer.html==="string") inst.footerHTML=sanitizeHTML(footer.html);
      else if(typeof data.footerHTML==="string") inst.footerHTML=sanitizeHTML(data.footerHTML);
      if(!headerEnabledExplicit && inst.headerHTML && inst.headerHTML.trim()) inst.headerEnabled=true;
      if(!footerEnabledExplicit && inst.footerHTML && inst.footerHTML.trim()) inst.footerEnabled=true;
      if(header.align) inst.headerAlign=HFAlign.normalize(header.align);
      else if(data.headerAlign) inst.headerAlign=HFAlign.normalize(data.headerAlign);
      if(footer.align) inst.footerAlign=HFAlign.normalize(footer.align);
      else if(data.footerAlign) inst.footerAlign=HFAlign.normalize(data.footerAlign);
      inst.el.classList.toggle("weditor--no-header", !inst.headerEnabled);
      inst.el.classList.toggle("weditor--no-footer", !inst.footerEnabled);
      inst.el.classList.toggle("weditor--paged", inst.outputMode==="paged");
      if(inst.el){ inst.el.setAttribute("data-fix-page-height", inst.fixPageHeight!==false ? "true" : "false"); }
      return true;
    }
    function capture(inst){
      if(!inst || !inst.el) return null;
      const state={
        version:"1.0",
        outputMode:inst.outputMode,
        fixPageHeight:inst.fixPageHeight!==false,
        html:Breaks.serialize(inst.el),
        header:{
          enabled:!!inst.headerEnabled,
          html:inst.headerHTML,
          align:inst.headerAlign
        },
        footer:{
          enabled:!!inst.footerEnabled,
          html:inst.footerHTML,
          align:inst.footerAlign
        }
      };
      return state;
    }
    function stringify(state){
      if(!state) return "";
      try { return JSON.stringify(state); }
      catch(err){ return ""; }
    }
    function consumeInitial(el){
      if(!el) return null;
      const attr=el.getAttribute("data-weditor-state");
      if(!attr) return null;
      const data=parse(attr);
      if(data) el.removeAttribute("data-weditor-state");
      return data;
    }
    return { parse, apply, capture, stringify, consumeInitial };
  })();
  const ContentInspector=(function(){
    const IGNORED_TAGS={ br:1, style:1, script:1, meta:1, link:1, title:1, base:1, head:1 };
    const SELF_CONTAINED_TAGS={ img:1, svg:1, canvas:1, video:1, audio:1, iframe:1, object:1, embed:1, hr:1, input:1, textarea:1, select:1, button:1, picture:1 };
    const INVISIBLE_TEXT=/[\u00a0\u200b\u200c\u200d\ufeff]/g;
    function textHasContent(value){
      if(!value) return false;
      return value.replace(INVISIBLE_TEXT, "").trim().length>0;
    }
    function nodeHasContent(node){
      if(!node) return false;
      if(node.nodeType===3){
        return textHasContent(node.nodeValue||"");
      }
      if(node.nodeType!==1) return false;
      if(node.hasAttribute && node.hasAttribute("data-weditor-break-placeholder")) return false;
      const tag=(node.tagName||"").toLowerCase();
      if(IGNORED_TAGS[tag]) return false;
      if(SELF_CONTAINED_TAGS[tag]){
        if(tag==="picture"){ return !!node.querySelector("img,source"); }
        return true;
      }
      const children=node.childNodes||[];
      for(let i=0;i<children.length;i++){
        if(nodeHasContent(children[i])) return true;
      }
      return false;
    }
    function hasEditorContent(inst){
      if(!inst || !inst.el) return false;
      if(inst.headerEnabled && inst.headerHTML && inst.headerHTML.trim()) return true;
      if(inst.footerEnabled && inst.footerHTML && inst.footerHTML.trim()) return true;
      const nodes=inst.el.childNodes||[];
      for(let i=0;i<nodes.length;i++){
        if(nodeHasContent(nodes[i])) return true;
      }
      return false;
    }
    return { hasEditorContent };
  })();
  const OutputBinding=(function(){
    function isOut(el){
      if(!el || el.tagName !== "TEXTAREA") return false;
      if(el.hasAttribute("data-weditor-output")) return true;
      if(!el.classList) return false;
      for(let i=0;i<el.classList.length;i++){
        const cls=el.classList[i];
        if(cls==="weditor_output" || cls==="w-editor_output") return true;
        if(/^weditor_output[_-]/.test(cls)) return true;
        if(/^w-editor_output[_-]/.test(cls)) return true;
      }
      return false;
    }
    function isEditorEl(el){
      return !!(el && el.classList && (el.classList.contains("weditor") || el.classList.contains("w-editor")));
    }
    function collectTargeted(editorEl){
      const outputs=[];
      const id=editorEl && editorEl.getAttribute && editorEl.getAttribute("id");
      if(!id) return outputs;
      const root=(editorEl.ownerDocument || document);
      const list=root.querySelectorAll("textarea[data-weditor-for]");
      for(let i=0;i<list.length;i++){
        const target=list[i].getAttribute("data-weditor-for");
        if(target && target===id && isOut(list[i])){
          outputs.push(list[i]);
        }
      }
      return outputs;
    }
    function collectSiblings(editorEl){
      const outputs=[];
      function add(el){ if(el && outputs.indexOf(el)<0 && isOut(el)) outputs.push(el); }
      function addFromNode(node){
        if(!node || !node.querySelectorAll) return;
        const nested=node.querySelectorAll("textarea");
        for(let i=0;i<nested.length;i++) add(nested[i]);
      }
      let sib = editorEl.nextElementSibling;
      while(sib){
        if(isEditorEl(sib)) break;
        if(isOut(sib)) add(sib);
        else addFromNode(sib);
        sib = sib.nextElementSibling;
      }
      sib = editorEl.previousElementSibling;
      while(sib){
        if(isEditorEl(sib)) break;
        if(isOut(sib)) add(sib);
        else addFromNode(sib);
        sib = sib.previousElementSibling;
      }
      if(outputs.length) return outputs;
      const parent = editorEl.parentElement;
      if(parent){
        const candidates = parent.querySelectorAll("textarea[data-weditor-output], textarea[class*='weditor_output'], textarea[class*='w-editor_output']");
        for(let i=0;i<candidates.length;i++){
          const el=candidates[i];
          if(isOut(el)) add(el);
        }
      }
      return outputs;
    }
    function resolveAll(editorEl){
      if(!editorEl) return [];
      const targeted=collectTargeted(editorEl);
      if(targeted.length) return targeted;
      return collectSiblings(editorEl);
    }
    function resolve(editorEl){
      const all=resolveAll(editorEl);
      return all.length ? all[0] : null;
    }
    function resolveFormat(inst, outputEl){
      const el=outputEl || (inst && inst.outputEl);
      if(!inst || !el) return inst && inst.outputMode==="paged" ? "paged" : "raw";
      const attr=el.getAttribute("data-weditor-output");
      if(attr){
        const value=String(attr).toLowerCase();
        if(value==="state" || value==="json") return "state";
        if(value==="raw" || value==="raw-html") return "raw";
        if(value==="paged" || value==="paged-html") return "paged";
      }
      return inst.outputMode==="paged" ? "paged" : "raw";
    }
    function getOutputs(inst){
      if(!inst) return [];
      if(inst.outputEls && inst.outputEls.length) return inst.outputEls;
      if(inst.outputEl) return [inst.outputEl];
      return [];
    }
    function sync(inst){
      const outputs=getOutputs(inst);
      if(!outputs.length) return;
      const hasContent=ContentInspector.hasEditorContent(inst);
      let cachedRaw=null;
      let cachedPaged=null;
      let cachedState=null;
      let pagedResult=null;
      const pagedTargets=[];
      for(let i=0;i<outputs.length;i++){
        const out=outputs[i];
        const format=resolveFormat(inst, out);
        if(format==="state"){
          if(cachedState===null){
            const state=StateBinding.capture(inst);
            if(state && !hasContent){ state.html=""; }
            cachedState=StateBinding.stringify(state);
          }
          out.value = cachedState || "";
        } else if(format==="paged"){
          if(!hasContent){
            out.value="";
            continue;
          }
          pagedTargets.push(out);
          if(cachedPaged===null){
            if(cachedRaw===null){
              cachedRaw=Breaks.serialize(inst.el);
            }
            pagedResult=Paginator.paginate(cachedRaw, inst);
            const initialPaged = pagedResult ? pagedResult.pagesHTML : "";
            cachedPaged="<style>"+PAGED_PRINT_STYLES+"</style>\n"+initialPaged;
            if(pagedResult && pagedResult.ready && typeof pagedResult.ready.then==="function"){
              pagedResult.ready.then(function(finalHTML){
                const finalValue="<style>"+PAGED_PRINT_STYLES+"</style>\n"+finalHTML;
                cachedPaged=finalValue;
                for(let j=0;j<pagedTargets.length;j++){
                  const target=pagedTargets[j];
                  if(target && target.value!==finalValue){ target.value=finalValue; }
                }
              }).catch(function(){});
            }
          }
          out.value = cachedPaged || "";
        } else {
          if(!hasContent){
            out.value="";
            continue;
          }
          if(cachedRaw===null){
            cachedRaw=Breaks.serialize(inst.el);
          }
          out.value = cachedRaw;
        }
      }
    }
    const timers=new WeakMap();
    function syncDebounced(inst){
      const t=timers.get(inst); if(t) window.clearTimeout(t);
      timers.set(inst, window.setTimeout(function(){ sync(inst); }, 200));
    }
    function consumeInitialState(inst){
      const outputs=getOutputs(inst);
      for(let i=0;i<outputs.length;i++){
        const out=outputs[i];
        if(resolveFormat(inst, out)==="state"){
          const parsed=StateBinding.parse(out.value);
          if(parsed){
            out.value = StateBinding.stringify(parsed) || "";
            return parsed;
          }
        }
      }
      return null;
    }
    function consumeInitialHTML(inst){
      const outputs=getOutputs(inst);
      for(let i=0;i<outputs.length;i++){
        const out=outputs[i];
        if(resolveFormat(inst, out)==="raw"){
          const raw=(out.value||"").trim();
          if(raw){
            return raw;
          }
        }
      }
      return null;
    }
    return { resolve, resolveAll, resolveFormat, sync, syncDebounced, consumeInitialState, consumeInitialHTML };
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
      let activeIndex=null;
      function applyActiveState(){
        const hasActive = activeIndex!==null;
        for(let i=0;i<tabButtons.length;i++){
          const btn=tabButtons[i]; const panel=tabPanels[i];
          const isActive = (activeIndex===i);
          btn.setAttribute("data-active", isActive?"1":"0");
          btn.setAttribute("aria-selected", (hasActive && isActive)?"true":"false");
          btn.setAttribute("tabindex", (isActive || (!hasActive && i===0))?"0":"-1");
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
      function setActive(index, toggle){
        if(index==null || index<0 || index>=tabButtons.length){
          activeIndex=null;
          applyActiveState();
          return;
        }
        if(toggle && activeIndex===index){
          activeIndex=null;
        } else {
          activeIndex=index;
        }
        applyActiveState();
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
        function appendItem(target, entry){
          if(!entry) return;
          if(typeof entry==="string"){
            const cmdBtn=createCommandButton(entry, inst, ctx);
            if(cmdBtn) target.appendChild(cmdBtn);
            return;
          }
          if(entry && typeof entry==="object" && Array.isArray(entry.items) && entry.items.length){
            const group=document.createElement("div");
            applyStyles(group, WCfg.Style.toolbarGroup);
            if(entry.compact){
              applyStyles(group, WCfg.Style.toolbarGroupCompact);
            }
            if(entry.label){
              const title=document.createElement("div");
              title.textContent=entry.label;
              applyStyles(title, WCfg.Style.toolbarGroupTitle);
              group.appendChild(title);
            }
            const row=document.createElement("div");
            applyStyles(row, WCfg.Style.toolbarGroupRow);
            if(entry.compact){
              applyStyles(row, WCfg.Style.toolbarGroupRowCompact);
            }
            for(let k=0;k<entry.items.length;k++){
              const child=entry.items[k];
              if(!child) continue;
              if(typeof child==="string"){
                const childBtn=createCommandButton(child, inst, ctx);
                if(childBtn) row.appendChild(childBtn);
              } else {
                appendItem(row, child);
              }
            }
            if(row.childNodes.length){ group.appendChild(row); panel.appendChild(group); }
            return;
          }
        }
        for(let j=0;j<items.length;j++){
          appendItem(panel, items[j]);
        }
        tabBtn.onclick=(function(idx){ return function(){ setActive(idx, true); if(tabButtons[idx]) tabButtons[idx].focus(); }; })(i);
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
              e.preventDefault();
              setActive(idx, true);
              return;
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
      let defaultActive = (config && Object.prototype.hasOwnProperty.call(config, "defaultActiveTab")) ? config.defaultActiveTab : 0;
      if(typeof defaultActive === "string"){
        const foundIndex = tabs.findIndex(function(tab){ return tab && tab.id === defaultActive; });
        defaultActive = foundIndex>=0 ? foundIndex : null;
      }
      if(typeof defaultActive === "number" && (defaultActive<0 || defaultActive>=tabButtons.length)){
        defaultActive = null;
      }
      setActive(defaultActive);
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
      ensureBaseStyles(document);
      const area=document.createElement("div");
      area.contentEditable="true";
      applyStyles(area, WCfg.Style.area);
      area.classList.add("weditor_fullscreen-area");
      area.innerHTML=Breaks.serialize(inst.el);
      Breaks.ensurePlaceholders(area);
      HistoryManager.init(inst, area);
      TableResizer.attach(inst, {
        root:area,
        getRecordTarget:function(){ return area; },
        onChange:function(){}
      });
      ImageTools.attach(area);
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
          HistoryManager.record(inst, inst ? inst.el : null, { label:"Apply Fullscreen Changes", repeatable:false });
          OutputBinding.sync(inst);
          return true;
        },
        close:cleanup,
        saveClose:function(){ ctx.writeBack(); cleanup(); }
      };
      TableSelection.attach(inst, {
        root:area,
        getRecordTarget:function(){ return area; },
        onChange:function(){ if(ctx && ctx.refreshPreview) ctx.refreshPreview(); }
      });
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
      let t=null; area.addEventListener("input", function(ev){ Breaks.ensurePlaceholders(area); HistoryManager.handleInput(inst, area, ev); if(t) window.clearTimeout(t); t=window.setTimeout(render, WCfg.DEBOUNCE_PREVIEW); });
      area.addEventListener("keydown", function(ev){
        if(Breaks.handleKeydown(area, ev)){
          HistoryManager.record(inst, area, { label:"Remove Page Break", repeatable:false });
          if(ctx && ctx.refreshPreview) ctx.refreshPreview();
          return;
        }
        HistoryManager.handleKeydown(inst, area, ev, ctx);
      });
      render();
      function render(attempt){
        attempt = attempt || 0;
        const sourceHTML=Breaks.serialize(area);
        const out=Paginator.paginate(sourceHTML, inst);
        const computed=window.getComputedStyle(left);
        const paddingLeft=parseFloat(computed.paddingLeft||"0")||0;
        const paddingRight=parseFloat(computed.paddingRight||"0")||0;
        const available=Math.max(0, left.clientWidth - paddingLeft - paddingRight);
        const previewPadding=WCfg.PREVIEW_FRAME_PADDING||0;
        let fitScale=1;
        if(available>0){
          const usableWidth=available - previewPadding*2;
          if(usableWidth>0){
            fitScale=Math.min(1, usableWidth / WCfg.A4W);
          } else {
            fitScale=Math.min(1, available / WCfg.A4W);
          }
        }
        let scale=fitScale;
        if(WCfg.PREVIEW_MAX_SCALE && scale>WCfg.PREVIEW_MAX_SCALE){ scale=WCfg.PREVIEW_MAX_SCALE; }
        if(!isFinite(scale) || scale<=0){ scale=1; }
        const scaledWidth=Math.max(1, Math.round(WCfg.A4W * scale));
        const totalFrameWidth=scaledWidth + previewPadding*2;
        const stage=document.createElement("div");
        applyStyles(stage, WCfg.Style.previewStage);
        for(let i=0;i<out.pages.length;i++){
          const page=out.pages[i];
          if(!page) continue;
          page.style.margin="0";
          page.style.transform="";
          page.style.transformOrigin="";
          const wrap=document.createElement("div");
          const naturalHeight=(page && typeof page.__weditorNaturalHeight==="number" && page.__weditorNaturalHeight>0) ? page.__weditorNaturalHeight : WCfg.A4H;
          const scaledHeight=Math.max(1, Math.round(naturalHeight * scale));
          const totalFrameHeight=scaledHeight + previewPadding*2;
          wrap.style.width=scaledWidth+"px";
          wrap.style.height=scaledHeight+"px";
          wrap.style.display="block";
          wrap.style.position="relative";
          wrap.style.maxWidth="100%";
          wrap.style.overflow="visible";
          const outer=document.createElement("div");
          outer.style.width=totalFrameWidth+"px";
          outer.style.height=totalFrameHeight+"px";
          outer.style.display="block";
          outer.style.position="relative";
          outer.style.maxWidth="100%";
          outer.style.margin="0px";
          outer.style.overflow="visible";
          outer.style.padding=previewPadding+"px";
          outer.style.background="#ffffff";
          outer.style.boxSizing="border-box";
          page.style.transformOrigin="top left";
          page.style.transform="scale("+scale+")";
          page.style.position="absolute";
          page.style.left="0";
          page.style.top="0";
          page.style.width=WCfg.A4W+"px";
          page.style.height=naturalHeight+"px";
          page.style.overflow=page.__weditorAdaptiveHeight ? "visible" : "hidden";
          outer.appendChild(wrap);
          wrap.appendChild(page);
          stage.appendChild(outer);
          if(i<out.pages.length-1){
            const br=document.createElement("div");
            br.textContent="Page Break";
            applyStyles(br, WCfg.Style.pageDivider);
            br.style.maxWidth=totalFrameWidth+"px";
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
        HistoryManager.detach(area);
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
    const FONT_THEME_COLORS=[
      { label:"Black", value:"#000000" },
      { label:"Brown", value:"#7f6000" },
      { label:"Dark Blue", value:"#1f4e79" },
      { label:"Blue", value:"#2e75b6" },
      { label:"Red", value:"#c00000" },
      { label:"Orange", value:"#f79646" },
      { label:"Green", value:"#9bbb59" },
      { label:"Purple", value:"#8064a2" }
    ];
    const FONT_STANDARD_COLORS=[
      { label:"Dark Red", value:"#800000" },
      { label:"Red", value:"#ff0000" },
      { label:"Orange", value:"#ffa500" },
      { label:"Yellow", value:"#ffff00" },
      { label:"Green", value:"#00b050" },
      { label:"Teal", value:"#00b0f0" },
      { label:"Blue", value:"#0070c0" },
      { label:"Dark Blue", value:"#002060" },
      { label:"Purple", value:"#7030a0" },
      { label:"Black", value:"#000000" }
    ];
    const FONT_COLOR_DEFAULT="#d13438";
    const HIGHLIGHT_COLORS=[
      { label:"Yellow", value:"#ffff00" },
      { label:"Bright Green", value:"#00ff00" },
      { label:"Turquoise", value:"#00ffff" },
      { label:"Pink", value:"#ff00ff" },
      { label:"Blue", value:"#0000ff" },
      { label:"Red", value:"#ff0000" },
      { label:"Dark Blue", value:"#000080" },
      { label:"Teal", value:"#008080" },
      { label:"Green", value:"#008000" },
      { label:"Purple", value:"#800080" },
      { label:"Violet", value:"#8000ff" },
      { label:"Dark Red", value:"#800000" },
      { label:"Dark Yellow", value:"#808000" },
      { label:"Gray", value:"#808080" },
      { label:"Black", value:"#000000" }
    ];
    const SHADING_STANDARD_COLORS=[
      { label:"Dark Red", value:"#800000" },
      { label:"Red", value:"#ff0000" },
      { label:"Orange", value:"#ffa500" },
      { label:"Yellow", value:"#ffff00" },
      { label:"Light Green", value:"#92d050" },
      { label:"Green", value:"#00b050" },
      { label:"Teal", value:"#00b0f0" },
      { label:"Blue", value:"#0070c0" },
      { label:"Purple", value:"#7030a0" },
      { label:"Black", value:"#000000" }
    ];
    const BLOCK_FORMATS=[
      { label:"Normal (Paragraph)", value:"p" },
      { label:"Heading 1", value:"h1" },
      { label:"Heading 2", value:"h2" },
      { label:"Heading 3", value:"h3" },
      { label:"Heading 4", value:"h4" },
      { label:"Heading 5", value:"h5" },
      { label:"Block Quote", value:"blockquote" },
      { label:"Code Block", value:"pre" }
    ];
    const LINE_SPACING_OPTIONS=[
      { label:"Single", value:"1" },
      { label:"1.15", value:"1.15" },
      { label:"1.5", value:"1.5" },
      { label:"Double", value:"2" }
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
    function fallbackApplyFontColor(target, color){
      const info=ensureSelectionInfo(target); if(!info) return false;
      const doc=target.ownerDocument || document;
      const span=doc.createElement("span");
      span.style.color=color;
      const contents=info.range.extractContents();
      span.appendChild(contents);
      info.range.insertNode(span);
      info.sel.removeAllRanges();
      const newRange=doc.createRange();
      newRange.selectNodeContents(span);
      info.sel.addRange(newRange);
      return true;
    }
    function fallbackClearFontColor(target){
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
        if(el.style && el.style.color){
          el.style.color="";
          if(el.getAttribute && el.getAttribute("style")==="") el.removeAttribute("style");
          modified=true;
        }
        if(el.hasAttribute && el.hasAttribute("color")){ el.removeAttribute("color"); modified=true; }
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
      if(!family){ return false; }
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const multi=applyAcrossTableSelection(inst, ctx, target, function(){
        return execCommand(target, "fontName", family, true);
      });
      if(multi.handled){ return multi.changed; }
      return execCommand(target, "fontName", family, true);
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
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const meta=FONT_SIZES.find(function(item){ return item.label===sizeLabel; }); if(!meta) return false;
      focusTarget(target);
      const applySize=function(){ return execCommand(target, "fontSize", meta.exec, true); };
      const multi=applyAcrossTableSelection(inst, ctx, target, applySize);
      let success=false;
      if(multi.handled){
        success=multi.changed;
      } else {
        success=applySize();
      }
      if(success){ convertFontTags(target, meta.exec, meta.px); }
      return success;
    }
    function normalizeShadingColor(input){
      if(input==null){ return null; }
      const raw=String(input).trim();
      if(!raw){ return null; }
      if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)){ return raw.length===4 ? (function(){
        const r=raw.charAt(1), g=raw.charAt(2), b=raw.charAt(3);
        return ("#"+r+r+g+g+b+b).toLowerCase();
      })() : raw.toLowerCase(); }
      if(/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)){ return normalizeShadingColor("#"+raw); }
      return null;
    }
    function normalizeShadingColor(input){
      if(input==null){ return null; }
      const raw=String(input).trim();
      if(!raw){ return null; }
      if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)){ return raw.length===4 ? (function(){
        const r=raw.charAt(1), g=raw.charAt(2), b=raw.charAt(3);
        return ("#"+r+r+g+g+b+b).toLowerCase();
      })() : raw.toLowerCase(); }
      if(/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)){ return normalizeShadingColor("#"+raw); }
      return null;
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
    function applyShadingToElements(elements, color){
      const normalized=color?normalizeShadingColor(color):null;
      let changed=false;
      for(let i=0;i<elements.length;i++){
        const el=elements[i];
        if(!el || el.nodeType!==1 || !el.style) continue;
        if(normalized){
          if(el.style.backgroundColor!==normalized){
            el.style.backgroundColor=normalized;
            changed=true;
          }
        } else if(el.style.backgroundColor){
          el.style.removeProperty("background-color");
          if(el.getAttribute && el.getAttribute("style")===""){ el.removeAttribute("style"); }
          changed=true;
        }
      }
      return changed;
    }
    function collectShadingBlocks(target, range){
      const blocks=[];
      if(!target) return blocks;
      if(range){
        const collected=collectLineSpacingBlocks(target, range);
        for(let i=0;i<collected.length;i++){ if(blocks.indexOf(collected[i])===-1) blocks.push(collected[i]); }
        const extraCandidates=[
          range.startContainer,
          range.endContainer,
          range.commonAncestorContainer
        ];
        for(let i=0;i<extraCandidates.length;i++){
          const candidate=findLineSpacingBlock(extraCandidates[i], target);
          if(candidate && blocks.indexOf(candidate)===-1){ blocks.push(candidate); }
        }
      }
      return blocks;
    }
    function applyAcrossTableSelection(inst, ctx, target, callback){
      if(!target) return { handled:false, changed:false };
      if(typeof TableSelection==='undefined' || !TableSelection || typeof TableSelection.getSelection!=="function"){
        return { handled:false, changed:false };
      }
      const selection=TableSelection.getSelection(inst, ctx);
      if(!selection || !selection.cells || !selection.cells.length){ return { handled:false, changed:false }; }
      const doc=target.ownerDocument || document;
      const win=doc.defaultView || window;
      const sel=win.getSelection ? win.getSelection() : window.getSelection();
      if(!sel || typeof doc.createRange!=="function"){ return { handled:false, changed:false }; }
      const cells=selection.cells.filter(function(cell){ return cell && cell.isConnected && target.contains(cell); });
      if(!cells.length){ return { handled:true, changed:false }; }
      const stored=[];
      for(let i=0;i<sel.rangeCount;i++){
        try{
          stored.push(sel.getRangeAt(i).cloneRange());
        } catch(err){}
      }
      let changed=false;
      for(let i=0;i<cells.length;i++){
        const cell=cells[i];
        const range=doc.createRange();
        range.selectNodeContents(cell);
        sel.removeAllRanges();
        sel.addRange(range);
        const result=callback({ cell, range, index:i });
        if(result){ changed=true; }
      }
      sel.removeAllRanges();
      if(stored.length){
        for(let i=0;i<stored.length;i++){ sel.addRange(stored[i]); }
      } else if(selection.anchor && selection.anchor.isConnected && target.contains(selection.anchor)){
        try{
          const anchorRange=doc.createRange();
          anchorRange.selectNodeContents(selection.anchor);
          anchorRange.collapse(true);
          sel.addRange(anchorRange);
        } catch(err){}
      }
      return { handled:true, changed };
    }
    function applyShading(inst, ctx, color){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const normalized=color?normalizeShadingColor(color):null;
      let changed=false;
      const tableSelection=(typeof TableSelection!=='undefined' && TableSelection && typeof TableSelection.getSelection==="function") ? TableSelection.getSelection(inst, ctx) : null;
      if(tableSelection && tableSelection.cells && tableSelection.cells.length){
        changed=applyShadingToElements(tableSelection.cells, normalized);
      }
      if(!changed){
        const selection=getSelectionWithin(target);
        if(selection && selection.range){
          const blocks=collectShadingBlocks(target, selection.range);
          if(blocks.length){
            changed=applyShadingToElements(blocks, normalized);
          }
        }
      }
      if(changed){
        if(inst){ inst.shadingColor=normalized||null; }
        Normalizer.fixStructure(target);
        Breaks.ensurePlaceholders(target);
      }
      return changed;
    }
    function clearShading(inst, ctx){
      return applyShading(inst, ctx, null);
    }
    function applyFontColor(inst, ctx, color){
      if(!color){ return clearFontColor(inst, ctx); }
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const applyColor=function(){
        let ok=execCommand(target, "foreColor", color, true);
        if(!ok){ ok=fallbackApplyFontColor(target, color); }
        return ok;
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, applyColor);
      let success=false;
      if(multi.handled){
        success=multi.changed;
      } else {
        success=applyColor();
      }
      if(success && inst){ inst.fontColor=color; }
      return success;
    }
    function clearFontColor(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const removeColor=function(){
        let ok=false;
        try{ document.execCommand("styleWithCSS", false, true); } catch(e){}
        try{ ok=document.execCommand("foreColor", false, WCfg.UI.text); }
        catch(err){ ok=false; }
        try{ document.execCommand("styleWithCSS", false, false); } catch(e){}
        if(fallbackClearFontColor(target)) ok=true;
        return ok;
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, removeColor);
      let success=false;
      if(multi.handled){
        success=multi.changed;
      } else {
        success=removeColor();
      }
      if(success && inst){ inst.fontColor=null; }
      return success;
    }
    function clearFormattingForCurrentSelection(target){
      if(!target) return false;
      const doc=target.ownerDocument || document;
      const win=doc.defaultView || window;
      const sel=win.getSelection ? win.getSelection() : window.getSelection();
      const originalRange = sel && sel.rangeCount ? (function(){ try{ return sel.getRangeAt(0).cloneRange(); } catch(e){ return null; } })() : null;
      let changed=false;
      function tryRemoveFormat(){
        try{ document.execCommand("styleWithCSS", false, true); } catch(e){}
        try{ if(document.execCommand("removeFormat", false, null)) changed=true; }
        catch(err){ }
        try{ document.execCommand("styleWithCSS", false, false); } catch(e){}
      }
      tryRemoveFormat();
      if(fallbackClearHighlight(target)) changed=true;
      if(fallbackClearFontColor(target)) changed=true;
      const selectionInfo=ensureSelectionInfo(target);
      const nodes=[];
      const seen=new Set();
      function addNode(node){
        if(!node || node===target) return;
        if(node.nodeType!==1) return;
        if(!target.contains(node)) return;
        if(seen.has(node)) return;
        seen.add(node);
        nodes.push(node);
      }
      const range = selectionInfo ? (function(){ try{ return selectionInfo.range.cloneRange(); } catch(e){ return null; } })() : null;
      if(range){
        const ancestor=range.commonAncestorContainer;
        if(ancestor && ancestor.nodeType===1) addNode(ancestor);
        addNode(findBlockNode(range.startContainer, target));
        addNode(findBlockNode(range.endContainer, target));
        if(doc && doc.createTreeWalker){
          const walker=doc.createTreeWalker(ancestor || target, NodeFilter.SHOW_ELEMENT, null);
          let current=walker.currentNode;
          if(current && current!==ancestor && intersectsRange(range, current)) addNode(current);
          while((current=walker.nextNode())){
            if(!target.contains(current)) continue;
            if(intersectsRange(range, current)) addNode(current);
          }
        }
      } else {
        let baseNode=null;
        if(sel && sel.rangeCount){
          try{
            const caretRange=sel.getRangeAt(0);
            if(caretRange && target.contains(caretRange.startContainer)){
              baseNode=findBlockNode(caretRange.startContainer, target) || findBlockNode(caretRange.endContainer, target);
            }
          } catch(err){ baseNode=null; }
        }
        if(!baseNode) baseNode=target;
        if(baseNode!==target) addNode(baseNode);
        if(doc && doc.createTreeWalker){
          const walker=doc.createTreeWalker(baseNode, NodeFilter.SHOW_ELEMENT, null);
          let current=walker.currentNode;
          if(current && current!==baseNode && current!==target) addNode(current);
          while((current=walker.nextNode())){
            if(current===target) continue;
            addNode(current);
          }
        }
      }
      if(!nodes.length){
        if(target.childNodes){
          for(let i=0;i<target.childNodes.length;i++){
            addNode(target.childNodes[i]);
          }
        }
      }
      if(!nodes.length){
        if(originalRange && sel){
          try{ sel.removeAllRanges(); sel.addRange(originalRange); }
          catch(e){}
        }
        return changed;
      }
      const blockReset={ H1:"p", H2:"p", H3:"p", H4:"p", H5:"p", H6:"p", BLOCKQUOTE:"p", PRE:"p" };
      const inlineUnwrap={ B:1, STRONG:1, I:1, EM:1, U:1, S:1, STRIKE:1, MARK:1, SUB:1, SUP:1, CODE:1 };
      const styleProps=["font-weight","font-style","text-decoration","text-decoration-line","text-decoration-style","text-decoration-color","font-size","font-family","color","background","background-color","line-height","letter-spacing","text-transform","vertical-align","text-align","margin","margin-left","margin-right","margin-top","margin-bottom","padding","padding-left","padding-right","padding-top","padding-bottom","border","border-top","border-right","border-bottom","border-left","border-color","border-style","border-width","outline","outline-color","outline-style","outline-width"];
      const attrRemovals=["color","face","size","bgcolor","background","align"]; // style handled separately above
      function toCamel(prop){ return prop.replace(/-([a-z])/g, function(_,c){ return c?c.toUpperCase():""; }); }
      function unwrap(el){
        const parent=el.parentNode;
        if(!parent) return;
        while(el.firstChild){ parent.insertBefore(el.firstChild, el); }
        parent.removeChild(el);
      }
      for(let i=0;i<nodes.length;i++){
        let el=nodes[i];
        if(!el || el.nodeType!==1) continue;
        if(el.hasAttribute && el.hasAttribute("data-weditor-break-placeholder")) continue;
        let tag=(el.tagName||"").toUpperCase();
        if(blockReset[tag]){
          const replacement=doc.createElement(blockReset[tag]);
          while(el.firstChild){ replacement.appendChild(el.firstChild); }
          if(el.parentNode){ el.parentNode.replaceChild(replacement, el); }
          nodes[i]=replacement;
          el=replacement;
          tag=(el.tagName||"").toUpperCase();
          changed=true;
        }
        if(el.style){
          let styleChanged=false;
          for(let j=0;j<styleProps.length;j++){
            const prop=styleProps[j];
            let current="";
            if(el.style.getPropertyValue){ current=el.style.getPropertyValue(prop); }
            if(current){ el.style.removeProperty(prop); styleChanged=true; continue; }
            const camel=toCamel(prop);
            if(el.style[camel]){ el.style[camel]=""; styleChanged=true; }
          }
          if(styleChanged) changed=true;
          if(el.getAttribute && el.getAttribute("style") && !el.getAttribute("style").trim()) el.removeAttribute("style");
        }
        for(let j=0;j<attrRemovals.length;j++){
          const name=attrRemovals[j];
          if(name==="style") continue;
          if(el.hasAttribute && el.hasAttribute(name)){ el.removeAttribute(name); changed=true; }
        }
        if(el.hasAttribute && el.hasAttribute("class")){
          const clsRaw=el.getAttribute("class")||"";
          const filtered=clsRaw.split(/\s+/).filter(function(token){ return token && !/^mso/i.test(token); });
          if(filtered.length){
            if(filtered.join(" ")!==clsRaw.trim()){ el.setAttribute("class", filtered.join(" ")); changed=true; }
          } else {
            el.removeAttribute("class");
            if(clsRaw.trim()) changed=true;
          }
        }
        if(tag==="SPAN" || tag==="FONT"){
          const attrCount=el.attributes ? el.attributes.length : 0;
          if(attrCount===0){ unwrap(el); changed=true; continue; }
        }
        if(inlineUnwrap[tag]){ unwrap(el); changed=true; }
      }
      if(changed){
        Normalizer.fixStructure(target);
        Breaks.ensurePlaceholders(target);
      }
      if(originalRange && sel){
        try{ sel.removeAllRanges(); sel.addRange(originalRange); }
        catch(e){}
      }
      return changed;
    }
    function clearAllFormatting(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const runClear=function(){ return clearFormattingForCurrentSelection(target); };
      const multi=applyAcrossTableSelection(inst, ctx, target, runClear);
      if(multi.handled){
        return multi.changed;
      }
      return runClear();
    }
    function fallbackApplyAlign(target, align){
      const info=ensureSelectionInfo(target); if(!info) return false;
      const { range }=info;
      const doc=target.ownerDocument || document;
      if(!doc) return false;
      const normalized=(align||"").toLowerCase();
      const targetAlign = normalized === "justify" ? "justify" : (normalized === "center" ? "center" : (normalized === "right" ? "right" : "left"));
      let updated=false;
      function isBlock(node){
        if(!node || node.nodeType!==1) return false;
        const tag=(node.tagName||"").toUpperCase();
        if(tag==="P" || tag==="DIV" || tag==="LI" || tag==="OL" || tag==="UL" || tag==="TABLE" || tag==="H1" || tag==="H2" || tag==="H3" || tag==="H4" || tag==="H5" || tag==="H6") return true;
        const display=window.getComputedStyle(node).display;
        return display==="block" || display==="list-item" || display==="table" || display==="flex" || display==="grid";
      }
      let node=range.commonAncestorContainer;
      while(node && node!==target){
        if(isBlock(node)){ node.style.textAlign=targetAlign; updated=true; break; }
        node=node.parentNode;
      }
      const walker=doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
        acceptNode:function(el){
          if(el===target) return NodeFilter.FILTER_SKIP;
          if(!isBlock(el)) return NodeFilter.FILTER_SKIP;
          return intersectsRange(range, el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      while((node=walker.nextNode())){
        node.style.textAlign=targetAlign;
        updated=true;
      }
      return updated;
    }
    function selectionHasUnderline(target){
      if(!target || !target.ownerDocument){ return false; }
      const doc=target.ownerDocument;
      const win=doc.defaultView || window;
      const sel=win.getSelection ? win.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0){ return false; }
      const range=sel.getRangeAt(0);
      let container=range.commonAncestorContainer;
      if(container && container.nodeType===3){ container=container.parentNode; }
      if(container && container!==target && !target.contains(container)){ return false; }
      function hasUnderlineOnNode(node){
        if(!node){ return false; }
        if(node.nodeType===3){ node=node.parentElement; }
        if(!node || node.nodeType!==1){ return false; }
        if(node.tagName && node.tagName.toLowerCase()==="u"){ return true; }
        if(win && typeof win.getComputedStyle==="function"){ try{
            const computed=win.getComputedStyle(node);
            if(computed){
              const textLine=(computed.textDecorationLine || computed.textDecoration || "");
              if(textLine && textLine.indexOf("underline")>-1){ return true; }
            }
          } catch(e){}
        }
        return false;
      }
      if(hasUnderlineOnNode(range.startContainer)){ return true; }
      if(hasUnderlineOnNode(range.endContainer)){ return true; }
      if(!doc.createTreeWalker){ return hasUnderlineOnNode(container); }
      const walker=doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
        acceptNode:function(node){
          if(node===target) return NodeFilter.FILTER_SKIP;
          return intersectsRange(range, node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      });
      let current;
      while((current=walker.nextNode())){
        if(hasUnderlineOnNode(current)){ return true; }
      }
      return false;
    }
    function applyUnderline(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const style = inst && inst.underlineStyle ? inst.underlineStyle : null;
      const applyUnderlineForSelection=function(){
        const ok=execCommand(target, "underline", null, true);
        if(!ok){ return ok; }
        const hasUnderline=selectionHasUnderline(target);
        if(style && hasUnderline){
          applyDecorationStyle(inst, ctx, style);
        } else if(!hasUnderline){
          clearUnderlineDecoration(inst, ctx);
        }
        return ok;
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, applyUnderlineForSelection);
      if(multi.handled){ return multi.changed; }
      return applyUnderlineForSelection();
    }
    function clearUnderlineDecoration(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const doc=target.ownerDocument || document;
      const win=doc.defaultView || window;
      const sel=win.getSelection ? win.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0){ return false; }
      const range=sel.getRangeAt(0);
      if(!target.contains(range.commonAncestorContainer)){ return false; }
      if(!doc.createTreeWalker){ return false; }
      const walker=doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
        acceptNode:function(node){
          if(node===target){ return NodeFilter.FILTER_SKIP; }
          try{ return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
          catch(err){ return NodeFilter.FILTER_REJECT; }
        }
      });
      const toProcess=[];
      let current=walker.nextNode();
      while(current){
        toProcess.push(current);
        current=walker.nextNode();
      }
      let changed=false;
      const toUnwrap=[];
      function removeProp(el, prop){
        if(!el.style){ return; }
        if(el.style.removeProperty){ el.style.removeProperty(prop); }
        else { el.style[prop.replace(/-([a-z])/g, function(_,c){ return c?c.toUpperCase():""; })]=""; }
      }
      for(let i=0;i<toProcess.length;i++){
        const el=toProcess[i];
        if(!el || el.nodeType!==1){ continue; }
        if(el.style){
          const beforeStyle=el.getAttribute && el.getAttribute("style");
          if(el.style.textDecorationLine){ removeProp(el, "text-decoration-line"); changed=true; }
          if(el.style.textDecorationStyle){ removeProp(el, "text-decoration-style"); changed=true; }
          const deco=el.style.textDecoration;
          if(deco && deco.indexOf("underline")>-1){ removeProp(el, "text-decoration"); changed=true; }
          if(el.getAttribute && el.getAttribute("style") && !el.getAttribute("style").trim()){ el.removeAttribute("style"); }
          else if(beforeStyle!==undefined && el.getAttribute && el.getAttribute("style")!==beforeStyle){ changed=true; }
        }
        const tag=(el.tagName||"").toUpperCase();
        if(tag==="SPAN"){
          const attrCount=el.attributes ? el.attributes.length : 0;
          if(attrCount===0){ toUnwrap.push(el); }
        }
      }
      for(let i=0;i<toUnwrap.length;i++){
        const span=toUnwrap[i];
        const parent=span.parentNode;
        if(!parent){ continue; }
        while(span.firstChild){ parent.insertBefore(span.firstChild, span); }
        parent.removeChild(span);
        changed=true;
      }
      if(changed){
        Normalizer.fixStructure(target);
        Breaks.ensurePlaceholders(target);
      }
      return changed;
    }
    function applyDecorationStyle(inst, ctx, style){
      if(!style){ return false; }
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const applyStyleForSelection=function(){
        const sel=window.getSelection();
        if(!sel || sel.rangeCount===0){ return false; }
        const range=sel.getRangeAt(0);
        if(!target.contains(range.commonAncestorContainer)){ return false; }
        if(range.collapsed){ return false; }
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
          return true;
        } catch(err){}
        const walker=doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
          acceptNode:function(node){ return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
        });
        const updates=[]; let node;
        while((node=walker.nextNode())){ updates.push(node); }
        let changed=false;
        for(let i=0;i<updates.length;i++){
          const el=updates[i];
          const computed=window.getComputedStyle(el);
          const hasUnderline=(computed && computed.textDecorationLine && computed.textDecorationLine.indexOf("underline")>-1);
          if(hasUnderline){
            el.style.textDecorationLine="underline";
            el.style.textDecorationStyle=style;
            changed=true;
          }
        }
        return changed;
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, applyStyleForSelection);
      if(multi.handled){ return multi.changed; }
      return applyStyleForSelection();
    }
    function applySimple(inst, ctx, command){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const runCommand=function(){ return execCommand(target, command, null, true); };
      const multi=applyAcrossTableSelection(inst, ctx, target, runCommand);
      if(multi.handled){ return multi.changed; }
      return runCommand();
    }
    function applyAlign(inst, ctx, align){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const map={ left:"justifyLeft", center:"justifyCenter", right:"justifyRight", justify:"justifyFull" };
      const normalized=(align||"").toLowerCase();
      const command=map[normalized] || map.left;
      focusTarget(target);
      const runAlign=function(){
        let ok=false;
        try{ ok=document.execCommand(command, false, null); }
        catch(err){ ok=false; }
        if(!ok){ ok=fallbackApplyAlign(target, normalized); }
        return ok;
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, runAlign);
      if(multi.handled){ return multi.changed; }
      return runAlign();
    }
    const BLOCK_TAGS={
      P:1,
      H1:1,
      H2:1,
      H3:1,
      H4:1,
      H5:1,
      H6:1,
      BLOCKQUOTE:1,
      PRE:1,
      DIV:1,
      LI:1,
      TD:1,
      TH:1,
      DT:1,
      DD:1
    };
    function findBlockNode(node, root){
      while(node && node!==root){
        if(node.nodeType===1){
          const tag=(node.tagName||"").toUpperCase();
          if(tag==="CODE"){
            const parent=node.parentNode;
            if(parent && parent.tagName && parent.tagName.toUpperCase()==="PRE"){ return parent; }
          }
          if(BLOCK_TAGS[tag]){ return node; }
        }
        node=node.parentNode;
      }
      return null;
    }
    function resolveBlockTag(node, root){
      const block=findBlockNode(node, root);
      if(!block) return null;
      const tag=(block.tagName||"").toLowerCase();
      return tag||null;
    }
    function getSelectionWithin(target){
      if(!target || !target.ownerDocument) return null;
      const doc=target.ownerDocument;
      const win=doc.defaultView || window;
      const sel=win.getSelection ? win.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0) return null;
      const range=sel.getRangeAt(0);
      let container=range.commonAncestorContainer;
      if(container && container.nodeType===3){ container=container.parentNode; }
      if(container && container!==target && !target.contains(container)){ return null; }
      return { sel, range };
    }
    function rangeCoversNode(range, node){
      if(!range || !node) return false;
      const doc=node.ownerDocument || document;
      if(!doc || !doc.createRange) return false;
      const test=doc.createRange();
      try{ test.selectNodeContents(node); }
      catch(err){ return false; }
      const START_TO_START=getRangeConstant(range, "START_TO_START", 0);
      const END_TO_END=getRangeConstant(range, "END_TO_END", 1);
      const startCompare=range.compareBoundaryPoints(START_TO_START, test);
      const endCompare=range.compareBoundaryPoints(END_TO_END, test);
      return startCompare<=0 && endCompare>=0;
    }
    function wrapSelectionAsBlock(target, selection, tag){
      if(!target || !selection || !tag) return false;
      const { sel, range }=selection;
      if(!range || range.collapsed) return false;
      const doc=target.ownerDocument || document;
      const upper=tag.toUpperCase();
      const block=doc.createElement(upper);
      let contents;
      try{ contents=range.extractContents(); }
      catch(err){ return false; }
      if(!contents){ contents=doc.createDocumentFragment(); }
      if(upper==="PRE"){
        const code=doc.createElement("code");
        const text=contents.textContent || "";
        code.textContent=text.replace(/\u00a0/g, " ");
        if(!code.textContent){ code.appendChild(doc.createTextNode("")); }
        block.appendChild(code);
      }else{
        if(contents.childNodes && contents.childNodes.length){
          block.appendChild(contents);
        }else{
          block.appendChild(doc.createTextNode(""));
        }
      }
      range.insertNode(block);
      sel.removeAllRanges();
      const newRange=doc.createRange();
      newRange.selectNodeContents(block);
      sel.addRange(newRange);
      Normalizer.fixStructure(target);
      Breaks.ensurePlaceholders(target);
      return true;
    }
    function applyBlockFormatForSelection(target, selection, tag){
      if(!target || !selection) return false;
      const normalized=(tag||"p").toString().trim().toLowerCase();
      const desired=normalized ? normalized : "p";
      const upper=desired.toUpperCase();
      const attempts=[];
      const { range }=selection;
      if(!range) return false;
      const startBlock=findBlockNode(range.startContainer, target);
      const endBlock=findBlockNode(range.endContainer, target);
      if(startBlock && endBlock && startBlock===endBlock){
        const currentTag=(startBlock.tagName||"").toLowerCase();
        const coversEntire=rangeCoversNode(range, startBlock);
        if(currentTag===desired && !coversEntire){ return true; }
        if(!coversEntire){
          const manual=wrapSelectionAsBlock(target, selection, desired);
          if(manual) return true;
        }
      }
      if(desired==="p"){ attempts.push("p"); }
      attempts.push(upper, "<"+upper+">");
      let success=false;
      for(let i=0;i<attempts.length && !success;i++){
        success=execCommand(target, "formatBlock", attempts[i], false);
      }
      if(success){
        Normalizer.fixStructure(target);
        Breaks.ensurePlaceholders(target);
      }
      return success;
    }
    function applyBlockFormat(inst, ctx, tag){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const run=function(){
        const selection=getSelectionWithin(target); if(!selection) return false;
        return applyBlockFormatForSelection(target, selection, tag);
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, function(){
        return run();
      });
      if(multi.handled){
        return multi.changed;
      }
      return run();
    }
    function getBlockFormat(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return "p";
      const selection=getSelectionWithin(target);
      if(!selection){ return "p"; }
      const { range }=selection;
      const start=resolveBlockTag(range.startContainer, target);
      if(start){ return start; }
      const end=resolveBlockTag(range.endContainer, target);
      if(end){ return end; }
      const common=resolveBlockTag(range.commonAncestorContainer, target);
      return common || "p";
    }
    function normalizeLineSpacingValue(value){
      if(value===null || typeof value==="undefined") return null;
      const str=String(value).trim();
      return str?str:null;
    }
    function isLineSpacingBlock(node){
      if(!node || node.nodeType!==1) return false;
      const tag=(node.tagName||"").toUpperCase();
      if(tag==="P" || tag==="DIV" || tag==="LI" || tag==="BLOCKQUOTE" || tag==="DD" || tag==="DT") return true;
      if(tag==="PRE") return true;
      if(tag==="TD" || tag==="TH") return true;
      if(tag.length===2 && tag.charAt(0)==="H" && tag.charAt(1)>="1" && tag.charAt(1)<="6") return true;
      return false;
    }
    function findLineSpacingBlock(node, root){
      while(node && node!==root){
        if(isLineSpacingBlock(node)) return node;
        node=node.parentNode;
      }
      return null;
    }
    function collectLineSpacingBlocks(target, range){
      const doc=target ? (target.ownerDocument || document) : document;
      const blocks=[];
      const seen=new Set();
      function add(node){
        const block=findLineSpacingBlock(node, target);
        if(block && !seen.has(block)){
          seen.add(block);
          blocks.push(block);
        }
      }
      if(range){
        add(range.startContainer);
        add(range.endContainer);
        if(!range.collapsed && doc && typeof doc.createTreeWalker==="function"){
          const walker=doc.createTreeWalker(target, NodeFilter.SHOW_ELEMENT, {
            acceptNode:function(node){
              if(node===target) return NodeFilter.FILTER_SKIP;
              if(!isLineSpacingBlock(node)) return NodeFilter.FILTER_SKIP;
              return intersectsRange(range, node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
          });
          let current;
          while((current=walker.nextNode())){
            add(current);
          }
        }
      }
      return blocks;
    }
    function applyLineSpacingForRange(target, range, normalized){
      if(!target || !range) return false;
      const blocks=collectLineSpacingBlocks(target, range);
      if(!blocks.length){
        const fallback=findLineSpacingBlock(range ? range.startContainer : null, target);
        if(fallback) blocks.push(fallback);
      }
      if(!blocks.length) return false;
      let changed=false;
      for(let i=0;i<blocks.length;i++){
        const block=blocks[i];
        if(!block || !block.style) continue;
        if(normalized){
          if(block.style.lineHeight!==normalized){
            block.style.lineHeight=normalized;
            changed=true;
          }
        } else {
          if(block.style.lineHeight){
            block.style.removeProperty("line-height");
            changed=true;
          }
        }
      }
      return changed;
    }
    function applyLineSpacing(inst, ctx, spacing){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      const normalized=normalizeLineSpacingValue(spacing);
      const runSpacing=function(){
        const doc=target.ownerDocument || document;
        const win=doc.defaultView || window;
        const sel=win.getSelection ? win.getSelection() : window.getSelection();
        if(!sel || sel.rangeCount===0) return false;
        const range=sel.getRangeAt(0);
        if(range && range.commonAncestorContainer && !target.contains(range.commonAncestorContainer) && range.commonAncestorContainer!==target){
          return false;
        }
        return applyLineSpacingForRange(target, range, normalized);
      };
      const multi=applyAcrossTableSelection(inst, ctx, target, runSpacing);
      let changed=false;
      if(multi.handled){
        changed=multi.changed;
      } else {
        changed=runSpacing();
      }
      if(changed){ Normalizer.fixStructure(target); }
      return changed;
    }
    function clearLineSpacing(inst, ctx){
      return applyLineSpacing(inst, ctx, null);
    }
    function getLineSpacing(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return null;
      const doc=target.ownerDocument || document;
      const win=doc.defaultView || window;
      const sel=win.getSelection ? win.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0) return null;
      const range=sel.getRangeAt(0);
      if(range && range.commonAncestorContainer && !target.contains(range.commonAncestorContainer) && range.commonAncestorContainer!==target){
        return null;
      }
      const block=findLineSpacingBlock(range ? range.startContainer : null, target) || findLineSpacingBlock(range ? range.commonAncestorContainer : null, target);
      if(block && block.style && block.style.lineHeight){
        const inline=(block.style.lineHeight||"").trim();
        return inline?inline:null;
      }
      return null;
    }
    function findListFromSelection(target){
      const info=ensureSelectionInfo(target);
      if(!info) return null;
      let node=info.range.commonAncestorContainer;
      if(node && node.nodeType===3){ node=node.parentNode; }
      while(node && node!==target){
        if(node.nodeType===1){
          const tag=(node.tagName||"").toUpperCase();
          if(tag==="UL" || tag==="OL"){ return node; }
        }
        node=node.parentNode;
      }
      return null;
    }
    function toggleList(inst, ctx, type, style){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const command=type==="ordered"?"insertOrderedList":"insertUnorderedList";
      const success=execCommand(target, command, null, true);
      if(success){
        Normalizer.fixStructure(target);
        Breaks.ensurePlaceholders(target);
        if(style){ applyListStyle(inst, ctx, style, type, true); }
        return true;
      }
      return false;
    }
    function findRootOrderedList(list){
      let current=list;
      while(current){
        const parent=current.parentNode;
        if(parent && parent.nodeType===1 && (parent.tagName||"").toLowerCase()==="li"){
          const maybeList=parent.parentNode;
          if(maybeList && maybeList.nodeType===1 && (maybeList.tagName||"").toLowerCase()==="ol"){
            current=maybeList;
            continue;
          }
        }
        break;
      }
      return current;
    }
    function applyDecimalDotZeroStyle(list){
      const root=findRootOrderedList(list);
      if(!root) return false;
      root.setAttribute(LIST_STYLE_ATTR, LIST_STYLE_DECIMAL_ZERO);
      const descendants=root.querySelectorAll("ol");
      for(let i=0;i<descendants.length;i++){
        const item=descendants[i];
        if(item!==root){ item.removeAttribute(LIST_STYLE_ATTR); }
      }
      return true;
    }
    function clearDecimalDotZeroStyle(list){
      const root=findRootOrderedList(list);
      if(!root) return;
      const lists=root.querySelectorAll("ol");
      for(let i=0;i<lists.length;i++){
        const item=lists[i];
        if(item.getAttribute && item.getAttribute(LIST_STYLE_ATTR)===LIST_STYLE_DECIMAL_ZERO){
          item.removeAttribute(LIST_STYLE_ATTR);
        }
        if(item.style && item.style.listStyleType==="none"){ item.style.removeProperty("list-style-type"); }
      }
      if(root.getAttribute && root.getAttribute(LIST_STYLE_ATTR)===LIST_STYLE_DECIMAL_ZERO){
        root.removeAttribute(LIST_STYLE_ATTR);
      }
      if(root.style && root.style.listStyleType==="none"){ root.style.removeProperty("list-style-type"); }
    }
    function applyListStyle(inst, ctx, style, type, skipCreate){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      focusTarget(target);
      let list=findListFromSelection(target);
      if(!list && !skipCreate){
        const command=type==="ordered"?"insertOrderedList":"insertUnorderedList";
        try{ document.execCommand(command, false, null); }
        catch(err){}
        Normalizer.fixStructure(target);
        list=findListFromSelection(target);
      }
      if(list){
        if(style && type==="ordered" && style===LIST_STYLE_DECIMAL_ZERO){
          return applyDecimalDotZeroStyle(list);
        }
        if(type==="ordered"){ clearDecimalDotZeroStyle(list); }
        if(style){ list.style.listStyleType=style; }
        else { list.style.removeProperty("list-style-type"); }
        return true;
      }
      return false;
    }
    function applyCustomBullet(inst, ctx, symbol){
      if(!symbol) return false;
      const trimmed=symbol.replace(/\s+/g," ").trim();
      if(!trimmed) return false;
      const cssValue='"'+trimmed.replace(/"/g,'\\"')+'"';
      return applyListStyle(inst, ctx, cssValue, "unordered");
    }
    function indentList(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const ok=execCommand(target, "indent", null, true);
      if(ok){ Normalizer.fixStructure(target); }
      return ok;
    }
    function outdentList(inst, ctx){
      const target=resolveTarget(inst, ctx); if(!target) return false;
      const ok=execCommand(target, "outdent", null, true);
      if(ok){ Normalizer.fixStructure(target); }
      return ok;
    }
    return {
      FONT_FAMILIES,
      FONT_SIZES,
      HIGHLIGHT_COLORS,
      SHADING_STANDARD_COLORS,
      LINE_SPACING_OPTIONS,
      FONT_THEME_COLORS,
      FONT_STANDARD_COLORS,
      FONT_COLOR_DEFAULT,
      applyFontFamily,
      applyFontSize,
      applyHighlight,
      clearHighlight,
      applyShading,
      clearShading,
      normalizeShadingColor,
      applyFontColor,
      clearFontColor,
      clearAllFormatting,
      applyUnderline,
      applyDecorationStyle,
      applySimple,
      applyAlign,
      applyLineSpacing,
      clearLineSpacing,
      getLineSpacing,
      toggleList,
      applyListStyle,
      applyCustomBullet,
      indentList,
      outdentList,
      applyBlockFormat,
      getBlockFormat,
      BLOCK_FORMATS
    };
  })();
  const HistoryManager=(function(){
    const MAX_ENTRIES=200;
    const states=new WeakMap();
    function makeCtx(inst, target){
      if(!inst || !target || target===inst.el) return null;
      return { area:target };
    }
    function repeatSimple(inst, target, command){
      Formatting.applySimple(inst, makeCtx(inst, target), command);
      return true;
    }
    const RepeatHandlers={
      formatBold:function(inst, target){ return repeatSimple(inst, target, "bold"); },
      formatItalic:function(inst, target){ return repeatSimple(inst, target, "italic"); },
      formatUnderline:function(inst, target){ Formatting.applyUnderline(inst, makeCtx(inst, target)); return true; },
      formatStrikeThrough:function(inst, target){ return repeatSimple(inst, target, "strikeThrough"); },
      formatSuperscript:function(inst, target){ return repeatSimple(inst, target, "superscript"); },
      formatSubscript:function(inst, target){ return repeatSimple(inst, target, "subscript"); },
      formatJustifyLeft:function(inst, target){ return Formatting.applyAlign(inst, makeCtx(inst, target), "left"); },
      formatJustifyCenter:function(inst, target){ return Formatting.applyAlign(inst, makeCtx(inst, target), "center"); },
      formatJustifyRight:function(inst, target){ return Formatting.applyAlign(inst, makeCtx(inst, target), "right"); },
      formatJustifyFull:function(inst, target){ return Formatting.applyAlign(inst, makeCtx(inst, target), "justify"); },
      insertOrderedList:function(inst, target){ return Formatting.toggleList(inst, makeCtx(inst, target), "ordered"); },
      insertUnorderedList:function(inst, target){ return Formatting.toggleList(inst, makeCtx(inst, target), "unordered"); },
      indent:function(inst, target){ return Formatting.indentList(inst, makeCtx(inst, target)); },
      outdent:function(inst, target){ return Formatting.outdentList(inst, makeCtx(inst, target)); },
      highlight:function(inst, target, args){
        if(args && Object.prototype.hasOwnProperty.call(args, "color")){
          if(args.color){ return Formatting.applyHighlight(inst, makeCtx(inst, target), args.color); }
          return Formatting.clearHighlight(inst, makeCtx(inst, target));
        }
        return Formatting.clearHighlight(inst, makeCtx(inst, target));
      },
      shading:function(inst, target, args){
        const ctx=makeCtx(inst, target);
        if(args && Object.prototype.hasOwnProperty.call(args, "color")){
          const color=args.color;
          if(color){ return Formatting.applyShading(inst, ctx, color); }
          return Formatting.clearShading(inst, ctx);
        }
        return Formatting.clearShading(inst, ctx);
      },
      lineSpacing:function(inst, target, args){
        const ctx=makeCtx(inst, target);
        if(args && Object.prototype.hasOwnProperty.call(args, "value")){
          const value=args.value;
          if(value===null || value===""){ return Formatting.clearLineSpacing(inst, ctx); }
          return Formatting.applyLineSpacing(inst, ctx, value);
        }
        return Formatting.applyLineSpacing(inst, ctx, "1");
      },
      fontColor:function(inst, target, args){
        if(args && Object.prototype.hasOwnProperty.call(args, "color")){
          if(args.color){ return Formatting.applyFontColor(inst, makeCtx(inst, target), args.color); }
          return Formatting.clearFontColor(inst, makeCtx(inst, target));
        }
        return Formatting.clearFontColor(inst, makeCtx(inst, target));
      },
      underlineStyle:function(inst, target, args){ if(!args || !args.style) return false; Formatting.applyDecorationStyle(inst, makeCtx(inst, target), args.style); return true; },
      fontFamily:function(inst, target, args){ if(!args || !args.value) return false; Formatting.applyFontFamily(inst, makeCtx(inst, target), args.value); return true; },
      fontSize:function(inst, target, args){ if(!args || !args.value) return false; Formatting.applyFontSize(inst, makeCtx(inst, target), args.value); return true; }
    };
    function resolveTarget(inst, ctx){ return (ctx && ctx.area) ? ctx.area : inst ? inst.el : null; }
    function cloneInstState(inst){
      if(!inst) return null;
      return {
        headerEnabled: !!inst.headerEnabled,
        footerEnabled: !!inst.footerEnabled,
        headerHTML: inst.headerHTML,
        footerHTML: inst.footerHTML,
        headerAlign: inst.headerAlign,
        footerAlign: inst.footerAlign,
        underlineStyle: inst.underlineStyle,
        highlightColor: inst.highlightColor,
        shadingColor: inst.shadingColor,
        fontColor: inst.fontColor,
        fixPageHeight: inst.fixPageHeight!==false
      };
    }
    function applyInstState(inst, state){
      if(!inst || !state) return;
      inst.headerEnabled = !!state.headerEnabled;
      inst.footerEnabled = !!state.footerEnabled;
      inst.headerHTML = state.headerHTML;
      inst.footerHTML = state.footerHTML;
      inst.headerAlign = state.headerAlign;
      inst.footerAlign = state.footerAlign;
      inst.underlineStyle = state.underlineStyle;
      inst.highlightColor = state.highlightColor;
      if(Object.prototype.hasOwnProperty.call(state, "shadingColor")){
        inst.shadingColor = state.shadingColor;
      }
      inst.fontColor = state.fontColor;
      inst.fixPageHeight = state.fixPageHeight!==false;
      if(inst.el){ inst.el.setAttribute("data-fix-page-height", inst.fixPageHeight!==false ? "true" : "false"); }
    }
    function instStateEqual(a, b){
      if(!a && !b) return true;
      if(!a || !b) return false;
      return a.headerEnabled===b.headerEnabled &&
        a.footerEnabled===b.footerEnabled &&
        a.headerHTML===b.headerHTML &&
        a.footerHTML===b.footerHTML &&
        a.headerAlign===b.headerAlign &&
        a.footerAlign===b.footerAlign &&
        a.underlineStyle===b.underlineStyle &&
        a.highlightColor===b.highlightColor &&
        a.shadingColor===b.shadingColor &&
        a.fontColor===b.fontColor &&
        (!!a.fixPageHeight)=== (!!b.fixPageHeight);
    }
    function sameSnapshot(a, b){
      if(!a || !b) return false;
      return a.html===b.html && instStateEqual(a.instState, b.instState);
    }
    function pathFor(root, node){
      if(node===root) return [];
      const path=[];
      let current=node;
      while(current && current!==root){
        const parent=current.parentNode;
        if(!parent) return null;
        path.push(Array.prototype.indexOf.call(parent.childNodes, current));
        current=parent;
      }
      if(current!==root) return null;
      path.reverse();
      return path;
    }
    function captureSelection(target){
      if(!target || !target.ownerDocument) return null;
      const sel=target.ownerDocument.getSelection ? target.ownerDocument.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0) return null;
      const range=sel.getRangeAt(0);
      if(!target.contains(range.startContainer) || !target.contains(range.endContainer)) return null;
      return {
        start:{ path:pathFor(target, range.startContainer), offset:range.startOffset },
        end:{ path:pathFor(target, range.endContainer), offset:range.endOffset }
      };
    }
    function resolvePosition(root, pos){
      if(!root || !pos) return null;
      let node=root;
      const path=pos.path || [];
      for(let i=0;i<path.length;i++){
        if(!node.childNodes || !node.childNodes[path[i]]) return null;
        node=node.childNodes[path[i]];
      }
      let offset=pos.offset;
      if(node.nodeType===3){
        const len=node.nodeValue!=null?node.nodeValue.length:0;
        if(offset>len) offset=len;
        if(offset<0) offset=0;
      } else {
        const len=node.childNodes?node.childNodes.length:0;
        if(offset>len) offset=len;
        if(offset<0) offset=0;
      }
      return { node, offset };
    }
    function restoreSelection(target, stored){
      if(!target || !stored || !target.ownerDocument || !target.ownerDocument.createRange) return;
      const doc=target.ownerDocument;
      const sel=doc.getSelection ? doc.getSelection() : window.getSelection();
      if(!sel) return;
      const start=resolvePosition(target, stored.start);
      const end=resolvePosition(target, stored.end || stored.start);
      if(!start || !end) return;
      const range=doc.createRange();
      try{
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
      }catch(err){ return; }
      sel.removeAllRanges();
      sel.addRange(range);
    }
    function createSnapshot(inst, target, label, meta){
      const snapshot={
        html:Breaks.serialize(target),
        selection:captureSelection(target),
        label:label || "Edit",
        instState:cloneInstState(inst),
        repeatable:null,
        timestamp:Date.now()
      };
      if(meta && meta.repeatable){
        const repeatId=meta.repeatId || meta.inputType || null;
        if(repeatId && RepeatHandlers[repeatId]){
          snapshot.repeatable={
            id:repeatId,
            args:meta.repeatArgs || null,
            label:meta.repeatLabel || snapshot.label
          };
        }
      }
      return snapshot;
    }
    function ensure(target){
      if(!target) return null;
      let state=states.get(target);
      if(!state){
        state={ past:[], future:[], applying:false, ui:[], lastRepeatable:null };
        states.set(target, state);
      }
      return state;
    }
    function getUndoItems(state){
      const items=[];
      if(!state || state.past.length<=1) return items;
      for(let i=state.past.length-1;i>0;i--){
        const snap=state.past[i];
        items.push({ label:snap.label || "Edit", depth:state.past.length-1-i });
      }
      return items;
    }
    function closeMenu(watcher){
      if(!watcher || !watcher.menuOpen) return;
      watcher.menuOpen=false;
      if(watcher.menu){
        watcher.menu.style.display="none";
        watcher.menu.setAttribute("aria-hidden","true");
        watcher.menu.innerHTML="";
      }
      const doc=watcher.menu ? watcher.menu.ownerDocument || document : document;
      if(watcher.docClick){ doc.removeEventListener("mousedown", watcher.docClick, true); watcher.docClick=null; }
      if(watcher.docKey){ doc.removeEventListener("keydown", watcher.docKey); watcher.docKey=null; }
    }
    function renderUndoMenu(inst, target, watcher, state){
      if(!watcher || !watcher.menu) return;
      const menu=watcher.menu;
      menu.innerHTML="";
      const items=getUndoItems(state);
      if(!items.length){
        const empty=document.createElement("div");
        empty.textContent="Nothing to undo";
        empty.style.padding="6px 12px";
        empty.style.font="12px/1.4 Segoe UI,system-ui";
        empty.style.color=WCfg.UI.textDim;
        menu.appendChild(empty);
        return;
      }
      const max=Math.min(items.length, 20);
      for(let i=0;i<max;i++){
        const item=items[i];
        const btn=document.createElement("button");
        btn.type="button";
        btn.setAttribute("role","menuitem");
        btn.textContent="Undo "+item.label;
        btn.style.display="block";
        btn.style.width="100%";
        btn.style.textAlign="left";
        btn.style.padding="6px 12px";
        btn.style.border="0";
        btn.style.background="transparent";
        btn.style.font="12px/1.4 Segoe UI,system-ui";
        btn.style.color=WCfg.UI.text;
        btn.style.cursor="pointer";
        btn.onmouseenter=function(){ btn.style.background=WCfg.UI.canvas; };
        btn.onmouseleave=function(){ btn.style.background="transparent"; };
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          const changed=undo(inst, target, item.depth+1);
          closeMenu(watcher);
          if(changed && watcher.ctx && watcher.ctx.refreshPreview) watcher.ctx.refreshPreview();
        });
        btn.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); closeMenu(watcher); if(watcher.dropdown) watcher.dropdown.focus(); } });
        menu.appendChild(btn);
      }
    }
    function openMenu(inst, target, watcher, state){
      if(!watcher || !watcher.menu || watcher.menuOpen) return;
      renderUndoMenu(inst, target, watcher, state);
      watcher.menuOpen=true;
      watcher.menu.style.display="flex";
      watcher.menu.style.flexDirection="column";
      watcher.menu.setAttribute("aria-hidden","false");
      const doc=watcher.menu.ownerDocument || document;
      watcher.docClick=function(e){ if(!watcher.container || !watcher.container.contains(e.target)){ closeMenu(watcher); } };
      watcher.docKey=function(e){ if(e.key==="Escape"){ closeMenu(watcher); if(watcher.dropdown) watcher.dropdown.focus(); } };
      doc.addEventListener("mousedown", watcher.docClick, true);
      doc.addEventListener("keydown", watcher.docKey);
      window.setTimeout(function(){ const first=watcher.menu.querySelector("button"); if(first) first.focus(); },0);
    }
    function updateUI(target){
      const state=ensure(target);
      if(!state) return;
      const canUndo=state.past.length>1;
      const canRedo=state.future.length>0;
      const repeatable=(!canRedo && state.lastRepeatable && RepeatHandlers[state.lastRepeatable.id]) ? state.lastRepeatable : null;
      for(let i=0;i<state.ui.length;i++){
        const watcher=state.ui[i];
        if(watcher.type==="undo"){
          if(watcher.primary){
            watcher.primary.disabled=!canUndo;
            watcher.primary.setAttribute("aria-disabled", canUndo?"false":"true");
            watcher.primary.style.opacity=canUndo?"1":"0.5";
          }
          if(watcher.dropdown){
            watcher.dropdown.disabled=!canUndo;
            watcher.dropdown.setAttribute("aria-disabled", canUndo?"false":"true");
            watcher.dropdown.style.opacity=canUndo?"1":"0.5";
          }
          if(!canUndo) closeMenu(watcher);
          if(watcher.menuOpen) renderUndoMenu(watcher.inst, watcher.target, watcher, state);
        } else if(watcher.type==="redo" && watcher.button){
          const mode=canRedo ? "redo" : (repeatable ? "repeat" : "redo");
          watcher.mode=mode;
          watcher.button.disabled=!(canRedo || repeatable);
          watcher.button.setAttribute("aria-disabled", watcher.button.disabled?"true":"false");
          watcher.button.style.opacity=watcher.button.disabled?"0.5":"1";
          if(watcher.icon && watcher.label){
            watcher.icon.textContent = mode==="redo" ? "↷" : "⟳";
            watcher.label.textContent = mode==="redo" ? "Redo" : "Repeat";
          }
          if(mode==="redo") watcher.button.title="Redo (Ctrl+Y / Cmd+Y)";
          else if(repeatable) watcher.button.title="Repeat last command (F4)";
          else watcher.button.title="Redo (Ctrl+Y / Cmd+Y)";
        }
      }
    }
    const INPUT_LABELS={
      insertText:{ label:"Typing" },
      insertParagraph:{ label:"Insert Paragraph" },
      insertLineBreak:{ label:"Insert Line Break" },
      insertFromPaste:{ label:"Paste" },
      insertFromDrop:{ label:"Drop" },
      deleteContentBackward:{ label:"Delete Backward" },
      deleteContentForward:{ label:"Delete Forward" },
      deleteByCut:{ label:"Cut" },
      formatBold:{ label:"Bold", repeatable:true, repeatId:"formatBold" },
      formatItalic:{ label:"Italic", repeatable:true, repeatId:"formatItalic" },
      formatUnderline:{ label:"Underline", repeatable:true, repeatId:"formatUnderline" },
      formatStrikeThrough:{ label:"Strikethrough", repeatable:true, repeatId:"formatStrikeThrough" },
      formatSuperscript:{ label:"Superscript", repeatable:true, repeatId:"formatSuperscript" },
      formatSubscript:{ label:"Subscript", repeatable:true, repeatId:"formatSubscript" },
      formatJustifyFull:{ label:"Justify", repeatable:true, repeatId:"formatJustifyFull" },
      formatJustifyCenter:{ label:"Align Center", repeatable:true, repeatId:"formatJustifyCenter" },
      formatJustifyLeft:{ label:"Align Left", repeatable:true, repeatId:"formatJustifyLeft" },
      formatJustifyRight:{ label:"Align Right", repeatable:true, repeatId:"formatJustifyRight" },
      insertOrderedList:{ label:"Numbered List", repeatable:true, repeatId:"insertOrderedList" },
      insertUnorderedList:{ label:"Bulleted List", repeatable:true, repeatId:"insertUnorderedList" },
      indent:{ label:"Increase Indent", repeatable:true, repeatId:"indent" },
      outdent:{ label:"Decrease Indent", repeatable:true, repeatId:"outdent" },
      removeFormat:{ label:"Clear Formatting" }
    };
    function fallbackLabelFromInput(type){
      if(!type) return { label:"Edit" };
      if(type.indexOf("delete")==0) return { label:"Delete" };
      if(type.indexOf("insert")==0) return { label:"Insert" };
      if(type.indexOf("format")==0){
        const friendly=type.replace(/^format/, "").replace(/([A-Z])/g, " $1").trim();
        return { label:friendly?friendly:"Format" };
      }
      return { label:"Edit" };
    }
    function metaFromInput(ev){
      const type=ev && ev.inputType ? ev.inputType : "";
      const base=INPUT_LABELS[type] || fallbackLabelFromInput(type);
      const meta={
        label:base.label,
        repeatable:!!base.repeatable,
        repeatId:base.repeatId || (base.repeatable ? type : null)
      };
      if(!RepeatHandlers[meta.repeatId]){ meta.repeatable=false; meta.repeatId=null; }
      return meta;
    }
    function init(inst, target){
      const state=ensure(target);
      if(!state) return;
      state.past=[];
      state.future=[];
      state.lastRepeatable=null;
      const snapshot=createSnapshot(inst, target, "Initial State", { repeatable:false });
      state.past.push(snapshot);
      updateUI(target);
    }
    function detach(target){
      const state=states.get(target);
      if(!state) return;
      for(let i=0;i<state.ui.length;i++){ closeMenu(state.ui[i]); }
      states.delete(target);
    }
    function record(inst, target, meta){
      const state=ensure(target);
      if(!state || state.applying) return false;
      const snapshot=createSnapshot(inst, target, meta && meta.label ? meta.label : "Edit", meta);
      const last=state.past[state.past.length-1];
      if(last && sameSnapshot(last, snapshot)){
        if(meta && meta.repeatable && meta.repeatId && RepeatHandlers[meta.repeatId]){
          state.lastRepeatable={ id:meta.repeatId, args:meta.repeatArgs||null, label:meta.repeatLabel || snapshot.label };
        } else if(meta && meta.repeatable===false){
          state.lastRepeatable=null;
        }
        updateUI(target);
        return false;
      }
      state.past.push(snapshot);
      if(state.past.length>MAX_ENTRIES) state.past.shift();
      state.future=[];
      state.lastRepeatable = snapshot.repeatable ? { id:snapshot.repeatable.id, args:snapshot.repeatable.args, label:snapshot.repeatable.label } : null;
      updateUI(target);
      return true;
    }
    function applySnapshot(inst, target, snapshot){
      const state=ensure(target);
      if(!state || !snapshot) return;
      state.applying=true;
      target.innerHTML=snapshot.html;
      Breaks.ensurePlaceholders(target);
      state.applying=false;
      applyInstState(inst, snapshot.instState);
      if(inst && target===inst.el) OutputBinding.syncDebounced(inst);
      window.requestAnimationFrame(function(){
        if(target && typeof target.focus==="function"){
          try{ target.focus({ preventScroll:true }); }
          catch(err){ target.focus(); }
        }
        restoreSelection(target, snapshot.selection);
      });
    }
    function undo(inst, target, steps){
      const state=states.get(target);
      if(!state || state.past.length<=1) return false;
      const count=Math.max(1, Math.min(steps||1, state.past.length-1));
      for(let i=0;i<count;i++){
        const current=state.past.pop();
        state.future.push(current);
        if(state.future.length>MAX_ENTRIES) state.future.shift();
      }
      const snapshot=state.past[state.past.length-1];
      applySnapshot(inst, target, snapshot);
      state.lastRepeatable = snapshot && snapshot.repeatable ? { id:snapshot.repeatable.id, args:snapshot.repeatable.args, label:snapshot.repeatable.label } : null;
      updateUI(target);
      return true;
    }
    function redo(inst, target){
      const state=states.get(target);
      if(!state || !state.future.length) return false;
      const snapshot=state.future.pop();
      state.past.push(snapshot);
      applySnapshot(inst, target, snapshot);
      state.lastRepeatable = snapshot && snapshot.repeatable ? { id:snapshot.repeatable.id, args:snapshot.repeatable.args, label:snapshot.repeatable.label } : null;
      updateUI(target);
      return true;
    }
    function repeat(inst, target){
      const state=states.get(target);
      if(!state || !state.lastRepeatable) return false;
      const handler=RepeatHandlers[state.lastRepeatable.id];
      if(!handler) return false;
      const result=handler(inst, target, state.lastRepeatable.args);
      if(result===false) return false;
      record(inst, target, {
        label:state.lastRepeatable.label || "Edit",
        repeatable:true,
        repeatId:state.lastRepeatable.id,
        repeatArgs:state.lastRepeatable.args || null,
        repeatLabel:state.lastRepeatable.label || "Edit"
      });
      return true;
    }
    function handleInput(inst, target, ev){
      const state=ensure(target);
      if(!state || state.applying) return;
      if(ev && (ev.inputType==="historyUndo" || ev.inputType==="historyRedo")) return;
      const meta=metaFromInput(ev);
      record(inst, target, meta);
    }
    function handleKeydown(inst, target, ev, ctx){
      if(!ev) return false;
      const isMod=ev.ctrlKey || ev.metaKey;
      if(isMod && !ev.altKey){
        const key=String(ev.key||"").toLowerCase();
        if(key==="z"){
          ev.preventDefault();
          const changed=ev.shiftKey ? redo(inst, target) : undo(inst, target);
          if(changed && ctx && ctx.refreshPreview) ctx.refreshPreview();
          return changed;
        }
        if(key==="y"){
          ev.preventDefault();
          const changed=redo(inst, target);
          if(changed && ctx && ctx.refreshPreview) ctx.refreshPreview();
          return changed;
        }
      }
      if(ev.key==="F4"){
        const ok=repeat(inst, target);
        if(ok){
          ev.preventDefault();
          if(ctx && ctx.refreshPreview) ctx.refreshPreview();
        }
        return ok;
      }
      return false;
    }
    function registerUndo(inst, target, refs){
      const state=ensure(target);
      if(!state) return null;
      const watcher={
        type:"undo",
        inst,
        target,
        ctx:refs && refs.ctx ? refs.ctx : null,
        container:refs && refs.container ? refs.container : null,
        primary:refs && refs.primary ? refs.primary : null,
        dropdown:refs && refs.dropdown ? refs.dropdown : null,
        menu:refs && refs.menu ? refs.menu : null,
        menuOpen:false,
        docClick:null,
        docKey:null
      };
      state.ui.push(watcher);
      updateUI(target);
      return watcher;
    }
    function registerRedo(inst, target, refs){
      const state=ensure(target);
      if(!state) return null;
      const watcher={
        type:"redo",
        inst,
        target,
        ctx:refs && refs.ctx ? refs.ctx : null,
        button:refs && refs.button ? refs.button : null,
        icon:refs && refs.icon ? refs.icon : null,
        label:refs && refs.label ? refs.label : null,
        mode:"redo"
      };
      state.ui.push(watcher);
      updateUI(target);
      return watcher;
    }
    function toggleUndoMenu(inst, target, watcher){
      const state=states.get(target);
      if(!state || !watcher) return;
      if(watcher.menuOpen) closeMenu(watcher);
      else openMenu(inst, target, watcher, state);
    }
    function getUndoHistory(target){
      const state=states.get(target);
      if(!state) return [];
      return getUndoItems(state);
    }
    return { resolveTarget, init, detach, record, undo, redo, repeat, handleInput, handleKeydown, registerUndo, registerRedo, toggleUndoMenu, getUndoHistory };
  })();
  const HistoryUI=(function(){
    function createUndo(inst, ctx){
      const target=HistoryManager.resolveTarget(inst, ctx);
      const wrap=document.createElement("div");
      wrap.style.position="relative";
      wrap.style.display="inline-flex";
      wrap.style.alignItems="stretch";
      wrap.style.gap="0";
      const primary=WDom.btn("", false, "Undo (Ctrl+Z / Cmd+Z)");
      primary.textContent="";
      primary.style.display="inline-flex";
      primary.style.alignItems="center";
      primary.style.gap="6px";
      primary.style.borderTopRightRadius="0";
      primary.style.borderBottomRightRadius="0";
      const icon=document.createElement("span");
      icon.setAttribute("aria-hidden","true");
      icon.textContent="↶";
      icon.style.fontSize="16px";
      const label=document.createElement("span");
      label.textContent="Undo";
      label.style.fontWeight="600";
      primary.appendChild(icon);
      primary.appendChild(label);
      const dropdown=WDom.btn("▼", false, "Undo history");
      dropdown.style.borderTopLeftRadius="0";
      dropdown.style.borderBottomLeftRadius="0";
      dropdown.style.borderLeft="0";
      dropdown.style.minWidth="34px";
      dropdown.style.padding="0 10px";
      dropdown.style.display="inline-flex";
      dropdown.style.alignItems="center";
      dropdown.style.justifyContent="center";
      const menu=document.createElement("div");
      menu.style.position="absolute";
      menu.style.top="calc(100% + 4px)";
      menu.style.left="0";
      menu.style.display="none";
      menu.style.background="#fff";
      menu.style.border="1px solid "+WCfg.UI.borderSubtle;
      menu.style.borderRadius="8px";
      menu.style.boxShadow="0 12px 24px rgba(0,0,0,.12)";
      menu.style.minWidth="180px";
      menu.style.padding="6px 0";
      menu.style.zIndex="30";
      menu.setAttribute("role","menu");
      menu.setAttribute("aria-hidden","true");
      wrap.appendChild(primary);
      wrap.appendChild(dropdown);
      wrap.appendChild(menu);
      const watcher=HistoryManager.registerUndo(inst, target, { container:wrap, primary, dropdown, menu, ctx });
      primary.addEventListener("click", function(e){
        e.preventDefault();
        const changed=HistoryManager.undo(inst, target);
        if(changed && ctx && ctx.refreshPreview) ctx.refreshPreview();
      });
      dropdown.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        HistoryManager.toggleUndoMenu(inst, target, watcher);
      });
      menu.addEventListener("click", function(e){ e.stopPropagation(); });
      return wrap;
    }
    function createRedo(inst, ctx){
      const target=HistoryManager.resolveTarget(inst, ctx);
      const btn=WDom.btn("", false, "Redo (Ctrl+Y / Cmd+Y)");
      btn.style.display="inline-flex";
      btn.style.alignItems="center";
      btn.style.gap="6px";
      const icon=document.createElement("span");
      icon.setAttribute("aria-hidden","true");
      icon.textContent="↷";
      icon.style.fontSize="16px";
      const label=document.createElement("span");
      label.textContent="Redo";
      label.style.fontWeight="600";
      btn.appendChild(icon);
      btn.appendChild(label);
      const watcher=HistoryManager.registerRedo(inst, target, { button:btn, icon, label, ctx });
      btn.addEventListener("click", function(e){
        e.preventDefault();
        if(watcher.mode==="redo"){
          const changed=HistoryManager.redo(inst, target);
          if(changed && ctx && ctx.refreshPreview) ctx.refreshPreview();
        } else if(watcher.mode==="repeat"){
          const ok=HistoryManager.repeat(inst, target);
          if(ok && ctx && ctx.refreshPreview) ctx.refreshPreview();
        }
      });
      return btn;
    }
    return { createUndo, createRedo };
  })();
  const TableMatrix=(function(){
    function parseSpan(value, fallback){
      const parsed=parseInt(value,10);
      return Number.isFinite(parsed) && parsed>0 ? parsed : fallback;
    }
    function read(table){
      if(!table || !table.rows) return null;
      const rows=Array.from(table.rows);
      const grid=[];
      const cells=new Map();
      for(let r=0;r<rows.length;r++){
        const row=rows[r];
        if(!row || !row.cells) continue;
        if(!grid[r]) grid[r]=[];
        let col=0;
        for(let c=0;c<row.cells.length;c++){
          const cell=row.cells[c];
          if(!cell || cell.nodeType!==1) continue;
          while(grid[r][col]) col++;
          const rowSpan=parseSpan(cell.getAttribute("rowspan")||cell.rowSpan||"1", 1);
          const colSpan=parseSpan(cell.getAttribute("colspan")||cell.colSpan||"1", 1);
          for(let rr=0;rr<rowSpan;rr++){
            const targetRow=r+rr;
            if(!grid[targetRow]) grid[targetRow]=[];
            for(let cc=0;cc<colSpan;cc++){
              const targetCol=col+cc;
              grid[targetRow][targetCol]=cell;
            }
          }
          cells.set(cell, { rowIndex:r, colIndex:col, rowSpan, colSpan });
          col+=colSpan;
        }
      }
      let columnCount=0;
      for(let i=0;i<grid.length;i++){
        const row=grid[i];
        if(row && row.length>columnCount) columnCount=row.length;
      }
      return { grid, cells, columnCount };
    }
    function getCellMetrics(table, cell, layout){
      if(!table || !cell) return null;
      const data=layout || read(table);
      if(!data) return null;
      const metrics=data.cells.get(cell);
      if(!metrics) return null;
      return { table, rowIndex:metrics.rowIndex, colIndex:metrics.colIndex, rowSpan:metrics.rowSpan, colSpan:metrics.colSpan };
    }
    return { read, getCellMetrics };
  })();
  const TableResizer=(function(){
    const HANDLE_BUFFER=6;
    const MIN_WIDTH=10;
    const MIN_HEIGHT=12;
    const layoutCache=new WeakMap();
    function refreshLayout(table){
      if(!table) return null;
      const layout=TableMatrix.read(table);
      if(layout && layout.grid){
        layoutCache.set(table, layout);
        return layout;
      }
      layoutCache.delete(table);
      return null;
    }
    function getLayout(table){
      if(!table) return null;
      return layoutCache.get(table) || refreshLayout(table);
    }
    function anchorBefore(table){
      if(table.tHead) return table.tHead;
      if(table.tBodies && table.tBodies.length) return table.tBodies[0];
      if(table.tFoot) return table.tFoot;
      return table.firstChild;
    }
    function measureColumn(table, colIndex, layout){
      if(!table || typeof colIndex!="number") return 0;
      const data=layout || getLayout(table);
      if(!data || !data.grid) return 0;
      let fallback=0;
      for(let r=0;r<data.grid.length;r++){
        const rowCells=data.grid[r];
        if(!rowCells) continue;
        const cell=rowCells[colIndex];
        if(!cell || !table.contains(cell)) continue;
        const rect=cell.getBoundingClientRect();
        if(!rect || !rect.width) continue;
        const metrics=data.cells ? data.cells.get(cell) : null;
        const span=metrics && metrics.colSpan ? metrics.colSpan : 1;
        const width=rect.width/Math.max(1, span);
        if(span===1 && width>0) return width;
        if(width>0 && !fallback) fallback=width;
      }
      return fallback;
    }
    function ensureWidths(table, colgroup, layout){
      if(!table || !colgroup) return;
      const cols=Array.prototype.slice.call(colgroup.children);
      if(!cols.length) return;
      const tableRect=table.getBoundingClientRect();
      const fallbackWidth=tableRect && tableRect.width ? Math.max(MIN_WIDTH, tableRect.width/cols.length) : 120;
      for(let i=0;i<cols.length;i++){
        const col=cols[i];
        const width=parseFloat(col.style.width);
        if(!width || Number.isNaN(width)){
          const measured=measureColumn(table, i, layout) || fallbackWidth;
          col.style.width=Math.max(MIN_WIDTH, Math.round(measured))+"px";
        }
      }
    }
    function ensureTable(table){
      if(!table) return null;
      const doc=table.ownerDocument || document;
      table.style.tableLayout="fixed";
      const layout=refreshLayout(table);
      if(!layout || !layout.grid || !layout.grid.length) return null;
      const expected=layout.columnCount || 0;
      if(expected<1) return null;
      let colgroup=null;
      const existing=table.querySelectorAll("colgroup");
      for(let i=0;i<existing.length;i++){
        if(existing[i] && existing[i].parentNode===table){ colgroup=existing[i]; break; }
      }
      if(!colgroup){
        colgroup=doc.createElement("colgroup");
        for(let i=0;i<expected;i++){ colgroup.appendChild(doc.createElement("col")); }
        const anchor=anchorBefore(table);
        if(anchor){ table.insertBefore(colgroup, anchor); }
        else { table.appendChild(colgroup); }
      } else if(colgroup.children.length!==expected){
        while(colgroup.firstChild){ colgroup.removeChild(colgroup.firstChild); }
        for(let i=0;i<expected;i++){ colgroup.appendChild(doc.createElement("col")); }
      }
      ensureWidths(table, colgroup, layout);
      return colgroup;
    }
    function locateCell(root, target){
      if(!target || !root.contains(target)) return null;
      let node=target;
      while(node && node!==root){
        const tag=node.tagName ? node.tagName.toLowerCase() : "";
        if(tag==="td" || tag==="th") return node;
        node=node.parentNode;
      }
      return null;
    }
    function createState(inst, options){
      const root=(options && options.root) ? options.root : (inst && inst.el);
      if(!root) return;
      const doc=root.ownerDocument || document;
      const ctx={};
      ctx.inst=inst || null;
      ctx.root=root;
      ctx.record = (options && typeof options.record==="function") ? options.record : function(instance, target, detail){
        if(!instance) return;
        const label=(detail && detail.label) ? detail.label : "Resize Table Column";
        HistoryManager.record(instance, target || (instance.el || null), { label, repeatable:false });
      };
      ctx.onChange = (options && typeof options.onChange==="function") ? options.onChange : function(instance){
        if(instance) OutputBinding.syncDebounced(instance);
      };
      ctx.getRecordTarget = (options && typeof options.getRecordTarget==="function") ? options.getRecordTarget : function(){ return ctx.root; };
      let hover=null;
      let active=null;
      let storedRootCursor=null;
      let storedBodyCursor=null;
      let storedBodySelect=null;
      function applyRootResizeCursor(cursor){
        if(storedRootCursor===null){ storedRootCursor=root.style.cursor || ""; }
        root.style.cursor=cursor || "col-resize";
      }
      function restoreRootCursor(){
        if(storedRootCursor!==null){
          root.style.cursor=storedRootCursor;
          storedRootCursor=null;
        }
      }
      function applyBodyDragCursor(cursor){
        if(!doc || !doc.body) return;
        if(storedBodyCursor===null){ storedBodyCursor=doc.body.style.cursor || ""; }
        if(storedBodySelect===null){ storedBodySelect=doc.body.style.userSelect || ""; }
        doc.body.style.cursor=cursor || "col-resize";
        doc.body.style.userSelect="none";
      }
      function restoreBodyCursor(){
        if(!doc || !doc.body) return;
        if(storedBodyCursor!==null){ doc.body.style.cursor=storedBodyCursor; storedBodyCursor=null; }
        if(storedBodySelect!==null){ doc.body.style.userSelect=storedBodySelect; storedBodySelect=null; }
      }
      function clearHover(){
        if(active) return;
        hover=null;
        restoreRootCursor();
      }
      function handleHover(info){
        if(!info || active) return;
        hover=info;
        const cursor=info.cursor || (info.axis==="row"?"ns-resize":"col-resize");
        applyRootResizeCursor(cursor);
      }
      function locateHandle(event){
        const cell=locateCell(root, event.target);
        if(!cell) return null;
        const table=cell.closest ? cell.closest("table") : null;
        if(!table || !root.contains(table)) return null;
        const rect=cell.getBoundingClientRect();
        if(!rect) return null;
        const withinColumn=Math.abs(rect.right - event.clientX) <= HANDLE_BUFFER;
        const withinRow=Math.abs(rect.bottom - event.clientY) <= HANDLE_BUFFER;
        if(!withinColumn && !withinRow) return null;
        let colInfo=null;
        let rowInfo=null;
        if(withinColumn){
          const colgroup=ensureTable(table);
          if(colgroup){
            const layout=getLayout(table);
            const columnCount=(layout && typeof layout.columnCount==="number") ? layout.columnCount : colgroup.children.length;
            if(columnCount>0 && layout && layout.cells){
              const metrics=layout.cells.get(cell);
              if(metrics){
                const boundaryIndex=metrics.colIndex + Math.max(1, metrics.colSpan||1) - 1;
                if(boundaryIndex>=0 && boundaryIndex<columnCount){
                  if(boundaryIndex===columnCount-1){
                    colInfo={ table, colgroup, colIndex:boundaryIndex, handleType:"edge", axis:"col", cursor:"col-resize" };
                  } else if(colgroup.children[boundaryIndex+1]){
                    colInfo={ table, colgroup, colIndex:boundaryIndex, handleType:"split", axis:"col", cursor:"col-resize" };
                  }
                }
              }
            }
          }
        }
        if(withinRow){
          const row=cell.parentNode && cell.parentNode.nodeType===1 ? cell.parentNode : null;
          if(row && typeof row.rowIndex==="number"){
            const rows=table.rows ? Array.prototype.slice.call(table.rows) : [];
            const rowIndex=rows.indexOf(row);
            if(rowIndex>=0){
              const isLast=rowIndex===rows.length-1;
              if(isLast){
                rowInfo={ table, row, rowIndex, handleType:"edge", axis:"row", cursor:"ns-resize" };
              } else {
                const nextRow=rows[rowIndex+1];
                if(nextRow){
                  rowInfo={ table, row, rowIndex, nextRow, handleType:"split", axis:"row", cursor:"ns-resize" };
                }
              }
            }
          }
        }
        if(colInfo && rowInfo){
          const colDistance=Math.abs(rect.right - event.clientX);
          const rowDistance=Math.abs(rect.bottom - event.clientY);
          return colDistance<=rowDistance ? colInfo : rowInfo;
        }
        return colInfo || rowInfo || null;
      }
      function onMouseMove(event){
        if(active){
          onDrag(event);
          return;
        }
        const info=locateHandle(event);
        if(info){ handleHover(info); }
        else if(hover){ clearHover(); }
      }
      function readRowHeight(row){
        if(!row) return 0;
        const rect=row.getBoundingClientRect();
        if(rect && rect.height) return rect.height;
        const styleHeight=parseFloat(row.style.height);
        if(styleHeight && !Number.isNaN(styleHeight)) return styleHeight;
        return MIN_HEIGHT;
      }
      function readColumnWidth(table, colgroup, index){
        const col=colgroup.children[index];
        if(!col) return 0;
        const width=parseFloat(col.style.width);
        if(width && !Number.isNaN(width)) return width;
        return measureColumn(table, index);
      }
      function prepareActive(info, event){
        if(info.axis==="row"){
          const mode=info.handleType || "split";
          const startHeight=readRowHeight(info.row);
          if(!startHeight) return null;
          const state={
            ctx,
            axis:"row",
            mode,
            table:info.table,
            row:info.row,
            startHeight,
            startY:event.clientY,
            changed:false,
            cursor:info.cursor || "ns-resize"
          };
          if(mode==="split" && info.nextRow){
            state.nextRow=info.nextRow;
          }
          applyBodyDragCursor(state.cursor);
          applyRootResizeCursor(state.cursor);
          return state;
        }
        const colgroup=info.colgroup;
        if(!colgroup) return null;
        const col=colgroup.children[info.colIndex];
        if(!col) return null;
        const mode=info.handleType || "split";
        const widths=[];
        for(let i=0;i<colgroup.children.length;i++){
          const w=readColumnWidth(info.table, colgroup, i);
          if(!w){ return null; }
          widths.push(w);
        }
        const startWidth=widths[info.colIndex];
        const state={
          ctx,
          axis:"col",
          mode,
          table:info.table,
          colgroup,
          col,
          startWidth,
          startX:event.clientX,
          changed:false,
          widths,
          cursor:info.cursor || "col-resize"
        };
        if(mode==="split"){
          const nextCol=colgroup.children[info.colIndex+1];
          if(!nextCol) return null;
          const nextWidth=widths[info.colIndex+1];
          if(!nextWidth) return null;
          state.nextCol=nextCol;
          state.nextWidth=nextWidth;
          state.total=startWidth+nextWidth;
        } else {
          state.otherTotal=0;
          for(let i=0;i<widths.length;i++){
            if(i===info.colIndex) continue;
            state.otherTotal+=widths[i];
          }
          state.total=startWidth+state.otherTotal;
          const explicitWidth=parseFloat(info.table.style.width);
          if(!info.table.style.width || Number.isNaN(explicitWidth) || !/px$/i.test(info.table.style.width.trim())){
            info.table.style.width=Math.max(MIN_WIDTH, Math.round(state.total))+"px";
          }
        }
        applyBodyDragCursor(state.cursor);
        applyRootResizeCursor(state.cursor);
        return state;
      }
      const DEFAULT_LINE_HEIGHT_RATIO=1.6;
      function parseLineHeightToPx(raw, fontSizePx){
        if(!raw) return 0;
        const value=String(raw).trim();
        if(!value) return 0;
        if(/px$/i.test(value)){ const parsed=parseFloat(value); return Number.isFinite(parsed)?parsed:0; }
        if(/^[0-9.]+$/i.test(value)){ const multiplier=parseFloat(value); return Number.isFinite(multiplier)&&fontSizePx>0 ? fontSizePx*multiplier : 0; }
        if(/%$/i.test(value)){ const percent=parseFloat(value); return Number.isFinite(percent)&&fontSizePx>0 ? fontSizePx*(percent/100) : 0; }
        if(value.toLowerCase()==="normal"){ return fontSizePx>0 ? fontSizePx*DEFAULT_LINE_HEIGHT_RATIO : 0; }
        return 0;
      }
      function resolveMaxLineHeight(metrics, desired){
        const safe=Math.max(MIN_HEIGHT, Number.isFinite(desired)?desired:MIN_HEIGHT);
        if(!metrics) return safe;
        const base=metrics.lineHeightPx;
        if(Number.isFinite(base) && base>0){ return Math.min(safe, base); }
        const fontSize=metrics.fontSizePx;
        if(Number.isFinite(fontSize) && fontSize>0){
          const fallback=Math.max(fontSize*DEFAULT_LINE_HEIGHT_RATIO, fontSize);
          return Math.min(safe, fallback);
        }
        return safe;
      }
      function ensureCellMetrics(cell){
        if(!cell) return null;
        if(cell.__weditorRowMetrics) return cell.__weditorRowMetrics;
        const doc=cell.ownerDocument || document;
        const win=doc.defaultView || window;
        let padTop=0, padBottom=0, borderTop=0, borderBottom=0, lineHeight="", boxSizing="", fontSizePx=0, lineHeightPx=0;
        if(win && win.getComputedStyle){
          try {
            const computed=win.getComputedStyle(cell);
            if(computed){
              padTop=parseFloat(computed.paddingTop)||0;
              padBottom=parseFloat(computed.paddingBottom)||0;
              borderTop=parseFloat(computed.borderTopWidth)||0;
              borderBottom=parseFloat(computed.borderBottomWidth)||0;
              boxSizing=computed.boxSizing||"";
              const fontSizeRaw=(computed.fontSize||"").trim();
              fontSizePx=parseFloat(fontSizeRaw)||0;
              const lineHeightRaw=(computed.lineHeight||"").trim();
              const parsedLineHeight=parseLineHeightToPx(lineHeightRaw, fontSizePx);
              if(Number.isFinite(parsedLineHeight) && parsedLineHeight>0) lineHeightPx=parsedLineHeight;
              if(lineHeightRaw && lineHeightRaw!=="normal" && lineHeightRaw!=="inherit" && lineHeightRaw!=="initial") lineHeight=lineHeightRaw;
            }
          } catch(err){
            padTop=padTop||0;
            padBottom=padBottom||0;
            borderTop=borderTop||0;
            borderBottom=borderBottom||0;
            lineHeight=lineHeight||"";
            boxSizing=boxSizing||"";
            fontSizePx=fontSizePx||0;
            lineHeightPx=lineHeightPx||0;
          }
        }
        const childrenMetrics=[];
        const children=cell && cell.children ? cell.children : null;
        let marginTotal=0;
        if(children && win && win.getComputedStyle){
          for(let i=0;i<children.length;i++){
            const child=children[i];
            if(!child || child.nodeType!==1) continue;
            let marginTop=0, marginBottom=0, childLineHeight="", childFontSizePx=0, childLineHeightPx=0;
            try {
              const childComputed=win.getComputedStyle(child);
              if(childComputed){
                marginTop=parseFloat(childComputed.marginTop)||0;
                marginBottom=parseFloat(childComputed.marginBottom)||0;
                const childFontSizeRaw=(childComputed.fontSize||"").trim();
                childFontSizePx=parseFloat(childFontSizeRaw)||0;
                const clh=(childComputed.lineHeight||"").trim();
                const childParsedLineHeight=parseLineHeightToPx(clh, childFontSizePx);
                if(Number.isFinite(childParsedLineHeight) && childParsedLineHeight>0) childLineHeightPx=childParsedLineHeight;
                if(clh && clh!=="normal" && clh!=="inherit" && clh!=="initial") childLineHeight=clh;
              }
            } catch(err){
              marginTop=marginTop||0;
              marginBottom=marginBottom||0;
              childLineHeight=childLineHeight||"";
              childFontSizePx=childFontSizePx||0;
              childLineHeightPx=childLineHeightPx||0;
            }
            marginTotal+=Math.max(0, marginTop||0)+Math.max(0, marginBottom||0);
            childrenMetrics.push({ el:child, marginTop, marginBottom, lineHeight:childLineHeight, fontSizePx:childFontSizePx, lineHeightPx:childLineHeightPx });
          }
        }
        let baseHeight=0;
        let innerHeight=0;
        let contentHeight=MIN_HEIGHT;
        if(typeof cell.getBoundingClientRect==="function"){
          try {
            const rect=cell.getBoundingClientRect();
            if(rect){
              baseHeight=rect.height||0;
              innerHeight=Math.max(0, baseHeight - (borderTop+borderBottom));
              const paddingTotal=padTop+padBottom;
              const usable=Math.max(0, innerHeight - paddingTotal - marginTotal);
              if(usable>0) contentHeight=usable;
            }
          } catch(err){
            baseHeight=baseHeight||0;
            innerHeight=innerHeight||0;
            contentHeight=contentHeight||MIN_HEIGHT;
          }
        }
        const metrics={ padTop, padBottom, borderTop, borderBottom, lineHeight, boxSizing, children:childrenMetrics, marginTotal, innerHeight, contentHeight, fontSizePx, lineHeightPx };
        cell.__weditorRowMetrics=metrics;
        return metrics;
      }
      function totalChildMargins(metrics){
        if(!metrics || !metrics.children || !metrics.children.length) return 0;
        let total=0;
        for(let i=0;i<metrics.children.length;i++){
          const info=metrics.children[i];
          if(!info) continue;
          total+=Math.max(0, info.marginTop||0)+Math.max(0, info.marginBottom||0);
        }
        return total;
      }
      function formatPixels(value){
        const safe=Math.max(0, Number.isFinite(value)?value:0);
        if(!safe) return "0px";
        const rounded=Math.round(safe*100)/100;
        return rounded+"px";
      }
      function applyCellPadding(cell, top, bottom){
        if(!cell || !cell.style) return;
        cell.style.paddingTop=formatPixels(top);
        cell.style.paddingBottom=formatPixels(bottom);
      }
      function restoreCellPadding(cell, metrics){
        if(!cell || !cell.style || !metrics) return;
        cell.style.paddingTop=formatPixels(metrics.padTop);
        cell.style.paddingBottom=formatPixels(metrics.padBottom);
      }
      function restoreChildMargins(cell, metrics){
        if(!cell || !metrics || !metrics.children) return;
        const list=metrics.children;
        for(let i=0;i<list.length;i++){
          const info=list[i];
          const el=info && info.el;
          if(!el || !el.style) continue;
          el.style.marginTop=formatPixels(info.marginTop);
          el.style.marginBottom=formatPixels(info.marginBottom);
          if(info.lineHeight){
            el.style.lineHeight=info.lineHeight;
          } else {
            el.style.removeProperty("line-height");
          }
        }
      }
      function applyChildLineHeight(cell, metrics, value){
        if(!cell || !metrics || !metrics.children || metrics.children.length===0) return;
        const safe=Math.max(MIN_HEIGHT, Number.isFinite(value)?value:MIN_HEIGHT);
        const list=metrics.children;
        for(let i=0;i<list.length;i++){
          const info=list[i];
          const el=info && info.el;
          if(!el || !el.style) continue;
          let target=safe;
          if(info){
            const base=info.lineHeightPx;
            if(Number.isFinite(base) && base>0){
              target=Math.min(target, base);
            } else {
              const fontSize=info.fontSizePx;
              if(Number.isFinite(fontSize) && fontSize>0){
                const fallback=Math.max(fontSize*DEFAULT_LINE_HEIGHT_RATIO, fontSize);
                target=Math.min(target, fallback);
              }
            }
          }
          el.style.lineHeight=formatPixels(Math.max(MIN_HEIGHT, target));
        }
      }
      function adjustChildMargins(cell, metrics, allowance){
        if(!cell || !metrics || !metrics.children || metrics.children.length===0) return 0;
        const list=metrics.children;
        let totalBase=0;
        for(let i=0;i<list.length;i++){
          const info=list[i];
          if(!info) continue;
          totalBase+=Math.max(0, info.marginTop||0)+Math.max(0, info.marginBottom||0);
        }
        if(totalBase<=0){
          restoreChildMargins(cell, metrics);
          return 0;
        }
        const safeAllowance=Math.max(0, Number.isFinite(allowance)?allowance:0);
        if(safeAllowance>=totalBase){
          restoreChildMargins(cell, metrics);
          return totalBase;
        }
        let used=0;
        const scale=safeAllowance>0 ? safeAllowance/totalBase : 0;
        for(let i=0;i<list.length;i++){
          const info=list[i];
          const el=info && info.el;
          if(!el || !el.style) continue;
          const baseTop=Math.max(0, info.marginTop||0);
          const baseBottom=Math.max(0, info.marginBottom||0);
          let top=0, bottom=0;
          if(scale>0){
            top=Math.floor(baseTop*scale);
            bottom=Math.floor(baseBottom*scale);
          }
          el.style.marginTop=formatPixels(top);
          el.style.marginBottom=formatPixels(bottom);
          used+=top+bottom;
        }
        if(list.length>0 && used!==safeAllowance){
          const diff=Math.round(safeAllowance-used);
          if(diff!==0){
            for(let i=0;i<list.length;i++){
              const info=list[i];
              const el=info && info.el;
              if(!el || !el.style) continue;
              const current=parseFloat(el.style.marginBottom)||0;
              const adjusted=Math.max(0, current+diff);
              el.style.marginBottom=formatPixels(adjusted);
              used+=adjusted-current;
              break;
            }
          }
        }
        return Math.min(used, safeAllowance);
      }
      function setRowSize(row, value){
        if(!row) return;
        const finalValue=Math.max(MIN_HEIGHT, Math.round(value));
        const px=finalValue+"px";
        row.style.boxSizing="border-box";
        row.style.height=px;
        row.style.minHeight=px;
        const cells=row.cells || [];
        for(let i=0;i<cells.length;i++){
          const cell=cells[i];
          if(!cell || !cell.style) continue;
          const metrics=ensureCellMetrics(cell);
          const basePadTop=metrics?metrics.padTop:0;
          const basePadBottom=metrics?metrics.padBottom:0;
          const basePaddingTotal=basePadTop+basePadBottom;
          const borderTotal=metrics?metrics.borderTop+metrics.borderBottom:0;
          const baseMargins=metrics && Number.isFinite(metrics.marginTotal)?metrics.marginTotal:totalChildMargins(metrics);
          const basePadMarginTotal=basePaddingTotal+baseMargins;
          const referenceInner=metrics && Number.isFinite(metrics.innerHeight) && metrics.innerHeight>0 ? metrics.innerHeight : (basePadMarginTotal + (metrics && Number.isFinite(metrics.contentHeight)?metrics.contentHeight:MIN_HEIGHT));
          const spaceForContent=Math.max(0, finalValue - borderTotal);
          const lineHeightValue=(metrics && metrics.lineHeight)?metrics.lineHeight:"";
          cell.style.boxSizing="border-box";
          cell.style.overflow="hidden";
          if(spaceForContent < referenceInner - 0.5){
            const targetForExtras=Math.max(0, spaceForContent - MIN_HEIGHT);
            let padTop=0;
            let padBottom=0;
            if(basePaddingTotal>0 && targetForExtras>0){
              const padScale=basePadMarginTotal>0 ? Math.min(1, targetForExtras/basePadMarginTotal) : 0;
              padTop=Math.max(0, Math.round(basePadTop*padScale));
              padBottom=Math.max(0, Math.round(basePadBottom*padScale));
              let padUsed=padTop+padBottom;
              if(padUsed>targetForExtras){
                const overflow=padUsed-targetForExtras;
                if(padTop>=padBottom){ padTop=Math.max(0, padTop-overflow); }
                else { padBottom=Math.max(0, padBottom-overflow); }
                padUsed=padTop+padBottom;
              }
              const marginAllowance=Math.max(0, targetForExtras - padUsed);
              const marginUsed=adjustChildMargins(cell, metrics, marginAllowance);
              const remaining=Math.max(MIN_HEIGHT, spaceForContent - padUsed - marginUsed);
              const effectiveLineHeight=resolveMaxLineHeight(metrics, remaining);
              cell.style.lineHeight=formatPixels(effectiveLineHeight);
              applyChildLineHeight(cell, metrics, effectiveLineHeight);
              applyCellPadding(cell, padTop, padBottom);
            } else {
              const marginAllowance=Math.max(0, targetForExtras);
              const marginUsed=adjustChildMargins(cell, metrics, marginAllowance);
              const remaining=Math.max(MIN_HEIGHT, spaceForContent - marginUsed);
              const effectiveLineHeight=resolveMaxLineHeight(metrics, remaining);
              cell.style.lineHeight=formatPixels(effectiveLineHeight);
              applyChildLineHeight(cell, metrics, effectiveLineHeight);
              applyCellPadding(cell, 0, 0);
            }
          } else {
            if(lineHeightValue){
              cell.style.lineHeight=lineHeightValue;
            } else {
              cell.style.removeProperty("line-height");
            }
            restoreCellPadding(cell, metrics);
            restoreChildMargins(cell, metrics);
          }
          cell.style.height=px;
          cell.style.minHeight=px;
        }
      }
      function applyRowHeights(state, height, nextHeight){
        setRowSize(state.row, height);
        if(state.mode!="edge" && state.nextRow && typeof nextHeight==="number"){
          setRowSize(state.nextRow, nextHeight);
        }
      }
      function applyWidths(state, width, nextWidth){
        if(state.mode==="edge"){
          state.col.style.width=Math.round(width)+"px";
          if(state.table){
            const total=Math.max(width + (state.otherTotal||0), MIN_WIDTH);
            state.table.style.width=Math.round(total)+"px";
          }
          return;
        }
        state.col.style.width=Math.round(width)+"px";
        state.nextCol.style.width=Math.round(nextWidth)+"px";
      }
      function onDrag(event){
        if(!active) return;
        if(active.axis==="row"){
          const delta=event.clientY - active.startY;
          const min=MIN_HEIGHT;
          let newHeight=active.startHeight + delta;
          if(newHeight<min) newHeight=min;
          applyRowHeights(active, newHeight);
        } else {
          const delta=event.clientX - active.startX;
          const min=MIN_WIDTH;
          if(active.mode==="edge"){
            let newWidth=active.startWidth + delta;
            if(newWidth<min) newWidth=min;
            applyWidths(active, newWidth);
          } else {
            let newWidth=active.startWidth + delta;
            let newNext=active.nextWidth - delta;
            if(newWidth<min){ newWidth=min; newNext=active.total-newWidth; }
            if(newNext<min){ newNext=min; newWidth=active.total-newNext; }
            newWidth=Math.max(min, newWidth);
            newNext=Math.max(min, newNext);
            if(newWidth+newNext!==active.total){
              const diff=active.total - (newWidth+newNext);
              newNext+=diff;
            }
            applyWidths(active, newWidth, newNext);
          }
        }
        active.changed=true;
        event.preventDefault();
      }
      function finishResize(){
        if(!active) return;
        const state=active;
        doc.removeEventListener("mousemove", onDrag, true);
        doc.removeEventListener("mouseup", onMouseUp, true);
        const changed=state.changed;
        const ctxRef=state.ctx;
        const instRef=ctxRef ? ctxRef.inst : null;
        const axis=state.axis || "col";
        active=null;
        hover=null;
        restoreBodyCursor();
        restoreRootCursor();
        if(changed && ctxRef){
          const target=ctxRef.getRecordTarget ? ctxRef.getRecordTarget(instRef) : (instRef ? instRef.el : null);
          const label=axis==="row" ? "Resize Table Row" : "Resize Table Column";
          if(ctxRef.record) ctxRef.record(instRef, target, { label });
          if(ctxRef.onChange) ctxRef.onChange(instRef, target);
        }
      }
      function onMouseUp(){
        finishResize();
      }
      function onMouseDown(event){
        if(event.button!==0) return;
        const info=locateHandle(event);
        if(!info) return;
        const state=prepareActive(info, event);
        if(!state) return;
        active=state;
        doc.addEventListener("mousemove", onDrag, true);
        doc.addEventListener("mouseup", onMouseUp, true);
        event.preventDefault();
      }
      function onFocus(event){
        const cell=locateCell(root, event.target);
        if(!cell) return;
        const table=cell.closest ? cell.closest("table") : null;
        if(table) ensureTable(table);
      }
      root.addEventListener("mousemove", onMouseMove);
      root.addEventListener("mousedown", onMouseDown);
      root.addEventListener("mouseleave", clearHover);
      root.addEventListener("focusin", onFocus);
    }
    return { attach:function(inst, options){ if(inst || (options && options.root)) createState(inst, options); }, ensureTable };
  })();
  const TableStyler=(function(){
    function resolveTarget(inst, ctx){ return (ctx && ctx.area) ? ctx.area : inst ? inst.el : null; }
    function ascendToTable(node, root){
      let current=node;
      while(current && current!==root){
        if(current.nodeType===1){
          const tag=(current.tagName||"").toLowerCase();
          if(tag==="table") return current;
        }
        current=current.parentNode;
      }
      if(current && current.nodeType===1 && (current.tagName||"").toLowerCase()==="table") return current;
      return null;
    }
    function ascendToCell(node, root){
      let current=node;
      while(current && current!==root){
        if(current.nodeType===1){
          const tag=(current.tagName||"").toLowerCase();
          if(tag==="td" || tag==="th") return current;
        }
        current=current.parentNode;
      }
      if(current && current.nodeType===1){
        const tag=(current.tagName||"").toLowerCase();
        if(tag==="td" || tag==="th") return current;
      }
      return null;
    }
    function currentSelectionTable(target){
      if(!target || !target.ownerDocument) return null;
      const doc=target.ownerDocument;
      const win=doc.defaultView || window;
      let sel=null;
      try{ sel=win.getSelection ? win.getSelection() : window.getSelection(); }
      catch(err){ sel=null; }
      const candidates=[];
      if(sel && sel.rangeCount>0){
        const range=sel.getRangeAt(0);
        if(range){
          candidates.push(range.commonAncestorContainer);
          candidates.push(range.startContainer);
          candidates.push(range.endContainer);
        }
        candidates.push(sel.anchorNode);
        candidates.push(sel.focusNode);
      }
      if(doc.activeElement && target.contains(doc.activeElement)) candidates.push(doc.activeElement);
      for(let i=0;i<candidates.length;i++){
        const candidate=candidates[i];
        if(!candidate) continue;
        const node=candidate.nodeType===3 ? candidate.parentNode : candidate;
        if(!node) continue;
        if(!target.contains(node)) continue;
        const table=ascendToTable(node, target);
        if(table) return table;
      }
      return null;
    }
    function currentSelectionCell(target){
      if(!target || !target.ownerDocument) return null;
      const doc=target.ownerDocument;
      const win=doc.defaultView || window;
      let sel=null;
      try{ sel=win.getSelection ? win.getSelection() : window.getSelection(); }
      catch(err){ sel=null; }
      const candidates=[];
      if(sel && sel.rangeCount>0){
        const range=sel.getRangeAt(0);
        if(range){
          candidates.push(range.commonAncestorContainer);
          candidates.push(range.startContainer);
          candidates.push(range.endContainer);
        }
        candidates.push(sel.anchorNode);
        candidates.push(sel.focusNode);
      }
      if(doc.activeElement && target.contains(doc.activeElement)) candidates.push(doc.activeElement);
      for(let i=0;i<candidates.length;i++){
        const candidate=candidates[i];
        if(!candidate) continue;
        const node=candidate.nodeType===3 ? candidate.parentNode : candidate;
        if(!node) continue;
        if(!target.contains(node)) continue;
        const cell=ascendToCell(node, target);
        if(cell) return cell;
      }
      return null;
    }
    function normalizeColor(input){
      if(!input) return null;
      let value=input.trim();
      if(!value) return null;
      if(/^rgba?\s*\(/i.test(value)){
        const parts=value.replace(/^rgba?\s*\(/i,"").replace(/\)$/,"").split(/\s*,\s*/);
        if(parts.length>=3){
          const r=Math.min(255, Math.max(0, parseInt(parts[0],10)));
          const g=Math.min(255, Math.max(0, parseInt(parts[1],10)));
          const b=Math.min(255, Math.max(0, parseInt(parts[2],10)));
          if(!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)){
            const toHex=function(num){ const hex=num.toString(16); return hex.length===1?"0"+hex:hex; };
            return "#"+toHex(r)+toHex(g)+toHex(b);
          }
        }
      }
      if(value.charAt(0)!=="#") value="#"+value;
      if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)){
        if(value.length===4){
          return "#"+value.charAt(1)+value.charAt(1)+value.charAt(2)+value.charAt(2)+value.charAt(3)+value.charAt(3);
        }
        return value.toLowerCase();
      }
      return null;
    }
    function readTableState(table){
      if(!table) return null;
      const hiddenAttr=table.getAttribute("data-weditor-border-hidden");
      const hidden=hiddenAttr==="1" || hiddenAttr==="true" || hiddenAttr==="yes" || hiddenAttr==="on" || (table.style.borderWidth && parseFloat(table.style.borderWidth)===0);
      let colorAttr=table.getAttribute("data-weditor-border-color");
      if(!colorAttr && hidden){
        colorAttr=table.getAttribute("data-weditor-border-last-color");
      }
      let color=normalizeColor(colorAttr || table.style.borderColor || "");
      if(!color && !hidden){
        try{
          const win=table.ownerDocument ? table.ownerDocument.defaultView : window;
          if(win && win.getComputedStyle){
            const computed=win.getComputedStyle(table);
            if(computed){
              color=normalizeColor(computed.borderTopColor || computed.borderColor || "");
            }
          }
        }catch(err){ color=null; }
      }
      return { table, hidden, color };
    }
    function applyColorToCells(table, colorValue, hidden){
      if(!table) return;
      const rows=table.rows;
      for(let r=0;r<rows.length;r++){
        const row=rows[r];
        const cells=row.cells;
        for(let c=0;c<cells.length;c++){
          const cell=cells[c];
          if(hidden){
            cell.style.border="0";
            cell.style.borderColor="transparent";
            cell.style.borderWidth="0";
            cell.style.borderStyle="solid";
          } else {
            cell.style.border="1px solid "+colorValue;
            cell.style.borderColor=colorValue;
            cell.style.borderWidth="1px";
            cell.style.borderStyle="solid";
          }
        }
      }
    }
    function applyColor(inst, ctx, color){
      const target=resolveTarget(inst, ctx);
      if(!target) return { changed:false };
      const table=currentSelectionTable(target);
      if(!table) return { changed:false };
      const normalized=normalizeColor(color);
      if(!normalized) return { changed:false };
      const state=readTableState(table);
      if(state && !state.hidden && state.color===normalized) return { changed:false, table };
      TableResizer.ensureTable(table);
      table.setAttribute("data-weditor-border-hidden","0");
      table.setAttribute("data-weditor-border-color", normalized);
      table.setAttribute("data-weditor-border-last-color", normalized);
      table.style.borderCollapse="collapse";
      table.style.border="1px solid "+normalized;
      table.style.borderColor=normalized;
      table.style.borderWidth="1px";
      table.style.borderStyle="solid";
      applyColorToCells(table, normalized, false);
      return { changed:true, table, hidden:false, color:normalized };
    }
    function applyDefault(inst, ctx){
      return applyColor(inst, ctx, WCfg.UI.borderSubtle || "#c8c6c4");
    }
    function hideBorders(inst, ctx){
      const target=resolveTarget(inst, ctx);
      if(!target) return { changed:false };
      const table=currentSelectionTable(target);
      if(!table) return { changed:false };
      const state=readTableState(table);
      if(state && state.hidden) return { changed:false, table };
      if(state && state.color){
        table.setAttribute("data-weditor-border-last-color", state.color);
      }
      table.setAttribute("data-weditor-border-hidden","1");
      table.removeAttribute("data-weditor-border-color");
      table.style.border="0";
      table.style.borderWidth="0";
      table.style.borderColor="transparent";
      table.style.borderStyle="solid";
      applyColorToCells(table, "transparent", true);
      return { changed:true, table, hidden:true, lastColor:state?state.color:null };
    }
    function collectTargetCells(inst, ctx, target){
      if(!target) return [];
      const cells=[];
      if(typeof TableSelection!=="undefined" && TableSelection && typeof TableSelection.getSelection==="function"){
        const selection=TableSelection.getSelection(inst, ctx);
        if(selection && selection.cells && selection.cells.length){
          for(let i=0;i<selection.cells.length;i++){
            const current=selection.cells[i];
            if(current && current.isConnected && target.contains(current)){
              cells.push(current);
            }
          }
        }
      }
      if(cells.length){
        rememberSelection(target, cells);
        return cells;
      }
      const remembered=recallSelection(target);
      if(remembered.length){
        return remembered;
      }
      const single=currentSelectionCell(target);
      if(single){
        rememberSelection(target, [single]);
        return [single];
      }
      return [];
    }
    function applyCellBorder(inst, ctx, color, sides){
      const target=resolveTarget(inst, ctx);
      if(!target) return { changed:false };
      const cells=collectTargetCells(inst, ctx, target);
      if(!cells.length) return { changed:false };
      const normalized=normalizeColor(color);
      if(!normalized) return { changed:false };
      const list=[];
      if(Array.isArray(sides)){
        for(let i=0;i<sides.length;i++){
          const side=(sides[i]||"").toLowerCase();
          if(side==="top"||side==="right"||side==="bottom"||side==="left"){
            if(list.indexOf(side)===-1) list.push(side);
          }
        }
      } else if(typeof sides==="string" && sides){
        const side=sides.toLowerCase();
        if(side==="top"||side==="right"||side==="bottom"||side==="left") list.push(side);
      }
      if(!list.length){
        list.push("top","right","bottom","left");
      }
      let changed=false;
      let primary=null;
      const tables=new Set();
      for(let cellIndex=0;cellIndex<cells.length;cellIndex++){
        const cell=cells[cellIndex];
        if(!cell) continue;
        if(!primary) primary=cell;
        let cellChanged=false;
        for(let i=0;i<list.length;i++){
          const side=list[i];
          const cap=side.charAt(0).toUpperCase()+side.slice(1);
          const colorProp="border"+cap+"Color";
          const widthProp="border"+cap+"Width";
          const styleProp="border"+cap+"Style";
          if(cell.style[colorProp]!==normalized){ cell.style[colorProp]=normalized; cellChanged=true; }
          if(cell.style[widthProp]!=="1px"){ cell.style[widthProp]="1px"; cellChanged=true; }
          if(cell.style[styleProp]!=="solid"){ cell.style[styleProp]="solid"; cellChanged=true; }
        }
        if(cellChanged) changed=true;
        const table=cell.closest ? cell.closest("table") : null;
        if(table){
          tables.add(table);
        }
      }
      tables.forEach(function(table){
        if(!table) return;
        if(!table.style.borderCollapse) table.style.borderCollapse="collapse";
        table.setAttribute("data-weditor-border-hidden","0");
        TableResizer.ensureTable(table);
      });
      const refCell=primary || cells[0] || null;
      const table=refCell && refCell.closest ? refCell.closest("table") : null;
      return { changed:changed, cell:refCell, cells:cells, table, color:normalized };
    }
    function clearCellBorder(inst, ctx, sides){
      const target=resolveTarget(inst, ctx);
      if(!target) return { changed:false };
      const cells=collectTargetCells(inst, ctx, target);
      if(!cells.length) return { changed:false };
      const list=[];
      if(Array.isArray(sides)){
        for(let i=0;i<sides.length;i++){
          const side=(sides[i]||"").toLowerCase();
          if(side==="top"||side==="right"||side==="bottom"||side==="left"){
            if(list.indexOf(side)===-1) list.push(side);
          }
        }
      } else if(typeof sides==="string" && sides){
        const side=sides.toLowerCase();
        if(side==="top"||side==="right"||side==="bottom"||side==="left") list.push(side);
      }
      if(!list.length){
        list.push("top","right","bottom","left");
      }
      let changed=false;
      let primary=null;
      const tables=new Set();
      for(let cellIndex=0;cellIndex<cells.length;cellIndex++){
        const cell=cells[cellIndex];
        if(!cell) continue;
        if(!primary) primary=cell;
        let cellChanged=false;
        for(let i=0;i<list.length;i++){
          const side=list[i];
          const cap=side.charAt(0).toUpperCase()+side.slice(1);
          const colorProp="border"+cap+"Color";
          const widthProp="border"+cap+"Width";
          const styleProp="border"+cap+"Style";
          if(cell.style[colorProp]!=="transparent"){ cell.style[colorProp]="transparent"; cellChanged=true; }
          if(cell.style[widthProp]!=="0px"){ cell.style[widthProp]="0px"; cellChanged=true; }
          if(cell.style[styleProp]!=="solid"){ cell.style[styleProp]="solid"; cellChanged=true; }
        }
        if(list.length===4){
          if(cell.style.border!=="0"){ cell.style.border="0"; cellChanged=true; }
        }
        if(cellChanged) changed=true;
        const table=cell.closest ? cell.closest("table") : null;
        if(table){
          tables.add(table);
        }
      }
      tables.forEach(function(table){
        if(!table) return;
        if(!table.style.borderCollapse) table.style.borderCollapse="collapse";
        TableResizer.ensureTable(table);
      });
      const refCell=primary || cells[0] || null;
      const table=refCell && refCell.closest ? refCell.closest("table") : null;
      return { changed:changed, cell:refCell, cells:cells, table, hidden:true };
    }
    const PADDING_SIDES=["top","right","bottom","left"];
    const LAST_SELECTION=new WeakMap();
    function rememberSelection(target, cells){
      if(!target) return;
      const filtered=cells.filter(function(cell){ return cell && cell.isConnected && target.contains(cell); });
      if(filtered.length){
        LAST_SELECTION.set(target, filtered);
      } else if(LAST_SELECTION.has(target)){
        LAST_SELECTION.delete(target);
      }
    }
    function recallSelection(target){
      if(!target || !LAST_SELECTION.has(target)) return [];
      const cached=LAST_SELECTION.get(target) || [];
      const filtered=cached.filter(function(cell){ return cell && cell.isConnected && target.contains(cell); });
      if(filtered.length){
        LAST_SELECTION.set(target, filtered);
        return filtered.slice();
      }
      LAST_SELECTION.delete(target);
      return [];
    }
    function normalizePaddingNumber(value){
      if(typeof value==="undefined") return undefined;
      if(value===null) return null;
      let numeric=value;
      if(typeof numeric==="string"){
        const trimmed=numeric.trim();
        if(!trimmed) return null;
        numeric=parseFloat(trimmed);
      }
      if(typeof numeric!=="number" || Number.isNaN(numeric) || !Number.isFinite(numeric)) return undefined;
      const clamped=Math.max(0, Math.min(240, numeric));
      return Math.round(clamped*100)/100;
    }
    function normalizePaddingValues(values){
      if(!values || typeof values!=="object") return null;
      const normalized={ top:undefined, right:undefined, bottom:undefined, left:undefined };
      let hasAny=false;
      if(Object.prototype.hasOwnProperty.call(values, "all")){
        const norm=normalizePaddingNumber(values.all);
        if(norm!==undefined){
          normalized.top=norm;
          normalized.right=norm;
          normalized.bottom=norm;
          normalized.left=norm;
          hasAny=true;
        } else if(values.all===null){
          normalized.top=null;
          normalized.right=null;
          normalized.bottom=null;
          normalized.left=null;
          hasAny=true;
        }
      }
      for(let i=0;i<PADDING_SIDES.length;i++){
        const side=PADDING_SIDES[i];
        if(Object.prototype.hasOwnProperty.call(values, side)){
          const norm=normalizePaddingNumber(values[side]);
          if(norm!==undefined){
            normalized[side]=norm;
            hasAny=true;
          } else if(values[side]===null){
            normalized[side]=null;
            hasAny=true;
          }
        }
      }
      return hasAny ? normalized : null;
    }
    function formatPaddingValue(value){
      if(value===null) return null;
      if(typeof value!=="number" || Number.isNaN(value)) return null;
      const rounded=Math.round(value*100)/100;
      if(!rounded) return "0px";
      return rounded+"px";
    }
    function readCellPadding(cell){
      if(!cell) return null;
      try{
        const doc=cell.ownerDocument || document;
        const win=doc.defaultView || window;
        const computed=(win && typeof win.getComputedStyle==="function") ? win.getComputedStyle(cell) : null;
        const result={ top:0, right:0, bottom:0, left:0 };
        for(let i=0;i<PADDING_SIDES.length;i++){
          const side=PADDING_SIDES[i];
          const prop="padding"+side.charAt(0).toUpperCase()+side.slice(1);
          let source=null;
          if(cell.style && cell.style[prop] && cell.style[prop].trim()){
            source=cell.style[prop];
          } else if(computed && computed[prop]){
            source=computed[prop];
          }
          const parsed=normalizePaddingNumber(source==null?null:source);
          result[side]=typeof parsed==="number" ? parsed : 0;
        }
        return result;
      }catch(err){
        return { top:0, right:0, bottom:0, left:0 };
      }
    }
    function applyPaddingToCell(cell, normalized){
      if(!cell || !normalized) return false;
      let changed=false;
      for(let i=0;i<PADDING_SIDES.length;i++){
        const side=PADDING_SIDES[i];
        const norm=normalized[side];
        if(typeof norm==="undefined") continue;
        const prop="padding"+side.charAt(0).toUpperCase()+side.slice(1);
        const cssProp="padding-"+side;
        if(norm===null){
          if(cell.style && cell.style[prop]){
            cell.style[prop]="";
            if(cell.style.removeProperty) cell.style.removeProperty(cssProp);
            changed=true;
          }
        } else {
          const formatted=formatPaddingValue(norm) || "0px";
          if(cell.style[prop]!==formatted){
            cell.style[prop]=formatted;
            changed=true;
          }
        }
      }
      return changed;
    }
    function setCellPadding(inst, ctx, values){
      const target=resolveTarget(inst, ctx);
      if(!target) return { changed:false };
      const normalized=normalizePaddingValues(values);
      if(!normalized) return { changed:false };
      const cells=collectTargetCells(inst, ctx, target);
      if(!cells.length) return { changed:false };
      let changed=false;
      let primary=null;
      const tables=new Set();
      for(let i=0;i<cells.length;i++){
        const cell=cells[i];
        if(!cell) continue;
        if(!primary) primary=cell;
        const table=cell.closest ? cell.closest("table") : null;
        if(table) tables.add(table);
        if(applyPaddingToCell(cell, normalized)){
          changed=true;
        }
      }
      tables.forEach(function(table){ if(table){ TableResizer.ensureTable(table); } });
      const first=primary || cells[0] || null;
      const table=first && first.closest ? first.closest("table") : null;
      return { changed, cell:first, table };
    }
    function getCellPadding(inst, ctx){
      const target=resolveTarget(inst, ctx);
      if(!target) return null;
      const cells=collectTargetCells(inst, ctx, target);
      if(!cells.length) return null;
      let primary=null;
      const summary={ top:null, right:null, bottom:null, left:null };
      const mixed={ top:false, right:false, bottom:false, left:false };
      for(let i=0;i<cells.length;i++){
        const cell=cells[i];
        if(!cell) continue;
        if(!primary) primary=cell;
        const padding=readCellPadding(cell);
        if(!padding) continue;
        PADDING_SIDES.forEach(function(side){
          if(summary[side]===null && i===0){
            summary[side]=padding[side];
            mixed[side]=false;
          } else if(summary[side]===null && i>0){
            mixed[side]=true;
          } else if(summary[side]!==null){
            const current=summary[side];
            if(Math.abs(padding[side]-current)>0.1){
              summary[side]=null;
              mixed[side]=true;
            }
          }
        });
      }
      if(!primary) return null;
      return { cell:primary, padding:summary, mixed:mixed };
    }
    function normalizeCellVerticalAlign(value){
      const key=(value==null?"":String(value)).trim().toLowerCase();
      if(key==="center") return "middle";
      if(key==="middle"||key==="top"||key==="bottom") return key;
      return null;
    }
    function readCellAlignment(cell){
      if(!cell) return null;
      const inline=normalizeCellVerticalAlign(cell.style ? cell.style.verticalAlign : null);
      if(inline) return inline;
      try{
        const doc=cell.ownerDocument || document;
        const win=doc.defaultView || window;
        if(win && typeof win.getComputedStyle==="function"){
          const computed=win.getComputedStyle(cell);
          if(computed){
            const norm=normalizeCellVerticalAlign(computed.verticalAlign);
            if(norm) return norm;
          }
        }
      }catch(err){ return null; }
      return null;
    }
    function setCellVerticalAlign(inst, ctx, align){
      const target=resolveTarget(inst, ctx);
      if(!target) return { changed:false };
      const normalized=normalizeCellVerticalAlign(align);
      function applyToCell(cell){
        if(!cell) return false;
        let changed=false;
        if(normalized){
          if(cell.style.verticalAlign!==normalized){ cell.style.verticalAlign=normalized; changed=true; }
        } else {
          if(cell.style.verticalAlign){
            cell.style.verticalAlign="";
            if(cell.style.removeProperty) cell.style.removeProperty("vertical-align");
            changed=true;
          }
        }
        return changed;
      }
      const tableSelection=(typeof TableSelection!=='undefined' && TableSelection && typeof TableSelection.getSelection==="function") ? TableSelection.getSelection(inst, ctx) : null;
      if(tableSelection && tableSelection.cells && tableSelection.cells.length){
        const cells=tableSelection.cells.filter(function(cell){ return cell && cell.isConnected && target.contains(cell); });
        if(cells.length){
          let changed=false;
          let primary=null;
          const tables=new Set();
          for(let i=0;i<cells.length;i++){
            const cell=cells[i];
            if(!primary) primary=cell;
            const table=cell.closest ? cell.closest("table") : null;
            if(table) tables.add(table);
            if(applyToCell(cell)){ changed=true; }
          }
          tables.forEach(function(table){ if(table){ TableResizer.ensureTable(table); } });
          const first=primary || cells[0] || null;
          const table=first && first.closest ? first.closest("table") : null;
          return { changed, cell:first, table, align:normalized };
        }
      }
      const cell=currentSelectionCell(target);
      if(!cell) return { changed:false };
      const changed=applyToCell(cell);
      const table=cell.closest ? cell.closest("table") : null;
      if(table){ TableResizer.ensureTable(table); }
      return { changed, cell, table, align:normalized };
    }
    function getCellAlignment(inst, ctx){
      const target=resolveTarget(inst, ctx);
      if(!target) return null;
      const tableSelection=(typeof TableSelection!=='undefined' && TableSelection && typeof TableSelection.getSelection==="function") ? TableSelection.getSelection(inst, ctx) : null;
      if(tableSelection && tableSelection.cells && tableSelection.cells.length){
        const cells=tableSelection.cells.filter(function(cell){ return cell && cell.isConnected && target.contains(cell); });
        if(cells.length){
          let primary=null;
          let align=null;
          let mixed=false;
          for(let i=0;i<cells.length;i++){
            const cell=cells[i];
            if(!primary) primary=cell;
            const value=readCellAlignment(cell);
            if(i===0){
              align=value;
            } else {
              if(value!==align){ mixed=true; }
            }
          }
          return { cell:primary, align:mixed?null:align };
        }
      }
      const cell=currentSelectionCell(target);
      if(!cell) return null;
      return { cell, align:readCellAlignment(cell) };
    }
    function getState(inst, ctx){
      const target=resolveTarget(inst, ctx);
      if(!target) return null;
      const table=currentSelectionTable(target);
      if(!table) return null;
      return readTableState(table);
    }
    return { applyColor, applyDefault, hideBorders, getState, normalizeColor, applyCellBorder, clearCellBorder, setCellVerticalAlign, getCellAlignment, setCellPadding, getCellPadding };
  })();
  const TableSelection=(function(){
    const CELL_CLASS="weditor-table-cell-selected";
    const STYLE_ID="weditor-table-selection-style";
    const states=new WeakMap();
    function resolveState(inst, ctx){
      const candidates=[];
      if(ctx){
        if(ctx.root) candidates.push(ctx.root);
        if(ctx.area) candidates.push(ctx.area);
      }
      if(inst){
        if(inst.root) candidates.push(inst.root);
        if(inst.el) candidates.push(inst.el);
      }
      for(let i=0;i<candidates.length;i++){
        const candidate=candidates[i];
        if(candidate && states.has(candidate)){
          return states.get(candidate).state;
        }
      }
      return null;
    }
    function ensureStyles(doc){
      if(!doc || !doc.head) return;
      if(doc.getElementById(STYLE_ID)) return;
      const style=doc.createElement("style");
      style.id=STYLE_ID;
      style.textContent=
        "."+CELL_CLASS+"{"+
          "position:relative;"+
          "background-image:linear-gradient(rgba(15,108,189,0.16),rgba(15,108,189,0.16));"+
          "box-shadow:inset 0 0 0 2px rgba(15,108,189,0.65),0 0 0 1px rgba(15,108,189,0.35);"+
          "outline:1px solid rgba(255,255,255,0.9);"+
          "outline-offset:-1px;"+
        "}";
      doc.head.appendChild(style);
    }
    function closestCell(root, node){
      let current=node;
      while(current && current!==root){
        if(current.nodeType===1){
          const tag=(current.tagName||"").toLowerCase();
          if(tag==="td" || tag==="th") return current;
        }
        current=current.parentNode;
      }
      if(current && current.nodeType===1){
        const tag=(current.tagName||"").toLowerCase();
        if(tag==="td" || tag==="th") return current;
      }
      return null;
    }
    function closestRow(cell){
      if(!cell) return null;
      let current=cell;
      while(current){
        if(current.nodeType===1 && (current.tagName||"").toLowerCase()==="tr") return current;
        current=current.parentNode;
      }
      return null;
    }
    function tableFromCell(cell){
      if(!cell || !cell.closest) return null;
      return cell.closest("table");
    }
    function isCellElement(node){
      if(!node || node.nodeType!==1) return false;
      const tag=(node.tagName||"").toLowerCase();
      return tag==="td" || tag==="th";
    }
    function getCellPosition(cell, layout){
      if(!cell || !isCellElement(cell)) return null;
      const table=tableFromCell(cell);
      if(!table) return null;
      const metrics=TableMatrix.getCellMetrics(table, cell, layout);
      if(!metrics) return null;
      return metrics;
    }
    function setSelectedCells(state, cells, table){
      const unique=new Set();
      for(let i=0;i<cells.length;i++){
        const current=cells[i];
        if(current && isCellElement(current)) unique.add(current);
      }
      state.cells.forEach(function(cell){
        if(!unique.has(cell) && cell && cell.classList){
          cell.classList.remove(CELL_CLASS);
        }
      });
      state.cells.clear();
      if(table){ state.table=table; }
      unique.forEach(function(cell){ addCell(state, cell); });
    }
    function collectRangeCells(table, rowStart, rowEnd, colStart, colEnd, layout){
      const selected=[];
      if(!table || rowStart>rowEnd || colStart>colEnd) return selected;
      const data=layout || TableMatrix.read(table);
      if(!data || !data.grid) return selected;
      const unique=new Set();
      for(let r=rowStart;r<=rowEnd;r++){
        const row=data.grid[r];
        if(!row) continue;
        for(let c=colStart;c<=colEnd;c++){
          const cell=row[c];
          if(cell && isCellElement(cell)){ unique.add(cell); }
        }
      }
      unique.forEach(function(cell){ selected.push(cell); });
      return selected;
    }
    function findColumnFocusCandidate(table, row, rowIndex, columnIndex){
      if(row && row.cells && row.cells.length){
        if(columnIndex<row.cells.length){ return row.cells[columnIndex]; }
        return row.cells[row.cells.length-1];
      }
      if(!table || !table.rows) return null;
      for(let i=rowIndex+1;i<table.rows.length;i++){
        const candidateRow=table.rows[i];
        if(candidateRow && candidateRow.cells && candidateRow.cells.length){
          if(columnIndex<candidateRow.cells.length){ return candidateRow.cells[columnIndex]; }
          return candidateRow.cells[candidateRow.cells.length-1];
        }
      }
      for(let i=rowIndex-1;i>=0;i--){
        const candidateRow=table.rows[i];
        if(candidateRow && candidateRow.cells && candidateRow.cells.length){
          if(columnIndex<candidateRow.cells.length){ return candidateRow.cells[columnIndex]; }
          return candidateRow.cells[candidateRow.cells.length-1];
        }
      }
      return null;
    }
    function clearSelection(state){
      if(!state) return;
      state.cells.forEach(function(cell){ if(cell && cell.classList) cell.classList.remove(CELL_CLASS); });
      state.cells.clear();
      state.table=null;
    }
    function isValidAnchor(state){
      if(!state.anchor) return null;
      if(!state.anchor.isConnected || !state.root.contains(state.anchor)){
        state.anchor=null;
        return null;
      }
      return state.anchor;
    }
    function addCell(state, cell){
      if(!state || !cell) return;
      const table=tableFromCell(cell);
      if(!table) return;
      if(state.table && state.table!==table){
        clearSelection(state);
      }
      ensureStyles(table.ownerDocument || document);
      if(!state.cells.has(cell)){
        cell.classList.add(CELL_CLASS);
        state.cells.add(cell);
      }
      state.table=table;
    }
    function removeCell(state, cell){
      if(!state || !cell) return;
      if(state.cells.has(cell)){
        cell.classList.remove(CELL_CLASS);
        state.cells.delete(cell);
      }
      if(!state.cells.size){ state.table=null; }
    }
    function focusCell(cell){
      if(!cell) return;
      const doc=cell.ownerDocument || document;
      if(!doc || !doc.createRange) return;
      try{
        const range=doc.createRange();
        range.selectNodeContents(cell);
        range.collapse(true);
        const sel=doc.getSelection ? doc.getSelection() : window.getSelection();
        if(sel){
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }catch(err){}
    }
    function deleteSelection(state){
      if(!state || !state.cells.size) return false;
      const table=state.table;
      if(!table || !table.isConnected || !state.root.contains(table)){
        clearSelection(state);
        return false;
      }
      const validCells=Array.from(state.cells).filter(function(cell){ return cell && cell.isConnected && table.contains(cell); });
      if(!validCells.length){
        clearSelection(state);
        return false;
      }
      const rowInfo=new Map();
      for(let i=0;i<table.rows.length;i++){
        const row=table.rows[i];
        const cellCount=row && row.cells ? row.cells.length : 0;
        if(row){ rowInfo.set(row, { total:cellCount, selected:new Set() }); }
      }
      validCells.forEach(function(cell){
        const row=closestRow(cell);
        if(!row || !rowInfo.has(row)) return;
        rowInfo.get(row).selected.add(cell);
      });
      const rowsToDelete=[];
      const cellsToClear=[];
      rowInfo.forEach(function(info, row){
        if(info.selected.size && info.total>0 && info.selected.size>=info.total){
          rowsToDelete.push(row);
        } else {
          info.selected.forEach(function(cell){ cellsToClear.push(cell); });
        }
      });
      let focusTarget=null;
      let tableRemoved=false;
      const rowsMarked=new Set(rowsToDelete);
      if(rowsToDelete.length){
        const beforeRows=table.rows ? Array.prototype.slice.call(table.rows) : [];
        const removedIndices=rowsToDelete.map(function(row){ return beforeRows.indexOf(row); }).filter(function(idx){ return idx>=0; }).sort(function(a,b){ return a-b; });
        const removedSet=new Set(removedIndices);
        rowsToDelete.forEach(function(row){ if(row && row.parentNode){ row.parentNode.removeChild(row); } });
        if(!table.rows || !table.rows.length){
          tableRemoved=true;
          const parent=table.parentNode;
          if(parent){ parent.removeChild(table); focusTarget=parent; }
        } else {
          TableResizer.ensureTable(table);
          let focusRow=null;
          if(removedIndices.length){
            for(let i=removedIndices[removedIndices.length-1]+1;i<beforeRows.length;i++){
              if(removedSet.has(i)) continue;
              const candidate=beforeRows[i];
              if(candidate && candidate.isConnected && table.contains(candidate) && candidate.cells && candidate.cells.length){ focusRow=candidate; break; }
            }
            if(!focusRow){
              for(let i=removedIndices[0]-1;i>=0;i--){
                if(removedSet.has(i)) continue;
                const candidate=beforeRows[i];
                if(candidate && candidate.isConnected && table.contains(candidate) && candidate.cells && candidate.cells.length){ focusRow=candidate; break; }
              }
            }
          }
          if(!focusRow && table.rows.length){ focusRow=table.rows[0]; }
          if(focusRow && focusRow.cells && focusRow.cells.length){ focusTarget=focusRow.cells[0]; }
        }
      }
      let columnsRemoved=false;
      let columnFocusTarget=null;
      let additionalRowsRemoved=0;
      if(!tableRemoved){
        const layout=TableMatrix.read(table);
        if(layout && layout.grid && layout.grid.length){
          const columnCount=layout.grid.reduce(function(max, row){ return row ? Math.max(max, row.length) : max; }, 0);
          if(columnCount>0){
            const deleteColumns=[];
            for(let colIndex=0; colIndex<columnCount; colIndex++){
              const columnCells=new Set();
              for(let rowIndex=0; rowIndex<layout.grid.length; rowIndex++){
                const rowCells=layout.grid[rowIndex];
                if(!rowCells) continue;
                const cell=rowCells[colIndex];
                if(!cell || !table.contains(cell)) continue;
                const row=closestRow(cell);
                if(!row || rowsMarked.has(row)) continue;
                columnCells.add(cell);
              }
              if(!columnCells.size) continue;
              let fullySelected=true;
              columnCells.forEach(function(cell){
                if(!state.cells.has(cell)){ fullySelected=false; }
              });
              if(fullySelected){ deleteColumns.push(colIndex); }
            }
            if(deleteColumns.length){
              deleteColumns.sort(function(a,b){ return a-b; });
              const deleteSet=new Set(deleteColumns);
              const processed=new Set();
              let focusColumnIndex=null;
              deleteColumns.forEach(function(colIndex){
                if(focusColumnIndex===null || colIndex<focusColumnIndex){ focusColumnIndex=colIndex; }
                for(let rowIndex=0; rowIndex<layout.grid.length; rowIndex++){
                  const rowCells=layout.grid[rowIndex];
                  if(!rowCells) continue;
                  const cell=rowCells[colIndex];
                  if(!cell || processed.has(cell) || !table.contains(cell)) continue;
                  const row=closestRow(cell);
                  if(!row || rowsMarked.has(row)) continue;
                  const metrics=layout.cells.get(cell);
                  if(!metrics) continue;
                  let spanCovered=0;
                  for(let c=metrics.colIndex; c<metrics.colIndex+metrics.colSpan; c++){
                    if(deleteSet.has(c)) spanCovered++;
                  }
                  if(spanCovered<=0) continue;
                  if(spanCovered>=metrics.colSpan){
                    if(cell.parentNode){ cell.parentNode.removeChild(cell); }
                    processed.add(cell);
                    columnsRemoved=true;
                    if(row && (!row.cells || !row.cells.length)){
                      rowsMarked.add(row);
                      if(row.parentNode){ row.parentNode.removeChild(row); additionalRowsRemoved++; }
                    }
                  } else {
                    const newSpan=metrics.colSpan-spanCovered;
                    if(newSpan>1){
                      cell.setAttribute("colspan", String(newSpan));
                      cell.colSpan=newSpan;
                    } else {
                      cell.removeAttribute("colspan");
                      cell.colSpan=1;
                    }
                    processed.add(cell);
                    columnsRemoved=true;
                  }
                }
              });
              if(columnsRemoved){
                if(focusTarget && (!focusTarget.isConnected || (table.contains && !table.contains(focusTarget)))){
                  focusTarget=null;
                }
                if(!focusTarget){
                  const updatedLayout=TableMatrix.read(table);
                  if(updatedLayout && updatedLayout.grid){
                    const preferred=[];
                    if(typeof focusColumnIndex==="number"){
                      if(focusColumnIndex>0) preferred.push(focusColumnIndex-1);
                      preferred.push(focusColumnIndex);
                    }
                    const updatedCount=updatedLayout.grid.reduce(function(max, row){ return row ? Math.max(max, row.length) : max; }, 0);
                    for(let i=0;i<updatedCount;i++){
                      if(preferred.indexOf(i)===-1) preferred.push(i);
                    }
                    for(let i=0;i<preferred.length && !columnFocusTarget;i++){
                      const idx=preferred[i];
                      for(let r=0;r<updatedLayout.grid.length;r++){
                        const rowCells=updatedLayout.grid[r];
                        if(!rowCells) continue;
                        const candidate=rowCells[idx];
                        if(candidate && table.contains(candidate)){ columnFocusTarget=candidate; break; }
                      }
                    }
                    if(!columnFocusTarget){
                      for(let r=updatedLayout.grid.length-1;r>=0 && !columnFocusTarget;r--){
                        const rowCells=updatedLayout.grid[r];
                        if(!rowCells) continue;
                        for(let c=rowCells.length-1;c>=0;c--){
                          const candidate=rowCells[c];
                          if(candidate && table.contains(candidate)){ columnFocusTarget=candidate; break; }
                        }
                      }
                    }
                  }
                }
                if(!focusTarget && columnFocusTarget){ focusTarget=columnFocusTarget; }
                if(table.rows && table.rows.length){
                  TableResizer.ensureTable(table);
                }
                if(!table.rows || !table.rows.length){
                  tableRemoved=true;
                  const parent=table.parentNode;
                  if(parent){ parent.removeChild(table); focusTarget=parent; }
                }
              }
            }
          }
        }
      }
      if(!tableRemoved && (!table.rows || !table.rows.length)){
        tableRemoved=true;
        const parent=table.parentNode;
        if(parent){ parent.removeChild(table); focusTarget=parent; }
      }
      if(!tableRemoved && !focusTarget){
        for(let i=0;i<table.rows.length;i++){
          const row=table.rows[i];
          if(row && row.cells && row.cells.length){
            focusTarget=row.cells[0];
            break;
          }
        }
      }
      const uniqueClear=new Set(cellsToClear);
      uniqueClear.forEach(function(cell){
        if(!cell || !table.contains(cell)) return;
        while(cell.firstChild){ cell.removeChild(cell.firstChild); }
        const doc=cell.ownerDocument||document;
        cell.appendChild(doc.createElement("br"));
      });
      Breaks.ensurePlaceholders(state.root);
      clearSelection(state);
      if(focusTarget){
        const tag=(focusTarget.tagName||"").toLowerCase();
        if(tag==="td" || tag==="th"){
          focusCell(focusTarget);
          state.anchor=focusTarget;
        } else if(focusTarget.nodeType===1){
          WDom.placeCaretAtEnd(focusTarget);
          state.anchor=null;
        }
      } else if(uniqueClear.size){
        const lastCell=Array.from(uniqueClear).pop();
        focusCell(lastCell);
        state.anchor=lastCell;
      } else {
        state.anchor=null;
      }
      const target=state.getRecordTarget ? state.getRecordTarget(state.inst) : (state.inst ? state.inst.el : state.root);
      const deletedRows=rowsToDelete.length+additionalRowsRemoved>0;
      const deletedColumns=columnsRemoved;
      const clearedOnly=!deletedRows && !deletedColumns && uniqueClear.size>0;
      const hadClearedCells=uniqueClear.size>0;
      const label=(function(){
        if(tableRemoved) return "Delete Table";
        if(deletedRows && deletedColumns && hadClearedCells) return "Delete Table Rows, Columns, and Clear Cells";
        if(deletedRows && deletedColumns) return "Delete Table Rows and Columns";
        if(deletedRows && hadClearedCells) return "Delete Table Rows and Clear Cells";
        if(deletedRows) return "Delete Table Rows";
        if(deletedColumns && hadClearedCells) return "Delete Table Columns and Clear Cells";
        if(deletedColumns) return "Delete Table Columns";
        if(hadClearedCells) return "Clear Table Cells";
        return "Modify Table";
      })();
      HistoryManager.record(state.inst, target, { label, repeatable:false });
      if(state.onChange) state.onChange(state.inst, target, { tableRemoved, clearedCells:clearedOnly, deletedRows, deletedColumns });
      if(state.inst && OutputBinding && typeof OutputBinding.syncDebounced==="function"){
        OutputBinding.syncDebounced(state.inst);
      }
      return true;
    }
    function handleMouseDown(state, event){
      if(!state || event.button!==0) return;
      const cell=closestCell(state.root, event.target);
      if(event.shiftKey && cell){
        const anchorCell=isValidAnchor(state);
        const anchorTable=tableFromCell(anchorCell);
        const targetTable=tableFromCell(cell);
        if(anchorTable && anchorTable===targetTable){
          const layout=TableMatrix.read(anchorTable);
          const anchorPos=getCellPosition(anchorCell, layout);
          const targetPos=getCellPosition(cell, layout);
          if(anchorPos && targetPos){
            event.preventDefault();
            const rowStart=Math.min(anchorPos.rowIndex, targetPos.rowIndex);
            const rowEnd=Math.max(anchorPos.rowIndex+anchorPos.rowSpan-1, targetPos.rowIndex+targetPos.rowSpan-1);
            const colStart=Math.min(anchorPos.colIndex, targetPos.colIndex);
            const colEnd=Math.max(anchorPos.colIndex+anchorPos.colSpan-1, targetPos.colIndex+targetPos.colSpan-1);
            const selected=collectRangeCells(anchorTable, rowStart, rowEnd, colStart, colEnd, layout);
            setSelectedCells(state, selected, anchorTable);
            state.anchor=anchorCell;
            focusCell(cell);
            return;
          }
        }
      }
      clearSelection(state);
      if(cell){
        state.anchor=cell;
        focusCell(cell);
      } else {
        state.anchor=null;
      }
    }
    function handleKeyDown(state, event){
      if(!state || !event) return;
      const key=String(event.key||"");
      if(key==="Escape"){ if(state.cells && state.cells.size){ clearSelection(state); event.preventDefault(); } return; }
      if(key!=="Backspace" && key!=="Delete") return;
      if(!state.cells.size) return;
      event.preventDefault();
      deleteSelection(state);
    }
    function handleFocusIn(state, event){
      if(!state || !event) return;
      const cell=closestCell(state.root, event.target);
      if(cell){ state.anchor=cell; }
    }
    function attach(inst, options){
      options=options||{};
      const root=options.root || (inst && inst.el) || null;
      if(!root) return;
      if(states.has(root)) return;
      const doc=root.ownerDocument || document;
      ensureStyles(doc);
      const state={
        inst:inst||null,
        root,
        anchor:null,
        cells:new Set(),
        table:null,
        getRecordTarget:typeof options.getRecordTarget==="function" ? options.getRecordTarget : function(){ return inst ? inst.el : root; },
        onChange:typeof options.onChange==="function" ? options.onChange : null
      };
      const onMouseDown=function(ev){ handleMouseDown(state, ev); };
      const onKeyDown=function(ev){ handleKeyDown(state, ev); };
      const onFocusIn=function(ev){ handleFocusIn(state, ev); };
      root.addEventListener("mousedown", onMouseDown);
      root.addEventListener("keydown", onKeyDown);
      root.addEventListener("focusin", onFocusIn);
      states.set(root, { state, handlers:{ onMouseDown, onKeyDown, onFocusIn } });
    }
    function getSelection(inst, ctx){
      const state=resolveState(inst, ctx);
      if(!state) return { table:null, cells:[], anchor:null };
      const table=(state.table && state.table.isConnected && state.root.contains(state.table)) ? state.table : null;
      const cells=table ? Array.from(state.cells).filter(function(cell){ return cell && cell.isConnected && table.contains(cell); }) : [];
      const anchor=isValidAnchor(state);
      return { table, cells, anchor };
    }
    function setSelection(inst, ctx, cells){
      const state=resolveState(inst, ctx);
      if(!state) return;
      const list=Array.isArray(cells) ? cells.filter(function(cell){ return cell && isCellElement(cell); }) : [];
      const table=list.length ? tableFromCell(list[0]) : null;
      setSelectedCells(state, list, table);
      state.anchor=list.length ? list[0] : null;
      if(state.anchor){ focusCell(state.anchor); }
    }
    function clear(inst, ctx){
      const state=resolveState(inst, ctx);
      if(!state) return;
      clearSelection(state);
      state.anchor=null;
    }
    return { attach, getSelection, setSelection, clear };
  })();
  const TableMerge=(function(){
    const BLOCK_TAGS=new Set(["p","div","ul","ol","li","table","thead","tbody","tfoot","tr","td","th","blockquote","h1","h2","h3","h4","h5","h6"]);
    function readCellMetrics(cell){
      if(!cell || cell.nodeType!==1) return null;
      const table=cell.closest ? cell.closest("table") : null;
      if(!table) return null;
      const metrics=TableMatrix.getCellMetrics(table, cell);
      if(!metrics) return null;
      return { cell, table, rowIndex:metrics.rowIndex, colIndex:metrics.colIndex, rowSpan:metrics.rowSpan, colSpan:metrics.colSpan };
    }
    function isBlock(node){
      if(!node || node.nodeType!==1) return false;
      return BLOCK_TAGS.has((node.tagName||"").toLowerCase());
    }
    function appendCellContent(target, source){
      if(!target || !source) return;
      const doc=target.ownerDocument || document;
      const fragment=doc.createDocumentFragment();
      while(source.firstChild){ fragment.appendChild(source.firstChild); }
      if(!fragment.childNodes.length){ return; }
      const needsSeparator=target.childNodes.length && !isBlock(target.lastChild) && !isBlock(fragment.firstChild);
      if(needsSeparator){ target.appendChild(doc.createElement("br")); }
      target.appendChild(fragment);
    }
    function ensureTableReady(table){
      if(TableResizer && typeof TableResizer.ensureTable==="function"){ TableResizer.ensureTable(table); }
    }
    function merge(inst, ctx){
      const selection=TableSelection.getSelection(inst, ctx);
      if(!selection || !selection.table){
        window.alert("Select table cells to merge.");
        return false;
      }
      const metrics=selection.cells.map(readCellMetrics).filter(function(info){ return !!info; });
      if(metrics.length<2){
        window.alert("Select at least two table cells to merge.");
        return false;
      }
      const table=metrics[0].table;
      for(let i=1;i<metrics.length;i++){ if(metrics[i].table!==table){ window.alert("Select cells from the same table to merge."); return false; } }
      metrics.sort(function(a,b){ if(a.rowIndex===b.rowIndex) return a.colIndex-b.colIndex; return a.rowIndex-b.rowIndex; });
      let minRow=metrics[0].rowIndex;
      let maxRow=metrics[0].rowIndex+metrics[0].rowSpan-1;
      let minCol=metrics[0].colIndex;
      let maxCol=metrics[0].colIndex+metrics[0].colSpan-1;
      metrics.forEach(function(info){
        if(info.rowIndex<minRow) minRow=info.rowIndex;
        const rowEnd=info.rowIndex+info.rowSpan-1;
        if(rowEnd>maxRow) maxRow=rowEnd;
        if(info.colIndex<minCol) minCol=info.colIndex;
        const colEnd=info.colIndex+info.colSpan-1;
        if(colEnd>maxCol) maxCol=colEnd;
      });
      const coverage=new Map();
      metrics.forEach(function(info){
        for(let r=info.rowIndex;r<info.rowIndex+info.rowSpan;r++){
          if(!coverage.has(r)) coverage.set(r, new Set());
          const rowSet=coverage.get(r);
          for(let c=info.colIndex;c<info.colIndex+info.colSpan;c++){
            rowSet.add(c);
          }
        }
      });
      for(let r=minRow;r<=maxRow;r++){
        const rowSet=coverage.get(r);
        if(!rowSet){ window.alert("Select a contiguous block of table cells to merge."); return false; }
        for(let c=minCol;c<=maxCol;c++){
          if(!rowSet.has(c)){ window.alert("Select a contiguous block of table cells to merge."); return false; }
        }
      }
      const primary=metrics[0].cell;
      const rowSpan=maxRow-minRow+1;
      const colSpan=maxCol-minCol+1;
      for(let i=1;i<metrics.length;i++){
        const current=metrics[i].cell;
        appendCellContent(primary, current);
        if(current.parentNode){ current.parentNode.removeChild(current); }
      }
      primary.rowSpan=rowSpan;
      primary.colSpan=colSpan;
      if(rowSpan===1){ primary.removeAttribute("rowspan"); }
      if(colSpan===1){ primary.removeAttribute("colspan"); }
      ensureTableReady(table);
      TableSelection.setSelection(inst, ctx, [primary]);
      const target=HistoryManager.resolveTarget(inst, ctx);
      HistoryManager.record(inst, target, { label:"Merge Table Cells", repeatable:false });
      if(OutputBinding && typeof OutputBinding.syncDebounced==="function"){ OutputBinding.syncDebounced(inst); }
      return true;
    }
    return { merge };
  })();
  const ListUI=(function(){
    function ensureListStyles(){
      if(typeof document==="undefined" || !document.head) return;
      if(document.getElementById(LIST_STYLE_DECIMAL_ZERO_STYLE_ID)) return;
      const style=document.createElement("style");
      style.id=LIST_STYLE_DECIMAL_ZERO_STYLE_ID;
      const selector="ol["+LIST_STYLE_ATTR+"=\""+LIST_STYLE_DECIMAL_ZERO+"\"]";
      style.textContent=
        selector+","+selector+" ol{"+
          "list-style:none;"+
          "padding-left:3em;"+
          "counter-reset:item;"+
        "}"+
        selector+" > li,"+selector+" ol > li{"+
          "position:relative;"+
          "margin:0.25em 0;"+
          "padding-left:0.6em;"+
          "counter-increment:item;"+
        "}"+
        selector+" > li::before,"+selector+" ol > li::before{"+
          "position:absolute;"+
          "left:-3em;"+
          "width:2.6em;"+
          "text-align:right;"+
          "font-variant-numeric:tabular-nums;"+
          "white-space:nowrap;"+
        "}"+
        selector+" > li::before{"+
          "content:counter(item) '.0\\00a0';"+
        "}"+
        selector+" ol > li::before{"+
          "content:counters(item,'.') '\\00a0';"+
        "}";
      document.head.appendChild(style);
    }
    ensureListStyles();
    function createSplitButton(options){
      const variant=(options && options.variant) || "default";
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-flex";
      container.style.alignItems="stretch";
      container.style.gap="0";
      container.setAttribute("data-variant", variant);
      const primary=WDom.btn(options.primaryLabel||"", false, options.primaryTitle);
      primary.setAttribute("aria-label", options.primaryAria||options.primaryTitle||options.primaryLabel||"");
      primary.style.display="inline-flex";
      primary.style.alignItems="center";
      primary.style.justifyContent="center";
      primary.style.position="relative";
      primary.style.gap = variant==="compact" ? "0" : "8px";
      primary.style.borderTopRightRadius="0";
      primary.style.borderBottomRightRadius="0";
      primary.style.marginRight="0";
      primary.style.borderRight="0";
      if(variant==="compact"){
        primary.style.padding="0";
        primary.style.width="40px";
        primary.style.minWidth="40px";
        primary.style.height="34px";
      }
      const arrow=WDom.btn("", false, options.menuTitle||"More options");
      const menuLabel=options.menuAria||options.menuTitle||"More options";
      arrow.setAttribute("aria-label", menuLabel);
      arrow.title = menuLabel;
      arrow.setAttribute("aria-haspopup","true");
      arrow.setAttribute("aria-expanded","false");
      arrow.style.display="inline-flex";
      arrow.style.alignItems="center";
      arrow.style.justifyContent="center";
      arrow.style.minWidth = variant==="compact" ? "28px" : "34px";
      arrow.style.padding = variant==="compact" ? "0" : "0 10px";
      arrow.style.fontSize="12px";
      arrow.style.borderTopLeftRadius="0";
      arrow.style.borderBottomLeftRadius="0";
      arrow.style.borderLeft="1px solid "+WCfg.UI.borderSubtle;
      if(variant==="compact"){
        arrow.style.height="34px";
      }
      arrow.textContent="";
      const caret=document.createElement("span");
      caret.textContent="▾";
      caret.setAttribute("aria-hidden","true");
      caret.style.fontSize="12px";
      arrow.appendChild(caret);
      const menu=document.createElement("div");
      menu.style.position="absolute";
      menu.style.top="calc(100% + 6px)";
      menu.style.left="0";
      menu.style.display="none";
      menu.style.flexDirection="column";
      const rawMenuWidth = options && options.menuWidth;
      if(rawMenuWidth){
        menu.style.minWidth = typeof rawMenuWidth === "number" ? rawMenuWidth+"px" : String(rawMenuWidth);
      } else {
        menu.style.minWidth = (variant==="compact"?200:220)+"px";
      }
      menu.style.background="#fff";
      menu.style.border="1px solid "+WCfg.UI.borderSubtle;
      menu.style.borderRadius="8px";
      menu.style.boxShadow="0 8px 20px rgba(0,0,0,.12)";
      menu.style.padding="8px";
      menu.style.zIndex="30";
      menu.setAttribute("role","menu");
      menu.setAttribute("aria-hidden","true");
      const doc=container.ownerDocument || document;
      let open=false;
      function setOpen(state){
        open=state;
        menu.style.display=open?"flex":"none";
        menu.setAttribute("aria-hidden", open?"false":"true");
        arrow.setAttribute("aria-expanded", open?"true":"false");
        if(open){
          doc.addEventListener("mousedown", onDocPointer, true);
          doc.addEventListener("keydown", onDocKey);
        } else {
          doc.removeEventListener("mousedown", onDocPointer, true);
          doc.removeEventListener("keydown", onDocKey);
        }
      }
      function onDocPointer(e){ if(!container.contains(e.target)){ setOpen(false); } }
      function onDocKey(e){ if(e.key==="Escape"){ setOpen(false); arrow.focus(); } }
      let primaryHandler=null;
      function setPrimaryHandler(handler){ primaryHandler = typeof handler==="function" ? handler : null; }
      arrow.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); setOpen(!open); if(open){ window.setTimeout(function(){ const first=menu.querySelector("button"); if(first) first.focus(); },0); } });
      arrow.addEventListener("keydown", function(e){ if(e.key==="ArrowDown" || e.key==="Enter" || e.key===" "){ e.preventDefault(); setOpen(true); const first=menu.querySelector("button"); if(first) first.focus(); } });
      menu.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); arrow.focus(); } });
      primary.addEventListener("click", function(e){
        if(primaryHandler){ primaryHandler(e, { closeMenu:setOpen.bind(null,false) }); }
      });
      container.appendChild(primary);
      container.appendChild(arrow);
      container.appendChild(menu);
      return { container, primary, arrow, menu, setOpen, setPrimaryHandler, variant };
    }
    function createMenuButton(label){
      const btn=document.createElement("button");
      btn.type="button";
      btn.textContent=label;
      btn.style.display="flex";
      btn.style.alignItems="center";
      btn.style.justifyContent="space-between";
      btn.style.gap="12px";
      btn.style.padding="8px 12px";
      btn.style.background="transparent";
      btn.style.border="0";
      btn.style.borderRadius="6px";
      btn.style.cursor="pointer";
      btn.style.font="13px/1.3 Segoe UI,system-ui";
      btn.style.color=WCfg.UI.text;
      btn.addEventListener("mouseenter", function(){ btn.style.background="#f3f2f1"; });
      btn.addEventListener("mouseleave", function(){ btn.style.background="transparent"; });
      return btn;
    }
    function addHiddenLabel(target, text){
      if(!target || !text) return;
      const span=document.createElement("span");
      span.textContent=text;
      span.style.position="absolute";
      span.style.width="1px";
      span.style.height="1px";
      span.style.padding="0";
      span.style.margin="-1px";
      span.style.overflow="hidden";
      span.style.clip="rect(0,0,0,0)";
      span.style.whiteSpace="nowrap";
      span.style.border="0";
      target.appendChild(span);
    }
    function createBulleted(inst, ctx){
      const split=createSplitButton({
        primaryLabel:"Bulleted",
        primaryTitle:"Bulleted List",
        primaryAria:"Bulleted List",
        menuTitle:"Bulleted List styles",
        variant:"compact"
      });
      const { container, primary, menu, setOpen, variant }=split;
      const isCompact=variant==="compact";
      const icon=document.createElement("span");
      icon.textContent="•";
      icon.style.fontSize=isCompact?"18px":"18px";
      icon.style.lineHeight="1";
      icon.setAttribute("aria-hidden","true");
      primary.textContent="";
      primary.appendChild(icon);
      if(isCompact){
        addHiddenLabel(primary, "Bulleted List");
      } else {
        const label=document.createElement("span");
        label.textContent="Bulleted List";
        label.style.fontSize="13px";
        label.style.lineHeight="1";
        primary.style.gap="8px";
        primary.appendChild(label);
      }
      let currentStyle="disc";
      let currentPreview="•";
      function updatePreview(preview){
        currentPreview=preview;
        icon.textContent=preview;
      }
      split.setPrimaryHandler(function(e){ e.preventDefault(); const ok=Formatting.toggleList(inst, ctx, "unordered", currentStyle); if(ok){ OutputBinding.syncDebounced(inst); } });
      const options=[
        { label:"• Disc", style:"disc", preview:"•" },
        { label:"○ Circle", style:"circle", preview:"○" },
        { label:"▪ Square", style:"square", preview:"▪" },
        { label:"Custom bullet…", custom:true }
      ];
      for(let i=0;i<options.length;i++){
        const opt=options[i];
        const btn=createMenuButton(opt.label);
        btn.setAttribute("role","menuitem");
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          let changed=false;
          if(opt.custom){
            const input=window.prompt("Enter custom bullet symbol", currentPreview);
            if(input){
              const cleaned=input.replace(/\s+/g," ").trim();
              if(cleaned){
                changed=Formatting.applyCustomBullet(inst, ctx, cleaned);
                if(changed){ currentStyle='"'+cleaned.replace(/"/g,'\\"')+'"'; updatePreview(cleaned); }
              }
            }
          } else {
            changed=Formatting.applyListStyle(inst, ctx, opt.style, "unordered");
            if(changed){ currentStyle=opt.style; updatePreview(opt.preview); }
          }
          if(changed){ OutputBinding.syncDebounced(inst); }
          setOpen(false);
        });
        menu.appendChild(btn);
      }
      return container;
    }
    function createNumbered(inst, ctx){
      const split=createSplitButton({
        primaryLabel:"Numbered",
        primaryTitle:"Numbered List",
        primaryAria:"Numbered List",
        menuTitle:"Numbered List styles",
        variant:"compact"
      });
      const { container, primary, menu, setOpen, variant }=split;
      const isCompact=variant==="compact";
      const icon=document.createElement("span");
      icon.textContent="1.";
      icon.style.fontSize=isCompact?"16px":"16px";
      icon.style.lineHeight="1";
      icon.style.fontWeight="600";
      icon.setAttribute("aria-hidden","true");
      primary.textContent="";
      primary.appendChild(icon);
      if(isCompact){
        addHiddenLabel(primary, "Numbered List");
      } else {
        const label=document.createElement("span");
        label.textContent="Numbered List";
        label.style.fontSize="13px";
        label.style.lineHeight="1";
        primary.style.gap="8px";
        primary.appendChild(label);
      }
      let currentStyle="decimal";
      function updatePreview(preview){
        const text=preview.length>6 ? preview.slice(0,6)+"…" : preview;
        icon.textContent=text;
      }
      split.setPrimaryHandler(function(e){ e.preventDefault(); const ok=Formatting.toggleList(inst, ctx, "ordered", currentStyle); if(ok){ OutputBinding.syncDebounced(inst); } });
      const options=[
        { label:"1. 2. 3.", style:"decimal", preview:"1." },
        { label:"1.0 2.0 3.0", style:LIST_STYLE_DECIMAL_ZERO, preview:"1.0" },
        { label:"a. b. c.", style:"lower-alpha", preview:"a." },
        { label:"A. B. C.", style:"upper-alpha", preview:"A." },
        { label:"i. ii. iii.", style:"lower-roman", preview:"i." },
        { label:"I. II. III.", style:"upper-roman", preview:"I." },
        { label:"Custom style…", custom:true }
      ];
      for(let i=0;i<options.length;i++){
        const opt=options[i];
        const btn=createMenuButton(opt.label);
        btn.setAttribute("role","menuitem");
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          let changed=false;
          if(opt.custom){
            const value=window.prompt("Enter CSS list-style-type", currentStyle);
            if(value){
              const cleaned=value.trim();
              if(cleaned){
                changed=Formatting.applyListStyle(inst, ctx, cleaned, "ordered");
                if(changed){ currentStyle=cleaned; updatePreview(cleaned); }
              }
            }
          } else {
            changed=Formatting.applyListStyle(inst, ctx, opt.style, "ordered");
            if(changed){ currentStyle=opt.style; updatePreview(opt.preview); }
          }
          if(changed){ OutputBinding.syncDebounced(inst); }
          setOpen(false);
        });
        menu.appendChild(btn);
      }
      return container;
    }
    function createMultilevel(inst, ctx){
      const split=createSplitButton({
        primaryLabel:"Multilevel",
        primaryTitle:"Multilevel List",
        primaryAria:"Multilevel List",
        menuTitle:"Multilevel controls",
        variant:"compact"
      });
      const { container, primary, menu, setOpen, variant }=split;
      const isCompact=variant==="compact";
      const icon=document.createElement("span");
      icon.textContent="1. a. i.";
      icon.style.fontSize=isCompact?"11px":"12px";
      icon.style.lineHeight="1";
      icon.setAttribute("aria-hidden","true");
      primary.textContent="";
      primary.appendChild(icon);
      if(isCompact){
        addHiddenLabel(primary, "Multilevel List");
      } else {
        const label=document.createElement("span");
        label.textContent="Multilevel";
        label.style.fontSize="13px";
        label.style.lineHeight="1";
        primary.style.gap="8px";
        primary.appendChild(label);
      }
      let currentStyle="decimal";
      split.setPrimaryHandler(function(e){ e.preventDefault(); const ok=Formatting.toggleList(inst, ctx, "ordered", currentStyle); if(ok){ OutputBinding.syncDebounced(inst); } });
      const controls=[
        { label:"Increase level", action:function(){ return Formatting.indentList(inst, ctx); } },
        { label:"Decrease level", action:function(){ return Formatting.outdentList(inst, ctx); } },
        { label:"Reset numbering style", action:function(){ return Formatting.applyListStyle(inst, ctx, currentStyle, "ordered"); } }
      ];
      for(let i=0;i<controls.length;i++){
        const item=controls[i];
        const btn=createMenuButton(item.label);
        btn.setAttribute("role","menuitem");
        btn.addEventListener("click", function(e){
          e.preventDefault();
          e.stopPropagation();
          const changed=!!item.action();
          if(changed){ OutputBinding.syncDebounced(inst); }
          setOpen(false);
        });
        menu.appendChild(btn);
      }
      return container;
    }
    return { createBulleted, createNumbered, createMultilevel };
  })();
  const ImageInsertUI=(function(){
    function normalizeAltName(name, fallback){
      if(!name) return fallback;
      const cleaned=name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
      return cleaned || fallback;
    }
    function deriveAltFromURL(url){
      if(!url) return "Inserted image";
      try {
        const parsed=new URL(url, window.location.href);
        const parts=parsed.pathname.split("/").filter(Boolean);
        if(parts.length){ return normalizeAltName(parts[parts.length-1], "Inserted image"); }
      } catch(e){}
      return "Inserted image";
    }
    function focusTarget(target){
      if(!target || typeof target.focus!=="function") return;
      try { target.focus({ preventScroll:true }); }
      catch(err){ target.focus(); }
    }
    function ensureSelection(target, doc){
      let sel=doc.getSelection ? doc.getSelection() : window.getSelection();
      if(!sel || sel.rangeCount===0 || !target.contains(sel.anchorNode)){
        WDom.placeCaretAtEnd(target);
        sel=doc.getSelection ? doc.getSelection() : window.getSelection();
      }
      return sel;
    }
    function insertImage(inst, ctx, src, alt){
      if(!inst || !src) return false;
      const target=(ctx && ctx.area) ? ctx.area : inst.el;
      if(!target) return false;
      const doc=target.ownerDocument || document;
      focusTarget(target);
      const sel=ensureSelection(target, doc);
      if(!sel) return false;
      const range=sel.rangeCount ? sel.getRangeAt(0).cloneRange() : doc.createRange();
      range.collapse(true);
      const img=doc.createElement("img");
      img.src=src;
      if(alt) img.alt=alt;
      img.loading="eager";
      const ctxWidth=(ctx && ctx.area && ctx.area.clientWidth) || 0;
      const targetWidth=(target && target.clientWidth) || 0;
      const instWidth=(inst && inst.el && inst.el.clientWidth) || 0;
      const availableWidth=ctxWidth || targetWidth || instWidth || 0;
      const preferredWidth=Math.max(Math.min((availableWidth||0)*0.6, 640), 280);
      const finalWidth=availableWidth?Math.min(preferredWidth, availableWidth):preferredWidth;
      if(finalWidth && isFinite(finalWidth)) img.style.width=Math.round(finalWidth)+"px";
      img.style.maxWidth="100%";
      img.style.height="auto";
      img.style.display="inline-block";
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      Normalizer.fixStructure(target);
      Breaks.ensurePlaceholders(target);
      ImageTools.attach(target);
      if(target.__weditorSelectImage) target.__weditorSelectImage(img);
      const historyTarget=HistoryManager.resolveTarget(inst, ctx);
      HistoryManager.record(inst, historyTarget, { label:"Insert Image", repeatable:false });
      OutputBinding.syncDebounced(inst);
      const syncAfterLoad=function(){
        ImageTools.capture(img);
        if(inst) OutputBinding.syncDebounced(inst);
        if(ctx && typeof ctx.refreshPreview==="function") ctx.refreshPreview();
      };
      if(img.complete){ syncAfterLoad(); }
      else { img.addEventListener("load", syncAfterLoad, { once:true }); }
      return true;
    }
    function promptForURL(inst, ctx){
      const raw=window.prompt("Enter image URL");
      if(!raw) return;
      const src=raw.trim();
      if(!src) return;
      insertImage(inst, ctx, src, deriveAltFromURL(src));
    }
    function handleFile(inst, ctx, file){
      if(!file) return;
      if(file.type && file.type.indexOf("image/")!==0){
        window.alert("Please choose an image file.");
        return;
      }
      const reader=new FileReader();
      reader.onload=function(){ insertImage(inst, ctx, reader.result, normalizeAltName(file.name||"", "Uploaded image")); };
      reader.readAsDataURL(file);
    }
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-block";
      container.style.minWidth="0";
      container.style.flex="0 0 auto";
      container.style.alignSelf="flex-start";
      container.style.width="auto";
      container.setAttribute("role","group");
      container.setAttribute("aria-label","Insert image");
      const trigger=WDom.btn("Insert Image", false, "Insert image");
      trigger.setAttribute("aria-haspopup","true");
      trigger.setAttribute("aria-expanded","false");
      trigger.style.display="inline-flex";
      trigger.style.alignItems="center";
      trigger.style.justifyContent="center";
      trigger.style.gap="6px";
      trigger.style.padding="8px 14px";
      trigger.style.minWidth="0";
      trigger.style.whiteSpace="nowrap";
      trigger.style.width="auto";
      trigger.textContent="";
      const label=document.createElement("span");
      label.textContent="Insert Image";
      label.style.fontSize="14px";
      const chevron=document.createElement("span");
      chevron.textContent="▼";
      chevron.style.fontSize="11px";
      chevron.style.color=WCfg.UI.textDim;
      chevron.setAttribute("aria-hidden","true");
      trigger.appendChild(label);
      trigger.appendChild(chevron);
      const menu=document.createElement("div");
      menu.style.position="absolute";
      menu.style.top="calc(100% + 6px)";
      menu.style.left="0";
      menu.style.display="none";
      menu.style.flexDirection="column";
      menu.style.background="#fff";
      menu.style.border="1px solid "+WCfg.UI.borderSubtle;
      menu.style.borderRadius="8px";
      menu.style.boxShadow="0 8px 24px rgba(0,0,0,.12)";
      menu.style.minWidth="180px";
      menu.style.padding="8px";
      menu.style.gap="6px";
      menu.setAttribute("role","menu");
      menu.setAttribute("aria-hidden","true");
      const makeMenuButton=function(text, description){
        const btn=WDom.btn(text, false, description);
        btn.style.width="100%";
        btn.style.justifyContent="flex-start";
        btn.style.fontSize="13px";
        btn.style.padding="8px 10px";
        btn.setAttribute("role","menuitem");
        return btn;
      };
      const fileInput=document.createElement("input");
      fileInput.type="file";
      fileInput.accept="image/*";
      fileInput.style.display="none";
      const uploadBtn=makeMenuButton("Upload from device", "Upload an image from your device");
      uploadBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        hideMenu();
        fileInput.click();
      });
      const urlBtn=makeMenuButton("Link from URL", "Insert image from a URL");
      urlBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        hideMenu();
        window.setTimeout(function(){ promptForURL(inst, ctx); }, 0);
      });
      menu.appendChild(uploadBtn);
      menu.appendChild(urlBtn);
      const doc=container.ownerDocument || document;
      let menuOpen=false;
      function showMenu(){
        if(menuOpen) return;
        menuOpen=true;
        menu.style.display="flex";
        menu.setAttribute("aria-hidden","false");
        trigger.setAttribute("aria-expanded","true");
        window.setTimeout(function(){ doc.addEventListener("mousedown", onDocClick, true); doc.addEventListener("keydown", onDocKeyDown, true); }, 0);
      }
      function hideMenu(){
        if(!menuOpen) return;
        menuOpen=false;
        menu.style.display="none";
        menu.setAttribute("aria-hidden","true");
        trigger.setAttribute("aria-expanded","false");
        doc.removeEventListener("mousedown", onDocClick, true);
        doc.removeEventListener("keydown", onDocKeyDown, true);
      }
      function toggleMenu(){ if(menuOpen) hideMenu(); else showMenu(); }
      function onDocClick(ev){
        if(!container.contains(ev.target)){ hideMenu(); }
      }
      function onDocKeyDown(ev){ if(ev.key==="Escape"){ hideMenu(); trigger.focus(); } }
      trigger.addEventListener("click", function(ev){ ev.preventDefault(); toggleMenu(); });
      trigger.addEventListener("keydown", function(ev){
        if(ev.key==="ArrowDown" && !menuOpen){ ev.preventDefault(); showMenu(); uploadBtn.focus(); }
      });
      fileInput.addEventListener("change", function(){
        const file=fileInput.files && fileInput.files[0];
        if(file) handleFile(inst, ctx, file);
        fileInput.value="";
      });
      container.appendChild(trigger);
      container.appendChild(menu);
      container.appendChild(fileInput);
      return container;
    }
    return { create };
  })();
  const FontColorUI=(function(){
    const NO_COLOR_PATTERN="linear-gradient(135deg,#ffffff 45%,"+WCfg.UI.borderSubtle+" 45%,"+WCfg.UI.borderSubtle+" 55%,#ffffff 55%)";
    function normalizeCustomColor(input){
      if(!input) return null;
      let value=input.trim();
      if(!value){ return null; }
      if(/^rgb\s*\(/i.test(value)){
        value=value.replace(/^rgb\s*\(/i,"").replace(/\)$/,"");
      }
      const rgb=value.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
      if(rgb){
        const r=Math.min(255, parseInt(rgb[1],10));
        const g=Math.min(255, parseInt(rgb[2],10));
        const b=Math.min(255, parseInt(rgb[3],10));
        const toHex=function(num){ const h=num.toString(16); return h.length===1?"0"+h:h; };
        return "#"+toHex(r)+toHex(g)+toHex(b);
      }
      const hex=value.charAt(0)==="#" ? value : "#"+value;
      if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)){
        if(hex.length===4){
          return "#"+hex.charAt(1)+hex.charAt(1)+hex.charAt(2)+hex.charAt(2)+hex.charAt(3)+hex.charAt(3);
        }
        return hex.toLowerCase();
      }
      return null;
    }
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-flex";
      container.style.alignItems="center";
      const button=WDom.btn("", false, "Font Color");
      button.setAttribute("title","Font Color");
      button.setAttribute("data-command","format.fontColor");
      button.setAttribute("aria-label","Font Color");
      button.setAttribute("aria-haspopup","true");
      button.setAttribute("aria-expanded","false");
      button.style.display="inline-flex";
      button.style.alignItems="center";
      button.style.justifyContent="center";
      button.style.gap="8px";
      button.style.minWidth="48px";
      button.style.padding="3px 12px";
      const iconWrap=document.createElement("span");
      iconWrap.style.display="flex";
      iconWrap.style.flexDirection="column";
      iconWrap.style.alignItems="center";
      iconWrap.style.lineHeight="1";
      const letter=document.createElement("span");
      letter.textContent="A";
      letter.style.fontSize="18px";
      letter.style.fontWeight="600";
      letter.style.color=WCfg.UI.text;
      letter.setAttribute("aria-hidden","true");
      const underline=document.createElement("span");
      underline.style.marginTop="3px";
      underline.style.width="20px";
      underline.style.height="4px";
      underline.style.borderRadius="4px";
      underline.style.background=Formatting.FONT_COLOR_DEFAULT || WCfg.UI.brand;
      underline.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
      underline.setAttribute("aria-hidden","true");
      iconWrap.appendChild(letter);
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
      palette.style.minWidth="220px";
      palette.style.flexDirection="column";
      palette.style.gap="12px";
      palette.setAttribute("role","menu");
      palette.setAttribute("aria-hidden","true");
      const doc=button.ownerDocument || document;
      const themeColors=Formatting.FONT_THEME_COLORS || [];
      const standardColors=Formatting.FONT_STANDARD_COLORS || [];
      let currentColor;
      if(inst && typeof inst.fontColor!=="undefined"){
        currentColor=inst.fontColor;
      } else if(themeColors.length){
        currentColor=themeColors[0].value;
        if(inst) inst.fontColor=currentColor;
      } else {
        currentColor=Formatting.FONT_COLOR_DEFAULT;
      }
      const colorButtons=[];
      function registerColorButton(value, el){ colorButtons.push({ value, el }); }
      function updateSelectionUI(selected){
        for(let i=0;i<colorButtons.length;i++){
          const entry=colorButtons[i];
          const isActive=selected===entry.value;
          entry.el.style.borderColor = isActive ? WCfg.UI.brand : WCfg.UI.borderSubtle;
          entry.el.style.boxShadow = isActive ? "0 0 0 2px "+WCfg.UI.brand : "none";
        }
      }
      function updatePreview(color){
        if(color){
          underline.style.background=color;
          underline.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
        } else {
          underline.style.background=NO_COLOR_PATTERN;
          underline.style.boxShadow="0 0 0 1px "+WCfg.UI.borderSubtle;
        }
      }
      function pickColor(value){
        setOpen(false);
        let changed=false;
        if(value){
          changed=!!Formatting.applyFontColor(inst, ctx, value);
          if(changed) currentColor=value;
        } else {
          changed=!!Formatting.clearFontColor(inst, ctx);
          if(changed) currentColor=null;
        }
        if(changed){
          updatePreview(currentColor);
          updateSelectionUI(currentColor);
          updateAutomaticState(currentColor);
          const target=HistoryManager.resolveTarget(inst, ctx);
          HistoryManager.record(inst, target, {
            label:value ? "Font Color" : "Clear Font Color",
            repeatable:true,
            repeatId:"fontColor",
            repeatArgs:{ color:value || null },
            repeatLabel:value ? "Font Color" : "Clear Font Color"
          });
          if(inst) OutputBinding.syncDebounced(inst);
        }
      }
      function createSwatch(color){
        const swatch=doc.createElement("button");
        swatch.type="button";
        swatch.setAttribute("role","menuitem");
        swatch.setAttribute("data-color", color.value);
        swatch.setAttribute("aria-label", color.label+" font color");
        swatch.title=color.label;
        swatch.style.width="24px";
        swatch.style.height="24px";
        swatch.style.border="1px solid "+WCfg.UI.borderSubtle;
        swatch.style.borderRadius="4px";
        swatch.style.background=color.value;
        swatch.style.cursor="pointer";
        swatch.style.padding="0";
        swatch.style.display="inline-flex";
        swatch.style.alignItems="center";
        swatch.style.justifyContent="center";
        swatch.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); pickColor(color.value); });
        swatch.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); button.focus(); } });
        registerColorButton(color.value, swatch);
        return swatch;
      }
      function createSection(title, colors){
        if(!colors || !colors.length) return;
        const section=document.createElement("div");
        section.style.display="flex";
        section.style.flexDirection="column";
        section.style.gap="6px";
        const heading=document.createElement("div");
        heading.textContent=title;
        heading.style.font="12px/1.4 Segoe UI,system-ui";
        heading.style.color=WCfg.UI.textDim;
        const grid=document.createElement("div");
        grid.style.display="grid";
        grid.style.gridTemplateColumns="repeat(auto-fill, minmax(24px, 1fr))";
        grid.style.gap="6px";
        for(let i=0;i<colors.length;i++){
          grid.appendChild(createSwatch(colors[i]));
        }
        section.appendChild(heading);
        section.appendChild(grid);
        palette.appendChild(section);
      }
      createSection("Theme Colors", themeColors);
      createSection("Standard Colors", standardColors);
      const automaticBtn=doc.createElement("button");
      automaticBtn.type="button";
      automaticBtn.setAttribute("role","menuitem");
      automaticBtn.textContent="Automatic";
      automaticBtn.setAttribute("aria-label","Use automatic font color");
      automaticBtn.style.padding="6px 8px";
      automaticBtn.style.font="12px/1.4 Segoe UI,system-ui";
      automaticBtn.style.background="#fff";
      automaticBtn.style.border="1px solid "+WCfg.UI.borderSubtle;
      automaticBtn.style.borderRadius="4px";
      automaticBtn.style.cursor="pointer";
      automaticBtn.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); pickColor(null); });
      automaticBtn.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); button.focus(); } });
      function updateAutomaticState(selected){
        const active=selected===null || typeof selected==="undefined";
        automaticBtn.style.borderColor = active ? WCfg.UI.brand : WCfg.UI.borderSubtle;
        automaticBtn.style.boxShadow = active ? "0 0 0 2px "+WCfg.UI.brand : "none";
      }
      palette.appendChild(automaticBtn);
      const moreColorsBtn=doc.createElement("button");
      moreColorsBtn.type="button";
      moreColorsBtn.setAttribute("role","menuitem");
      moreColorsBtn.textContent="More Colors…";
      moreColorsBtn.setAttribute("aria-label","Choose a custom font color");
      moreColorsBtn.style.padding="6px 8px";
      moreColorsBtn.style.font="12px/1.4 Segoe UI,system-ui";
      moreColorsBtn.style.background="#fff";
      moreColorsBtn.style.border="1px solid "+WCfg.UI.borderSubtle;
      moreColorsBtn.style.borderRadius="4px";
      moreColorsBtn.style.cursor="pointer";
      moreColorsBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        const input=window.prompt("Enter a hex value (e.g. #ff0000) or RGB value (e.g. 255,0,0)", currentColor || "#");
        if(input===null) return;
        const normalized=normalizeCustomColor(input);
        if(!normalized){
          window.alert("Please enter a valid hex or RGB color value.");
          return;
        }
        pickColor(normalized);
      });
      moreColorsBtn.addEventListener("keydown", function(e){ if(e.key==="Escape"){ e.preventDefault(); setOpen(false); button.focus(); } });
      palette.appendChild(moreColorsBtn);
      function setOpen(state){
        if(open===state) return;
        open=state;
        button.setAttribute("aria-expanded", state ? "true" : "false");
        if(state){
          palette.style.display="flex";
          palette.setAttribute("aria-hidden","false");
          doc.addEventListener("mousedown", onDocPointer, true);
          doc.addEventListener("keydown", onDocKey);
          window.setTimeout(function(){
            if(doc.activeElement===button){
              const first=palette.querySelector("button");
              if(first) first.focus();
            }
          },0);
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
      updateAutomaticState(currentColor);
      container.appendChild(button);
      container.appendChild(palette);
      return container;
    }
    return { create };
  })();
  const TableBorderUI=(function(){
    const NO_BORDER_PATTERN="linear-gradient(135deg,#ffffff 45%,"+WCfg.UI.borderSubtle+" 45%,"+WCfg.UI.borderSubtle+" 55%,#ffffff 55%)";
    function createActionButton(label){
      const btn=document.createElement("button");
      btn.type="button";
      btn.style.padding="6px 10px";
      btn.style.border="1px solid "+WCfg.UI.borderSubtle;
      btn.style.borderRadius="6px";
      btn.style.background="#fff";
      btn.style.color=WCfg.UI.text;
      btn.style.font="12px/1.4 Segoe UI,system-ui";
      btn.style.cursor="pointer";
      btn.style.display="inline-flex";
      btn.style.alignItems="center";
      btn.style.justifyContent="center";
      btn.style.gap="6px";
      btn.textContent=label;
      btn.setAttribute("data-active","0");
      btn.onmouseenter=function(){ if(btn.getAttribute("data-active")==="1") return; btn.style.background=WCfg.UI.canvas; };
      btn.onmouseleave=function(){ if(btn.getAttribute("data-active")==="1") return; btn.style.background="#fff"; };
      return btn;
    }
    function setActionActive(btn, active){
      if(!btn) return;
      if(active){
        btn.style.background="#e6f2fb";
        btn.style.borderColor=WCfg.UI.brand;
        btn.style.color=WCfg.UI.brand;
        btn.setAttribute("data-active","1");
      } else {
        btn.style.background="#fff";
        btn.style.borderColor=WCfg.UI.borderSubtle;
        btn.style.color=WCfg.UI.text;
        btn.setAttribute("data-active","0");
      }
    }
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-flex";
      container.style.alignItems="center";
      const button=WDom.btn("", false, "Table border color or visibility");
      button.setAttribute("data-command","table.borderColor");
      button.setAttribute("aria-label","Table border color or visibility");
      button.setAttribute("aria-haspopup","true");
      button.setAttribute("aria-expanded","false");
      button.style.display="inline-flex";
      button.style.alignItems="center";
      button.style.gap="8px";
      button.style.padding="6px 12px";
      const label=document.createElement("span");
      label.textContent="Table Border";
      label.style.fontWeight="600";
      label.setAttribute("aria-hidden","true");
      const preview=document.createElement("span");
      preview.style.width="18px";
      preview.style.height="18px";
      preview.style.borderRadius="4px";
      preview.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
      preview.setAttribute("aria-hidden","true");
      const arrow=document.createElement("span");
      arrow.textContent="▼";
      arrow.style.fontSize="11px";
      arrow.style.color=WCfg.UI.textDim;
      arrow.setAttribute("aria-hidden","true");
      button.textContent="";
      button.appendChild(label);
      button.appendChild(preview);
      button.appendChild(arrow);
      const palette=document.createElement("div");
      palette.style.position="absolute";
      palette.style.top="calc(100% + 6px)";
      palette.style.left="0";
      palette.style.display="none";
      palette.style.flexDirection="column";
      palette.style.gap="12px";
      palette.style.background="#fff";
      palette.style.border="1px solid "+WCfg.UI.borderSubtle;
      palette.style.borderRadius="8px";
      palette.style.boxShadow="0 12px 24px rgba(0,0,0,.16)";
      palette.style.padding="12px";
      palette.style.zIndex="25";
      palette.style.minWidth="220px";
      palette.setAttribute("role","menu");
      palette.setAttribute("aria-hidden","true");
      const doc=button.ownerDocument || document;
      const colorButtons=[];
      const actionButtons={ hide:null, standard:null };
      const defaultColor=TableStyler.normalizeColor(WCfg.UI.borderSubtle || "#c8c6c4");
      let cellColor=defaultColor;
      if(inst && Object.prototype.hasOwnProperty.call(inst, "_tableCellBorderColor")){
        if(inst._tableCellBorderColor===null){
          cellColor=null;
        } else {
          cellColor=TableStyler.normalizeColor(inst._tableCellBorderColor) || defaultColor;
        }
      }
      const themeColors=Formatting.FONT_THEME_COLORS || [];
      const standardColors=Formatting.FONT_STANDARD_COLORS || [];
      const cellColorButtons=[];
      let noBorderButton=null;
      let cellColorPreview=null;
      function registerCellColorButton(value, el){ cellColorButtons.push({ value, el }); }
      function updateCellColorSelection(selected){
        for(let i=0;i<cellColorButtons.length;i++){
          const entry=cellColorButtons[i];
          const active=selected && entry.value===selected;
          entry.el.style.borderColor = active ? WCfg.UI.brand : WCfg.UI.borderSubtle;
          entry.el.style.boxShadow = active ? "0 0 0 2px "+WCfg.UI.brand : "none";
        }
        if(noBorderButton){
          const active=!selected;
          noBorderButton.style.borderColor = active ? WCfg.UI.brand : WCfg.UI.borderSubtle;
          noBorderButton.style.boxShadow = active ? "0 0 0 2px "+WCfg.UI.brand : "none";
        }
      }
      function updateCellColorPreview(value){
        if(!cellColorPreview) return;
        if(value){
          cellColorPreview.style.background=value;
          cellColorPreview.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
        } else {
          cellColorPreview.style.background=NO_BORDER_PATTERN;
          cellColorPreview.style.boxShadow="0 0 0 1px "+WCfg.UI.borderSubtle;
        }
      }
      function setCellColor(value, persist){
        if(value===null){
          cellColor=null;
          if(persist!==false && inst) inst._tableCellBorderColor=null;
          updateCellColorSelection(null);
          updateCellColorPreview(null);
          return;
        }
        const normalized=TableStyler.normalizeColor(value);
        if(!normalized) return;
        cellColor=normalized;
        if(persist!==false && inst) inst._tableCellBorderColor=normalized;
        updateCellColorSelection(normalized);
        updateCellColorPreview(normalized);
      }
      function registerColorButton(value, el){ colorButtons.push({ value, el }); }
      function updateSelectionUI(selectedColor, hidden){
        for(let i=0;i<colorButtons.length;i++){
          const entry=colorButtons[i];
          const active=!hidden && selectedColor && entry.value===selectedColor;
          entry.el.style.borderColor = active ? WCfg.UI.brand : WCfg.UI.borderSubtle;
          entry.el.style.boxShadow = active ? "0 0 0 2px "+WCfg.UI.brand : "none";
        }
        setActionActive(actionButtons.hide, !!hidden);
        const isDefault=!hidden && selectedColor && defaultColor && selectedColor===defaultColor;
        setActionActive(actionButtons.standard, !!isDefault);
      }
      function updatePreviewState(state){
        if(!state){
          preview.style.background=WCfg.UI.borderSubtle;
          preview.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
          return;
        }
        if(state.hidden){
          preview.style.background=NO_BORDER_PATTERN;
          preview.style.boxShadow="0 0 0 1px "+WCfg.UI.borderSubtle;
          return;
        }
        if(state.color){
          preview.style.background=state.color;
          preview.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
          return;
        }
        preview.style.background=WCfg.UI.borderSubtle;
        preview.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
      }
      function closePalette(){
        palette.style.display="none";
        palette.setAttribute("aria-hidden","true");
        button.setAttribute("aria-expanded","false");
        doc.removeEventListener("mousedown", onDocClick, true);
        doc.removeEventListener("keydown", onDocKey);
      }
      function applyResult(result, labelText){
        if(!result || !result.changed) return;
        updatePreviewState(result);
        updateSelectionUI(result.color || null, !!result.hidden);
        const target=HistoryManager.resolveTarget(inst, ctx);
        HistoryManager.record(inst, target, { label:labelText, repeatable:false });
        OutputBinding.syncDebounced(inst);
      }
      function setOpen(open){
        if(open){
          const state=TableStyler.getState(inst, ctx);
          if(!state){
            closePalette();
            window.alert("Place the caret inside a table to adjust borders.");
            return;
          }
          updatePreviewState(state);
          updateSelectionUI(state.color || null, !!state.hidden);
          if(state){
            if(state.hidden){ setCellColor(null, false); }
            else if(state.color){ setCellColor(state.color, false); }
          }
          palette.style.display="flex";
          palette.setAttribute("aria-hidden","false");
          button.setAttribute("aria-expanded","true");
          doc.addEventListener("mousedown", onDocClick, true);
          doc.addEventListener("keydown", onDocKey);
        } else {
          closePalette();
        }
      }
      function onDocClick(e){ if(!palette.contains(e.target) && !button.contains(e.target)){ closePalette(); } }
      function onDocKey(e){ if(e.key==="Escape"){ e.preventDefault(); closePalette(); button.focus(); } }
      button.addEventListener("click", function(e){
        e.preventDefault();
        if(palette.style.display==="none" || palette.getAttribute("aria-hidden")==="true") setOpen(true);
        else closePalette();
      });
      const actions=document.createElement("div");
      actions.style.display="flex";
      actions.style.flexDirection="column";
      actions.style.gap="6px";
      const actionsLabel=document.createElement("div");
      actionsLabel.textContent="Quick actions";
      actionsLabel.style.font="11px/1.4 Segoe UI,system-ui";
      actionsLabel.style.color=WCfg.UI.textDim;
      const hideBtn=createActionButton("Hide Borders");
      hideBtn.setAttribute("role","menuitem");
      hideBtn.addEventListener("click", function(e){
        e.preventDefault();
        const result=TableStyler.hideBorders(inst, ctx);
        closePalette();
        applyResult(result, "Hide Table Borders");
      });
      const defaultBtn=createActionButton("Default Border");
      defaultBtn.setAttribute("role","menuitem");
      defaultBtn.addEventListener("click", function(e){
        e.preventDefault();
        const result=TableStyler.applyDefault(inst, ctx);
        closePalette();
        applyResult(result, "Set Table Border Color");
        if(result && result.changed && defaultColor){ setCellColor(defaultColor, true); }
      });
      actions.appendChild(actionsLabel);
      actions.appendChild(hideBtn);
      actions.appendChild(defaultBtn);
      actionButtons.hide=hideBtn;
      actionButtons.standard=defaultBtn;
      const cellSection=document.createElement("div");
      cellSection.style.display="flex";
      cellSection.style.flexDirection="column";
      cellSection.style.gap="6px";
      const cellHeading=document.createElement("div");
      cellHeading.textContent="Cell border";
      cellHeading.style.font="11px/1.4 Segoe UI,system-ui";
      cellHeading.style.color=WCfg.UI.textDim;
      const cellColorHeader=document.createElement("div");
      cellColorHeader.style.display="flex";
      cellColorHeader.style.alignItems="center";
      cellColorHeader.style.gap="8px";
      const cellColorLabel=document.createElement("span");
      cellColorLabel.textContent="Color";
      cellColorLabel.style.font="11px/1.4 Segoe UI,system-ui";
      cellColorLabel.style.color=WCfg.UI.textDim;
      cellColorPreview=document.createElement("span");
      cellColorPreview.style.width="18px";
      cellColorPreview.style.height="18px";
      cellColorPreview.style.borderRadius="4px";
      cellColorPreview.style.boxShadow="0 0 0 1px rgba(0,0,0,.08)";
      cellColorPreview.setAttribute("aria-hidden","true");
      cellColorHeader.appendChild(cellColorLabel);
      cellColorHeader.appendChild(cellColorPreview);
      noBorderButton=doc.createElement("button");
      noBorderButton.type="button";
      noBorderButton.style.width="24px";
      noBorderButton.style.height="24px";
      noBorderButton.style.border="1px solid "+WCfg.UI.borderSubtle;
      noBorderButton.style.borderRadius="4px";
      noBorderButton.style.background=NO_BORDER_PATTERN;
      noBorderButton.style.cursor="pointer";
      noBorderButton.setAttribute("title","Hide cell border");
      noBorderButton.setAttribute("aria-label","Remove color from selected cell border");
      noBorderButton.setAttribute("role","menuitem");
      noBorderButton.addEventListener("click", function(ev){
        ev.preventDefault();
        setCellColor(null, true);
      });
      noBorderButton.addEventListener("keydown", function(ev){
        if(ev.key==="Escape"){ ev.preventDefault(); closePalette(); button.focus(); }
      });
      cellColorHeader.appendChild(noBorderButton);
      const cellColorGrid=document.createElement("div");
      cellColorGrid.style.display="grid";
      cellColorGrid.style.gridTemplateColumns="repeat(auto-fill, minmax(24px, 1fr))";
      cellColorGrid.style.gap="6px";
      const cellColorList=themeColors.concat(standardColors);
      for(let i=0;i<cellColorList.length;i++){
        const entry=cellColorList[i];
        const normalizedValue=TableStyler.normalizeColor(entry.value) || entry.value;
        const swatch=doc.createElement("button");
        swatch.type="button";
        swatch.style.width="24px";
        swatch.style.height="24px";
        swatch.style.border="1px solid "+WCfg.UI.borderSubtle;
        swatch.style.borderRadius="4px";
        swatch.style.background=normalizedValue;
        swatch.style.cursor="pointer";
        swatch.setAttribute("title", (entry.label||"Cell")+" border color");
        swatch.setAttribute("aria-label", "Use "+(entry.label||"cell")+" color for selected cell border");
        swatch.setAttribute("role","menuitem");
        swatch.addEventListener("click", function(ev){
          ev.preventDefault();
          setCellColor(normalizedValue, true);
        });
        swatch.addEventListener("keydown", function(ev){ if(ev.key==="Escape"){ ev.preventDefault(); closePalette(); button.focus(); } });
        registerCellColorButton(normalizedValue, swatch);
        cellColorGrid.appendChild(swatch);
      }
      const cellApplyLabel=document.createElement("div");
      cellApplyLabel.textContent="Apply to";
      cellApplyLabel.style.font="11px/1.4 Segoe UI,system-ui";
      cellApplyLabel.style.color=WCfg.UI.textDim;
      const cellApplyRow=document.createElement("div");
      cellApplyRow.style.display="flex";
      cellApplyRow.style.flexWrap="wrap";
      cellApplyRow.style.gap="6px";
      const cellActions=[
        { label:"All", sides:["top","right","bottom","left"], history:"Set Cell Border Color", historyClear:"Hide Cell Borders", aria:"Apply color to all borders of the selected cell" },
        { label:"Top", sides:["top"], history:"Set Cell Top Border Color", historyClear:"Hide Cell Top Border", aria:"Apply color to the top border of the selected cell" },
        { label:"Right", sides:["right"], history:"Set Cell Right Border Color", historyClear:"Hide Cell Right Border", aria:"Apply color to the right border of the selected cell" },
        { label:"Bottom", sides:["bottom"], history:"Set Cell Bottom Border Color", historyClear:"Hide Cell Bottom Border", aria:"Apply color to the bottom border of the selected cell" },
        { label:"Left", sides:["left"], history:"Set Cell Left Border Color", historyClear:"Hide Cell Left Border", aria:"Apply color to the left border of the selected cell" }
      ];
      for(let i=0;i<cellActions.length;i++){
        const action=cellActions[i];
        const btn=createActionButton(action.label);
        btn.setAttribute("role","menuitem");
        btn.setAttribute("aria-label", action.aria);
        btn.addEventListener("click", function(ev){
          ev.preventDefault();
          if(cellColor===null){
            const result=TableStyler.clearCellBorder(inst, ctx, action.sides);
            if(!result || !result.cell){
              window.alert("Place the caret inside a table cell to adjust its border.");
              return;
            }
            if(!result.changed) return;
            updatePreviewState(TableStyler.getState(inst, ctx));
            const target=HistoryManager.resolveTarget(inst, ctx);
            HistoryManager.record(inst, target, { label:action.historyClear || "Hide Cell Border", repeatable:false });
            OutputBinding.syncDebounced(inst);
            return;
          }
          if(!cellColor){
            window.alert("Select a cell border color first.");
            return;
          }
          const result=TableStyler.applyCellBorder(inst, ctx, cellColor, action.sides);
          if(!result || !result.cell){
            window.alert("Place the caret inside a table cell to adjust its border.");
            return;
          }
          if(!result.changed) return;
          updatePreviewState(TableStyler.getState(inst, ctx));
          const target=HistoryManager.resolveTarget(inst, ctx);
          HistoryManager.record(inst, target, { label:action.history, repeatable:false });
          OutputBinding.syncDebounced(inst);
        });
        cellApplyRow.appendChild(btn);
      }
      cellSection.appendChild(cellHeading);
      cellSection.appendChild(cellColorHeader);
      cellSection.appendChild(cellColorGrid);
      cellSection.appendChild(cellApplyLabel);
      cellSection.appendChild(cellApplyRow);
      function createColorSection(title, colors){
        if(!colors || !colors.length) return null;
        const section=document.createElement("div");
        section.style.display="flex";
        section.style.flexDirection="column";
        section.style.gap="6px";
        const heading=document.createElement("div");
        heading.textContent=title;
        heading.style.font="11px/1.4 Segoe UI,system-ui";
        heading.style.color=WCfg.UI.textDim;
        const grid=document.createElement("div");
        grid.style.display="grid";
        grid.style.gridTemplateColumns="repeat(auto-fill, minmax(24px, 1fr))";
        grid.style.gap="6px";
        for(let i=0;i<colors.length;i++){
          const swatch=doc.createElement("button");
          swatch.type="button";
          swatch.style.width="24px";
          swatch.style.height="24px";
          swatch.style.border="1px solid "+WCfg.UI.borderSubtle;
          swatch.style.borderRadius="4px";
          swatch.style.background=colors[i].value;
          swatch.style.cursor="pointer";
          swatch.setAttribute("title", colors[i].label+" border");
          swatch.setAttribute("aria-label", colors[i].label+" table border");
          swatch.setAttribute("role","menuitem");
          swatch.addEventListener("click", function(ev){
            ev.preventDefault();
            const result=TableStyler.applyColor(inst, ctx, colors[i].value);
            closePalette();
            applyResult(result, "Set Table Border Color");
            if(result && result.changed){ setCellColor(colors[i].value, true); }
          });
          swatch.addEventListener("keydown", function(ev){ if(ev.key==="Escape"){ ev.preventDefault(); closePalette(); button.focus(); } });
          registerColorButton(colors[i].value, swatch);
          grid.appendChild(swatch);
        }
        section.appendChild(heading);
        section.appendChild(grid);
        return section;
      }
      const themeSection=createColorSection("Theme colors", themeColors);
      const standardSection=createColorSection("Standard colors", standardColors);
      palette.appendChild(actions);
      palette.appendChild(cellSection);
      if(themeSection) palette.appendChild(themeSection);
      if(standardSection) palette.appendChild(standardSection);
      palette.addEventListener("click", function(e){ e.stopPropagation(); });
      container.appendChild(button);
      container.appendChild(palette);
      setCellColor(cellColor, false);
      updatePreviewState(TableStyler.getState(inst, ctx));
      return container;
    }
    return { create };
  })();
  const TableCellPaddingUI=(function(){
    const SIDES=[
      { key:"top", label:"Top" },
      { key:"right", label:"Right" },
      { key:"bottom", label:"Bottom" },
      { key:"left", label:"Left" }
    ];
    function createNumberInput(){
      const input=document.createElement("input");
      input.type="number";
      input.inputMode="decimal";
      input.min="0";
      input.max="240";
      input.step="1";
      input.placeholder="--";
      input.style.width="64px";
      input.style.height="28px";
      input.style.padding="4px 6px";
      input.style.border="1px solid "+WCfg.UI.borderSubtle;
      input.style.borderRadius="6px";
      input.style.font="12px/1.4 Segoe UI,system-ui";
      input.style.color=WCfg.UI.text;
      input.style.background="#fff";
      input.style.textAlign="center";
      input.style.boxSizing="border-box";
      input.style.transition="border-color .15s ease, background-color .15s ease, opacity .15s ease";
      return input;
    }
    function formatDisplayValue(value){
      if(typeof value!=="number" || Number.isNaN(value)) return "";
      const rounded=Math.round(value*100)/100;
      if(Math.abs(rounded-Math.round(rounded))<0.01) return String(Math.round(rounded));
      return rounded.toString();
    }
    function parseInputValue(value){
      const raw=value==null?"":String(value).trim();
      if(!raw) return null;
      const num=parseFloat(raw);
      if(Number.isNaN(num) || !Number.isFinite(num)) return undefined;
      return Math.max(0, Math.min(240, Math.round(num*100)/100));
    }
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.display="flex";
      container.style.flexDirection="column";
      container.style.alignItems="flex-start";
      container.style.gap="6px";
      const label=document.createElement("span");
      label.textContent="Cell Padding";
      label.style.font="12px/1.4 Segoe UI,system-ui";
      label.style.color=WCfg.UI.textDim;
      label.setAttribute("aria-hidden","true");
      container.appendChild(label);
      const panel=document.createElement("div");
      panel.style.display="grid";
      panel.style.gridTemplateColumns="minmax(150px, auto) minmax(170px, auto)";
      panel.style.columnGap="12px";
      panel.style.rowGap="8px";
      panel.style.alignItems="start";
      panel.style.padding="8px 10px";
      panel.style.border="1px solid "+WCfg.UI.borderSubtle;
      panel.style.borderRadius="10px";
      panel.style.background="#fff";
      panel.style.boxShadow="0 0 0 1px rgba(0,0,0,0.02)";
      container.appendChild(panel);
      const allRow=document.createElement("div");
      allRow.style.display="flex";
      allRow.style.alignItems="center";
      allRow.style.gap="6px";
      const allLabel=document.createElement("span");
      allLabel.textContent="All";
      allLabel.style.font="11px/1.4 Segoe UI,system-ui";
      allLabel.style.color=WCfg.UI.textDim;
      const allInput=createNumberInput();
      allInput.style.width="72px";
      allInput.setAttribute("aria-label","Set padding on all sides for selected cells");
      const allUnit=document.createElement("span");
      allUnit.textContent="px";
      allUnit.style.font="11px/1.4 Segoe UI,system-ui";
      allUnit.style.color=WCfg.UI.textDim;
      allRow.appendChild(allLabel);
      allRow.appendChild(allInput);
      allRow.appendChild(allUnit);
      const presetRow=document.createElement("div");
      presetRow.style.display="flex";
      presetRow.style.flexWrap="wrap";
      presetRow.style.gap="6px";
      const quickWrap=document.createElement("div");
      quickWrap.style.display="flex";
      quickWrap.style.flexDirection="column";
      quickWrap.style.gap="6px";
      quickWrap.style.alignItems="flex-start";
      quickWrap.style.gridColumn="1";
      quickWrap.appendChild(allRow);
      quickWrap.appendChild(presetRow);
      panel.appendChild(quickWrap);
      const presetButtons=[];
      const presetDefs=[
        { label:"0", value:0, aria:"Apply 0px padding to selected cells" },
        { label:"6", value:6, aria:"Apply 6px padding to selected cells" },
        { label:"12", value:12, aria:"Apply 12px padding to selected cells" },
        { label:"18", value:18, aria:"Apply 18px padding to selected cells" },
        { label:"Clear", value:null, aria:"Remove custom padding for selected cells" }
      ];
      presetDefs.forEach(function(def){
        const btn=document.createElement("button");
        btn.type="button";
        btn.textContent=def.label;
        btn.setAttribute("aria-label", def.aria);
        btn.style.padding="4px 10px";
        btn.style.borderRadius="999px";
        btn.style.border="1px solid transparent";
        btn.style.background="#f3f2f1";
        btn.style.color=WCfg.UI.textDim;
        btn.style.font="11px/1.3 Segoe UI,system-ui";
        btn.style.cursor="pointer";
        btn.style.transition="background .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease";
        btn.setAttribute("data-active","0");
        btn.addEventListener("mouseenter", function(){ if(btn.getAttribute("data-active")!=="1" && !btn.disabled) btn.style.background="#edebe9"; });
        btn.addEventListener("mouseleave", function(){ if(btn.getAttribute("data-active")!=="1") btn.style.background="#f3f2f1"; });
        btn.addEventListener("click", function(ev){
          ev.preventDefault();
          const historyLabel=def.value===null?"Clear Cell Padding":"Set Cell Padding";
          applyPadding({ all:def.value }, historyLabel);
        });
        presetRow.appendChild(btn);
        presetButtons.push({ value:def.value, button:btn });
      });
      const sideGrid=document.createElement("div");
      sideGrid.style.display="grid";
      sideGrid.style.gridTemplateColumns="auto auto auto";
      sideGrid.style.gridAutoRows="auto";
      sideGrid.style.gap="6px 12px";
      sideGrid.style.alignItems="center";
      sideGrid.style.justifyItems="center";
      sideGrid.style.paddingTop="2px";
      sideGrid.style.gridColumn="2";
      sideGrid.style.alignSelf="center";
      const positions={ top:{ row:1, col:2 }, right:{ row:2, col:3 }, bottom:{ row:3, col:2 }, left:{ row:2, col:1 } };
      const sideInputs=[];
      for(let i=0;i<SIDES.length;i++){
        const side=SIDES[i];
        const pos=positions[side.key] || { row:1, col:i+1 };
        const wrap=document.createElement("div");
        wrap.style.display="flex";
        wrap.style.alignItems="center";
        wrap.style.gap="6px";
        wrap.style.gridColumn=String(pos.col);
        wrap.style.gridRow=String(pos.row);
        const sideLabel=document.createElement("span");
        sideLabel.textContent=side.label;
        sideLabel.style.font="11px/1.4 Segoe UI,system-ui";
        sideLabel.style.color=WCfg.UI.textDim;
        const input=createNumberInput();
        input.setAttribute("aria-label","Set "+side.label.toLowerCase()+" padding for selected cells");
        wrap.appendChild(sideLabel);
        wrap.appendChild(input);
        sideGrid.appendChild(wrap);
        sideInputs.push({ key:side.key, label:side.label, input:input, lastValue:null, mode:"auto", placeholderText:"--", titleText:"" });
      }
      const center=document.createElement("div");
      center.style.gridColumn="2";
      center.style.gridRow="2";
      center.style.width="36px";
      center.style.height="36px";
      center.style.border="1px dashed "+WCfg.UI.borderSubtle;
      center.style.borderRadius="8px";
      center.style.display="flex";
      center.style.flexDirection="column";
      center.style.alignItems="center";
      center.style.justifyContent="center";
      center.style.font="10px/1.1 Segoe UI,system-ui";
      center.style.color=WCfg.UI.textDim;
      center.style.textTransform="uppercase";
      center.style.letterSpacing=".08em";
      center.innerHTML="<span>per</span><span>side</span>";
      sideGrid.appendChild(center);
      panel.appendChild(sideGrid);
      const root=(ctx && ctx.area) ? ctx.area : inst ? inst.el : null;
      const doc=root ? root.ownerDocument || document : document;
      let lastAllValue=null;
      let currentAllState={ mode:"auto", placeholder:"--", title:"Select a table cell to adjust padding" };
      let rafId=null;
      function setInputMode(input, mode, placeholder, title){
        input.setAttribute("data-mode", mode||"");
        input.placeholder=placeholder||"";
        if(title){ input.title=title; } else { input.removeAttribute("title"); }
        if(mode==="mixed"){
          input.style.background="#fff7d6";
          input.style.borderColor=WCfg.UI.brand;
        } else if(mode==="auto"){
          input.style.background="#f8f9fb";
          input.style.borderColor=WCfg.UI.borderSubtle;
        } else if(mode==="disabled"){
          input.style.background="#f3f2f1";
          input.style.borderColor=WCfg.UI.borderSubtle;
        } else {
          input.style.background="#fff";
          input.style.borderColor=WCfg.UI.borderSubtle;
        }
      }
      function updatePresetButtons(referenceValue, uniformNumber, uniformClear){
        for(let i=0;i<presetButtons.length;i++){
          const entry=presetButtons[i];
          const btn=entry.button;
          let active=false;
          if(uniformClear && entry.value===null){
            active=true;
          } else if(uniformNumber && entry.value!==null && referenceValue!=null){
            active=Math.abs(entry.value-referenceValue)<0.1;
          }
          btn.setAttribute("data-active", active?"1":"0");
          btn.style.background=active?WCfg.UI.brand:"#f3f2f1";
          btn.style.color=active?"#fff":WCfg.UI.textDim;
          btn.style.borderColor=active?WCfg.UI.brand:"transparent";
        }
      }
      function setDisabled(disabled){
        const inputs=[allInput];
        for(let i=0;i<sideInputs.length;i++){ inputs.push(sideInputs[i].input); }
        inputs.forEach(function(input){
          input.disabled=disabled;
          input.style.opacity=disabled?"0.6":"1";
          input.style.cursor=disabled?"not-allowed":"text";
          if(disabled){
            setInputMode(input, "disabled", input.placeholder, input.title);
          }
        });
        for(let i=0;i<presetButtons.length;i++){
          const btn=presetButtons[i].button;
          btn.disabled=disabled;
          btn.style.opacity=disabled?"0.6":"1";
          btn.style.cursor=disabled?"not-allowed":"pointer";
        }
        panel.style.opacity=disabled?"0.75":"1";
        panel.style.pointerEvents=disabled?"none":"auto";
      }
      function refreshFromSelection(){
        const state=TableStyler.getCellPadding(inst, ctx);
        if(!state){
          lastAllValue=null;
          currentAllState={ mode:"auto", placeholder:"--", title:"Select a table cell to adjust padding" };
          allInput.value="";
          setInputMode(allInput, currentAllState.mode, currentAllState.placeholder, currentAllState.title);
          sideInputs.forEach(function(entry){
            entry.lastValue=null;
            entry.mode="auto";
            entry.placeholderText="--";
            entry.titleText="Select a table cell to adjust padding";
            entry.input.value="";
            setInputMode(entry.input, "auto", entry.placeholderText, entry.titleText);
          });
          updatePresetButtons(null,false,false);
          setDisabled(true);
          return;
        }
        setDisabled(false);
        const padding=state.padding||{};
        const mixed=state.mixed||{};
        let numericReference=null;
        let numericUniform=true;
        let numericCount=0;
        let anyMixed=false;
        let allCleared=true;
        for(let i=0;i<sideInputs.length;i++){
          const entry=sideInputs[i];
          const side=SIDES[i];
          const key=entry.key;
          const value=padding[key];
          const isMixed=!!mixed[key];
          const sideName=side.label.toLowerCase();
          if(isMixed){
            anyMixed=true;
            allCleared=false;
            entry.lastValue=null;
            entry.mode="mixed";
            entry.placeholderText="Mixed";
            entry.titleText="Selected cells have different "+sideName+" padding";
            entry.input.value="";
            setInputMode(entry.input, "mixed", entry.placeholderText, entry.titleText);
          } else if(value===null){
            entry.lastValue=null;
            entry.mode="auto";
            entry.placeholderText="Auto";
            entry.titleText="Selected cells use default "+sideName+" padding";
            entry.input.value="";
            setInputMode(entry.input, "auto", entry.placeholderText, entry.titleText);
          } else {
            allCleared=false;
            entry.lastValue=value;
            entry.mode="value";
            entry.placeholderText="";
            entry.titleText="";
            entry.input.value=formatDisplayValue(value);
            setInputMode(entry.input, "value", "", "");
            if(numericReference===null){
              numericReference=value;
            } else if(Math.abs(value-numericReference)>0.1){
              numericUniform=false;
            }
            numericCount++;
          }
        }
        if(anyMixed){ allCleared=false; }
        const uniformNumber=(numericCount===sideInputs.length) && numericUniform && !anyMixed;
        const uniformClear=allCleared && !anyMixed;
        if(uniformNumber){
          allInput.value=formatDisplayValue(numericReference);
          currentAllState={ mode:"value", placeholder:"", title:"" };
          setInputMode(allInput, currentAllState.mode, currentAllState.placeholder, currentAllState.title);
          lastAllValue=numericReference;
        } else if(uniformClear){
          allInput.value="";
          currentAllState={ mode:"auto", placeholder:"Auto", title:"Selected cells use default table padding" };
          setInputMode(allInput, currentAllState.mode, currentAllState.placeholder, currentAllState.title);
          lastAllValue=null;
        } else if(anyMixed){
          allInput.value="";
          currentAllState={ mode:"mixed", placeholder:"Mixed", title:"Selected cells have different padding values" };
          setInputMode(allInput, currentAllState.mode, currentAllState.placeholder, currentAllState.title);
          lastAllValue=null;
        } else {
          allInput.value="";
          currentAllState={ mode:"custom", placeholder:"Custom", title:"Selected cells use per-side padding" };
          setInputMode(allInput, currentAllState.mode, currentAllState.placeholder, currentAllState.title);
          lastAllValue=null;
        }
        updatePresetButtons(numericReference, uniformNumber, uniformClear);
      }
      function scheduleRefresh(){
        if(typeof window!=="undefined" && typeof window.requestAnimationFrame==="function"){
          if(rafId!==null) return;
          rafId=window.requestAnimationFrame(function(){ rafId=null; refreshFromSelection(); });
        } else {
          if(rafId!==null) return;
          const timeoutFn = typeof setTimeout==="function" ? setTimeout : function(fn){ fn(); return null; };
          rafId=timeoutFn(function(){ rafId=null; refreshFromSelection(); }, 60);
        }
      }
      function applyPadding(values, historyLabel){
        const result=TableStyler.setCellPadding(inst, ctx, values);
        if(!result || !result.cell){
          window.alert("Place the caret inside a table cell to adjust its padding.");
          refreshFromSelection();
          return;
        }
        if(result.changed){
          const target=HistoryManager.resolveTarget(inst, ctx);
          HistoryManager.record(inst, target, { label:historyLabel, repeatable:false });
          OutputBinding.syncDebounced(inst);
        }
        refreshFromSelection();
      }
      function commitAllChange(){
        const parsed=parseInputValue(allInput.value);
        if(typeof parsed==="undefined"){
          if(lastAllValue!=null){
            allInput.value=formatDisplayValue(lastAllValue);
          } else {
            allInput.value="";
          }
          setInputMode(allInput, currentAllState.mode, currentAllState.placeholder, currentAllState.title);
          return;
        }
        const historyLabel = parsed===null ? "Clear Cell Padding" : "Set Cell Padding";
        applyPadding({ all:parsed }, historyLabel);
      }
      function commitSideChange(entry){
        const parsed=parseInputValue(entry.input.value);
        if(typeof parsed==="undefined"){
          if(entry.lastValue!=null){
            entry.input.value=formatDisplayValue(entry.lastValue);
            entry.mode="value";
            entry.placeholderText="";
            entry.titleText="";
            setInputMode(entry.input, "value", "", "");
          } else {
            entry.input.value="";
            setInputMode(entry.input, entry.mode, entry.placeholderText, entry.titleText);
          }
          return;
        }
        const historyLabel = parsed===null ? "Clear "+entry.label+" Cell Padding" : "Set "+entry.label+" Cell Padding";
        const values={};
        values[entry.key]=parsed;
        applyPadding(values, historyLabel);
      }
      allInput.addEventListener("change", commitAllChange);
      allInput.addEventListener("keydown", function(ev){ if(ev.key==="Enter"){ ev.preventDefault(); commitAllChange(); } });
      sideInputs.forEach(function(entry){
        entry.input.addEventListener("change", function(){ commitSideChange(entry); });
        entry.input.addEventListener("keydown", function(ev){ if(ev.key==="Enter"){ ev.preventDefault(); commitSideChange(entry); } });
      });
      if(root){
        root.addEventListener("keyup", scheduleRefresh);
        root.addEventListener("mouseup", scheduleRefresh);
        root.addEventListener("focusin", scheduleRefresh);
      }
      if(doc){
        doc.addEventListener("selectionchange", scheduleRefresh);
      }
      refreshFromSelection();
      return container;
    }
    return { create };
  })();
  const TableCellAlignUI=(function(){
    const OPTIONS=[
      { value:"top", label:"Top", aria:"Align selected cell content to the top", history:"Align Cell Top" },
      { value:"middle", label:"Middle", aria:"Align selected cell content to the middle", history:"Align Cell Middle" },
      { value:"bottom", label:"Bottom", aria:"Align selected cell content to the bottom", history:"Align Cell Bottom" }
    ];
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.display="inline-flex";
      container.style.alignItems="center";
      container.style.gap="8px";
      const label=document.createElement("span");
      label.textContent="Cell Align";
      label.style.font="12px/1.4 Segoe UI,system-ui";
      label.style.color=WCfg.UI.textDim;
      label.setAttribute("aria-hidden","true");
      const group=document.createElement("div");
      group.style.display="inline-flex";
      group.style.border="1px solid "+WCfg.UI.borderSubtle;
      group.style.borderRadius="999px";
      group.style.overflow="hidden";
      group.style.background="#fff";
      const buttons=[];
      function setActive(value){
        for(let i=0;i<buttons.length;i++){
          const entry=buttons[i];
          const active=entry.value===value;
          entry.button.setAttribute("data-active", active?"1":"0");
          entry.button.style.background = active?"#e6f2fb":"transparent";
          entry.button.style.color = active?WCfg.UI.brand:WCfg.UI.textDim;
          entry.button.style.fontWeight = active?"600":"500";
        }
      }
      function refreshFromSelection(){
        const state=TableStyler.getCellAlignment(inst, ctx);
        if(state && state.align){
          setActive(state.align);
        } else {
          setActive(null);
        }
      }
      function applyAlign(option){
        const result=TableStyler.setCellVerticalAlign(inst, ctx, option.value);
        if(!result || !result.cell){
          window.alert("Place the caret inside a table cell to change its alignment.");
          return;
        }
        const alignValue=result && Object.prototype.hasOwnProperty.call(result, "align") ? result.align : option.value;
        setActive(alignValue || null);
        if(result.changed){
          const target=HistoryManager.resolveTarget(inst, ctx);
          HistoryManager.record(inst, target, { label:option.history, repeatable:false });
          OutputBinding.syncDebounced(inst);
        }
      }
      for(let i=0;i<OPTIONS.length;i++){
        const option=OPTIONS[i];
        const btn=document.createElement("button");
        btn.type="button";
        btn.textContent=option.label;
        btn.setAttribute("aria-label", option.aria);
        btn.style.border="0";
        btn.style.background="transparent";
        btn.style.padding="6px 12px";
        btn.style.font="12px/1.4 Segoe UI,system-ui";
        btn.style.color=WCfg.UI.textDim;
        btn.style.cursor="pointer";
        btn.style.transition="background .15s ease, color .15s ease";
        btn.setAttribute("data-active","0");
        btn.addEventListener("mouseenter", function(){ if(btn.getAttribute("data-active")!=="1") btn.style.background="#f3f2f1"; });
        btn.addEventListener("mouseleave", function(){ if(btn.getAttribute("data-active")!=="1") btn.style.background="transparent"; });
        btn.addEventListener("click", function(e){ e.preventDefault(); applyAlign(option); });
        group.appendChild(btn);
        buttons.push({ value:option.value, button:btn });
      }
      const root=(ctx && ctx.area) ? ctx.area : inst ? inst.el : null;
      const doc=root ? root.ownerDocument || document : document;
      let rafId=null;
      function scheduleRefresh(){
        if(typeof window!=="undefined" && typeof window.requestAnimationFrame==="function"){
          if(rafId!==null) return;
          rafId=window.requestAnimationFrame(function(){ rafId=null; refreshFromSelection(); });
        } else {
          if(rafId!==null) return;
          const timeoutFn = typeof setTimeout==="function" ? setTimeout : function(fn){ fn(); return null; };
          rafId=timeoutFn(function(){ rafId=null; refreshFromSelection(); }, 50);
        }
      }
      if(root){
        root.addEventListener("keyup", scheduleRefresh);
        root.addEventListener("mouseup", scheduleRefresh);
        root.addEventListener("focusin", scheduleRefresh);
      }
      if(doc){
        doc.addEventListener("selectionchange", scheduleRefresh);
      }
      container.appendChild(label);
      container.appendChild(group);
      refreshFromSelection();
      return container;
    }
    return { create };
  })();
  const LineSpacingUI=(function(){
    function normalize(value){
      if(value===null || typeof value==="undefined") return null;
      const str=String(value).trim();
      return str?str:null;
    }
    function labelForValue(value, options){
      const normalized=normalize(value);
      if(normalized===null) return "Default";
      for(let i=0;i<options.length;i++){
        if(options[i].value===normalized) return options[i].label;
      }
      return normalized;
    }
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-block";
      const button=WDom.btn("Spacing", false, "Line and Paragraph Spacing");
      button.setAttribute("aria-haspopup","true");
      button.setAttribute("aria-expanded","false");
      button.setAttribute("aria-label","Line and Paragraph Spacing");
      button.style.display="inline-flex";
      button.style.alignItems="center";
      button.style.gap="8px";
      button.style.minWidth="64px";
      button.style.padding="1px 12px";
      button.textContent="";
      const iconWrap=document.createElement("span");
      iconWrap.style.display="grid";
      iconWrap.style.gridTemplateColumns="16px 1fr";
      iconWrap.style.alignItems="center";
      iconWrap.style.gap="6px";
      iconWrap.style.pointerEvents="none";
      const arrows=document.createElement("span");
      arrows.style.display="flex";
      arrows.style.flexDirection="column";
      arrows.style.alignItems="center";
      arrows.style.fontSize="12px";
      arrows.style.lineHeight="1";
      const arrowUp=document.createElement("span"); arrowUp.textContent="↑";
      const arrowDown=document.createElement("span"); arrowDown.textContent="↓";
      arrows.appendChild(arrowUp);
      arrows.appendChild(arrowDown);
      const lines=document.createElement("span");
      lines.style.display="grid";
      lines.style.gap="3px";
      lines.style.width="16px";
      lines.style.pointerEvents="none";
      for(let i=0;i<3;i++){
        const bar=document.createElement("span");
        bar.style.display="block";
        bar.style.height=i===1?"2px":"3px";
        bar.style.borderRadius="999px";
        bar.style.background=WCfg.UI.text;
        lines.appendChild(bar);
      }
      iconWrap.appendChild(arrows);
      iconWrap.appendChild(lines);
      const textWrap=document.createElement("span");
      textWrap.style.display="flex";
      textWrap.style.flexDirection="column";
      textWrap.style.alignItems="flex-start";
      textWrap.style.gap="2px";
      textWrap.style.pointerEvents="none";
      const title=document.createElement("span");
      title.textContent="Spacing";
      title.style.font="12px/1.2 Segoe UI,system-ui";
      title.style.color=WCfg.UI.text;
      const valueLabel=document.createElement("span");
      valueLabel.textContent="Default";
      valueLabel.style.font="11px/1.2 Segoe UI,system-ui";
      valueLabel.style.color=WCfg.UI.textDim;
      textWrap.appendChild(title);
      textWrap.appendChild(valueLabel);
      const caret=document.createElement("span");
      caret.textContent="▼";
      caret.style.fontSize="11px";
      caret.style.color=WCfg.UI.textDim;
      caret.style.pointerEvents="none";
      button.appendChild(iconWrap);
      button.appendChild(textWrap);
      button.appendChild(caret);
      const menu=document.createElement("div");
      menu.style.position="absolute";
      menu.style.top="calc(100% + 6px)";
      menu.style.left="0";
      menu.style.display="none";
      menu.style.flexDirection="column";
      menu.style.minWidth="180px";
      menu.style.background="#fff";
      menu.style.border="1px solid "+WCfg.UI.borderSubtle;
      menu.style.borderRadius="8px";
      menu.style.boxShadow="0 8px 20px rgba(0,0,0,.12)";
      menu.style.padding="8px";
      menu.style.zIndex="24";
      menu.style.gap="4px";
      menu.setAttribute("role","menu");
      menu.setAttribute("aria-hidden","true");
      const baseOptions=(Formatting && Formatting.LINE_SPACING_OPTIONS) ? Formatting.LINE_SPACING_OPTIONS : [];
      const options=[];
      for(let i=0;i<baseOptions.length;i++){
        const item=baseOptions[i];
        options.push({ label:item.label, value:normalize(item.value), hint:null });
      }
      options.push({ label:"Reset", value:null, hint:"Remove custom spacing" });
      const optionButtons=[];
      function updateValueLabel(value){
        valueLabel.textContent=labelForValue(value, options);
      }
      function updateActive(value){
        const normalized=normalize(value);
        for(let i=0;i<optionButtons.length;i++){
          const entry=optionButtons[i];
          const isActive=normalized===entry.value;
          entry.el.setAttribute("aria-checked", isActive?"true":"false");
          entry.el.style.background=isActive?"#f0f6ff":"transparent";
          entry.el.style.borderColor=isActive?WCfg.UI.brand:"transparent";
        }
      }
      let open=false;
      let currentValue=null;
      function setOpen(state){
        if(open===state) return;
        open=state;
        button.setAttribute("aria-expanded", open?"true":"false");
        menu.style.display=open?"flex":"none";
        menu.setAttribute("aria-hidden", open?"false":"true");
        caret.textContent=open?"▲":"▼";
        const doc=button.ownerDocument || document;
        if(open){
          currentValue=Formatting.getLineSpacing(inst, ctx);
          updateValueLabel(currentValue);
          updateActive(currentValue);
          doc.addEventListener("mousedown", onDocPointer, true);
          doc.addEventListener("keydown", onDocKey);
          window.setTimeout(function(){ const first=menu.querySelector("button"); if(first) first.focus(); },0);
        } else {
          doc.removeEventListener("mousedown", onDocPointer, true);
          doc.removeEventListener("keydown", onDocKey);
        }
      }
      function onDocPointer(ev){ if(!container.contains(ev.target)){ setOpen(false); } }
      function onDocKey(ev){ if(ev.key==="Escape"){ ev.preventDefault(); setOpen(false); button.focus(); } }
      function choose(option, event){
        if(event){ event.preventDefault(); event.stopPropagation(); }
        const value=option.value;
        let changed=false;
        if(value===null){
          changed=!!Formatting.clearLineSpacing(inst, ctx);
        } else {
          changed=!!Formatting.applyLineSpacing(inst, ctx, value);
        }
        setOpen(false);
        if(!changed && value!==currentValue){
          currentValue=value;
          updateValueLabel(currentValue);
          updateActive(currentValue);
        }
        if(!changed) return;
        currentValue=value;
        updateValueLabel(currentValue);
        updateActive(currentValue);
        const target=HistoryManager.resolveTarget(inst, ctx);
        const historyLabel=value===null?"Line Spacing Default":"Line Spacing "+option.label;
        HistoryManager.record(inst, target, {
          label:historyLabel,
          repeatable:true,
          repeatId:"lineSpacing",
          repeatArgs:{ value:value===null?null:value },
          repeatLabel:"Line Spacing"
        });
        if(inst) OutputBinding.syncDebounced(inst);
      }
      for(let i=0;i<options.length;i++){
        const option=options[i];
        const optBtn=document.createElement("button");
        optBtn.type="button";
        optBtn.setAttribute("role","menuitemradio");
        optBtn.setAttribute("aria-checked","false");
        optBtn.setAttribute("data-value", option.value===null?"":option.value);
        optBtn.style.display="flex";
        optBtn.style.flexDirection="column";
        optBtn.style.alignItems="flex-start";
        optBtn.style.gap="2px";
        optBtn.style.width="100%";
        optBtn.style.padding="6px 10px";
        optBtn.style.borderRadius="6px";
        optBtn.style.border="1px solid transparent";
        optBtn.style.background="transparent";
        optBtn.style.cursor="pointer";
        optBtn.style.font="12px/1.3 Segoe UI,system-ui";
        optBtn.style.color=WCfg.UI.text;
        const optLabel=document.createElement("span");
        optLabel.textContent=option.label;
        optLabel.style.fontWeight="600";
        optLabel.style.color=WCfg.UI.text;
        const optHint=document.createElement("span");
        optHint.textContent=option.hint || (option.value ? option.value+" × line height" : "Restore default spacing");
        optHint.style.fontSize="11px";
        optHint.style.color=WCfg.UI.textDim;
        optBtn.appendChild(optLabel);
        optBtn.appendChild(optHint);
        optBtn.addEventListener("click", function(ev){ choose(option, ev); });
        optBtn.addEventListener("keydown", function(ev){ if(ev.key==="Escape"){ ev.preventDefault(); setOpen(false); button.focus(); } });
        optionButtons.push({ value:option.value, el:optBtn });
        menu.appendChild(optBtn);
      }
      button.addEventListener("click", function(ev){ ev.preventDefault(); ev.stopPropagation(); setOpen(!open); });
      button.addEventListener("keydown", function(ev){
        if(ev.key==="ArrowDown" || ev.key==="Enter" || ev.key===" "){
          ev.preventDefault();
          setOpen(true);
        }
      });
      menu.addEventListener("click", function(ev){ ev.stopPropagation(); });
      container.appendChild(button);
      container.appendChild(menu);
      return container;
    }
    return { create };
  })();
  const HighlightUI=(function(){
    const NO_COLOR_PATTERN="linear-gradient(135deg,#ffffff 45%,#d13438 45%,#d13438 55%,#ffffff 55%)";
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-flex";
      container.style.alignItems="center";
      const button=WDom.btn("", false, "Text Highlight Color");
      button.setAttribute("title","Text Highlight Color");
      button.setAttribute("data-command","format.highlight");
      button.setAttribute("aria-label","Text Highlight Color");
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
      palette.style.gridTemplateColumns="repeat(4, 28px)";
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
          const target=HistoryManager.resolveTarget(inst, ctx);
          HistoryManager.record(inst, target, {
            label:value ? "Highlight" : "Remove Highlight",
            repeatable:true,
            repeatId:"highlight",
            repeatArgs:{ color:value || null },
            repeatLabel:value ? "Highlight" : "Remove Highlight"
          });
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
  const ShadingUI=(function(){
    const NO_COLOR_PATTERN="linear-gradient(135deg,#ffffff 45%,#c8c6c4 45%,#c8c6c4 55%,#ffffff 55%)";
    function create(inst, ctx){
      const container=document.createElement("div");
      container.style.position="relative";
      container.style.display="inline-flex";
      container.style.alignItems="center";
      const button=WDom.btn("Shading", false, "Shading background color");
      button.setAttribute("data-command","format.shading");
      button.setAttribute("aria-haspopup","true");
      button.setAttribute("aria-expanded","false");
      button.setAttribute("aria-label","Shading");
      button.style.display="inline-flex";
      button.style.alignItems="center";
      button.style.justifyContent="center";
      button.style.gap="8px";
      button.style.padding="6px 14px";
      button.style.minWidth="0";
      const preview=document.createElement("span");
      preview.style.width="18px";
      preview.style.height="18px";
      preview.style.borderRadius="4px";
      preview.style.border="1px solid "+WCfg.UI.borderSubtle;
      preview.style.boxShadow="inset 0 0 0 1px rgba(0,0,0,.04)";
      preview.setAttribute("aria-hidden","true");
      const label=document.createElement("span");
      label.textContent="Shading";
      label.style.fontSize="13px";
      label.style.lineHeight="1";
      const arrow=document.createElement("span");
      arrow.textContent="▼";
      arrow.setAttribute("aria-hidden","true");
      arrow.style.fontSize="11px";
      arrow.style.color=WCfg.UI.textDim;
      button.textContent="";
      button.appendChild(preview);
      button.appendChild(label);
      button.appendChild(arrow);
      const menu=document.createElement("div");
      menu.style.position="absolute";
      menu.style.top="calc(100% + 6px)";
      menu.style.left="0";
      menu.style.display="none";
      menu.style.flexDirection="column";
      menu.style.background="#fff";
      menu.style.border="1px solid "+WCfg.UI.borderSubtle;
      menu.style.borderRadius="8px";
      menu.style.boxShadow="0 8px 24px rgba(0,0,0,.12)";
      menu.style.padding="12px";
      menu.style.gap="10px";
      menu.style.minWidth="220px";
      menu.style.zIndex="30";
      menu.setAttribute("role","menu");
      menu.setAttribute("aria-hidden","true");
      const doc=button.ownerDocument || document;
      const colors=Formatting.SHADING_STANDARD_COLORS || [];
      let currentColor=null;
      if(inst){
        if(typeof inst.shadingColor!=="undefined"){
          currentColor=inst.shadingColor;
        }
      } else if(colors.length){
        currentColor=colors[0].value;
      }
      function updatePreview(color){
        if(color){
          preview.style.background=color;
          preview.style.borderColor=WCfg.UI.borderSubtle;
        } else {
          preview.style.background=NO_COLOR_PATTERN;
          preview.style.borderColor=WCfg.UI.borderSubtle;
        }
      }
      const colorButtons=[];
      function updateColorSelection(active){
        for(let i=0;i<colorButtons.length;i++){
          const entry=colorButtons[i];
          const isActive=active && active.toLowerCase()===entry.value.toLowerCase();
          entry.el.style.borderColor = isActive ? WCfg.UI.brand : WCfg.UI.borderSubtle;
          entry.el.style.boxShadow = isActive ? "0 0 0 2px "+WCfg.UI.brand : "none";
          entry.el.setAttribute("aria-checked", isActive?"true":"false");
        }
      }
      let open=false;
      function setOpen(state){
        if(open===state) return;
        open=state;
        menu.style.display=open?"flex":"none";
        menu.setAttribute("aria-hidden", open?"false":"true");
        button.setAttribute("aria-expanded", open?"true":"false");
        if(open){
          doc.addEventListener("mousedown", onDocPointer, true);
          doc.addEventListener("keydown", onDocKey);
        } else {
          doc.removeEventListener("mousedown", onDocPointer, true);
          doc.removeEventListener("keydown", onDocKey);
        }
      }
      function onDocPointer(ev){
        if(!open) return;
        if(container.contains(ev.target)){ return; }
        setOpen(false);
      }
      function onDocKey(ev){
        if(ev.key==="Escape"){ setOpen(false); button.focus(); }
      }
      function recordChange(labelText, repeatArgs){
        const target=HistoryManager.resolveTarget(inst, ctx);
        HistoryManager.record(inst, target, {
          label:labelText,
          repeatable:true,
          repeatId:"shading",
          repeatArgs:repeatArgs,
          repeatLabel:labelText
        });
        if(inst){ OutputBinding.syncDebounced(inst); }
      }
      function applyColor(value){
        const changed=Formatting.applyShading(inst, ctx, value);
        if(changed){
          currentColor=value;
          updatePreview(currentColor);
          updateColorSelection(currentColor);
          updateNoColorState();
          recordChange("Shading", { color:value });
        }
      }
      function clearColor(){
        const changed=Formatting.clearShading(inst, ctx);
        if(changed){
          currentColor=null;
          updatePreview(currentColor);
          updateColorSelection("");
          updateNoColorState();
          recordChange("Remove Shading", { color:null });
        }
      }
      function updateNoColorState(){
        if(!noColorBtn) return;
        const active=!currentColor;
        noColorBtn.setAttribute("aria-pressed", active?"true":"false");
        noColorBtn.style.background = active?"#f3f2f1":"#fff";
        noColorBtn.style.borderColor = active?WCfg.UI.brand:WCfg.UI.borderSubtle;
      }
      const heading=document.createElement("div");
      heading.textContent="Standard Colors";
      heading.style.font="12px/1.4 Segoe UI,system-ui";
      heading.style.color=WCfg.UI.textDim;
      const grid=document.createElement("div");
      grid.style.display="grid";
      grid.style.gridTemplateColumns="repeat(5, 28px)";
      grid.style.gap="6px";
      grid.setAttribute("role","none");
      for(let i=0;i<colors.length;i++){
        const entry=colors[i];
        const swatch=doc.createElement("button");
        swatch.type="button";
        swatch.setAttribute("role","menuitemradio");
        swatch.setAttribute("aria-checked","false");
        swatch.setAttribute("aria-label", entry.label+" shading");
        swatch.title=entry.label;
        swatch.style.width="28px";
        swatch.style.height="28px";
        swatch.style.border="1px solid "+WCfg.UI.borderSubtle;
        swatch.style.borderRadius="4px";
        swatch.style.background=entry.value;
        swatch.style.cursor="pointer";
        swatch.style.padding="0";
        swatch.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          setOpen(false);
          applyColor(entry.value);
        });
        swatch.addEventListener("keydown", function(ev){ if(ev.key==="Escape"){ ev.preventDefault(); setOpen(false); button.focus(); } });
        colorButtons.push({ value:entry.value, el:swatch });
        grid.appendChild(swatch);
      }
      const actions=document.createElement("div");
      actions.style.display="flex";
      actions.style.flexDirection="column";
      actions.style.gap="6px";
      function createActionButton(text){
        const btn=WDom.btn(text, false, text);
        btn.style.width="100%";
        btn.style.justifyContent="center";
        btn.style.fontSize="13px";
        btn.style.padding="8px 10px";
        return btn;
      }
      const noColorBtn=createActionButton("No Color");
      noColorBtn.setAttribute("role","menuitem");
      noColorBtn.setAttribute("aria-pressed","false");
      noColorBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        setOpen(false);
        clearColor();
      });
      const moreColorBtn=createActionButton("More Color");
      moreColorBtn.setAttribute("role","menuitem");
      moreColorBtn.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        setOpen(false);
        const initial=currentColor || "#";
        const input=window.prompt("Enter a hex color (e.g. #dddddd)", initial);
        if(!input){ return; }
        const normalized=Formatting.normalizeShadingColor(input);
        if(!normalized){
          window.alert("Please enter a valid hex color like #dddddd.");
          return;
        }
        applyColor(normalized);
      });
      actions.appendChild(noColorBtn);
      actions.appendChild(moreColorBtn);
      menu.appendChild(heading);
      menu.appendChild(grid);
      menu.appendChild(actions);
      button.addEventListener("click", function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        setOpen(!open);
      });
      button.addEventListener("keydown", function(ev){
        if(ev.key==="ArrowDown" || ev.key==="Enter" || ev.key===" "){
          ev.preventDefault();
          setOpen(true);
        }
      });
      menu.addEventListener("mousedown", function(ev){ ev.stopPropagation(); });
      menu.addEventListener("click", function(ev){ ev.stopPropagation(); });
      updatePreview(currentColor);
      updateColorSelection(currentColor);
      updateNoColorState();
      container.appendChild(button);
      container.appendChild(menu);
      return container;
    }
    return { create };
  })();
  function decorateAlignButton(btn, align){
    if(!btn) return;
    const mode=(align||"").toLowerCase();
    btn.textContent="";
    btn.style.display="inline-flex";
    btn.style.alignItems="center";
    btn.style.justifyContent="center";
    btn.style.minWidth="36px";
    btn.style.padding="8px 10px";
    const icon=document.createElement("span");
    icon.setAttribute("aria-hidden","true");
    icon.style.display="grid";
    icon.style.width="18px";
    icon.style.gap="3px";
    icon.style.justifyItems = mode==="right" ? "end" : mode==="center" ? "center" : mode==="justify" ? "stretch" : "start";
    const barWidths = mode==="justify" ? [100,100,100] : [100,70,90];
    for(let i=0;i<barWidths.length;i++){
      const bar=document.createElement("span");
      bar.style.display="block";
      bar.style.height="3px";
      bar.style.borderRadius="999px";
      bar.style.background=WCfg.UI.text;
      bar.style.width = mode==="justify" ? "100%" : barWidths[i]+"%";
      icon.appendChild(bar);
    }
    btn.appendChild(icon);
  }
  function decorateIndentButton(btn, direction){
    if(!btn) return;
    const dir=(direction||"").toLowerCase();
    const isIncrease=dir==="increase" || dir==="right";
    btn.textContent="";
    btn.style.display="inline-flex";
    btn.style.alignItems="center";
    btn.style.justifyContent="center";
    btn.style.minWidth="36px";
    btn.style.padding="8px 10px";
    const icon=document.createElement("span");
    icon.setAttribute("aria-hidden","true");
    icon.style.display="grid";
    icon.style.gridAutoFlow="column";
    icon.style.alignItems="center";
    icon.style.gap="6px";
    const arrow=document.createElement("span");
    arrow.textContent=isIncrease?"→":"←";
    arrow.style.fontSize="16px";
    arrow.style.lineHeight="1";
    arrow.style.color=WCfg.UI.brand;
    arrow.style.display="flex";
    arrow.style.alignItems="center";
    arrow.style.justifyContent="center";
    const lines=document.createElement("span");
    lines.style.display="grid";
    lines.style.gap="3px";
    lines.style.width="16px";
    lines.style.justifyItems=isIncrease?"end":"start";
    const widths=isIncrease?[60,80,100]:[100,80,60];
    for(let i=0;i<widths.length;i++){
      const bar=document.createElement("span");
      bar.style.display="block";
      bar.style.height="3px";
      bar.style.borderRadius="999px";
      bar.style.background=WCfg.UI.text;
      bar.style.width=widths[i]+"%";
      lines.appendChild(bar);
    }
    if(isIncrease){
      icon.appendChild(lines);
      icon.appendChild(arrow);
    } else {
      icon.appendChild(arrow);
      icon.appendChild(lines);
    }
    btn.appendChild(icon);
  }
  const Commands={
    "history.undo":{
      kind:"custom",
      ariaLabel:"Undo (Ctrl+Z / Cmd+Z)",
      render:function(inst, ctx){ return HistoryUI.createUndo(inst, ctx); }
    },
    "history.redo":{
      kind:"custom",
      ariaLabel:"Redo or Repeat (Ctrl+Y / Cmd+Y / F4)",
      render:function(inst, ctx){ return HistoryUI.createRedo(inst, ctx); }
    },
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
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Font Family",
          repeatable:true,
          repeatId:"fontFamily",
          repeatArgs:{ value:value },
          repeatLabel:"Font Family"
        });
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
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Font Size",
          repeatable:true,
          repeatId:"fontSize",
          repeatArgs:{ value:value },
          repeatLabel:"Font Size"
        });
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.blockStyle":{
      label:"Heading",
      kind:"select",
      ariaLabel:"Select paragraph style",
      placeholder:"Heading",
      options:Formatting.BLOCK_FORMATS.map(function(item){ return { label:item.label, value:item.value }; }),
      getValue:function(inst, ctx){ return Formatting.getBlockFormat(inst, ctx); },
      run:function(inst, arg){
        const value=(arg && arg.value) || (arg && arg.event && arg.event.target && arg.event.target.value);
        if(!value) return;
        const applied=Formatting.applyBlockFormat(inst, arg && arg.ctx, value);
        if(!applied) return;
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Paragraph Style",
          repeatable:true,
          repeatId:"blockStyle",
          repeatArgs:{ value:value },
          repeatLabel:"Paragraph Style"
        });
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
      decorate:function(btn){ btn.style.textDecoration="underline"; btn.style.textDecorationThickness="2px"; },
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
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Underline Style",
          repeatable:true,
          repeatId:"underlineStyle",
          repeatArgs:{ style:value },
          repeatLabel:"Underline Style"
        });
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.bulletedList":{
      kind:"custom",
      ariaLabel:"Bulleted List",
      render:function(inst, ctx){ return ListUI.createBulleted(inst, ctx); }
    },
    "format.numberedList":{
      kind:"custom",
      ariaLabel:"Numbered List",
      render:function(inst, ctx){ return ListUI.createNumbered(inst, ctx); }
    },
    "format.multilevelList":{
      kind:"custom",
      ariaLabel:"Multilevel List",
      render:function(inst, ctx){ return ListUI.createMultilevel(inst, ctx); }
    },
    "format.fontColor":{
      kind:"custom",
      ariaLabel:"Font Color",
      render:function(inst, ctx){ return FontColorUI.create(inst, ctx); }
    },
    "format.highlight":{
      kind:"custom",
      ariaLabel:"Text Highlight Color",
      render:function(inst, ctx){ return HighlightUI.create(inst, ctx); }
    },
    "format.shading":{
      kind:"custom",
      ariaLabel:"Shading",
      render:function(inst, ctx){ return ShadingUI.create(inst, ctx); }
    },
    "format.alignLeft":{
      label:"Left",
      kind:"button",
      ariaLabel:"Align Left",
      title:"Align Left",
      decorate:function(btn){ decorateAlignButton(btn, "left"); },
      run:function(inst, arg){ Formatting.applyAlign(inst, arg && arg.ctx, "left"); OutputBinding.syncDebounced(inst); }
    },
    "format.alignCenter":{
      label:"Center",
      kind:"button",
      ariaLabel:"Align Center",
      title:"Align Center",
      decorate:function(btn){ decorateAlignButton(btn, "center"); },
      run:function(inst, arg){ Formatting.applyAlign(inst, arg && arg.ctx, "center"); OutputBinding.syncDebounced(inst); }
    },
    "format.alignRight":{
      label:"Right",
      kind:"button",
      ariaLabel:"Align Right",
      title:"Align Right",
      decorate:function(btn){ decorateAlignButton(btn, "right"); },
      run:function(inst, arg){ Formatting.applyAlign(inst, arg && arg.ctx, "right"); OutputBinding.syncDebounced(inst); }
    },
    "format.alignJustify":{
      label:"Justify",
      kind:"button",
      ariaLabel:"Justify",
      title:"Justify",
      decorate:function(btn){ decorateAlignButton(btn, "justify"); },
      run:function(inst, arg){ Formatting.applyAlign(inst, arg && arg.ctx, "justify"); OutputBinding.syncDebounced(inst); }
    },
    "format.lineSpacing":{
      kind:"custom",
      ariaLabel:"Line and Paragraph Spacing",
      render:function(inst, ctx){ return LineSpacingUI.create(inst, ctx); }
    },
    "format.decreaseIndent":{
      label:"←",
      kind:"button",
      ariaLabel:"Decrease Indent",
      title:"Decrease Indent ← Moves the entire paragraph closer to the left margin.",
      decorate:function(btn){ decorateIndentButton(btn, "decrease"); },
      run:function(inst, arg){
        const changed=Formatting.outdentList(inst, arg && arg.ctx);
        if(!changed) return;
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Decrease Indent",
          repeatable:true,
          repeatId:"outdent",
          repeatLabel:"Decrease Indent"
        });
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.increaseIndent":{
      label:"→",
      kind:"button",
      ariaLabel:"Increase Indent",
      title:"Increase Indent → Moves the paragraph further from the left margin.",
      decorate:function(btn){ decorateIndentButton(btn, "increase"); },
      run:function(inst, arg){
        const changed=Formatting.indentList(inst, arg && arg.ctx);
        if(!changed) return;
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Increase Indent",
          repeatable:true,
          repeatId:"indent",
          repeatLabel:"Increase Indent"
        });
        OutputBinding.syncDebounced(inst);
      }
    },
    "format.strike":{
      label:"ab",
      kind:"button",
      ariaLabel:"Strikethrough",
      title:"Strikethrough",
      decorate:function(btn){ btn.style.textDecoration="line-through"; btn.style.textDecorationThickness="2px"; },
      run:function(inst, arg){ Formatting.applySimple(inst, arg && arg.ctx, "strikeThrough"); OutputBinding.syncDebounced(inst); }
    },
    "format.clearFormatting":{
      label:"Clear",
      kind:"button",
      ariaLabel:"Clear All Formatting",
      title:"Clear all formatting",
      run:function(inst, arg){
        const changed=Formatting.clearAllFormatting(inst, arg && arg.ctx);
        if(!changed) return;
        const target=HistoryManager.resolveTarget(inst, arg && arg.ctx);
        HistoryManager.record(inst, target, {
          label:"Clear Formatting",
          repeatable:false
        });
        OutputBinding.syncDebounced(inst);
      }
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
    "insert.image":{ kind:"custom", ariaLabel:"Insert image", render:function(inst, ctx){ return ImageInsertUI.create(inst, ctx); } },
    "insert.table":{ label:"Insert Table", kind:"button", ariaLabel:"Insert table",
      run:function(inst, arg){
        const target=(arg && arg.ctx && arg.ctx.area) ? arg.ctx.area : inst.el;
        if(!target) return;
        try{ target.focus({ preventScroll:true }); }
        catch(err){ if(typeof target.focus==="function") target.focus(); }
        const colInput=window.prompt("Enter number of columns", "3");
        if(colInput===null) return;
        const cols=parseInt(colInput, 10);
        if(!cols || cols<1 || cols>12){ window.alert("Please enter a whole number of columns between 1 and 12."); return; }
        const rowInput=window.prompt("Enter number of rows", "3");
        if(rowInput===null) return;
        const rows=parseInt(rowInput, 10);
        if(!rows || rows<1 || rows>20){ window.alert("Please enter a whole number of rows between 1 and 20."); return; }
        const doc=target.ownerDocument || document;
        const win=doc.defaultView || window;
        let sel=win.getSelection ? win.getSelection() : window.getSelection();
        if(!sel || sel.rangeCount===0 || !target.contains(sel.anchorNode)){
          WDom.placeCaretAtEnd(target);
          sel=win.getSelection ? win.getSelection() : window.getSelection();
        }
        const baseRange=(sel && sel.rangeCount) ? sel.getRangeAt(0).cloneRange() : null;
        const table=doc.createElement("table");
        table.style.width="100%";
        table.style.borderCollapse="collapse";
        table.style.tableLayout="fixed";
        table.style.margin="12px 0";
        table.style.border="1px solid "+WCfg.UI.borderSubtle;
        for(let r=0;r<rows;r++){
          const tr=doc.createElement("tr");
          for(let c=0;c<cols;c++){
            const td=doc.createElement("td");
            td.style.border="1px solid "+WCfg.UI.borderSubtle;
            td.style.padding="8px";
            td.style.verticalAlign="top";
            td.style.wordBreak="break-word";
            const block=doc.createElement("p");
            applyZeroMarginToParagraph(block);
            block.appendChild(doc.createElement("br"));
            td.appendChild(block);
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        const fragment=doc.createDocumentFragment();
        fragment.appendChild(table);
        const spacer=doc.createElement("p");
        applyZeroMarginToParagraph(spacer);
        spacer.appendChild(doc.createElement("br"));
        fragment.appendChild(spacer);
        if(baseRange){
          const range=baseRange.cloneRange();
          range.deleteContents();
          range.insertNode(fragment);
        } else {
          target.appendChild(fragment);
        }
        Normalizer.fixStructure(target);
        Breaks.ensurePlaceholders(target);
        TableResizer.ensureTable(table);
        const selection=win.getSelection ? win.getSelection() : window.getSelection();
        const firstCell=table.querySelector("td");
        if(firstCell && selection && doc.createRange){
          const focusTarget=firstCell.querySelector("p") || firstCell;
          const cellRange=doc.createRange();
          cellRange.selectNodeContents(focusTarget);
          cellRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(cellRange);
        }
        HistoryManager.record(inst, target, { label:"Insert Table", repeatable:false });
        OutputBinding.syncDebounced(inst);
      } },
    "table.mergeCells":{
      label:"Merge Cells",
      kind:"button",
      ariaLabel:"Merge selected table cells",
      run:function(inst, arg){
        const ctx=arg && arg.ctx;
        TableMerge.merge(inst, ctx);
      }
    },
    "table.borderColor":{
      kind:"custom",
      ariaLabel:"Table border color or visibility",
      render:function(inst, ctx){ return TableBorderUI.create(inst, ctx); }
    },
    "table.cellPadding":{
      kind:"custom",
      ariaLabel:"Table cell padding",
      render:function(inst, ctx){ return TableCellPaddingUI.create(inst, ctx); }
    },
    "table.cellVerticalAlign":{
      kind:"custom",
      ariaLabel:"Table cell vertical alignment",
      render:function(inst, ctx){ return TableCellAlignUI.create(inst, ctx); }
    },
    "fullscreen.open":{ label:"Fullscreen", primary:true, kind:"button", ariaLabel:"Open fullscreen editor", run:function(inst){ Fullscreen.open(inst); } },
    "break.insert":{ label:"Insert Break", kind:"button", ariaLabel:"Insert page break",
      run:function(inst, arg){
        const target=(arg && arg.ctx && arg.ctx.area) ? arg.ctx.area : inst.el;
        Breaks.insert(target);
        HistoryManager.record(inst, target, { label:"Insert Page Break", repeatable:false });
        if(arg && arg.ctx && arg.ctx.refreshPreview) arg.ctx.refreshPreview();
        OutputBinding.syncDebounced(inst);
      } },
    "break.remove":{ label:"Remove Break", kind:"button", ariaLabel:"Remove page break",
      run:function(inst, arg){
        const target=(arg && arg.ctx && arg.ctx.area) ? arg.ctx.area : inst.el;
        if(Breaks.remove(target)){
          HistoryManager.record(inst, target, { label:"Remove Page Break", repeatable:false });
          if(arg && arg.ctx && arg.ctx.refreshPreview) arg.ctx.refreshPreview();
          OutputBinding.syncDebounced(inst);
        }
      } },
    "hf.edit":{ label:"Header & Footer", kind:"button", ariaLabel:"Edit header and footer",
      run:function(inst, arg){ HFEditor.open(inst, arg && arg.ctx); } },
    "toggle.header":{ label:"Header", kind:"toggle", ariaLabel:"Toggle header", getActive:function(inst){ return !!inst.headerEnabled; },
      run:function(inst){
        inst.headerEnabled = !inst.headerEnabled;
        HistoryManager.record(inst, inst ? inst.el : null, { label:inst.headerEnabled ? "Enable Header" : "Disable Header", repeatable:false });
        OutputBinding.syncDebounced(inst);
      } },
    "toggle.footer":{ label:"Footer", kind:"toggle", ariaLabel:"Toggle footer", getActive:function(inst){ return !!inst.footerEnabled; },
      run:function(inst){
        inst.footerEnabled = !inst.footerEnabled;
        HistoryManager.record(inst, inst ? inst.el : null, { label:inst.footerEnabled ? "Enable Footer" : "Disable Footer", repeatable:false });
        OutputBinding.syncDebounced(inst);
      } },
    "layout.fixPageHeight":{ label:"Fix A4 Page Height", kind:"toggle", ariaLabel:"Toggle fixed A4 page height",
      getActive:function(inst){ return !inst || inst.fixPageHeight!==false; },
      run:function(inst, arg){
        if(!inst) return;
        const current=inst.fixPageHeight!==false;
        inst.fixPageHeight = !current;
        if(inst.el){ inst.el.setAttribute("data-fix-page-height", inst.fixPageHeight!==false ? "true" : "false"); }
        HistoryManager.record(inst, inst ? inst.el : null, { label:inst.fixPageHeight ? "Enable Fixed Page Height" : "Disable Fixed Page Height", repeatable:false });
        if(arg && arg.ctx && typeof arg.ctx.refreshPreview==="function"){ arg.ctx.refreshPreview(); }
        OutputBinding.syncDebounced(inst);
      } },
    "reflow":{ label:"Reflow", kind:"button", ariaLabel:"Write changes back to editor", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.writeBack){ arg.ctx.writeBack(); if(arg.ctx.refreshPreview) arg.ctx.refreshPreview(); } } },
    "print":{ label:"Print", kind:"button", ariaLabel:"Print paged HTML", run:function(inst, arg){
      if(arg && arg.ctx && arg.ctx.writeBack) arg.ctx.writeBack();
      const targetWin=WDom.openBlank();
      if(!targetWin) return;
      targetWin.document.open();
      targetWin.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Preparing print…</title></head><body style='margin:0;font:14px/1.4 Segoe UI,system-ui;padding:24px;color:#323130;background:#fff;'>Preparing document for printing…</body></html>");
      targetWin.document.close();
      const rawHTML=Breaks.serialize(inst.el);
      const result=Paginator.paginate(rawHTML, inst);
      const open=function(html){ PrintUI.open(html, targetWin); };
      if(result && result.ready && typeof result.ready.then==="function"){
        result.ready.then(open).catch(function(){ open(result ? result.pagesHTML : ""); });
      }else{
        open(result ? result.pagesHTML : "");
      }
    } },
    "export":{ label:"Export", kind:"button", ariaLabel:"Export HTML", run:function(inst, arg){
      if(arg && arg.ctx && arg.ctx.writeBack) arg.ctx.writeBack();
      const targetWin=WDom.openBlank();
      if(!targetWin) return;
      targetWin.document.open();
      targetWin.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>Preparing export…</title></head><body style='margin:0;font:14px/1.4 Segoe UI,system-ui;padding:24px;color:#323130;background:#fff;'>Preparing HTML export…</body></html>");
      targetWin.document.close();
      const rawHTML=Breaks.serialize(inst.el);
      const result=Paginator.paginate(rawHTML, inst);
      const rawClean=Sanitizer.clean(rawHTML);
      const open=function(html){ ExportUI.open(html, rawClean, targetWin); };
      if(result && result.ready && typeof result.ready.then==="function"){
        result.ready.then(open).catch(function(){ open(result ? result.pagesHTML : ""); });
      }else{
        open(result ? result.pagesHTML : "");
      }
    } },
    "fullscreen.close":{ label:"Close", kind:"button", ariaLabel:"Close fullscreen", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.close) arg.ctx.close(); } },
    "fullscreen.saveClose":{ label:"Close", primary:true, kind:"button", ariaLabel:"Save changes and close", run:function(inst, arg){ if(arg && arg.ctx && arg.ctx.saveClose) arg.ctx.saveClose(); } }
  };
  const OUTPUT_ITEMS=FeatureFlags.exportButton?["print","export"]:["print"];
  const TOOLBAR_PAGE={
    idPrefix:"weditor-page",
    defaultActiveTab:null,
    tabs:[
      { id:"format", label:"Format", items:[
        { label:"Text Style", compact:true, items:["format.fontFamily","format.fontSize","format.blockStyle","format.bold","format.italic","format.underline","format.underlineStyle","format.strike","format.clearFormatting"] },
        { label:"Color & Emphasis", compact:true, items:["format.fontColor","format.highlight","format.shading","format.subscript","format.superscript"] },
        { label:"Paragraph", compact:true, items:["format.bulletedList","format.numberedList","format.multilevelList","format.decreaseIndent","format.increaseIndent","format.alignLeft","format.alignCenter","format.alignRight","format.alignJustify","format.lineSpacing"] }
      ] },
      { id:"table", label:"Table", items:[
        { label:"Table", compact:true, items:["insert.table","table.mergeCells","table.borderColor","table.cellVerticalAlign"] },
        { compact:true, items:["table.cellPadding"] }
      ] },
      { id:"insert", label:"Insert", items:["insert.image","insert.table"] },
      { id:"editing", label:"Editing", items:["history.undo","history.redo","hf.edit","break.insert","break.remove","reflow"] },
      { id:"layout", label:"Layout", items:["toggle.header","toggle.footer","layout.fixPageHeight"] },
      { id:"output", label:"Output", items:OUTPUT_ITEMS }
    ],
    quickActions:["fullscreen.open"]
  };
  const TOOLBAR_FS={
    idPrefix:"weditor-fs",
    defaultActiveTab:null,
    tabs:[
      { id:"format", label:"Format", items:[
        { label:"Text Style", compact:true, items:["format.fontFamily","format.fontSize","format.blockStyle","format.bold","format.italic","format.underline","format.underlineStyle","format.strike","format.clearFormatting"] },
        { label:"Color & Emphasis", compact:true, items:["format.fontColor","format.highlight","format.shading","format.subscript","format.superscript"] },
        { label:"Paragraph", compact:true, items:["format.bulletedList","format.numberedList","format.multilevelList","format.decreaseIndent","format.increaseIndent","format.alignLeft","format.alignCenter","format.alignRight","format.alignJustify","format.lineSpacing"] }
      ] },
      { id:"table", label:"Table", items:[
        { label:"Table", compact:true, items:["insert.table","table.mergeCells","table.borderColor","table.cellVerticalAlign"] },
        { compact:true, items:["table.cellPadding"] }
      ] },
      { id:"insert", label:"Insert", items:["insert.image","insert.table"] },
      { id:"editing", label:"Editing", items:["history.undo","history.redo","hf.edit","break.insert","break.remove","reflow"] },
      { id:"layout", label:"Layout", items:["toggle.header","toggle.footer","layout.fixPageHeight"] },
      { id:"output", label:"Output", items:OUTPUT_ITEMS }
    ]
  };
  function readBooleanAttribute(el, name){
    if(!el) return null;
    const raw=el.getAttribute(name);
    if(raw==null) return null;
    const value=raw.trim().toLowerCase();
    if(value==="" || value==="true" || value==="1" || value==="yes" || value==="on") return true;
    if(value==="false" || value==="0" || value==="no" || value==="off") return false;
    return true;
  }
  let INSTANCE_SEQ=0;
  function WEditorInstance(editorEl){
    this.uid = ++INSTANCE_SEQ;
    this.el = editorEl;
    this.el.setAttribute("data-weditor-instance", String(this.uid));
    const initialStateAttr=StateBinding.consumeInitial(editorEl);
    this.headerHTML = "";
    this.footerHTML = "";
    this.headerAlign = HFAlign.normalize(editorEl.getAttribute("data-header-align"));
    this.footerAlign = HFAlign.normalize(editorEl.getAttribute("data-footer-align"));
    const customLetterheadAttr=sanitizeImageURL(editorEl.getAttribute("data-custom-letterhead-logo-url"));
    this.customLetterheadLogoURL = customLetterheadAttr || null;
    const customFooterAttr=sanitizeImageURL(editorEl.getAttribute("data-custom-footer-logo-url"));
    this.customFooterLogoURL = customFooterAttr || null;
    const headerAttr=readBooleanAttribute(editorEl, "data-header-enabled");
    const footerAttr=readBooleanAttribute(editorEl, "data-footer-enabled");
    const fixHeightAttr=readBooleanAttribute(editorEl, "data-fix-page-height");
    this.headerEnabled = headerAttr!=null ? headerAttr : false;
    this.footerEnabled = footerAttr!=null ? footerAttr : false;
    this.fixPageHeight = fixHeightAttr!=null ? !!fixHeightAttr : true;
    if(editorEl.classList.contains("weditor--no-header")) this.headerEnabled=false;
    if(editorEl.classList.contains("weditor--no-footer")) this.footerEnabled=false;
    this.outputEls = OutputBinding.resolveAll(editorEl);
    this.outputEl = this.outputEls.length ? this.outputEls[0] : null;
    this.outputMode = editorEl.classList.contains("weditor--paged") ? "paged" : "raw";
    this.underlineStyle = "solid";
    this.shadingColor = null;
    this.highlightColor = (Formatting && Formatting.HIGHLIGHT_COLORS && Formatting.HIGHLIGHT_COLORS.length ? Formatting.HIGHLIGHT_COLORS[0].value : null);
    this.fontColor = (Formatting && typeof Formatting.FONT_COLOR_DEFAULT!=="undefined") ? Formatting.FONT_COLOR_DEFAULT : "#d13438";
    const initialState = initialStateAttr || OutputBinding.consumeInitialState(this);
    if(initialState){
      StateBinding.apply(this, initialState);
    } else {
      const initialHTML = OutputBinding.consumeInitialHTML(this);
      if(initialHTML){
        this.el.innerHTML = Sanitizer.clean(initialHTML);
        Breaks.ensurePlaceholders(this.el);
      }
    }
    this.el.classList.toggle("weditor--no-header", !this.headerEnabled);
    this.el.classList.toggle("weditor--no-footer", !this.footerEnabled);
    this.el.classList.toggle("weditor--paged", this.outputMode==="paged");
    this.el.setAttribute("data-fix-page-height", this.fixPageHeight!==false ? "true" : "false");
    this._mount();
    OutputBinding.syncDebounced(this);
  }
  WEditorInstance.prototype._mount=function(){
    ensureBaseStyles(document);
    const shell=document.createElement("div"); applyStyles(shell, WCfg.Style.shell);
    const toolbarWrap=document.createElement("div"); applyStyles(toolbarWrap, WCfg.Style.toolbarWrap);
    ToolbarFactory.build(toolbarWrap, TOOLBAR_PAGE, this, null);
    applyStyles(this.el, WCfg.Style.editor);
    this.el.setAttribute("contenteditable","true");
    Breaks.ensurePlaceholders(this.el);
    this.el.addEventListener("paste", function(self){ return function(){ window.setTimeout(function(){ Normalizer.fixStructure(self.el); Breaks.ensurePlaceholders(self.el); },0); }; }(this));
    const parent=this.el.parentNode; parent.replaceChild(shell, this.el);
    shell.appendChild(toolbarWrap); shell.appendChild(this.el);
    this.el.addEventListener("input", (function(self){ return function(ev){ Breaks.ensurePlaceholders(self.el); HistoryManager.handleInput(self, self.el, ev); OutputBinding.syncDebounced(self); }; })(this));
    this.el.addEventListener("keydown", (function(self){
      return function(ev){
        if(Breaks.handleKeydown(self.el, ev)){
          HistoryManager.record(self, self.el, { label:"Remove Page Break", repeatable:false });
          OutputBinding.syncDebounced(self);
          return;
        }
        HistoryManager.handleKeydown(self, self.el, ev);
      };
    })(this));
    HistoryManager.init(this, this.el);
    TableResizer.attach(this);
    TableSelection.attach(this);
    ImageTools.attach(this.el);
    this.el.__winst = this;
  };
  WEditorInstance.prototype.loadState=function(state){
    const applied=StateBinding.apply(this, state);
    if(applied){
      Breaks.ensurePlaceholders(this.el);
      OutputBinding.syncDebounced(this);
    }
    return applied;
  };
  const WEditor=(function(){
    function initAll(selectors){ selectors = selectors || [".weditor", ".w-editor"]; const nodes=[];
      for(let i=0;i<selectors.length;i++){ const list=document.querySelectorAll(selectors[i]); for(let j=0;j<list.length;j++){ if(nodes.indexOf(list[j])<0) nodes.push(list[j]); } }
      const instances=[]; for(let k=0;k<nodes.length;k++){ instances.push(new WEditorInstance(nodes[k])); } return instances;
    }
    function from(el){ return new WEditorInstance(el); }
    function applyState(target, state){
      if(!target) return null;
      let inst=null;
      if(target instanceof WEditorInstance){ inst=target; }
      else if(target.__winst){ inst=target.__winst; }
      else if(target.el && target.el.__winst){ inst=target.el.__winst; }
      if(!inst) return null;
      inst.loadState(state);
      return inst;
    }
    return { initAll, from, applyState, version:"1.7.0" };
  })();
  window.WEditor=WEditor;
  document.addEventListener("DOMContentLoaded", function(){ WEditor.initAll(); });
})();
