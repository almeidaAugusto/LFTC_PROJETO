
const AF = (() => {
  function epsilonClosure(trans, states) {
    const stack = [...states];
    const visited = new Set(states);
    while (stack.length) {
      const u = stack.pop();
      const key = u + '|ε';
      const next = trans.get(key) || new Set();
      for (const v of next) if (!visited.has(v)) { visited.add(v); stack.push(v); }
    }
    return visited;
  }

  function step(trans, setStates, a) {
    const out = new Set();
    for (const u of setStates) {
      const key = u + '|' + a;
      const next = trans.get(key) || new Set();
      for (const v of next) out.add(v);
    }
    return out;
  }

  function acceptsNFA(automaton, w) {
    let current = epsilonClosure(automaton.trans, new Set([automaton.initial]));
    for (const ch of w) {
      current = epsilonClosure(automaton.trans, step(automaton.trans, current, ch));
    }
    for (const q of current) if (automaton.finals.has(q)) return true;
    return false;
  }

  function acceptsDFA(automaton, w) {
    let q = automaton.initial;
    for (const ch of w) {
      const key = q + '|' + ch;
      const next = automaton.trans.get(key);
      if (!next || next.size !== 1) return false;
      q = [...next][0];
    }
    return automaton.finals.has(q);
  }

  return { epsilonClosure, step, acceptsNFA, acceptsDFA };
})();


