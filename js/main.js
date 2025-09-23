document.addEventListener('DOMContentLoaded', function() {
    const toolsList = document.getElementById('tools-list');
    
    const simuladorRegex = document.createElement('div');
    simuladorRegex.className = 'tool-item';
    simuladorRegex.innerHTML = '<a href="tools/simulador-regex.html">Simulador de Expressão Regular</a>';
    toolsList.appendChild(simuladorRegex);

    const simuladorGramatica = document.createElement('div');
    simuladorGramatica.className = 'tool-item';
    simuladorGramatica.innerHTML = '<a href="tools/simulador-gramatica.html">Simulador de Gramática Regular (Direita)</a>';
    toolsList.appendChild(simuladorGramatica);

    const simuladorAutomato = document.createElement('div');
    simuladorAutomato.className = 'tool-item';
    simuladorAutomato.innerHTML = '<a href="tools/simulador-automato.html">Simulador de Autômato Finito</a>';
    toolsList.appendChild(simuladorAutomato);
});
