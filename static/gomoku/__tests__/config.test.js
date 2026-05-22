import { BOARD_SIZE, PLAYERS, GAME_STATES } from '../_index/js/config.js';

describe('Config', () => {
  test('BOARD_SIZE为15', () => {
    expect(BOARD_SIZE).toBe(15);
  });

  test('PLAYERS有BLACK和WHITE', () => {
    expect(PLAYERS).toHaveProperty('BLACK');
    expect(PLAYERS).toHaveProperty('WHITE');
    expect(PLAYERS.BLACK).toBe('black');
    expect(PLAYERS.WHITE).toBe('white');
  });

  test('GAME_STATES有PLAYING和GAME_OVER', () => {
    expect(GAME_STATES).toHaveProperty('PLAYING');
    expect(GAME_STATES).toHaveProperty('GAME_OVER');
    expect(GAME_STATES.PLAYING).toBe('playing');
    expect(GAME_STATES.GAME_OVER).toBe('game_over');
  });
});
