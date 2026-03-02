function showCustomAlert(message) {
    const modal = document.getElementById('customModal');
    const overlay = document.getElementById('modalOverlay');
    const messageEl = document.getElementById('modalMessage');
    const button = document.getElementById('modalButton');

    if (message == null) message = '';
    messageEl.innerHTML = String(message).replace(/\n/g, '<br>');
    modal.classList.add('show');
    overlay.classList.add('show');

    let modalKeyHandler = null;

    const closeModal = function() {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        window.modalActive = false;
        if (modalKeyHandler) document.removeEventListener('keydown', modalKeyHandler, true);
    };

    button.onclick = closeModal;
    overlay.onclick = closeModal;

    modalKeyHandler = function(e) {
        e.stopImmediatePropagation();
        // Close on Escape or Enter
        if (e.key === 'Escape' || e.key === 'Enter') {
            closeModal();
        }
    };

    window.modalActive = true;
    document.addEventListener('keydown', modalKeyHandler, true);
}

function showCustomInput(message, defaultValue = "") {
    return new Promise((resolve) => {
        const modal = document.getElementById('inputModal');
        const overlay = document.getElementById('inputModalOverlay');
        const messageEl = document.getElementById('inputModalMessage');
        const input = document.getElementById('inputModalField');
        const submitBtn = document.getElementById('inputModalSubmit');
        const cancelBtn = document.getElementById('inputModalCancel');

        messageEl.textContent = message;
        input.value = defaultValue;
        modal.classList.add('show');
        overlay.classList.add('show');
        input.focus();

        let modalKeyHandler = null;

        const closeModal = (value) => {
            modal.classList.remove('show');
            overlay.classList.remove('show');
            window.modalActive = false;
            if (modalKeyHandler) document.removeEventListener('keydown', modalKeyHandler, true);
            resolve(value);
        };

        submitBtn.onclick = function() {
            closeModal(input.value || null);
        };

        cancelBtn.onclick = function() {
            closeModal(null);
        };

        overlay.onclick = function() {
            closeModal(null);
        };

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                closeModal(input.value || null);
            }
        });

        modalKeyHandler = function(e) {
            e.stopImmediatePropagation();
            if (e.key === 'Escape') {
                closeModal(null);
            }
        };

        window.modalActive = true;
        document.addEventListener('keydown', modalKeyHandler, true);
    });
}