document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('automato-canvas');
  const modeSel = document.getElementById('mode');
  const inputEl = document.getElementById('input-string');
  const resultEl = document.getElementById('result');
  const msgEl = document.getElementById('messages');

  const btnAdd = document.getElementById('btn-add-state');
  const btnDel = document.getElementById('btn-del-state');
  const btnInitial = document.getElementById('btn-toggle-initial');
  const btnFinal = document.getElementById('btn-toggle-final');
  const btnEdgeMode = document.getElementById('btn-edge-mode');
  const btnRun = document.getElementById('btn-run');
  const btnStep = document.getElementById('btn-step');
  const btnClear = document.getElementById('btn-clear');

  let edgeMode = false;
  let selectedState = null; 
  let counter = 0;
  
  let exec = {
    word: '',
    index: 0,
    currentDFA: null,
    currentNFA: new Set(),
    mode: 'nfa',
    active: false
  };

  
  const model = {
    states: new Map(), 
    initial: null,
    finals: new Set(),
    transitions: [],  
    transMap: new Map(), 
    type: 'nfa' 
  };
  const connCache = new Map(); 

  function buildLabelHTML(symbolsArray) {
    return symbolsArray.map(s => `<span class="sym" data-sym="${s}">${s}</span>`).join('<span class="sep">,</span>');
  }

  function setMessage(text, isError=false) {
    msgEl.textContent = text || '';
    msgEl.style.color = isError ? '#dc3545' : '#4a5568';
  }

  function addState(pos = {x: 60 + counter*30, y: 60 + counter*20}) {
    const id = 'q' + counter++;
    const el = document.createElement('div');
    el.className = 'state-node';
    el.id = id;
    el.setAttribute('tabindex', '0');
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.textContent = id;
    canvas.appendChild(el);

    jsPlumb.draggable(el, { containment: true });
    jsPlumb.addEndpoint(el, {
      isSource: true,
      isTarget: true,
      maxConnections: -1,
      endpoint: 'Dot',
      paintStyle: { fill: '#4a5568', radius: 3 },
      anchor: [ 'Continuous', { faces: [ 'top', 'bottom', 'left', 'right' ] } ]
    });

    el.addEventListener('click', () => { selectedState = id; highlightSelection(); });

    model.states.set(id, { id, label: id, el });
    return id;
  }

  function removeState(id) {
    const st = model.states.get(id);
    if (!st) return;
    
    jsPlumb.remove(st.el);
    
    model.states.delete(id);
    if (model.initial === id) model.initial = null;
    model.finals.delete(id);
    model.transitions = model.transitions.filter(t => t.from !== id && t.to !== id);
    rebuildTransMap();
  }

  function toggleInitial(id) {
    if (!model.states.has(id)) return;
    model.initial = model.initial === id ? null : id;
    updateStateStyles();
  }

  function toggleFinal(id) {
    if (!model.states.has(id)) return;
    if (model.finals.has(id)) model.finals.delete(id); else model.finals.add(id);
    updateStateStyles();
  }

  function updateStateStyles() {
    model.states.forEach(({id, el}) => {
      el.classList.remove('state-initial','state-final');
      if (model.initial === id) el.classList.add('state-initial');
      if (model.finals.has(id)) el.classList.add('state-final');
    });
  }

  function clearHighlights() {
    model.states.forEach(({el}) => el.classList.remove('state-active'));
    jsPlumb.getAllConnections().forEach(c => {
      c.removeClass('edge-active');
      const ov = c.getOverlay && c.getOverlay('label');
      const el = ov && ov.getElement && ov.getElement();
      if (el) el.querySelectorAll('.sym-active').forEach(s => s.classList.remove('sym-active'));
    });
  }

  function highlightStates(ids) {
    ids.forEach(id => {
      const st = model.states.get(id);
      if (st) st.el.classList.add('state-active');
    });
  }

  

  function highlightSymbolOnConnection(conn, sym) {
    if (!conn) return;
    const ov = conn.getOverlay && conn.getOverlay('label');
    const el = ov && ov.getElement && ov.getElement();
    if (!el) return;
    el.querySelectorAll('.sym-active').forEach(s => s.classList.remove('sym-active'));
    const target = el.querySelector(`.sym[data-sym="${sym}"]`);
    if (target) target.classList.add('sym-active');
  }

  function highlightSelection() {
    model.states.forEach(({el, id}) => {
      if (selectedState === id) el.classList.add('state-selected');
      else el.classList.remove('state-selected');
    });
  }

  function rebuildTransMap() {
    model.transMap.clear();
    for (const t of model.transitions) {
      for (const a of t.symbols) {
        const key = t.from + '|' + (a || 'ε');
        if (!model.transMap.has(key)) model.transMap.set(key, new Set());
        model.transMap.get(key).add(t.to);
      }
    }
  }

  function addTransition(from, to, symbols) {
    
    let edge = model.transitions.find(e => e.from === from && e.to === to);
    if (!edge) { edge = { from, to, symbols: new Set() }; model.transitions.push(edge); }
    for (const s of symbols) edge.symbols.add(s);
    rebuildTransMap();
    drawConnection(from, to, buildLabelHTML([...edge.symbols]));
  }

  function getConnectorStyle(from, to) {
    if (from === to) {
      return { connector: ['StateMachine', { curviness: 40 }], labelLoc: 0.15 };
    }
    const positive = from < to; 
    
    const parallel = jsPlumb.getAllConnections().filter(c => c.sourceId === from && c.targetId === to).length;
    const sign = positive ? 1 : -1;
    const base = 60;
    const step = 25;
    const curviness = sign * (base + step * parallel);
    const labelLoc = positive ? 0.6 : 0.4;
    return { connector: ['Bezier', { curviness }], labelLoc };
  }

  function drawConnection(from, to, labelHTML) {
    
    jsPlumb.getAllConnections().forEach(c => {
      if (c.sourceId === from && c.targetId === to) jsPlumb.deleteConnection(c);
    });
    const { connector, labelLoc } = getConnectorStyle(from, to);
    const conn = jsPlumb.connect({
      source: from,
      target: to,
      anchors: ['Continuous', 'Continuous'],
      connector: connector,
      overlays: [ ['Label', { id: 'label', label: labelHTML || '', location: labelLoc, cssClass: 'edge-label' }] ],
      paintStyle: { stroke: '#4a5568', strokeWidth: 2 },
      endpointStyle: { fill: '#4a5568' }
    });
    connCache.set(from + '|' + to, conn);
    bindConnectionEditing(conn, from, to);
  }

  function parseSymbolsString(str) {
    return str.split(',').map(s => s.trim()).filter(s => s.length);
  }

  function validateDFAAfterUpdate(from, to, newSymbols) {
    if (modeSel.value !== 'dfa') return { ok: true };
    
    for (const a of newSymbols) {
      if (a === 'ε') return { ok: false, msg: 'DFA não permite ε-transições.' };
    }
    
    const map = new Map();
    
    for (const e of model.transitions) {
      if (e.from !== from) continue;
      if (e.from === from && e.to === to) continue; 
      for (const a of e.symbols) {
        if (a === 'ε') return { ok: false, msg: 'DFA não permite ε-transições.' };
        const prev = map.get(a);
        if (prev && prev !== e.to) return { ok: false, msg: `Conflito DFA em '${from}' com símbolo '${a}'.` };
        map.set(a, e.to);
      }
    }
    
    for (const a of newSymbols) {
      const prev = map.get(a);
      if (prev && prev !== to) return { ok: false, msg: `Conflito DFA em '${from}' com símbolo '${a}'.` };
      map.set(a, to);
    }
    return { ok: true };
  }

  function updateEdgeSymbols(from, to, symbols) {
    let edge = model.transitions.find(e => e.from === from && e.to === to);
    if (!edge) {
      edge = { from, to, symbols: new Set() };
      model.transitions.push(edge);
    } else {
      edge.symbols.clear();
    }
    for (const s of symbols) edge.symbols.add(s);
    rebuildTransMap();
    const conn = connCache.get(from + '|' + to);
    if (conn) {
      const ov = conn.getOverlay && conn.getOverlay('label');
      if (ov && typeof ov.setLabel === 'function') ov.setLabel(buildLabelHTML(symbols));
    }
  }

  function bindConnectionEditing(conn, from, to) {
    try {
      const overlay = conn.getOverlay('label');
      const el = overlay && overlay.getElement && overlay.getElement();
      if (!el) return;
      el.style.cursor = 'pointer';
      el.title = 'Duplo clique para editar rótulo';
      el.addEventListener('dblclick', () => {
        const edge = model.transitions.find(e => e.from === from && e.to === to);
        const current = edge ? [...edge.symbols].join(',') : '';
        const edited = prompt('Edite os símbolos (separe por vírgula). Use ε para epsilon:', current);
        if (edited == null) return;
        const symbols = parseSymbolsString(edited);
        if (symbols.length === 0) { setMessage('Rótulo vazio não permitido.', true); return; }
        const v = validateDFAAfterUpdate(from, to, symbols);
        if (!v.ok) { setMessage(v.msg, true); return; }
        updateEdgeSymbols(from, to, symbols);
        setMessage('Transição atualizada.');
      });
    } catch (_) { /* ignore */ }
  }

 
  btnAdd.addEventListener('click', () => {
    const id = addState();
    selectedState = id;
    highlightSelection();
  });

  btnDel.addEventListener('click', () => {
    if (!selectedState) return setMessage('Selecione um estado para excluir.', true);
    removeState(selectedState);
    selectedState = null;
    highlightSelection();
  });

  btnInitial.addEventListener('click', () => {
    if (!selectedState) return setMessage('Selecione um estado para marcar como inicial.', true);
    toggleInitial(selectedState);
    setMessage('');
  });

  btnFinal.addEventListener('click', () => {
    if (!selectedState) return setMessage('Selecione um estado para alternar final.', true);
    toggleFinal(selectedState);
    setMessage('');
  });

  btnEdgeMode.addEventListener('click', () => {
    edgeMode = !edgeMode;
    btnEdgeMode.setAttribute('aria-pressed', String(edgeMode));
    btnEdgeMode.textContent = edgeMode ? 'Modo transição: Ligado' : 'Modo transição: Desligado';
    setMessage(edgeMode ? 'Clique em origem e depois em destino para criar transição. Digite rótulo quando solicitado.' : '');
    if (!edgeMode) { clearPendingMark(); }
  });

  
  let pendingFrom = null;
  function clearPendingMark() {
    model.states.forEach(({el}) => el.classList.remove('state-pending'));
    pendingFrom = null;
  }
  function setPending(id) {
    clearPendingMark();
    const st = model.states.get(id);
    if (st) st.el.classList.add('state-pending');
    pendingFrom = id;
  }
  canvas.addEventListener('click', (ev) => {
    if (!edgeMode) return;
    const el = ev.target.closest('.state-node');
    if (!el) return;
    const id = el.id;
    if (!pendingFrom) {
      setPending(id);
      highlightSelection();
    } else {
      const from = pendingFrom;
      const to = id;
      clearPendingMark();
      highlightSelection();
      const label = prompt('Símbolos da transição (separe por vírgula). Use ε para epsilon:');
      if (label == null) return; // cancelou
      const symbols = label.split(',').map(s => s.trim()).filter(s => s.length);
      if (modeSel.value === 'dfa') {
        
        for (const a of symbols) {
          const key = from + '|' + (a || 'ε');
          if (a === 'ε') { setMessage('DFA não permite ε-transições.', true); return; }
          const toSet = model.transMap.get(key);
          if (toSet && toSet.size > 0 && !toSet.has(to)) { setMessage(`Conflito DFA em '${from}' com símbolo '${a}'.`, true); return; }
        }
      }
      addTransition(from, to, symbols);
      setMessage('');
    }
  });

  
  btnRun.addEventListener('click', () => {
    startExecution();
    const automaton = toAutomaton();
    if (!automaton) return;
    const isDFA = exec.mode === 'dfa';
    const ok = isDFA ? AF.acceptsDFA(automaton, exec.word) : AF.acceptsNFA(automaton, exec.word);
    resultEl.textContent = ok ? 'ACEITA' : 'REJEITA';
    resultEl.style.color = ok ? '#155724' : '#dc3545';
  });

  btnClear.addEventListener('click', () => {
    resultEl.textContent = '';
    setMessage('');
    clearHighlights();
    clearPendingMark();
    exec = { word: '', index: 0, currentDFA: null, currentNFA: new Set(), mode: 'nfa', active: false };
  });

  btnStep.addEventListener('click', () => {
    if (!exec.active) startExecution();
    doStep();
  });

  

  function toAutomaton(forceType) {
    if (!model.initial) { setMessage('Defina um estado inicial.', true); return null; }
    if (model.finals.size === 0) { setMessage('Defina pelo menos um estado final.', true); return null; }
    const trans = new Map(model.transMap); 
    return {
      states: new Set([...model.states.keys()]),
      initial: model.initial,
      finals: new Set(model.finals),
      trans,
      type: forceType || modeSel.value
    };
  }

  function startExecution() {
    const word = inputEl.value || '';
    const automaton = toAutomaton();
    if (!automaton) return;
    exec.word = word;
    exec.index = 0;
    exec.mode = modeSel.value;
    exec.active = true;
    clearHighlights();
    if (exec.mode === 'dfa') {
      exec.currentDFA = automaton.initial;
      highlightStates([exec.currentDFA]);
    } else {
      const startSet = AF.epsilonClosure(automaton.trans, new Set([automaton.initial]));
      exec.currentNFA = startSet;
      highlightStates([...startSet]);
    }
    resultEl.textContent = '';
  }

  function doStep() {
    const automaton = toAutomaton();
    if (!automaton || !exec.active) return;
    if (exec.index >= exec.word.length) {
      const ok = exec.mode === 'dfa'
        ? automaton.finals.has(exec.currentDFA)
        : [...exec.currentNFA].some(s => automaton.finals.has(s));
      resultEl.textContent = ok ? 'ACEITA' : 'REJEITA';
      resultEl.style.color = ok ? '#155724' : '#dc3545';
      return;
    }
    const a = exec.word[exec.index];
    clearHighlights();
    if (exec.mode === 'dfa') {
      const key = exec.currentDFA + '|' + a;
      const toSet = automaton.trans.get(key);
      if (!toSet || toSet.size !== 1) {
        setMessage(`Sem transição para '${a}' a partir de ${exec.currentDFA}`, true);
        resultEl.textContent = 'REJEITA';
        resultEl.style.color = '#dc3545';
        return;
      }
      const to = [...toSet][0];
      const conn = connCache.get(exec.currentDFA + '|' + to);
      if (conn) { conn.addClass('edge-active'); highlightSymbolOnConnection(conn, a); }
      exec.currentDFA = to;
      exec.index++;
      highlightStates([exec.currentDFA]);
    } else {
      const next = AF.epsilonClosure(automaton.trans, AF.step(automaton.trans, exec.currentNFA, a));
      exec.currentNFA.forEach(from => {
        const key = from + '|' + a;
        const tos = automaton.trans.get(key) || new Set();
        tos.forEach(to => {
          const conn = connCache.get(from + '|' + to);
          if (conn) { conn.addClass('edge-active'); highlightSymbolOnConnection(conn, a); }
        });
      });
      exec.currentNFA = next;
      exec.index++;
      highlightStates([...next]);
    }
  }

  
});
