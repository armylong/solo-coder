import { Board } from '../_index/js/board.js';
import { BOARD_SIZE } from '../_index/js/config.js';

describe('Board', () => {
  let board;

  beforeEach(() => {
    board = new Board();
  });

  test('初始状态所有格子为null', () => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        expect(board.get(i, j)).toBeNull();
      }
    }
  });

  test('set和get方法正常工作', () => {
    board.set(5, 5, 'black');
    expect(board.get(5, 5)).toBe('black');
  });

  test('set越界坐标不报错但无效', () => {
    board.set(-1, 5, 'black');
    board.set(BOARD_SIZE, 5, 'black');
    board.set(5, -1, 'black');
    board.set(5, BOARD_SIZE, 'black');
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        expect(board.get(i, j)).toBeNull();
      }
    }
  });

  test('get越界坐标返回null', () => {
    expect(board.get(-1, 5)).toBeNull();
    expect(board.get(BOARD_SIZE, 5)).toBeNull();
    expect(board.get(5, -1)).toBeNull();
    expect(board.get(5, BOARD_SIZE)).toBeNull();
  });

  test('isFull在空棋盘返回false', () => {
    expect(board.isFull()).toBe(false);
  });

  test('isFull在满棋盘返回true', () => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        board.set(i, j, 'black');
      }
    }
    expect(board.isFull()).toBe(true);
  });

  test('reset方法清空棋盘', () => {
    board.set(5, 5, 'black');
    board.set(3, 3, 'white');
    expect(board.get(5, 5)).toBe('black');
    expect(board.get(3, 3)).toBe('white');
    board.reset();
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        expect(board.get(i, j)).toBeNull();
      }
    }
  });
});
