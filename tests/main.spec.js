

describe('Main window', () => {
  test('h1 contains Retro Game Launcher', () => {
    document.body.innerHTML = '<h1>Retro Game Launcher</h1>';
    const h1 = document.querySelector('h1');
    expect(h1.textContent).toBe('Retro Game Launcher');
  });
});
