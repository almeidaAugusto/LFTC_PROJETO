class NormaMachine {
    constructor(registerNames) {
        this.order = [...registerNames];
        this.regs = {};
        this.order.forEach((name) => {
            this.regs[name] = 0;
        });
    }

    setRegister(name, value) {
        if (!Object.prototype.hasOwnProperty.call(this.regs, name)) return;
        const parsed = Number(value);
        this.regs[name] = Number.isFinite(parsed) ? parsed : 0;
    }

    getRegister(name) {
        return this.regs[name] ?? 0;
    }

    addNoPreserve(src, dest) {
        const sum = this.getRegister(dest) + this.getRegister(src);
        this.regs[dest] = sum;
        this.regs[src] = 0;
    }

    addPreserve(src, dest) {
        this.regs[dest] = this.getRegister(dest) + this.getRegister(src);
    }

    multiply(regA, regB, dest) {
        this.regs[dest] = this.getRegister(regA) * this.getRegister(regB);
    }

    isLess(regA, regB) {
        return this.getRegister(regA) < this.getRegister(regB);
    }

    isLessOrEqual(regA, regB) {
        return this.getRegister(regA) <= this.getRegister(regB);
    }

    isPrime(reg) {
        const n = this.getRegister(reg);
        if (!Number.isInteger(n) || n <= 1) return false;
        if (n === 2) return true;
        if (n % 2 === 0) return false;
        const limit = Math.floor(Math.sqrt(n));
        for (let i = 3; i <= limit; i += 2) {
            if (n % i === 0) return false;
        }
        return true;
    }

    listRegisters() {
        return [...this.order];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const norma = new NormaMachine(['A', 'B', 'C', 'D']);
    const registerInputs = {
        A: document.getElementById('reg-A'),
        B: document.getElementById('reg-B'),
        C: document.getElementById('reg-C'),
        D: document.getElementById('reg-D')
    };
    const tableBody = document.querySelector('#tabela-registradores tbody');
    const feedbackEl = document.getElementById('norma-feedback');
    const outputs = {
        addNP: document.getElementById('add-np-output'),
        addPreserve: document.getElementById('add-preserve-output'),
        multiply: document.getElementById('mul-output'),
        compareLT: document.getElementById('cmp-lt-output'),
        compareLE: document.getElementById('cmp-le-output'),
        prime: document.getElementById('prime-output')
    };

    const selects = {
        addNPSource: document.getElementById('add-np-source'),
        addNPTarget: document.getElementById('add-np-target'),
        addPreserveSource: document.getElementById('add-preserve-source'),
        addPreserveTarget: document.getElementById('add-preserve-target'),
        mulOp1: document.getElementById('mul-op1'),
        mulOp2: document.getElementById('mul-op2'),
        mulDest: document.getElementById('mul-dest'),
        cmpLTLeft: document.getElementById('cmp-lt-left'),
        cmpLTRight: document.getElementById('cmp-lt-right'),
        cmpLELeft: document.getElementById('cmp-le-left'),
        cmpLERight: document.getElementById('cmp-le-right'),
        prime: document.getElementById('prime-register')
    };

    const buttons = {
        apply: document.getElementById('btn-apply-registers'),
        addNP: document.getElementById('btn-add-np'),
        addPreserve: document.getElementById('btn-add-preserve'),
        multiply: document.getElementById('btn-multiply'),
        compareLT: document.getElementById('btn-compare-lt'),
        compareLE: document.getElementById('btn-compare-le'),
        prime: document.getElementById('btn-prime')
    };

    function setFeedback(message = '', isError = false) {
        feedbackEl.textContent = message;
        feedbackEl.style.color = isError ? '#dc3545' : '#4a5568';
    }

    function setResult(el, message = '', isError = false) {
        if (!el) return;
        el.textContent = message;
        el.classList.toggle('error', Boolean(isError));
    }

    function syncFromInputs(render = true) {
        norma.listRegisters().forEach((name) => {
            norma.setRegister(name, registerInputs[name].value);
        });
        if (render) syncView();
    }

    function updateInputsFromState() {
        norma.listRegisters().forEach((name) => {
            registerInputs[name].value = norma.getRegister(name);
        });
    }

    function renderTable() {
        tableBody.innerHTML = '';
        const frag = document.createDocumentFragment();
        norma.listRegisters().forEach((name) => {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = name;
            const tdValue = document.createElement('td');
            tdValue.textContent = norma.getRegister(name);
            tr.appendChild(tdName);
            tr.appendChild(tdValue);
            frag.appendChild(tr);
        });
        tableBody.appendChild(frag);
    }

    function syncView() {
        updateInputsFromState();
        renderTable();
    }

    buttons.apply.addEventListener('click', () => {
        syncFromInputs();
        setFeedback('Registradores atualizados.');
    });

    buttons.addNP.addEventListener('click', () => {
        syncFromInputs(false);
        setFeedback('');
        const origem = selects.addNPSource.value;
        const destino = selects.addNPTarget.value;
        if (origem === destino) {
            setResult(outputs.addNP, 'Origem e destino devem ser diferentes.', true);
            return;
        }
        norma.addNoPreserve(origem, destino);
        finishOperation(outputs.addNP, `${destino} = ${destino} + ${origem}; ${origem} foi zerado.`);
    });

    buttons.addPreserve.addEventListener('click', () => {
        syncFromInputs(false);
        setFeedback('');
        const origem = selects.addPreserveSource.value;
        const destino = selects.addPreserveTarget.value;
        norma.addPreserve(origem, destino);
        finishOperation(outputs.addPreserve, `${destino} = ${destino} + ${origem}; conteúdo de ${origem} preservado.`);
    });

    buttons.multiply.addEventListener('click', () => {
        syncFromInputs(false);
        setFeedback('');
        const op1 = selects.mulOp1.value;
        const op2 = selects.mulOp2.value;
        const destino = selects.mulDest.value;
        norma.multiply(op1, op2, destino);
        finishOperation(outputs.multiply, `${destino} = ${op1} × ${op2}.`);
    });

    function handleComparison(leftSelect, rightSelect, outputEl, symbol, comparatorFn) {
        syncFromInputs(false);
        setFeedback('');
        syncView();
        const regA = leftSelect.value;
        const regB = rightSelect.value;
        const ok = comparatorFn(regA, regB);
        setResult(outputEl, `${regA} ${symbol} ${regB}: ${ok ? 'Verdadeiro' : 'Falso'}`);
    }

    buttons.compareLT.addEventListener('click', () => {
        handleComparison(selects.cmpLTLeft, selects.cmpLTRight, outputs.compareLT, '<', (a, b) => norma.isLess(a, b));
    });

    buttons.compareLE.addEventListener('click', () => {
        handleComparison(selects.cmpLELeft, selects.cmpLERight, outputs.compareLE, '≤', (a, b) => norma.isLessOrEqual(a, b));
    });

    buttons.prime.addEventListener('click', () => {
        syncFromInputs(false);
        setFeedback('');
        syncView();
        const reg = selects.prime.value;
        const valor = norma.getRegister(reg);
        const ehPrimo = norma.isPrime(reg);
        const msg = `Valor em ${reg} = ${valor}. ${ehPrimo ? 'É primo.' : 'Não é primo.'}`;
        setResult(outputs.prime, msg);
    });

    function finishOperation(targetOutput, message) {
        syncView();
        setResult(targetOutput, message);
    }

    syncFromInputs();
});
