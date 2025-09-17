document.addEventListener('DOMContentLoaded', function() {
    const grammarInput = document.getElementById('grammar-input');
    const test1 = document.getElementById('test-g1');
    const test2 = document.getElementById('test-g2');

    function parseGrammar(text) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const productions = {};
        let startSymbol = 'S';
        for (const line of lines) {
            const [leftRaw, rightRaw] = line.split('->').map(s => s && s.trim());
            if (!leftRaw || !rightRaw) throw new Error('Linha inválida: ' + line);
            const left = leftRaw;
            if (!/^[A-Z]$/.test(left)) throw new Error('Lado esquerdo deve ser uma única variável maiúscula: ' + left);
            if (!productions[left]) productions[left] = [];
            const alts = rightRaw.split('|').map(s => s.trim());
            for (const alt of alts) {
                if (alt === 'ε' || alt.toLowerCase() === 'epsilon' || alt === 'eps') {
                    productions[left].push({ type: 'eps' });
                } else if (/^[a-z0-9]$/.test(alt)) {
                    productions[left].push({ type: 'terminal', a: alt });
                } else if (/^[a-z0-9][A-Z]$/.test(alt)) {
                    productions[left].push({ type: 'step', a: alt[0], B: alt[1] });
                } else {
                    throw new Error('Produção não direita-linear: ' + alt);
                }
            }
            if (!startSymbol) startSymbol = left;
        }
        return { productions, startSymbol };
    }

    function buildNFA({ productions, startSymbol }) {
        const states = new Set(Object.keys(productions));
        const FINAL = '#F';
        states.add(FINAL);
        const trans = new Map();
        function add(u, a, v) {
            const key = u + '|' + (a ?? 'ε');
            if (!trans.has(key)) trans.set(key, new Set());
            trans.get(key).add(v);
        }
        for (const A of Object.keys(productions)) {
            for (const p of productions[A]) {
                if (p.type === 'step') add(A, p.a, p.B);
                else if (p.type === 'terminal') add(A, p.a, FINAL);
                else if (p.type === 'eps') add(A, null, FINAL);
            }
        }
        return { states, start: startSymbol, finals: new Set([FINAL]), trans };
    }

    function epsilonClosure(trans, statesSet) {
        const stack = [...statesSet];
        const visited = new Set(statesSet);
        while (stack.length) {
            const u = stack.pop();
            const key = u + '|ε';
            const next = trans.get(key) || new Set();
            for (const v of next) if (!visited.has(v)) { visited.add(v); stack.push(v); }
        }
        return visited;
    }

    function step(trans, S, a) {
        const out = new Set();
        for (const u of S) {
            const key = u + '|' + a;
            const next = trans.get(key) || new Set();
            for (const v of next) out.add(v);
        }
        return out;
    }

    function accepts(nfa, w) {
        let current = epsilonClosure(nfa.trans, new Set([nfa.start]));
        for (const ch of w) {
            current = epsilonClosure(nfa.trans, step(nfa.trans, current, ch));
        }
        for (const q of current) if (nfa.finals.has(q)) return true;
        return false;
    }

    let nfa = null;
    function recompute() {
        try {
            nfa = parseGrammar(grammarInput.value.trim() || 'S -> aS | b | ε');
            nfa = buildNFA(nfa);
            test1.className = 'test-input';
            test2.className = 'test-input';
        } catch (e) {
            nfa = null;
            test1.className = 'test-input';
            test2.className = 'test-input';
        }
        testNow();
    }

    function testNow() {
        if (!nfa) { test1.className = 'test-input'; test2.className = 'test-input'; return; }
        const r1 = accepts(nfa, test1.value);
        const r2 = accepts(nfa, test2.value);
        test1.className = 'test-input ' + (r1 ? 'match' : 'no-match');
        test2.className = 'test-input ' + (r2 ? 'match' : 'no-match');
    }

    grammarInput.addEventListener('input', recompute);
    test1.addEventListener('input', testNow);
    test2.addEventListener('input', testNow);

    recompute();
});
