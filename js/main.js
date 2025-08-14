document.addEventListener('DOMContentLoaded', function() {
    const toolsList = document.getElementById('tools-list');
    
    
    const simuladorRegex = document.createElement('div');
    simuladorRegex.className = 'tool-item';
    simuladorRegex.innerHTML = '<a href="tools/simulador-regex.html">Simulador de Expressão Regular</a>';
    toolsList.appendChild(simuladorRegex);
    
    
    function addTool(toolName) {
        const toolElement = document.createElement('div');
        toolElement.className = 'tool-item';
        toolElement.textContent = toolName;
        toolsList.appendChild(toolElement);
    }
    
    
    function clearTools() {
        toolsList.innerHTML = '';
    }
    
    
    window.LFTC = {
        addTool: addTool,
        clearTools: clearTools
    };
});
