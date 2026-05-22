jest.mock('../_index/js/renderer.js', () => {
  return {
    Renderer: jest.fn().mockImplementation(() => ({
      clear: jest.fn(),
      drawBoard: jest.fn(),
      drawStones: jest.fn(),
      drawLastMove: jest.fn(),
      drawWinLine: jest.fn(),
      drawStatus: jest.fn(),
    })),
  };
});

import { Game } from '../_index/js/game.js';
import { BOARD_SIZE, GAME_STATES, PLAYERS, CELL_SIZE } from '../_index/js/config.js';

const createMockCanvas = () => ({
  getContext: jest.fn().mockReturnValue({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    createRadialGradient: jest.fn().mockReturnValue({
      addColorStop: jest.fn(),
    }),
    fillText: jest.fn(),
  }),
  width: 0,
  height: 0,
});

describe('Game', () => {
  let game;
  let mockCanvas;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanvas = createMockCanvas();
    game = new Game(mockCanvas);
  });

  test('初始状态为PLAYING，当前玩家为BLACK', () => {
    expect(game.state).toBe(GAME_STATES.PLAYING);
    expect(game.currentPlayer).toBe(PLAYERS.BLACK);
  });

  test('handleClick在非PLAYING状态不响应', () => {
    game.state = GAME_STATES.GAME_OVER;
    const x = CELL_SIZE + 5 * CELL_SIZE;
    const y = CELL_SIZE + 5 * CELL_SIZE;
    game.handleClick(x, y);
    expect(game.board.get(5, 5)).toBeNull();
  });

  test('handleClick越界坐标不响应', () => {
    game.handleClick(-10, 100);
    game.handleClick(CELL_SIZE * 20, 100);
    game.handleClick(100, -10);
    game.handleClick(100, CELL_SIZE * 20);
    let hasStone = false;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (game.board.get(i, j) !== null) {
          hasStone = true;
        }
      }
    }
    expect(hasStone).toBe(false);
  });

  test('handleClick已占用位置不响应', () => {
    const x = CELL_SIZE + 5 * CELL_SIZE;
    const y = CELL_SIZE + 5 * CELL_SIZE;
    game.handleClick(x, y);
    expect(game.board.get(5, 5)).toBe(PLAYERS.BLACK);
    game.handleClick(x, y);
    expect(game.history.length).toBe(1);
  });

  test('_makeMove正确切换玩家', () => {
    game._makeMove(5, 5);
    expect(game.currentPlayer).toBe(PLAYERS.WHITE);
    game._makeMove(5, 6);
    expect(game.currentPlayer).toBe(PLAYERS.BLACK);
  });

  test('_checkWin水平五连判定', () => {
    for (let i = 0; i < 5; i++) {
      game.board.set(5, i, PLAYERS.BLACK);
    }
    const winLine = game._checkWin(5, 2);
    expect(winLine).not.toBeNull();
    expect(winLine.length).toBe(5);
  });

  test('_checkWin垂直五连判定', () => {
    for (let i = 0; i < 5; i++) {
      game.board.set(i, 5, PLAYERS.BLACK);
    }
    const winLine = game._checkWin(2, 5);
    expect(winLine).not.toBeNull();
    expect(winLine.length).toBe(5);
  });

  test('_checkWin对角线五连判定', () => {
    for (let i = 0; i < 5; i++) {
      game.board.set(i, i, PLAYERS.BLACK);
    }
    const winLine = game._checkWin(2, 2);
    expect(winLine).not.toBeNull();
    expect(winLine.length).toBe(5);
  });

  test('_checkWin反对角线五连判定', () => {
    for (let i = 0; i < 5; i++) {
      game.board.set(i, 4 - i, PLAYERS.BLACK);
    }
    const winLine = game._checkWin(2, 2);
    expect(winLine).not.toBeNull();
    expect(winLine.length).toBe(5);
  });

  test('_checkWin不足五连不判定', () => {
    for (let i = 0; i < 4; i++) {
      game.board.set(5, i, PLAYERS.BLACK);
    }
    const winLine = game._checkWin(5, 2);
    expect(winLine).toBeNull();
  });

  test('棋盘满时判定平局', () => {
    let player = PLAYERS.BLACK;
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (i === BOARD_SIZE - 1 && j === BOARD_SIZE - 1) {
          continue;
        }
        game.board.set(i, j, player);
        player = player === PLAYERS.BLACK ? PLAYERS.WHITE : PLAYERS.BLACK;
      }
    }
    game._makeMove(BOARD_SIZE - 1, BOARD_SIZE - 1);
    expect(game.state).toBe(GAME_STATES.GAME_OVER);
    expect(game.winner).toBeNull();
  });

  test('undo撤销最后一步', () => {
    game._makeMove(5, 5);
    expect(game.board.get(5, 5)).toBe(PLAYERS.BLACK);
    expect(game.history.length).toBe(1);
    game.undo();
    expect(game.board.get(5, 5)).toBeNull();
    expect(game.history.length).toBe(0);
    expect(game.currentPlayer).toBe(PLAYERS.BLACK);
  });

  test('restart重置游戏', () => {
    game._makeMove(5, 5);
    game._makeMove(5, 6);
    game.restart();
    expect(game.state).toBe(GAME_STATES.PLAYING);
    expect(game.currentPlayer).toBe(PLAYERS.BLACK);
    expect(game.history.length).toBe(0);
    expect(game.winner).toBeNull();
    expect(game.winLine).toBeNull();
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        expect(game.board.get(i, j)).toBeNull();
      }
    }
  });
});
