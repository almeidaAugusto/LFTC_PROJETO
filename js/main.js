document.addEventListener('DOMContentLoaded', function() {
    const toolsList = document.getElementById('tools-list');
    
    const simuladorRegex = document.createElement('div');
    simuladorRegex.className = 'tool-item';
    simuladorRegex.innerHTML = '<a href="tools/simulador-regex.html">Simulador de Expressão Regular</a>';
    toolsList.appendChild(simuladorRegex);
});
