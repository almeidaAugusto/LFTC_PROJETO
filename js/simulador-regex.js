document.addEventListener('DOMContentLoaded', function() {
    const regexInput = document.getElementById('regex-input');
    const testInput1 = document.getElementById('test-input1');
    const testInput2 = document.getElementById('test-input2');

    function testRegex() {
        const regexPattern = regexInput.value;

        if (!regexPattern) {
            testInput1.className = 'test-input';
            testInput2.className = 'test-input';
            return;
        }

        try {
            const regex = new RegExp(regexPattern);

            if (regex.test(testInput1.value)) {
                testInput1.className = 'test-input match';
            } else {
                testInput1.className = 'test-input no-match';
            }

            if (regex.test(testInput2.value)) {
                testInput2.className = 'test-input match';
            } else {
                testInput2.className = 'test-input no-match';
            }
        } catch (e) {
            testInput1.className = 'test-input';
            testInput2.className = 'test-input';
        }
    }

    regexInput.addEventListener('input', testRegex);
    testInput1.addEventListener('input', testRegex);
    testInput2.addEventListener('input', testRegex);
});
