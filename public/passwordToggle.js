// Wires up every ".toggle-password" eye-icon button on the page.
// Each button needs a data-target attribute matching the id of the
// password input it controls.

document.querySelectorAll(".toggle-password").forEach(function (btn) {

    const input = document.getElementById(btn.getAttribute("data-target"));

    if (!input) return;

    const eyeIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    `;

    const eyeSlashIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-6.06"></path>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    `;

    btn.addEventListener("click", function () {

        const isHidden = input.type === "password";

        input.type = isHidden ? "text" : "password";
        btn.innerHTML = isHidden ? eyeSlashIcon : eyeIcon;
        btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");

    });

});
