(()=>{"use strict";console.log("ArXiv extension content script loaded");const n=document.createElement("style");n.textContent="\n.arxiv-annotator {\n    display: inline-block;\n    margin-left: 4px;\n    cursor: pointer;\n    font-size: 0.9em;\n    opacity: 0.7;\n    transition: opacity 0.2s;\n    vertical-align: baseline;\n}\n\n.arxiv-annotator:hover {\n    opacity: 1;\n}\n\n.arxiv-popup {\n    position: absolute;  /* Changed from fixed to absolute */\n    background: white;\n    border: 1px solid #ddd;\n    border-radius: 6px;\n    padding: 12px;\n    box-shadow: 0 4px 12px rgba(0,0,0,0.15);\n    width: 300px;\n    z-index: 10000;\n    box-sizing: border-box;  /* Added to ensure padding is included in width */\n}\n\n.arxiv-popup-header {\n    font-weight: bold;\n    margin-bottom: 8px;\n    line-height: 1.4;\n    font-size: 1em;\n}\n\n.arxiv-popup-meta {\n    color: #666;\n    font-size: 0.85em;\n    margin-bottom: 12px;\n    line-height: 1.4;\n}\n\n.arxiv-popup-buttons {\n    display: flex;\n    gap: 8px;\n    margin: 8px 0;\n}\n\n.arxiv-popup button {\n    padding: 6px 12px;\n    border: 1px solid #ddd;\n    border-radius: 4px;\n    background: #f5f5f5;\n    cursor: pointer;\n    transition: all 0.2s ease;\n    font-size: 0.9em;\n}\n\n.arxiv-popup button:hover {\n    background: #e8e8e8;\n    border-color: #ccc;\n}\n\n.arxiv-popup button.active {\n    background: #e0e0e0;\n    border-color: #aaa;\n}\n\n.arxiv-popup textarea {\n    width: calc(100% - 16px);  /* Account for padding */\n    min-height: 80px;\n    margin: 8px 0;\n    padding: 8px;\n    border: 1px solid #ddd;\n    border-radius: 4px;\n    resize: vertical;\n    font-family: inherit;\n    font-size: 0.9em;\n    line-height: 1.4;\n    box-sizing: border-box;  /* Added to ensure padding is included in width */\n}\n\n.arxiv-popup textarea:focus {\n    outline: none;\n    border-color: #aaa;\n}\n\n.arxiv-popup-actions {\n    display: flex;\n    justify-content: flex-end;\n    gap: 8px;\n    margin-top: 12px;\n}\n\n.arxiv-popup .save-button {\n    background: #2563eb;\n    color: white;\n    border-color: #2563eb;\n}\n\n.arxiv-popup .save-button:hover {\n    background: #1d4ed8;\n    border-color: #1d4ed8;\n}\n\n/* Loading state */\n.arxiv-popup-header:empty::after,\n.arxiv-popup-header:contains('Loading...') {\n    content: '';\n    display: inline-block;\n    width: 12px;\n    height: 12px;\n    border: 2px solid #ddd;\n    border-top-color: #666;\n    border-radius: 50%;\n    animation: spin 1s linear infinite;\n}\n\n@keyframes spin {\n    to { transform: rotate(360deg); }\n}\n",document.head.appendChild(n);let t=null;document.addEventListener("click",(n=>{!t||t.contains(n.target)||n.target.classList.contains("arxiv-annotator")||(t.parentElement?.remove(),t=null)}));const e=new Map;async function o(n){if(n.classList.contains("arxiv-processed"))return;n.classList.add("arxiv-processed");const o=[/arxiv\.org\/abs\/([0-9.]+)/,/arxiv\.org\/pdf\/([0-9.]+)\.pdf/,/arxiv\.org\/\w+\/([0-9.]+)/];let a=null;for(const t of o){const e=n.href.match(t);if(e){a=e[1];break}}if(!a)return;const r=document.createElement("span");r.className="arxiv-annotator",r.textContent="📝",r.title="Add annotation",r.addEventListener("click",(async n=>{if(n.preventDefault(),n.stopPropagation(),t&&(t.parentElement?.remove(),t.arxivId===a))return void(t=null);const o=await async function(n,o=""){console.log("Creating popup for:",n);const a=await async function(n){if(console.log("Starting metadata fetch for:",n),e.has(n))return console.log("Found in cache:",n),e.get(n);console.log("Fetching from arXiv API:",n);try{const t=`https://export.arxiv.org/api/query?id_list=${n}`;console.log("API URL:",t);const o=await fetch(t);console.log("API response status:",o.status);const a=await o.text();console.log("API response length:",a.length);const r=await async function(n){const t=(new DOMParser).parseFromString(n,"text/xml").querySelector("entry");return t?{title:t.querySelector("title")?.textContent?.trim(),authors:Array.from(t.querySelectorAll("author name")).map((n=>n.textContent.trim())).join(", "),abstract:t.querySelector("summary")?.textContent?.trim(),published:t.querySelector("published")?.textContent?.trim()}:null}(a);if(console.log("Parsed metadata:",r),r)return e.set(n,r),r;console.log("Failed to parse metadata")}catch(n){console.error("Error fetching metadata:",n)}return null}(n);console.log("Fetched metadata:",a);const r=document.createElement("div");return r.className="arxiv-popup",r.innerHTML=`\n        <div class="arxiv-popup-header">${a?.title||o||n}</div>\n        <div class="arxiv-popup-meta">${a?.authors||""}</div>\n        <div class="arxiv-popup-buttons">\n            <button class="vote-button" data-vote="thumbsup">👍 Interesting</button>\n            <button class="vote-button" data-vote="thumbsdown">👎 Not Relevant</button>\n        </div>\n        <textarea placeholder="Add notes..."></textarea>\n        <div class="arxiv-popup-actions">\n            <button class="save-button">Save</button>\n        </div>\n    `,r.querySelectorAll(".vote-button").forEach((n=>{n.addEventListener("click",(()=>{r.querySelectorAll(".vote-button").forEach((n=>n.classList.remove("active"))),n.classList.add("active")}))})),r.querySelector(".save-button").addEventListener("click",(()=>{const e=r.querySelector(".vote-button.active")?.dataset.vote,o=r.querySelector("textarea").value;(e||o)&&chrome.runtime.sendMessage({type:"updateAnnotation",annotationType:o?"notes":"vote",data:{paperId:n,vote:e,notes:o,title:a?.title,authors:a?.authors,abstract:a?.abstract,timestamp:(new Date).toISOString()}},(n=>{console.log("Annotation saved:",n),r.remove(),t=null}))})),r}(a),i=function(){const n=document.createElement("div");return n.style.position="relative",n.style.zIndex="10000",n}();i.appendChild(o);const s=r.getBoundingClientRect();window.innerWidth-s.left<320?(o.style.right="0",o.style.left="auto"):o.style.left="0",o.style.top=`${s.height+5}px`,o.arxivId=a,r.parentNode.insertBefore(i,r.nextSibling),t=o})),n.parentNode.insertBefore(r,n.nextSibling)}document.querySelectorAll('a[href*="arxiv.org"]').forEach(o),new MutationObserver((n=>{n.forEach((n=>{n.addedNodes.forEach((n=>{n.nodeType===Node.ELEMENT_NODE&&n.querySelectorAll('a[href*="arxiv.org"]').forEach(o)}))}))})).observe(document.body,{childList:!0,subtree:!0})})();