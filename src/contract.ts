/** Copy exactly the contract address that is visible and selectable in the page. */
export function setupContract() {
  const address = document.getElementById('token-address');
  const button = document.getElementById('copy-contract');
  const feedback = document.getElementById('contract-feedback');
  if (!(address instanceof HTMLElement) || !(button instanceof HTMLButtonElement) || !feedback) return;

  button.addEventListener('click', async () => {
    button.disabled = true;
    feedback.textContent = '';
    try {
      await navigator.clipboard.writeText(address.textContent!.trim());
      feedback.textContent = 'Address copied.';
    } catch {
      // Clipboard access can be unavailable on HTTP gateways or denied by the browser.
      // Selecting the visible address gives those visitors a manual recovery path.
      const selection = window.getSelection();
      if (selection) {
        address.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(address);
        selection.removeAllRanges();
        selection.addRange(range);
        feedback.textContent = 'Address selected. Copy it manually.';
      } else {
        feedback.textContent = 'Select the address above and copy it manually.';
      }
    } finally {
      button.disabled = false;
    }
  });
}
